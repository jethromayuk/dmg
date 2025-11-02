import { registerBlockType } from '@wordpress/blocks';
import {
    useBlockProps,
    InspectorControls,
} from '@wordpress/block-editor';
import {
    PanelBody,
    TextControl,
    Button,
    Spinner,
    Disabled,
} from '@wordpress/components';
import { useState, useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import { addQueryArgs } from '@wordpress/url';

import './editor.scss';
import './style.scss';

import metadata from './block.json';

const Edit = ( { attributes, setAttributes } ) => {
    const { selectedPostId, selectedPostTitle, selectedPostLink } = attributes;

    const [ searchTerm, setSearchTerm ] = useState( '' );
    const [ searchResults, setSearchResults ] = useState( [] );
    const [ isLoading, setIsLoading ] = useState( true );
    const [ currentPage, setCurrentPage ] = useState( 1 );
    const [ totalPages, setTotalPages ] = useState( 1 );

    const postsPerPage = 5;

    const fetchPosts = ( page = 1, search = '' ) => {
        setIsLoading( true );
        setSearchResults( [] );

        const query = {
            per_page: postsPerPage,
            page,
            status: 'publish',
            _embed: true,
            orderby: 'date',
        };

        if ( search ) {
            if ( /^\d+$/.test( search ) ) {
                query.include = [ search ];
            } else {
                query.search = search;
            }
        }

        const path = addQueryArgs( '/wp/v2/posts', query );

        apiFetch( { path } )
            .then( ( posts ) => {
                setSearchResults( posts );
                setIsLoading( false );

                try {
                    const response = apiFetch.getLastResponse();
                    if ( response && response.headers ) {
                        const total = response.headers.get( 'X-WP-TotalPages' );
                        setTotalPages( parseInt( total, 10 ) || 1 );
                    } else {
                        setTotalPages( 1 );
                    }
                } catch ( e ) {
                    console.warn( 'Could not parse pagination headers:', e );
                    setTotalPages( 1 );
                }

                setCurrentPage( page );
            } )
            .catch( ( error ) => {
                console.error( 'Error fetching posts:', error );
                setIsLoading( false );
                setSearchResults( [] );
            } );
    };

    // Fetch recent posts by default on load
    useEffect( () => {
        fetchPosts( 1, '' );
    }, [] );

    const onSelectPost = ( post ) => {
        setAttributes( {
            selectedPostId: post.id,
            selectedPostTitle: post.title.rendered,
            selectedPostLink: post.link,
        } );
    };

    return (
        <>
            <InspectorControls>
                <PanelBody title={ __( 'Post Selection', 'dmg-read-more' ) }>
                    <TextControl
                        label={ __( 'Search Posts', 'dmg-read-more' ) }
                        value={ searchTerm }
                        onChange={ ( newSearch ) => setSearchTerm( newSearch ) }
                        help={ __(
                            'Search by title or enter a specific Post ID.',
                            'dmg-read-more'
                        ) }
                    />
                    <Button
                        isPrimary
                        onClick={ () => fetchPosts( 1, searchTerm ) }
                        disabled={ isLoading }
                    >
                        { __( 'Search', 'dmg-read-more' ) }
                    </Button>

                    <div className="dmg-search-results">
                        { isLoading && <Spinner /> }
                        { ! isLoading && searchResults.length === 0 && (
                            <p>{ __( 'No posts found.', 'dmg-read-more' ) }</p>
                        ) }
                        <ul>
                            { searchResults.map( ( post ) => (
                                <li key={ post.id }>
                                    <Button
                                        isLink
                                        onClick={ () => onSelectPost( post ) }
                                    >
                                        { post.title.rendered ||
                                            __( '(No Title)', 'dmg-read-more' ) }
                                    </Button>
                                </li>
                            ) ) }
                        </ul>
                    </div>

                    { ! isLoading && totalPages > 1 && (
                        <div className="dmg-pagination">
                            <Button
                                onClick={ () =>
                                    fetchPosts( currentPage - 1, searchTerm )
                                }
                                disabled={ currentPage === 1 }
                            >
                                { __( 'Previous', 'dmg-read-more' ) }
                            </Button>
                            <span>
								{ `Page ${ currentPage } of ${ totalPages }` }
							</span>
                            <Button
                                onClick={ () =>
                                    fetchPosts( currentPage + 1, searchTerm )
                                }
                                disabled={ currentPage === totalPages }
                            >
                                { __( 'Next', 'dmg-read-more' ) }
                            </Button>
                        </div>
                    ) }
                </PanelBody>
            </InspectorControls>

            <div { ...useBlockProps() }>
                { ! selectedPostId ? (
                    <p>{ __( 'Please select a post from the sidebar.', 'dmg-read-more' ) }</p>
                ) : (
                    <Disabled>
                        <p className="dmg-read-more">
                            { 'Read More: ' }
                            <a href={ selectedPostLink }>
                                { selectedPostTitle }
                            </a>
                        </p>
                    </Disabled>
                ) }
            </div>
        </>
    );
};

const Save = ( { attributes } ) => {
    const { selectedPostId, selectedPostTitle, selectedPostLink } = attributes;

    return (
        selectedPostId && (
            <p { ...useBlockProps.save( { className: 'dmg-read-more' } ) }>
                { 'Read More: ' }
                <a href={ selectedPostLink } rel="bookmark">
                    { selectedPostTitle }
                </a>
            </p>
        )
    );
};

registerBlockType( metadata.name, {
    edit: Edit,
    save: Save,
} );