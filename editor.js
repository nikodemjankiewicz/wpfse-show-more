( function ( blocks, blockEditor, components, data, element, i18n ) {
	const { createBlock, registerBlockType } = blocks;
	const { InnerBlocks, InspectorControls, useBlockProps } = blockEditor;
	const { Notice, PanelBody, RangeControl, SelectControl, TextControl, ToggleControl } = components;
	const { useDispatch, useSelect } = data;
	const { createElement: el, Fragment } = element;
	const { __ } = i18n;

	registerBlockType( 'wpfse/show-more', {
		edit( { attributes, setAttributes, clientId } ) {
			const children = useSelect( ( select ) => select( 'core/block-editor' ).getBlocks( clientId ), [ clientId ] );
			const siblings = useSelect( ( select ) => {
				const editor = select( 'core/block-editor' );
				return editor.getBlocks( editor.getBlockRootClientId( clientId ) );
			}, [ clientId ] );
			const { replaceInnerBlocks } = useDispatch( 'core/block-editor' );
			const count = siblings.filter( ( block ) => block.name === 'wpfse/show-more' ).length;
			const controlType = children[0]?.name === 'core/buttons' ? 'button' : 'paragraph';
			const label = children[0]?.name === 'core/buttons' ? children[0].innerBlocks[0]?.attributes.text : children[0]?.attributes.content;
			const props = useBlockProps( { className: 'wpfse-show-more' } );

			function setControlType( type ) {
				const text = label || 'Show more';
				const block = type === 'button'
					? createBlock( 'core/buttons', {}, [ createBlock( 'core/button', { text } ) ] )
					: createBlock( 'core/paragraph', { content: text } );
				replaceInnerBlocks( clientId, [ block ], false );
			}

			return el( Fragment, {},
				el( InspectorControls, {},
					el( PanelBody, { title: __( 'Show More settings', 'wpfse-show-more' ) },
						el( SelectControl, { label: __( 'Control block', 'wpfse-show-more' ), value: controlType, options: [ { label: __( 'Paragraph', 'wpfse-show-more' ), value: 'paragraph' }, { label: __( 'Button', 'wpfse-show-more' ), value: 'button' } ], onChange: setControlType } ),
						el( RangeControl, { label: __( 'Initial blocks and blocks per click', 'wpfse-show-more' ), min: 1, max: 20, value: attributes.itemsPerClick, onChange: ( value ) => setAttributes( { itemsPerClick: value } ) } ),
						el( ToggleControl, { label: __( 'Show remaining count', 'wpfse-show-more' ), checked: attributes.showRemaining, onChange: ( value ) => setAttributes( { showRemaining: value } ) } ),
						el( TextControl, { label: __( 'Final label ({count} is replaced by the number)', 'wpfse-show-more' ), value: attributes.finalButtonLabel, onChange: ( value ) => setAttributes( { finalButtonLabel: value } ) } ),
						count > 1 && el( Notice, { status: 'warning', isDismissible: false }, __( 'Only one Show More block can be used in a group. While there are duplicates, the group stays fully visible.', 'wpfse-show-more' ) ),
						children.length !== 1 && el( Notice, { status: 'warning', isDismissible: false }, __( 'Use one Paragraph or one Button block as the Show More control.', 'wpfse-show-more' ) )
					)
				),
				el( 'div', props,
					el( InnerBlocks, { allowedBlocks: [ 'core/paragraph', 'core/buttons' ], template: [ [ 'core/paragraph', { content: 'Show more' } ] ] } )
				)
			);
		},
		save( { attributes } ) {
			return el( InnerBlocks.Content );
		}
	} );
} )( window.wp.blocks, window.wp.blockEditor, window.wp.components, window.wp.data, window.wp.element, window.wp.i18n );
