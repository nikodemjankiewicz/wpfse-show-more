const assert = require( 'node:assert/strict' );
const fs = require( 'node:fs' );
const test = require( 'node:test' );
const vm = require( 'node:vm' );

class Element {
	constructor( className = '', tagName = 'DIV' ) {
		this.nodeType = 1;
		this.className = className;
		this.tagName = tagName;
		this.classList = { contains: ( name ) => this.className.split( ' ' ).includes( name ) };
		this.children = [];
		this.childNodes = this.children;
		this.dataset = {};
		this.parentElement = null;
		this.attributes = {};
		this.handlers = {};
		this.styles = {};
		this._textContent = '';
	}

	get textContent() { return this._textContent + this.children.map( ( child ) => child.textContent ).join( '' ); }
	get nextElementSibling() {
		if ( ! this.parentElement ) return null;
		const siblings = this.parentElement.children;
		return siblings[ siblings.indexOf( this ) + 1 ] || null;
	}
	set textContent( value ) {
		this._textContent = String( value );
		this.children.forEach( ( child ) => { child.parentElement = null; } );
		this.children.length = 0;
	}

	append( child ) {
		if ( child.parentElement ) child.parentElement.children.splice( child.parentElement.children.indexOf( child ), 1 );
		this.children.push( child );
		child.parentElement = this;
	}

	insertBefore( child, reference ) {
		if ( child.parentElement ) child.parentElement.children.splice( child.parentElement.children.indexOf( child ), 1 );
		const index = reference ? this.children.indexOf( reference ) : -1;
		this.children.splice( index < 0 ? this.children.length : index, 0, child );
		child.parentElement = this;
	}

	cloneNode() {
		const clone = new Element( this.className, this.tagName );
		clone.textContent = this.textContent;
		clone.styles = { ...this.styles };
		this.children.forEach( ( child ) => clone.append( child.cloneNode( true ) ) );
		return clone;
	}

	replaceChildren( ...children ) {
		this.children.forEach( ( child ) => { child.parentElement = null; } );
		this.children.length = 0;
		this.textContent = '';
		children.forEach( ( child ) => this.append( child ) );
	}

