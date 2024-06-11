<?php
/*
Plugin Name: Playgorund Markdown loader
Description: A plugin that loads markdown files into WordPress
Version: 1.0
Author: WordPress community
*/

function playground_markdown_scripts() {
    wp_register_script('playground-markdown', plugin_dir_url(__FILE__) . 'playground-markdown.js', array('wp-api', 'wp-blocks'));
    $dir = '/wordpress/wp-content/uploads/markdown';
    $files = array();
    function scan_directory($dir) {
        $files = array();

        if (is_dir($dir)) {
            $dh = opendir($dir);
            while (($file = readdir($dh)) !== false) {
                if ($file != "." && $file != "..") {
                    $filePath = $dir . '/' . $file;
                    if (is_dir($filePath)) {
                        $nestedFiles = scan_directory($filePath);
                        $files = array_merge($files, $nestedFiles);
                    } elseif (str_ends_with(strtolower($file), '.md')) {
                        // Check if the file is already in the database
                        // $post = get_page_by_title($file, OBJECT, 'post');
                        // if ($post) {
                        //     continue;
                        // }

                        $files[] = array(
                            'path' => $filePath,
                            'name' => $file,
                            'content' => file_get_contents($filePath),
                        );
                    }
                }
            }
            closedir($dh);
        }

        return $files;
    }

    $files = scan_directory($dir);
    $data = array(
      'markdown' => $files
    );
    wp_localize_script('playground-markdown', 'playgroundMarkdown', $data);
    wp_enqueue_script('playground-markdown');

    wp_enqueue_style('playground-markdown', plugin_dir_url(__FILE__) . 'playground-markdown.css');
}
add_action('wp_enqueue_scripts', 'playground_markdown_scripts');


function playground_markdown_loader($classes) {
    $classes[] = 'playground-markdown-loading';
    return $classes;
}
add_filter('body_class', 'playground_markdown_loader');


// @TODO This is unsafe and shouldn't be used outside of Playground at this point.
function playground_register_rest_endpoint() {
    register_rest_route('wp/v2', 'page-hierarchy', array(
        'methods' => 'POST',
        'callback' => 'playground_handle_rest_request',
        'permission_callback' => '__return_true',
    ));
}
add_action('rest_api_init', 'playground_register_rest_endpoint');

function playground_handle_rest_request($request) {
    // Handle the REST request here
    create_db_pages($request->get_params()['pages']);

    // Example response
    $response = array(
        'message' => 'Endpoint called successfully',
    );

    return rest_ensure_response($response);
}

function create_db_pages($pages)
{
    $by_path = [];
    foreach($pages as $page) {
        $by_path[$page['path']] = $page;
    }
    sortByKeyLengthAndReadme($by_path);

    $ids_by_path = [];
    foreach($pages as $page) {
        $parent_path = dirname($page['path']) . '/README.md';
        if (isset($ids_by_path[$parent_path])) {
            $parent_id = $ids_by_path[$parent_path];
        } else {
            $parent_id = null;
        }
        $ids_by_path[$page['path']] = create_db_page($page, $parent_id);
    }
}

function create_db_page($page, $parent_id=null) {
    $post_id = wp_insert_post(array(
        'post_title' => $page['name'],
        'post_content' => $page['content'],
        'post_status' => 'publish',
        'post_type' => 'page',
        'post_parent' => $parent_id,
        'post_author' => get_current_user_id(),
    ));

    if (is_wp_error($post_id)) {
        return;
    }

    $post = get_post($post_id);
    $post->post_name = sanitize_title($page['name']);
    wp_update_post($post);
    return $post_id;
}

function sortByKeyLengthAndReadme(&$array) {
    // Step 1: Extract the keys and sort them
    $keys = array_keys($array);

    usort($keys, function($a, $b) {
        // Bubble README.md to the top within the same directory
        if (basename($a) === 'README.md') return -1;
        if (basename($b) === 'README.md') return 1;
        
        // Sort by key length
        return strlen($a) <=> strlen($b);
    });

    // Step 2: Re-create the array with sorted keys
    $sorted = [];
    foreach ($keys as $key) {
        $sorted[$key] = $array[$key];
    }

    $array = $sorted;
}
