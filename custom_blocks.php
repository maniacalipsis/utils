<?php
/*==================================*/
/* Utilities plugin                 */
/* Copyright: FSG a.k.a ManiaC      */
/* Contact: imroot@maniacalipsis.ru */
/* License: GNU GPL v3              */
/*----------------------------------*/
/* Custom blocks for Guttenberg     */
/*==================================*/

namespace Utilities;

add_action( 'init', function() {
$args = [
'public' => true,
'label' => 'News',
'show_in_rest' => true,
'template_lock' => 'all',
'template' => [
[ 'core/paragraph', [
'placeholder' => 'Breaking News',
] ],
[ 'core/image', [
'align' => 'right',
] ],
],
];
register_post_type( 'news', $args );
} );

?>