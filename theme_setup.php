<?php
/*==================================*/
/* Utilities plugin                 */
/* Copyright: FSG a.k.a ManiaC      */
/* Contact: imroot@maniacalipsis.ru */
/* License: GNU GPL v3              */
/*----------------------------------*/
/* WP Theme setup&settings classes  */
/*==================================*/

namespace Maniacalipsis\Utilities;

use \JSONAns;

class ThemeSetup
{
   public bool  $noindex=false;
   public array $theme_supports=["title-tag"=>true,"html5"=>['comment-list','comment-form','search-form','gallery','caption','script','style']];
   public array $page_supports=[];
   public array $post_supports=[];
   
   public array $menu_locations=[];
   
   public array $allowed_mimes=["svg"=>"image/svg+xml","webp"=>"image/webp"];
   public array $disallowed_mimes=[];
   
   public array $unwanted_public_styles=[];
   public array $unwanted_public_scripts=[];
   public array $unwanted_admin_styles=[];
   public array $unwanted_admin_scripts=[];
   
   //Format for (public|admin)_scripts and (public|admin)_styles: ["<id>"=>"uri",...].
   //Format for (public|admin)_script_(modules|module_imports): ["<id>"=>"uri","<id2>"=>["src"=>"<uri2>","deps"=>[...],"version"=>"1.0"],...], where array form contains arguments for WP_Script_Modules::register() and WP_Script_Modules::enqueue().
   //NOTE: Modules from (public|admin)_script_module_imports will appear in the importmap if (and only if) there is any enqueued module that refers them in their "deps" directly or indirectly.
   public array $public_styles=[];                    //Styles will be enqueued on public pages.
   public array $public_scripts=[];                   //Simple JS scripts will be enqueued on public pages.
   public array $public_script_module_imports=[];     //JS modules will be just registered for public pages.
   public array $public_script_modules=[];            //JS modules will be enqueued on public pages.
   public array $admin_styles=[];                     //Styles will be enqueued on admin pages.
   public array $admin_scripts=[];                    //Simple JS scripts will be enqueued on admin pages.
   public array $admin_script_module_imports=[];      //JS modules will be just registered for admin pages.
   public array $admin_script_modules=[];             //JS modules will be enqueued on admin pages.
   
   public bool  $remove_category_base=true;
   
   public readonly string $theme_uri;  //Current theme directory URI.
   public readonly string $plugin_uri; //This plugin directory URI.
   
   protected $required_plugins=["Utilities"=>"FSG a.k.a ManiaC"];
   
   protected array $actions_to_remove=[];
   protected array $actions_to_add=[];
   protected array $actions_deferred=[];
   
   protected array $settings_pages=[]; //Array of ThemeSettingsPage instances.
   
   public function __construct()
   {
      //NOTE: Unfortunatelly, PHP can't use $this and non constant expressions in properties declaration.
      
      $this->theme_url=get_stylesheet_directory_uri();
      $this->plugin_uri=plugins_url("",__FILE__);
      
      $this->actions_to_remove=[
                                  ["tag"=>"wp_head","callback"=>"rsd_link"],
                                  ["tag"=>"wp_head","callback"=>"wlwmanifest_link"],
                                  ["tag"=>"wp_head","callback"=>"wp_generator"],
                                  ["tag"=>"wp_head","callback"=>"print_emoji_detection_script","priority"=>7],   //Disable emoji.
                                  ["tag"=>"admin_print_scripts","callback"=>"print_emoji_detection_script"],     //
                                  ["tag"=>"wp_print_styles","callback"=>"print_emoji_styles"],                   //
                                  ["tag"=>"admin_print_styles","callback"=>"print_emoji_styles"],                //
                               ];
      $this->actions_to_add   =[
                                  ["tag"=>"wp_enqueue_scripts","callback"=>[$this,"enqueue_public_assets_callback"]],
                                  ["tag"=>"wp_head","callback"=>[$this,"wp_head_callback"]],
                                  ["tag"=>"admin_menu","callback"=>[$this,"init_admin_menu_callback"]],
                                  ["tag"=>"admin_head","callback"=>[$this,"admin_head_callback"]],
                                  ["tag"=>"after_setup_theme","callback"=>[$this,"init_settings_callback"]],
                               ];
      $this->actions_deferred =[
                                  ["tag"=>"plugin_action_links","callback"=>[$this,"plugin_actions_callback"],"argc"=>4],
                                  ["tag"=>"the_content","callback"=>"do_shortcode","priority"=>11],                //Enable shortcodes in content.
                               ];
      
      $this->public_script_module_imports=[
                                             "@maniacalipsis/utils/utils"=>$this->plugin_uri."/js_utils.js",
                                             "@maniacalipsis/utils/feedback"=>$this->plugin_uri."/feedback.js",
                                          ];
      
      $this->admin_styles=[
                             "@maniacalipsis/utils/admin_style"=>$this->plugin_uri."/admin.css",
                          ];
      $this->admin_script_module_imports=[
                                            "@maniacalipsis/utils/utils"=>$this->plugin_uri."/js_utils.js",
                                            "@maniacalipsis/utils/admin"=>$this->plugin_uri."/admin.js",
                                         ];
   }
   
