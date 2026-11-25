( function () {
	const PAGED = 'data-wpfse-show-more-paged';
	const EXHAUSTED = 'data-wpfse-show-more-exhausted';
	const FILTER_ATTRIBUTES = [ 'class', 'style', 'hidden', 'aria-hidden', 'inert' ];

	function initialize( control ) {
		const parent = control.parentElement;
		if ( ! parent ) return;

		let managedItems = new Set();
		let shown = Math.max( 1, parseInt( control.dataset.itemsPerClick, 10 ) || 1 );
		const step = shown;
		let eligibleCount = 0;
		const action = control.querySelector( '.wp-block-button__link, .wp-block-paragraph, p' );
		const originalActionContent = action ? Array.from( action.childNodes, ( node ) => node.cloneNode( true ) ) : [];
		const status = document.createElement( 'span' );
		status.className = 'wpfse-show-more__status screen-reader-text';
		status.setAttribute( 'aria-live', 'polite' );
		status.setAttribute( 'aria-atomic', 'true' );
		status.setAttribute( 'role', 'status' );
		if ( action ) control.append( status );

		function refresh( reset ) {
			const controls = Array.from( parent.children ).filter( ( child ) => child.classList.contains( 'wpfse-show-more' ) && child.dataset.itemsPerClick );
			if ( controls.length !== 1 || controls[0] !== control || ! action ) {
				managedItems.forEach( ( item ) => item.removeAttribute( PAGED ) );
				managedItems.clear();
				controls.forEach( ( item ) => { item.dataset.ready = 'true'; item.removeAttribute( EXHAUSTED ); } );
				return;
			}

			const items = Array.from( parent.children ).filter( ( child ) => child !== control && ! child.classList.contains( 'wpfse-show-more' ) );
			managedItems.forEach( ( item ) => item.removeAttribute( PAGED ) );
			managedItems = new Set( items );
			if ( reset ) shown = step;

			const visible = items.filter( isVisible );
			eligibleCount = visible.length;
			// Keep the current page within the filtered result set. If a filter
			// later restores items, they can be paged in again from this point.
			shown = Math.max( Math.min( step, visible.length ), Math.min( shown, visible.length ) );
			const visibleCount = Math.min( shown, visible.length );
			visible.forEach( ( item, index ) => {
				if ( index >= visibleCount ) item.setAttribute( PAGED, '' );
			} );
			control.dataset.ready = 'true';
			if ( visible.length <= shown ) control.setAttribute( EXHAUSTED, '' );
			else control.removeAttribute( EXHAUSTED );
			const nextVisible = visible[ visibleCount ];
			if ( control.nextElementSibling !== nextVisible ) parent.insertBefore( control, nextVisible || null );
			updateLabel( visible.length - shown );
		}

		function updateLabel( remaining ) {
			const finalLabel = remaining > 0 && remaining < step ? control.dataset.finalLabel : '';
			const usesCount = finalLabel && finalLabel.includes( '{count}' );
			if ( finalLabel ) action.textContent = finalLabel.replace( /\{count\}/g, remaining );
			else action.replaceChildren( ...originalActionContent.map( ( node ) => node.cloneNode( true ) ) );
			if ( control.dataset.showRemaining === 'true' && ! usesCount ) {
				const count = document.createElement( 'span' );
				count.className = 'wpfse-show-more__count';
				count.textContent = ' (' + remaining + ')';
				action.append( count );
			}
		}

		function isVisible( element ) {
			let elementStyle;
			for ( let node = element; node && node.nodeType === 1; node = node.parentElement ) {
				if ( node.hasAttribute( 'hidden' ) || node.getAttribute( 'aria-hidden' ) === 'true' || node.hasAttribute( 'inert' ) ) return false;
				const style = window.getComputedStyle( node );
				if ( node === element ) elementStyle = style;
				if ( style.display === 'none' || style.contentVisibility === 'hidden' || parseFloat( style.opacity ) === 0 ) return false;
				if ( node === element && ( style.visibility === 'hidden' || style.visibility === 'collapse' ) ) return false;
			}
			return elementStyle.display === 'contents' || element.getClientRects().length > 0;
		}

		if ( action ) {
			action.addEventListener( 'click', ( event ) => {
				event.preventDefault();
				// Refresh eligibility at click time in case a filter changed styles without a DOM mutation.
				refresh( false );
				shown = Math.min( eligibleCount, shown + step );
				refresh( false );
				status.textContent = 'More blocks shown. ' + Math.max( 0, eligibleCount - shown ) + ' remaining.';
			} );
			action.setAttribute( 'role', 'button' );
			if ( action.tagName === 'P' || action.classList.contains( 'wp-block-paragraph' ) ) action.setAttribute( 'tabindex', '0' );
			action.addEventListener( 'keydown', ( event ) => {
				if ( event.key === 'Enter' || event.key === ' ' ) {
					event.preventDefault();
					action.click();
				}
			} );
		}

		let queued = false;
		const scheduleRefresh = () => {
			if ( queued ) return;
			queued = true;
			window.requestAnimationFrame( () => {
				queued = false;
				refresh( false );
			} );
		};
		const observer = new MutationObserver( ( mutations ) => {
			const onlyControlMove = mutations.length && mutations.every( ( mutation ) =>
				mutation.type === 'childList' && mutation.target === parent &&
				Array.from( mutation.addedNodes || [] ).concat( Array.from( mutation.removedNodes || [] ) ).every( ( node ) => node === control )
			);
			if ( ! onlyControlMove && mutations.some( ( mutation ) => mutation.target !== control && ! control.contains( mutation.target ) ) ) {
				scheduleRefresh();
			}
		} );
		observer.observe( parent, { childList: true, subtree: true, attributes: true, attributeFilter: FILTER_ATTRIBUTES } );
		for ( let ancestor = parent.parentElement; ancestor; ancestor = ancestor.parentElement ) {
			observer.observe( ancestor, { attributes: true, attributeFilter: FILTER_ATTRIBUTES } );
		}
		parent.addEventListener( 'transitionend', scheduleRefresh, true );
		parent.addEventListener( 'animationend', scheduleRefresh, true );
		window.addEventListener( 'resize', scheduleRefresh );
		refresh( true );
	}

	document.querySelectorAll( '.wpfse-show-more[data-items-per-click]' ).forEach( initialize );
} )();
