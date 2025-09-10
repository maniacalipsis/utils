<?php
/*
Plugin Name: Utilities
Description: Set of theme setup and utility functions.
Version: 3.1
Author: FSG a.k.a ManiaC
Author URI: http://maniacalipsis.ru/
Plugin URI:
*/

namespace Maniacalipsis\Utilities;

define("JSON_ENCODE_OPTIONS",JSON_HEX_APOS|JSON_HEX_QUOT|JSON_UNESCAPED_UNICODE|JSON_PARTIAL_OUTPUT_ON_ERROR);    //Options for json_encode(). See PHP man pages for details.
define("JSON_DECODE_OPTIONS",JSON_OBJECT_AS_ARRAY|JSON_THROW_ON_ERROR);                                           //Options for json_decode(). See PHP man pages for details. NOTE: Flag JSON_OBJECT_AS_ARRAY is mandatory, dismissing it will result many engine's methods fail to operate.
define("JSON_MAX_DEPTH",512);                                                                                     //Allows to raise (or lower) default PHP's value of the depth argument of json_encode() and json_decode(). The PHP's default is 512.
define("DB_CONSTANTS",["NULL","TRUE","FALSE","CURRENT_TIMESTAMP","CURRENT_DATE","CURRENT_TIME","LOCALTIME","LOCALTIMESTAMP","UTC_DATE","UTC_TIME","UTC_TIMESTAMP"]);

require_once(__DIR__."/utils.php");                //Utilities from ThePatternEngine. (Actually it's a copy of /core/utils.php)
require_once(__DIR__."/utils_wp.php");             //Additional utilities.
require_once(__DIR__."/inputs.php");               //Input fields handling.
require_once(__DIR__."/post_customizations.php");  //Custom posts metaboxes.
require_once(__DIR__."/menu_customizations.php");  //Custom rendering of menu.
require_once(__DIR__."/theme_setup.php");          //Theme setup clases.
require_once(__DIR__."/blocks.php");               //Collection of helper functions and classes for blocks rendering.
require_once(__DIR__."/captcha.php");              //Text captcha for feedback forms.

if (version_compare(phpversion(),"8.4.0","<"))     //This is a tempopary solution for extending compartibility 
   require_once("utils.prior-to-phpv8.4.php");     // with older versions of PHP (until they are not tool old yet).

spl_autoload_register(__NAMESPACE__."\\ClassesAutoloader::callback");

//TODO: Following code has no more use and was left as template.
//function plugin_init()
//{
//   //Common utility scripts for both of front and back ends:
//   
//   //Backend-specific utils:
//   if (is_admin())
//   {
//      //Nothing to do.
//   }
//   else
//   {
//      //Nothing to do.
//   }
//}
//add_action("init",__NAMESPACE__."\\plugin_init");
?>