   public function remove_action(string $tag_,array|string|callable $callback_,?int $priority_=null,?int $argc_=null):void
   {
      $was_found=false;
      //Try to find this action into the adding list:
      foreach ($this->actions_to_add as $i=>$action)
         if (($action["tag"]==$tag_)&&($action["callback"]==$callback_)&&(($action["priority"]??null)==$priority_)&&(($action["argc"]??null)==$argc_))
         {
            unset($this->actions_to_add[$i]);
            $was_found=true;
            break;
         }
      
      //If the action is builtin or thirdparty's then add it to removal list:
      if (!$was_found)
      {
         $act=["tag"=>$tag_,"callback"=>$callback_];
         if ($priority_!==null)
            $act["priority"]=$priority_;
         if ($argc_!==null)
            $act["argc"]=$argc_;
      }
      
      $this->actions_to_remove[]=$act;
   }
   
   public function add_action(string $tag_,array|string|callable $callback_,?int $priority_=null,?int $argc_=null):void
   {
      $act=["tag"=>$tag_,"callback"=>$callback_];
      if ($priority_!==null)
         $act["priority"]=$priority_;
      if ($argc_!==null)
         $act["argc"]=$argc_;
      
      $this->actions_to_add[]=$act;
   }
   
   public function require_plugin(string $name_,?string $author_=null):void
   {
      $this->required_plugins[$name_]=$author_;
   }
   
   public function add_settings_page(ThemeSettingsPage $settings_page_):void
   {
      $settings_page_->parent=$this;
      $this->settings_pages[]=$settings_page_;
   }
   
   public function setup():void
   {
      //Performs the admin page setup.
      //Call this after set all properties needed.
      
      //Add filters:
      add_filter("mime_types",[$this,"filter_allowed_mimes_callback"]);    //Allow/disallow to use specified mimes.
      add_filter("upload_mimes",[$this,"filter_allowed_mimes_callback"]);  //Allow/disallow to upload specified mimes.
      if ($this->remove_category_base)
         add_filter("category_link",[$this,"filter_category_link"],99);
      
      add_filter("run_wptexturize","__return_false"); //Disable content formatting. Reason: It ruins inline scripts by substutution of double quotes. (Also it does a lot of replacements with unexplored consequences.) Probably it's a WP's bug. See wp-includes/formatting.php

      //Remove actions:
      foreach ($this->actions_to_remove as $action)
         remove_action($action["tag"],$action["callback"],$action["priority"]??10); //WP's default action priority is 10,
      
      //Add actions:
      //TODO: Needs get synced with new API:
      //if (WP_DEBUG||$this->noindex)        //
      //   add_action("wp_head","noindex");  //NOTE: This action will set metatag robots noindex,nofollow.
         
      foreach ($this->actions_to_add as $action)
         add_action($action["tag"],$action["callback"],$action["priority"]??10,$action["argc"]??1); //WP's default action priority is 10, args count is 1.
   }
   
   //Callbacks
   public function filter_allowed_mimes_callback(array $mimes_):array
   {
      foreach ($this->allowed_mimes as $key=>$mime)
         $mimes_[$key]=$mime;
      
      foreach ($this->disallowed_mimes as $key=>$mime)
         if (key_exists($key,$mimes_))
            unset($mimes_[$key]);
      
      return $mimes_;
   }
   
   public function filter_category_link(string $link_str_):string
   {
      return str_replace("/category/","/",$link_str_);
   }
   
