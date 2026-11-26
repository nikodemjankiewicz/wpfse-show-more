<?php
$items_per_click = max( 1, absint( $attributes['itemsPerClick'] ?? 3 ) );
$final_label     = $attributes['finalButtonLabel'] ?? null;
$final_label     = sanitize_text_field( is_string( $final_label ) ? $final_label : __( 'Show all remaining ({count})', 'wpfse-show-more' ) );
$show_remaining  = ! empty( $attributes['showRemaining'] );
$extra_attributes = array(
	'class'                  => 'wpfse-show-more',
	'data-items-per-click'   => $items_per_click,
	'data-final-label'       => $final_label,
	'data-show-remaining'    => $show_remaining ? 'true' : 'false',
);

printf(
	'<div %1$s>%2$s</div>',
	get_block_wrapper_attributes( $extra_attributes ),
	$content
);
