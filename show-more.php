<?php
/**
 * Plugin Name: Show More
 * Description: Reveal following sibling blocks a few at a time.
 * Version: 1.0.0
 * Requires at least: 6.9
 * Requires PHP: 7.4
 * Text Domain: wpfse-show-more
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action(
	'init',
	static function () {
		register_block_type( __DIR__ );
	}
);

add_action(
	'wp_enqueue_scripts',
	static function () {
		wp_register_script( 'wpfse-show-more-early', false, array(), null, false );
		wp_enqueue_script( 'wpfse-show-more-early' );
		wp_add_inline_script( 'wpfse-show-more-early', 'document.documentElement.classList.add("wpfse-show-more-js");', 'before' );
	}
);