   public function enqueue_public_assets_callback():void
   {
      //Remove unwanted styles and scripts:
      foreach ($this->unwanted_public_styles as $asset_key)
         wp_dequeue_style($asset_key);
      
      foreach ($this->unwanted_public_scripts as $asset_key)
         wp_dequeue_script($asset_key);
      
      //Add public styles and scripts:
      $theme_url=get_stylesheet_directory_uri();
      
      foreach ($this->public_styles as $asset_key=>$asset_url)
         wp_enqueue_style($asset_key,(preg_match("/^http(s)?:/i",$asset_url) ? $asset_url : $theme_url.$asset_url));
      
      $wp_script_modules=wp_script_modules();
      foreach ($this->public_script_modules as $asset_key=>$asset_def)
         $wp_script_modules->enqueue($asset_key,...$this->unify_asset_definition($asset_def));
      
      foreach ($this->public_scripts as $asset_key=>$asset_url)
         wp_enqueue_script($asset_key,(preg_match("/^http(s)?:/i",$asset_url) ? $asset_url : $theme_url.$asset_url));
   }
   
   public function wp_head_callback():void
   {
      //Add importmap for js modules:
      //NOTE: WP's native JS modules API has dumb behaviour (actual for 6.8.2): 
      //       1) It sets aside all modules that are not mentioned (directly or indirectly) in the "deps" of enqueued ones. This ruins all idea of an importmap which is to let the browser to manage the loading of JS files. 
      //          Such behaviour is bug-prone and leads to occasional bugs when use inline script modules. If inline script module "A" imports something from module "B" in b.js (which is only registered but not enqueued) and no enqueued modules depends on "B" (directly or indirectly), then it will not appear in the importmap , so the "A" will fail to import from "B".
      //       2) It use wp_is_block_theme() to choose where to output the importmap: in the header or in the footer. Why a non-block themes was not honored to have an importmap in the header is completely beyond comprehension.
      $js_map=new JSONAns(["imports"=>[]]);
      foreach ($this->public_script_module_imports as $key=>$entry)
         $js_map["imports"][$key]=(is_array($entry) ? $entry["src"] : $entry);
      echo "\n<SCRIPT TYPE=\"importmap\">$js_map</SCRIPT>\n";
   }
   
   public function init_settings_callback():void
   {
      //Add deferred actions:
      foreach ($this->actions_deferred as $action)
         add_action($action["tag"],$action["callback"],$action["priority"]??10,$action["argc"]??1); //WP's default action priority is 10, args count is 1.
         
      //Tell about supported features:
      foreach ($this->theme_supports as $feature=>$formats)
         if ($formats)
            if (is_array($formats))
               add_theme_support($feature,$formats);
            else
               add_theme_support($feature);
               
      
      add_post_type_support("page",$this->page_supports);
      add_post_type_support("post",$this->post_supports);
      
      if ($this->menu_locations)
         register_nav_menus($this->menu_locations);
   }
   
   public function init_admin_menu_callback():void
   {
      //Remove unwanted styles and scripts:
      foreach ($this->unwanted_admin_styles as $asset_key)
         wp_dequeue_style($asset_key);
      
      foreach ($this->unwanted_admin_scripts as $asset_key)
         wp_dequeue_script($asset_key);
      
      //Add admin styles and scripts:
      $theme_url=get_stylesheet_directory_uri();
      
      foreach ($this->admin_styles as $asset_key=>$asset_url)
         wp_enqueue_style($asset_key,(preg_match("/^http(s)?:/i",$asset_url) ? $asset_url : $theme_url.$asset_url));
      
      $wp_script_modules=wp_script_modules();
      foreach ($this->admin_script_modules as $asset_key=>$asset_def)
         $wp_script_modules->enqueue($asset_key,...$this->unify_asset_definition($asset_def));
      
      foreach ($this->admin_scripts as $asset_key=>$asset_url)
         wp_enqueue_script($asset_key,(preg_match("/^http(s)?:/i",$asset_url) ? $asset_url : $theme_url.$asset_url));
      
      wp_enqueue_media();
      
      //Add settings pages:
      foreach ($this->settings_pages as $setting_page)
         $setting_page->setup();
   }
   
