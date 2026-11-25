const assert = require( 'node:assert/strict' );
const fs = require( 'node:fs' );
const test = require( 'node:test' );
const vm = require( 'node:vm' );

class Element {
	constructor( className = '', tagName = 'DIV' ) {
		this.className = className;
		this.tagName = tagName;
		this.classList = { contains: ( name ) => this.className.split( ' ' ).includes( name ) };
		this.children = [];
		this.dataset = {};
		this.hidden = false;
		this.parentElement = null;
		this.attributes = {};
		this.handlers = {};
		this.innerHTML = '';
		this.textContent = '';
	}

	append( child ) {
		if ( child.parentElement ) child.parentElement.children.splice( child.parentElement.children.indexOf( child ), 1 );
		this.children.push( child );
		child.parentElement = this;
	}

	after( sibling ) {
		const parent = this.parentElement;
		if ( sibling.parentElement ) sibling.parentElement.children.splice( sibling.parentElement.children.indexOf( sibling ), 1 );
		parent.children.splice( parent.children.indexOf( this ) + 1, 0, sibling );
		sibling.parentElement = parent;
	}

	querySelector( selector ) {
		const selectors = selector.split( ', ' );
		const visit = ( element ) => {
			for ( const child of element.children ) {
				if ( selectors.some( ( item ) => item === 'p' ? child.tagName === 'P' : child.classList.contains( item.slice( 1 ) ) ) ) return child;
				const found = visit( child );
				if ( found ) return found;
			}
			return null;
		};
		return visit( this );
	}

	setAttribute( name, value ) { this.attributes[name] = value; }
	getAttribute( name ) { return this.attributes[name] || null; }
	addEventListener( name, handler ) { this.handlers[name] = handler; }
	click() { this.handlers.click( { preventDefault() {} } ); }
}

function run( parent ) {
	const controls = [];
	function visit( element ) {
		if ( element.classList.contains( 'wpfse-show-more' ) && element.dataset.itemsPerClick ) controls.push( element );
		element.children.forEach( visit );
	}
	visit( parent );
	const document = { querySelectorAll: () => controls, createElement: () => new Element() };
	vm.runInNewContext( fs.readFileSync( 'view.js', 'utf8' ), { document, Array, Math, parseInt } );
	return controls;
}

function createControl( parent, type = 'paragraph', options = {} ) {
	const control = new Element( 'wpfse-show-more' );
	control.dataset = { itemsPerClick: '2', finalLabel: 'Show all ({count})', showRemaining: 'false', ...options };
	const action = type === 'button' ? new Element( 'wp-block-button__link', 'A' ) : new Element( 'wp-block-paragraph', 'P' );
	action.innerHTML = 'Show more';
	control.append( action );
	parent.append( control );
	return { control, action };
}

test( 'reveals direct siblings in steps, moves the native control, then reveals the rest', () => {
	const parent = new Element();
	parent.append( new Element( 'before' ) );
	const { control, action } = createControl( parent );
	const items = [ 1, 2, 3 ].map( () => new Element( 'item' ) );
	items.forEach( ( item ) => parent.append( item ) );

	run( parent );
	assert.deepEqual( items.map( ( item ) => item.hidden ), [ true, true, true ] );
	assert.equal( action.innerHTML, 'Show more' );
	action.click();
	assert.deepEqual( items.map( ( item ) => item.hidden ), [ false, false, true ] );
	assert.equal( parent.children.indexOf( control ), parent.children.indexOf( items[1] ) + 1 );
	assert.equal( action.innerHTML, 'Show all (1)' );
	action.click();
	assert.ok( items.every( ( item ) => ! item.hidden ) );
	assert.equal( control.hidden, true );
	assert.equal( parent.children.at( -1 ).textContent, 'All remaining blocks are now visible.' );
} );

test( 'leaves content visible when a group has multiple Show More controls', () => {
	const parent = new Element();
	const first = createControl( parent );
	const item = new Element( 'item' );
	parent.append( item );
	const second = createControl( parent );
	run( parent );
	assert.equal( item.hidden, false );
	assert.equal( first.control.dataset.ready, 'true' );
	assert.equal( second.control.dataset.ready, 'true' );
} );

test( 'hides an empty control without hiding anything else', () => {
	const parent = new Element();
	const { control } = createControl( parent );
	run( parent );
	assert.equal( control.hidden, true );
	assert.equal( control.dataset.ready, 'true' );
} );

test( 'defaults to visible content without JavaScript enhancement', () => {
	const php = fs.readFileSync( 'show-more.php', 'utf8' );
	const css = fs.readFileSync( 'style.css', 'utf8' );
	assert.match( php, /classList\.add\("wpfse-show-more-js"\)/ );
	assert.match( css, /html\.wpfse-show-more-js \.wpfse-show-more:not\(\[data-ready="true"\]\) ~ \*/ );
	assert.match( fs.readFileSync( 'render.php', 'utf8' ), /get_block_wrapper_attributes\( \$extra_attributes \)/ );
} );

test( 'paragraph works with Enter and Space, and Button uses its native link element', () => {
	const parent = new Element();
	const { action } = createControl( parent );
	parent.append( new Element( 'item' ) );
	run( parent );
	assert.equal( action.getAttribute( 'role' ), 'button' );
	let prevented = false;
	action.handlers.keydown( { key: ' ', preventDefault: () => { prevented = true; } } );
	assert.equal( prevented, true );
	assert.equal( parent.children.find( ( child ) => child.classList.contains( 'item' ) ).hidden, false );

	const buttonParent = new Element();
	const { action: nativeButton } = createControl( buttonParent, 'button' );
	buttonParent.append( new Element( 'item' ) );
	run( buttonParent );
	assert.equal( nativeButton.getAttribute( 'role' ), 'button' );
} );
