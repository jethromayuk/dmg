<?php
/**
 * Plugin Name:       DMG
 * Description:       Custom Read More block and WP CLI Post Search.
 * Version:           1.0.0
 * Author:            Jethro May
 * Text Domain:       dmg-read-more
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

function dmg_read_more_register_block() {
    register_block_type( __DIR__ . '/build' );
}
add_action( 'init', 'dmg_read_more_register_block' );

function dmg_read_more_register_cli() {
    if ( defined( 'WP_CLI' ) && WP_CLI ) {
        require_once __DIR__ . '/inc/cli.php';
        WP_CLI::add_command( 'dmg-read-more', 'DMG_Read_More_CLI' );
    }
}
add_action( 'cli_init', 'dmg_read_more_register_cli' );