   public function admin_head_callback():void
   {
      //Add importmap for js modules:
      //NOTE: WP's native JS modules API has dumb behaviour (actual for 6.8.2): 
      //       1) It sets aside all modules that are not mentioned (directly or indirectly) in the "deps" of enqueued ones. This ruins all idea of an importmap which is to let the browser to manage the loading of JS files. 
      //          Such behaviour is bug-prone and leads to occasional bugs when use inline script modules. If inline script module "A" imports something from module "B" in b.js (which is only registered but not enqueued) and no enqueued modules depends on "B" (directly or indirectly), then it will not appear in the importmap , so the "A" will fail to import from "B".
      //       2) It use wp_is_block_theme() to choose where to output the importmap: in the header or in the footer. Why a non-block themes was not honored to have an importmap in the header is completely beyond comprehension.
      $js_map=new JSONAns(["imports"=>[]]);
      foreach ($this->admin_script_module_imports as $key=>$entry)
         $js_map["imports"][$key]=(is_array($entry) ? $entry["src"] : $entry);
      echo "\n<SCRIPT TYPE=\"importmap\">$js_map</SCRIPT>\n";
   }
   
   public function plugin_actions_callback(array $actions_,string $plugin_file_,array $plugin_data_,$context_):array
   {
      //Disable deactivation of the required plugins.
      
      if (key_exists($plugin_data_["Name"],$this->required_plugins)&&($this->required_plugins[$plugin_data_["Name"]]==$plugin_data_["Author"])   //Make a double check by Name and Author to ensure do not mismatch.
          &&key_exists("deactivate",$actions_))
         unset($actions_['deactivate']);
      
      return $actions_;
   }
   
   protected function unify_asset_definition(string|array $asset_def_):array
   {
      //Make asset definitions uniform and also makes their URI absolute.
      
      $res=(is_array($asset_def_) ? $asset_def_ : ["src"=>$asset_def_]);
      
      if (!preg_match("/^http(s)?:/i",$res["src"]))
         $res["src"]=$this->theme_url.$res["src"];
      
      return $res;
   }
}

class ThemeSettingsPage
{
   public ?ThemeSetup $parent=null;              //Parent ThemeSetup instance.
   
   protected array $sections=[];
   
   public function __construct(
      public string $key="",                       //Menu slug.
      public string $title="",                     //Page title (main).
      public string $menu_title="",                //Menu title (separate title for menu, by default equal to the main title).
      public string $parent_page="themes.php",     //Parent page slug.
      public string $permissions="manage_options", //User permissions required.
   )
   {
   }
   
   public function add_section(ThemeSettingsSection $section_):void
   {
      $section_->page=$this;
      $this->sections[]=$section_;
   }
   
   public function setup():void
   {
      //Performs the admin page setup.
      //Call this after set all properties needed.
      
      if ($this->menu_title)
         $this->menu_title=$this->title;
      
      add_submenu_page($this->parent_page,$this->menu_title,$this->title,$this->permissions,$this->key,[$this,"setup_callback"]);
      
      foreach ($this->sections as $section)
         $section->setup();
   }
   
   public function setup_callback():void
   {
      if (!current_user_can($this->permissions))
      wp_die("Не достаточно прав для изменения настроек.");
       
      ?>
         <FORM NAME="<?=$this->key?>" ACTION="options.php" METHOD="post">
      <?php
      submit_button();                   //Additional submit button at the top.
      settings_fields($this->key);       //Output hidden inputs ?for the settings registered?.
      do_settings_sections($this->key);  //Output setting sections.
      submit_button();                   //Output submit button.
      ?>
         </FORM>
      <?php
   }
}

class ThemeSettingsSection
{
   public $page=null;   //Parent ThemeSettingsPage.
   
   protected $fields=[];
   
   public function __construct(
      public $key="",      //Section ID.
      public $title="",    //Section title.
   )
   {
   }
   
   public function add_field(InputField $field_):void
   {
      $this->fields[]=$field_;
   }
   
   public function setup():void
   {
      //Performs the admin section setup.
      //NOTE: Must be called only by the page ThemeSettingsPage.
      
      add_settings_section($this->key,$this->title,[$this,"render_callback"],$this->page->key);
      
      foreach ($this->fields as $field)
      {
         add_settings_field($field->key,$field->title,[$field,"render"],$this->page->key,$this->key);
         register_setting($this->page->key,$field->key);
      }
   }
   
   public function render_callback():void
   {
      foreach ($this->fields as $field)
         $field->value=get_option($field->key,$field->default);
      ?><HR><?php
   }
}
?>