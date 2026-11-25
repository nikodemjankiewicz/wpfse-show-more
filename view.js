( function () {
	function initialize( control ) {
		const parent = control.parentElement;
		if ( ! parent ) return;
		const controls = Array.from( parent.children ).filter( ( child ) => child.classList.contains( 'wpfse-show-more' ) && child.dataset.itemsPerClick );
		if ( controls.length !== 1 ) {
			controls.forEach( ( item ) => { item.dataset.ready = 'true'; } );
			return;
		}

		const siblings = Array.from( parent.children );
		const items = siblings.slice( siblings.indexOf( control ) + 1 );
		const action = control.querySelector( '.wp-block-button__link, .wp-block-paragraph, p' );
		if ( ! action ) {
			control.dataset.ready = 'true';
			return;
		}

		items.forEach( ( item ) => { item.hidden = true; } );
		const status = document.createElement( 'span' );
		status.className = 'wpfse-show-more__status screen-reader-text';
		status.setAttribute( 'aria-live', 'polite' );
		status.setAttribute( 'aria-atomic', 'true' );
		status.setAttribute( 'role', 'status' );
		parent.append( status );
		if ( ! items.length ) {
			control.hidden = true;
			control.dataset.ready = 'true';
			return;
		}

		control.dataset.ready = 'true';
		const step = Math.max( 1, parseInt( control.dataset.itemsPerClick, 10 ) || 1 );
		const originalLabel = action.innerHTML;
		let revealed = 0;

		function updateLabel() {
			const remaining = items.length - revealed;
			const finalClick = remaining < step;
			const finalLabel = finalClick && control.dataset.finalLabel;
			let label = finalLabel ? finalLabel.replace( /\{count\}/g, remaining ) : originalLabel;
			if ( control.dataset.showRemaining === 'true' && ! ( finalLabel && finalLabel.includes( '{count}' ) ) ) label += ' (' + remaining + ')';
			action.innerHTML = label;
		}

		updateLabel();
		function reveal( event ) {
			if ( event ) event.preventDefault();
			const remaining = items.length - revealed;
			const amount = remaining <= step ? remaining : step;
			for ( let i = revealed; i < revealed + amount; i++ ) items[i].hidden = false;
			revealed += amount;
			if ( revealed === items.length ) {
				control.hidden = true;
				status.textContent = 'All remaining blocks are now visible.';
				return;
			}
			items[ revealed - 1 ].after( control );
			updateLabel();
			status.textContent = amount + ' more blocks shown. ' + ( items.length - revealed ) + ' remaining.';
		}

		action.addEventListener( 'click', reveal );
		action.setAttribute( 'role', 'button' );
		if ( action.tagName === 'P' || action.classList.contains( 'wp-block-paragraph' ) ) {
			action.setAttribute( 'tabindex', '0' );
		}
		if ( action.getAttribute( 'role' ) === 'button' ) {
			action.addEventListener( 'keydown', function ( event ) {
				if ( event.key === 'Enter' || event.key === ' ' ) {
					event.preventDefault();
					action.click();
				}
			} );
		}
	}

	document.querySelectorAll( '.wpfse-show-more[data-items-per-click]' ).forEach( initialize );
} )();