	contains( node ) {
		return node === this || this.children.some( ( child ) => child.contains( node ) );
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

	setAttribute( name, value ) { this.attributes[name] = String( value ); }
	removeAttribute( name ) { delete this.attributes[name]; }
	hasAttribute( name ) { return Object.hasOwn( this.attributes, name ); }
	getAttribute( name ) { return this.attributes[name] ?? null; }
	getClientRects() { return this.styles.display === 'none' ? [] : [ {} ]; }
	addEventListener( name, handler ) { this.handlers[name] = handler; }
	click() { this.handlers.click( { preventDefault() {} } ); }
}

function run( parent ) {
	const controls = [];
	const observers = [];
	function visit( element ) {
		if ( element.classList.contains( 'wpfse-show-more' ) && element.dataset.itemsPerClick ) controls.push( element );
		element.children.forEach( visit );
	}
	visit( parent );
	const document = { querySelectorAll: () => controls, createElement: () => new Element() };
	class FakeMutationObserver {
		constructor( callback ) { this.callback = callback; observers.push( this ); }
		observe() {}
		trigger( records = [] ) { this.callback( records ); }
	}
	const window = {
		getComputedStyle: ( element ) => ( { display: 'block', visibility: 'visible', opacity: '1', contentVisibility: 'visible', ...element.styles } ),
		requestAnimationFrame: ( callback ) => callback(),
		addEventListener() {},
	};
	vm.runInNewContext( fs.readFileSync( 'view.js', 'utf8' ), { document, window, MutationObserver: FakeMutationObserver, Array, Math, parseInt, Set } );
	return { controls, observers };
}

function createControl( parent, type = 'paragraph', options = {} ) {
	const control = new Element( 'wpfse-show-more' );
	control.dataset = { itemsPerClick: '2', finalLabel: 'Show all ({count})', showRemaining: 'false', ...options };
	const action = type === 'button' ? new Element( 'wp-block-button__link', 'A' ) : new Element( 'wp-block-paragraph', 'P' );
	action.textContent = 'Show more';
	control.append( action );
	parent.append( control );
	return { control, action };
}

test( 'shows the initial batch and reveals the next batch on each click', () => {
	const parent = new Element();
	const { control, action } = createControl( parent );
	const items = [ 1, 2, 3, 4, 5 ].map( () => new Element( 'item' ) );
	items.forEach( ( item ) => parent.append( item ) );

	run( parent );
	assert.deepEqual( parent.children.slice( 0, 3 ), [ items[0], items[1], control ] );
	assert.deepEqual( items.map( ( item ) => item.hasAttribute( 'data-wpfse-show-more-paged' ) ), [ false, false, true, true, true ] );
	action.click();
	assert.deepEqual( parent.children.slice( 0, 5 ), [ items[0], items[1], items[2], items[3], control ] );
	assert.deepEqual( items.map( ( item ) => item.hasAttribute( 'data-wpfse-show-more-paged' ) ), [ false, false, false, false, true ] );
	assert.equal( action.textContent, 'Show all (1)' );
	action.click();
	assert.ok( items.every( ( item ) => ! item.hasAttribute( 'data-wpfse-show-more-paged' ) ) );
	assert.equal( control.hasAttribute( 'data-wpfse-show-more-exhausted' ), true );
	assert.match( control.children.at( -1 ).textContent, /0 remaining/ );
} );

test( 'counts direct siblings, skips hidden items, and treats nested blocks as one item', () => {
	const parent = new Element();
	createControl( parent, 'paragraph', { itemsPerClick: '2' } );
	const hidden = new Element( 'item' );
	hidden.setAttribute( 'hidden', '' );
	const group = new Element( 'group' );
	group.append( new Element( 'nested' ) );
	const transparent = new Element( 'item' );
	transparent.styles.opacity = '0';
	const last = new Element( 'item' );
	const afterLast = new Element( 'item' );
	[ hidden, group, transparent, last, afterLast ].forEach( ( item ) => parent.append( item ) );

	run( parent );
	assert.equal( hidden.hasAttribute( 'data-wpfse-show-more-paged' ), false );
	assert.equal( group.hasAttribute( 'data-wpfse-show-more-paged' ), false );
	assert.equal( transparent.hasAttribute( 'data-wpfse-show-more-paged' ), false );
	assert.equal( last.hasAttribute( 'data-wpfse-show-more-paged' ), false );
	assert.equal( afterLast.hasAttribute( 'data-wpfse-show-more-paged' ), true );
} );

test( 'recalculates after filters and DOM changes without undoing revealed batches', () => {
	const parent = new Element();
	const { action } = createControl( parent );
	const items = [ 1, 2, 3, 4, 5, 6 ].map( () => new Element( 'item' ) );
	items.forEach( ( item ) => parent.append( item ) );
	const { observers } = run( parent );
	action.click();
	assert.equal( items[2].hasAttribute( 'data-wpfse-show-more-paged' ), false );
	items[0].setAttribute( 'hidden', '' );
	const added = new Element( 'item' );
	parent.append( added );
	observers[0].trigger( [ { type: 'attributes', target: items[0] }, { type: 'childList', target: parent } ] );
	assert.equal( items[0].hasAttribute( 'data-wpfse-show-more-paged' ), false );
	assert.equal( items[1].hasAttribute( 'data-wpfse-show-more-paged' ), false );
	assert.equal( items[2].hasAttribute( 'data-wpfse-show-more-paged' ), false );
	assert.equal( items[3].hasAttribute( 'data-wpfse-show-more-paged' ), false );
	assert.equal( items[4].hasAttribute( 'data-wpfse-show-more-paged' ), false );
	assert.equal( added.hasAttribute( 'data-wpfse-show-more-paged' ), true );
} );

test( 'restores pagination when filters hide and then restore items after all were revealed', () => {
	const parent = new Element();
	const { control, action } = createControl( parent );
	const items = [ 1, 2, 3, 4, 5 ].map( () => new Element( 'item' ) );
	items.forEach( ( item ) => parent.append( item ) );
	const { observers } = run( parent );
	action.click();
	action.click();
	assert.equal( control.hasAttribute( 'data-wpfse-show-more-exhausted' ), true );

	items.slice( 2 ).forEach( ( item ) => item.setAttribute( 'hidden', '' ) );
	observers[0].trigger( items.slice( 2 ).map( ( item ) => ( { type: 'attributes', target: item } ) ) );
	items.slice( 2 ).forEach( ( item ) => item.removeAttribute( 'hidden' ) );
	observers[0].trigger( items.slice( 2 ).map( ( item ) => ( { type: 'attributes', target: item } ) ) );

	assert.equal( control.hasAttribute( 'data-wpfse-show-more-exhausted' ), false );
	assert.deepEqual( items.map( ( item ) => item.hasAttribute( 'data-wpfse-show-more-paged' ) ), [ false, false, true, true, true ] );
	assert.equal( parent.children.indexOf( control ), parent.children.indexOf( items[1] ) + 1 );
} );

test( 'does not reset the revealed batch when its own label changes', () => {
	const parent = new Element();
	const { action } = createControl( parent );
	const items = [ 1, 2, 3, 4, 5 ].map( () => new Element( 'item' ) );
	items.forEach( ( item ) => parent.append( item ) );
	const { observers } = run( parent );
	action.click();
	observers[0].trigger( [ { type: 'childList', target: action } ] );
	assert.deepEqual( items.map( ( item ) => item.hasAttribute( 'data-wpfse-show-more-paged' ) ), [ false, false, false, false, true ] );
} );

test( 'rechecks filter visibility when clicked even without a DOM mutation', () => {
	const parent = new Element();
	const { action } = createControl( parent );
	const items = [ 1, 2, 3, 4 ].map( () => new Element( 'item' ) );
	items.forEach( ( item ) => parent.append( item ) );
	run( parent );
	items[0].styles.opacity = '0';
	action.click();
	assert.equal( items[0].hasAttribute( 'data-wpfse-show-more-paged' ), false );
	assert.equal( items[1].hasAttribute( 'data-wpfse-show-more-paged' ), false );
	assert.equal( items[2].hasAttribute( 'data-wpfse-show-more-paged' ), false );
	assert.equal( items[3].hasAttribute( 'data-wpfse-show-more-paged' ), false );
} );

test( 'keeps authored inline formatting while updating the remaining count', () => {
	const parent = new Element();
	const { action } = createControl( parent, 'paragraph', { showRemaining: 'true', finalLabel: '' } );
	const emphasis = new Element( 'has-inline-style', 'STRONG' );
	emphasis.textContent = 'Show more';
	action.append( emphasis );
	[ 1, 2, 3, 4, 5 ].forEach( () => parent.append( new Element( 'item' ) ) );

	run( parent );
	assert.equal( action.children[0].tagName, 'STRONG' );
	assert.equal( action.children[0].classList.contains( 'has-inline-style' ), true );
	assert.equal( action.children.at( -1 ).className, 'wpfse-show-more__count' );
	assert.equal( action.textContent, 'Show more (3)' );
	action.click();
	assert.equal( action.children[0].tagName, 'STRONG' );
	assert.equal( action.children[0].classList.contains( 'has-inline-style' ), true );
	assert.equal( action.textContent, 'Show more (1)' );
} );

test( 'leaves all content visible for duplicate controls and without JavaScript', () => {
	const parent = new Element();
	const first = createControl( parent );
	const item = new Element( 'item' );
	parent.append( item );
	const second = createControl( parent );
	run( parent );
	assert.equal( item.hasAttribute( 'data-wpfse-show-more-paged' ), false );
	assert.equal( first.control.dataset.ready, 'true' );
	assert.equal( second.control.dataset.ready, 'true' );

	const php = fs.readFileSync( 'show-more.php', 'utf8' );
	const css = fs.readFileSync( 'style.css', 'utf8' );
	assert.doesNotMatch( php, /wpfse-show-more-early/ );
	assert.doesNotMatch( css, /wpfse-show-more-js/ );
	assert.match( css, /\[data-wpfse-show-more-paged\]/ );
	assert.match( fs.readFileSync( 'render.php', 'utf8' ), /get_block_wrapper_attributes\( \$extra_attributes \)/ );
} );

test( 'paragraph supports Enter and Space, while Button keeps its native link element', () => {
	const parent = new Element();
	const { action } = createControl( parent );
	parent.append( new Element( 'item' ) );
	run( parent );
	assert.equal( action.getAttribute( 'role' ), 'button' );
	let prevented = false;
	action.handlers.keydown( { key: ' ', preventDefault: () => { prevented = true; } } );
	assert.equal( prevented, true );
	assert.equal( parent.children.find( ( child ) => child.classList.contains( 'item' ) ).hasAttribute( 'data-wpfse-show-more-paged' ), false );

	const buttonParent = new Element();
	const { action: nativeButton } = createControl( buttonParent, 'button' );
	buttonParent.append( new Element( 'item' ) );
	run( buttonParent );
	assert.equal( nativeButton.getAttribute( 'role' ), 'button' );
} );
