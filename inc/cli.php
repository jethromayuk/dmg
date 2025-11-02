<?php

if ( ! class_exists( 'WP_CLI_Command' ) ) {
    return;
}

class DMG_Read_More_CLI extends WP_CLI_Command {

    public function search( $args, $assoc_args ) {

        $date_after  = WP_CLI\Utils\get_flag_value( $assoc_args, 'date-after' );
        $date_before = WP_CLI\Utils\get_flag_value( $assoc_args, 'date-before' );

        if ( $date_after && ! $this->validate_date( $date_after ) ) {
            WP_CLI::error( "Invalid 'date-after' format. Please use Y-m-d." );
            return;
        }
        if ( $date_before && ! $this->validate_date( $date_before ) ) {
            WP_CLI::error( "Invalid 'date-before' format. Please use Y-m-d." );
            return;
        }

        $date_query_args = [ 'inclusive' => true ];

        // Default to last 30 days if no dates are provided
        if ( empty( $date_after ) && empty( $date_before ) ) {
            $date_query_args['after'] = '30 days ago';
        } else {
            if ( $date_after ) {
                $date_query_args['after'] = $date_after;
            }
            if ( $date_before ) {
                $date_query_args['before'] = $date_before;
            }
        }

        WP_CLI::log( 'Starting search for posts with block "dmg/read-more"...' );

        $block_search_filter = function( $where, $wp_query ) {
            global $wpdb;

            if ( $wp_query->get( 'dmg_block_search' ) ) {
                $search_string = '';

                $where .= $wpdb->prepare(
                    " AND {$wpdb->posts}.post_content LIKE %s",
                    '%' . $wpdb->esc_like( $search_string ) . '%'
                );
            }
            return $where;
        };

        $paged          = 1;
        $batch_size     = 1000;
        $total_found    = 0;

        do {
            $query_args = [
                'post_type'      => 'post',
                'post_status'    => 'publish',
                'date_query'     => [ $date_query_args ],
                'posts_per_page' => $batch_size,
                'paged'          => $paged,
                'fields'                 => 'ids',
                'no_found_rows'          => true,
                'update_post_meta_cache' => false,
                'update_post_term_cache' => false,
                'dmg_block_search' => true,
            ];

            add_filter( 'posts_where', $block_search_filter, 10, 2 );

            $query = new WP_Query( $query_args );

            remove_filter( 'posts_where', $block_search_filter, 10 );

            if ( $query->have_posts() ) {
                $post_ids = $query->posts;
                $total_found += count( $post_ids );

                foreach ( $post_ids as $post_id ) {
                    WP_CLI::line( (string) $post_id );
                }
            }

            $paged++;

            if ( ! $query->have_posts() || count( $query->posts ) < $batch_size ) {
                break;
            }

            // Clear cache periodically to prevent memory exhaustion
            $this->clear_cache();

        } while ( true );

        if ( 0 === $total_found ) {
            WP_CLI::warning( 'No posts found matching the criteria.' );
        } else {
            WP_CLI::success( "Search complete. Found $total_found matching post(s)." );
        }
    }

    private function validate_date( $date ) {
        $d = DateTime::createFromFormat( 'Y-m-d', $date );
        return $d && $d->format( 'Y-m-d' ) === $date;
    }

    private function clear_cache() {
        global $wpdb, $wp_object_cache;
        $wpdb->queries = [];
        if ( is_object( $wp_object_cache ) ) {
            $wp_object_cache->group_ops      = [];
            $wp_object_cache->stats          = [];
            $wp_object_cache->memcache_debug = [];
            $wp_object_cache->cache          = [];
            if ( method_exists( $wp_object_cache, '__remoteset' ) ) {
                $wp_object_cache->__remoteset();
            }
        }
    }
}