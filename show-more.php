<?php
/**
 * Plugin Name: Show More
 * Description: Reveal sibling blocks a few at a time.
 * Author: nikodemjankiewicz
 * Author URI: https://github.com/nikodemjankiewicz
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
