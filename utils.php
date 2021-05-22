<?php
/*
Plugin Name: Utlilties
Description: Set of theme setup and utility functions.
Version: 2.0
Author: FSG a.k.a ManiaC
Author URI: http://maniacalipsis.ru/
Plugin URI:
*/

namespace Utilities\Init;

define("JSON_ENCODE_OPTIONS",JSON_HEX_APOS|JSON_HEX_QUOT|JSON_PARTIAL_OUTPUT_ON_ERROR);

require_once(__DIR__."/functions.php");            //Utilities.
require_once(__DIR__."/post_customizations.php");  //Custom posts metaboxes.
require_once(__DIR__."/theme_setup.php");          //Theme setup clases.
require_once(__DIR__."/shortcodes.php");           //Set of the most commonly used shortcodes.

function plugin_init()
{
   //Common utility scripts for both of front and back ends:
   wp_enqueue_script("js_utils",plugins_url("/js_utils.js",__FILE__));
   
   //Backend-specific utils:
   if (is_admin())
   {
      wp_enqueue_script("admin_utils",plugins_url("/admin.js",__FILE__));
      wp_enqueue_style("admin_utils",plugins_url("/admin.css",__FILE__));
   }      
}
add_action("init",__NAMESPACE__."\\plugin_init");
?>