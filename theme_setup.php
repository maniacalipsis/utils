<?php
/*==================================*/
/* Utilities plugin                 */
/* Copyright: FSG a.k.a ManiaC      */
/* Contact: imroot@maniacalipsis.ru */
/* License: GNU GPL v3              */
/*----------------------------------*/
/* WP Theme setup&settings classes  */
/*==================================*/

namespace Utilities;

class ThemeSetup
{
   public $noindex=false;
   public $theme_supports=["title-tag"=>true,"html5"=>true];
   public $page_supports=[];
   public $post_supports=[];
   
   public $allowed_mimes=["svg"=>"image/svg+xml"];
   public $disallowed_mimes=[];
   
   public $unwanted_public_styles=[];
   public $unwanted_public_scripts=[];
   public $unwanted_admin_styles=[];
   public $unwanted_admin_scripts=[];
   
   public $public_styles=[];
   public $public_scripts=[];
   public $admin_styles=[];
   public $admin_scripts=[];
   
   public $remove_category_base=true;
   
   protected $required_plugins=["Utlilties"=>"FSG a.k.a ManiaC"];
   
   protected $actions_to_remove=null;
   protected $actions_to_add=null;
   protected $actions_deferred=null;
   
   protected $settings_pages=[]; //Array of ThemeSettingsPage instances.
   
   public function __construct()
   {
      //NOTE: Unfortubatelly, PHP can't use $this in properties declaration.
      $this->actions_to_remove=[
         ["tag"=>"wp_head","callback"=>"rsd_link"],
         ["tag"=>"wp_head","callback"=>"wlwmanifest_link"],
         ["tag"=>"wp_head","callback"=>"wp_generator"],
         ["tag"=>"wp_head","callback"=>"print_emoji_detection_script","priority"=>7],   //Disable emoji.
         ["tag"=>"admin_print_scripts","callback"=>"print_emoji_detection_script"],     //
         ["tag"=>"wp_print_styles","callback"=>"print_emoji_styles"],                   //
         ["tag"=>"admin_print_styles","callback"=>"print_emoji_styles"],                //
      ];
      $this->actions_to_add=[
         ["tag"=>"wp_enqueue_scripts","callback"=>[$this,"enqueue_public_assets_callback"]],
         ["tag"=>"admin_menu","callback"=>[$this,"init_admin_menu_callback"]],
         ["tag"=>"after_setup_theme","callback"=>[$this,"init_settings_callback"]],
      ];
      $this->actions_deferred=[
         ["tag"=>"plugin_action_links","callback"=>[$this,"plugin_actions_callback"],"argc"=>4],
         ["tag"=>"the_content","callback"=>"do_shortcode","priority"=>11],                //Enable shortcodes in content.
      ];
   }
   
   public function remove_action($tag_,$callback_,$priority_=null,$argc_=null)
   {
      $was_found=false;
      //Try to find this action into the adding list:
      foreach ($this->actions_to_add as $i=>$action)
         if (($action["tag"]==$tag_)&&($action["callback"]==$callback_)&&(arr_val($action,"priority")==$priority_)&&(arr_val($action,"argc")==$argc_))
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
   
   public function add_action($tag_,$callback_,$priority_=null,$argc_=null)
   {
      $act=["tag"=>$tag_,"callback"=>$callback_];
      if ($priority_!==null)
         $act["priority"]=$priority_;
      if ($argc_!==null)
         $act["argc"]=$argc_;
      
      $this->actions_to_add[]=$act;
   }
   
   public function require_plugin($name_,$author_=null)
   {
      $this->required_plugins[$name_]=$author_;
   }
   
   public function add_settings_page(/*ThemeSettingsSection*/ $settings_page_)
   {
      $settings_page_->parent=$this;
      $this->settings_pages[]=$settings_page_;
   }
   
   public function setup()
   {
      //Performs the admin page setup.
      //Call this after set all properties needed.
      
      //Add filters:
      add_filter("upload_mimes",[$this,"filter_allowed_mimes_callback"]);  //Allow/disallow specified mimes.
      if ($this->remove_category_base)
         add_filter("category_link",[$this,"filter_category_link"],99);
      
      //Remove actions:
      foreach ($this->actions_to_remove as $action)
         remove_action($action["tag"],$action["callback"],arr_val($action,"priority",10)); //WP's default action priority is 10,
      
      //Add actions:
      if (WP_DEBUG||$this->noindex)        //
         add_action("wp_head","noindex");  //NOTE: This action will set metatag robots noindex,nofollow.
         
      foreach ($this->actions_to_add as $action)
         add_action($action["tag"],$action["callback"],arr_val($action,"priority",10),arr_val($action,"argc",1)); //WP's default action priority is 10, args count is 1.
   }
   
   //Callbacks
   public function filter_allowed_mimes_callback($mimes_)
   {
      foreach ($this->allowed_mimes as $key=>$mime)
         $mimes_[$key]=$mime;
      
      foreach ($this->disallowed_mimes as $key=>$mime)
         if (key_exists($key,$mimes_))
            unset($mimes_[$key]);
      
      return $mimes_;
   }
   
   public function filter_category_link($link_str_)
   {
      return str_replace("/category/","/",$link_str_);
   }
   
   public function enqueue_public_assets_callback()
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
      
      foreach ($this->public_scripts as $asset_key=>$asset_url)
         wp_enqueue_script($asset_key,(preg_match("/^http(s)?:/i",$asset_url) ? $asset_url : $theme_url.$asset_url));
   }
   
   public function init_settings_callback()
   {
      //Add deferred actions:
      foreach ($this->actions_deferred as $action)
         add_action($action["tag"],$action["callback"],arr_val($action,"priority",10),arr_val($action,"argc",1)); //WP's default action priority is 10, args count is 1.
         
      //Tell about supported features:
      foreach ($this->theme_supports as $feature=>$formats)
         if ($formats)
            if (is_array($formats))
               add_theme_support($feature,$formats);
            else
               add_theme_support($feature);
               
      
      add_post_type_support("page",$this->page_supports);
      add_post_type_support("post",$this->post_supports);
   }
   
   public function init_admin_menu_callback()
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
      
      foreach ($this->admin_scripts as $asset_key=>$asset_url)
         wp_enqueue_script($asset_key,(preg_match("/^http(s)?:/i",$asset_url) ? $asset_url : $theme_url.$asset_url));
      
      wp_enqueue_media();
      
      //Add settings pages:
      foreach ($this->settings_pages as $setting_page)
         $setting_page->setup();
   }
   
   public function plugin_actions_callback($actions_,$plugin_file_,$plugin_data_,$context_)
   {
      //Disable deactivation of the required plugins.
      
      if (key_exists($plugin_data_["Name"],$this->required_plugins)&&($this->required_plugins[$plugin_data_["Name"]]==$plugin_data_["Author"])   //Make a double check by Name and Author to ensure do not mismatch.
          &&key_exists("deactivate",$actions_))
         unset($actions_['deactivate']);
      
      return $actions_;
   }
}

class ThemeSettingsPage
{
   public $key="";                        //Menu slug.
   public $title="";                      //Page title (main).
   public $menu_title="";                 //Menu title (separate title for menu, by default equal to the main title).
   public $parent_page="themes.php";      //Parent page slug.
   public $permissions="manage_options";  //User permissions required.
   public $parent=null;                   //Parent ThemeSetup.
   
   protected $sections=[];
   
   public function __construct($key_,$title_,$menu_title_=null,$parent_page_=null,$permissions_=null)
   {
      $this->key=$key_;
      $this->title=$title_;
      if ($menu_title_) $this->menu_title=$menu_title_;
      if ($parent_page_) $this->parent_page=$parent_page_;
      if ($permissions_) $this->permissions=$permissions_;
   }
   
   public function add_section(/*ThemeSettingsSection*/ $section_)
   {
      $section_->page=$this;
      $this->sections[]=$section_;
   }
   
   public function setup()
   {
      //Performs the admin page setup.
      //Call this after set all properties needed.
      
      if ($this->menu_title)
         $this->menu_title=$this->title;
      
      add_submenu_page($this->parent_page,$this->menu_title,$this->title,$this->permissions,$this->key,[$this,"setup_callback"]);
      
      foreach ($this->sections as $section)
         $section->setup();
   }
   
   public function setup_callback()
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
   public $key="";     	//Section ID.
   public $title="";    //Section title.
   public $page=null;   //Parent ThemeSettingsPage.
   
   protected $fields=[];
   
   public function __construct($key_,$title_)
   {
      $this->key=$key_;
      $this->title=$title_;
   }
   
   public function add_field(/*AbstractThemeSettingsField*/ $field_)
   {
      $field_->section=$this;
      $this->fields[]=$field_;
   }
   
   public function setup()
   {
      //Performs the admin section setup.
      //NOTE: Must be called only by the page ThemeSettingsPage.
      
      add_settings_section($this->key,$this->title,[$this,"render_callback"],$this->page->key);
      
      foreach ($this->fields as $field)
         $field->setup();
   }
   
   public function render_callback()
   {
      ?><HR><?php
   }
}

abstract class AbstractThemeSettingsField
{
   public $key="";         //Field ID.
   public $title="";       //Field title.
   public $section=null;   //Parent ThemeSettingsSection.
   public $type="text";    //Input type.
   public $default="";     //Default value.
   public $misc_attrs=[];  //Other input attributes.
   
   public function __construct($key_,$title_,$type_=null,$default_=null,$misc_attrs_=null)
   {
      $this->key=$key_;
      $this->title=$title_;
      if ($type_) $this->type=$type_;
      if ($default_) $this->default=$default_;
      if ($misc_attrs_) $this->misc_attrs=$misc_attrs_;
   }
   
   public function setup()
   {
      add_settings_field($this->key,$this->title,[$this,"render_callback"],$this->section->page->key,$this->section->key);
      register_setting($this->section->page->key,$this->key);
   }
   
   abstract public function render_callback();
}

class ThemeSettingsField extends AbstractThemeSettingsField
{
   public function render_callback()
   {
      $main_attrs=[
                     "type"=>$this->type,
                     "name"=>$this->key,
                  ];
      $value=get_option($this->key,$this->default);
      
      switch ($this->type)
      {
         case "richtext":
         {
            echo wp_editor($value,$this->key,["textarea_name"=>$this->key]+$this->misc_attrs);
            break;
         }
         case "textarea":
         {
            ?>
            <TEXTAREA<?=serialize_element_attrs($main_attrs+$this->misc_attrs)?>><?=htmlspecialchars($value)?></TEXTAREA>
            <?php
            break;
         }
         case "checkbox":
         case "radio":     //NOTE: radio is accounted, but just as far as it has the same format as the checkbox. However it's task for the separate class to render an option sets.
         {
            $main_attrs["checked"]=to_bool($value);
            ?>
            <INPUT<?=serialize_element_attrs($main_attrs+$this->misc_attrs)?>>
            <?php
            break;
         }
         default:
         {
            $main_attrs["value"]=$value;
            ?>
            <INPUT<?=serialize_element_attrs($main_attrs+$this->misc_attrs)?>>
            <?php
         }
      }
   }
}
?>