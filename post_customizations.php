<?php
/*==================================*/
/* Utilities plugin                 */
/* Copyright: FSG a.k.a ManiaC      */
/* Contact: imroot@maniacalipsis.ru */
/* License: GNU GPL v3              */
/*----------------------------------*/
/* Custom posts metaboxes           */
/*==================================*/

namespace Utilities;

function custom_post_labels($plural_,$nominative_,$accusative_,$genitive_,$menu_="")
{
   $menu_=($menu_ ? $menu_ : $plural_);
   return [
            "name"              =>$plural_,
            "singular_name"     =>$nominative_,
            "add_new"           =>"Добавить $accusative_",
            "add_new_item"      =>"Добавить $accusative_",
            "edit_item"         =>"Редактировать $accusative_",
            "new_item"          =>"Новая запись",
            "view_item"         =>"Посмотреть $accusative_",
            "search_items"      =>"Найти $accusative_",
            "not_found"         =>mb_ucfirst("$genitive_ не найдено"),
            "not_found_in_trash"=>"Нет $genitive_ в корзине",
            "parent_item_colon" =>"",
            "menu_name"         =>$menu_
          ];
}

function custom_taxonomy_labels($plural_,$nominative_,$accusative_,$genitive_,$menu_="")
{
   $menu_=($menu_ ? $menu_ : $plural_);
   return [
            "name"              =>$plural_,
            "singular_name"     =>$nominative_,
            "add_new"           =>"Добавить $accusative_",
            "add_new_item"      =>"Добавить $accusative_",
            "edit_item"         =>"Редактировать $accusative_",
            "update_item"       =>"Обновить $accusative_",
            "new_item_name"     =>"Новая категория",
            "view_item"         =>"Посмотреть $accusative_",
            "search_items"      =>"Найти $accusative_",
            "all_items"         =>"Все $plural_",
            "not_found"         =>mb_ucfirst("$genitive_ не найдено"),
            "parent_item"       =>"Parent $nominative_",
            "parent_item_colon" =>"",
            "menu_name"         =>$menu_,
            "back_to_items"     => "← К списку",
          ];
}

function register_custom_post($post_type_,$labels_,$params_=[])
{
   $defaults=[
                "public"            =>true,
                "show_in_rest"      =>true,  //IMPORTANT! Guttenberg and some sidebar panels (featured image in particular) will not work properly if "show_in_rest" isn't set true.
                "rewrite"           =>true,
                "capability_type"   =>"post",
                "hierarchical"      =>false,
                "menu_position"     =>5,
                "menu_icon"         =>"dashicons-format-aside",
                "supports"          =>["title","editor","excerpt","page-attributes","thumbnail","custom-fields"],  //Full list of standard features: "title","editor","author","thumbnail","excerpt","trackbacks","custom-fields","comments","revisions","page-attributes","post-formats".
                //"query_var"=>true by WP default, that means it's equal to the $post_type_.
             ];
   $params_=array_merge_recursive($defaults,$params_);
   $params_["labels"]=$labels_;
   
   register_post_type($post_type_,$params_);
}

function register_custom_taxonomy($tax_type_,$object_types_,$labels_,$params_=[])
{
   $defaults=[
                "label"            =>"",     //Defaults to $labels_["name"].
                "description"      =>"",
                "public"           =>true,
                "hierarchical"     =>true,   //If true, will appear as checkboxees on the associated posts edit pages.
                "rewrite"          =>true,
                "capabilities"     =>[],
                "meta_box_cb"      =>null,   //Metabox html. callback: `post_categories_meta_box` or `post_tags_meta_box`. false — metabox is off.
                "show_admin_column"=>false,  //Autocreation if taxonomy column in the table of associated post type (since v3.5).
                "show_in_rest"     =>true,   //Add to REST API (will appear on the associated posts edit pages).
	          ];
   $params_=array_merge_recursive($defaults,$params_);
   $params_["labels"]=$labels_;
   
   register_taxonomy($tax_type_,$object_types_,$params_);
}

class MetaboxManager
{
   //Managing a metaboxes. In exact, it call their register() and save() methods at the right time.
   //Usage:
   // new MetaboxManager(new Metabox(....));
   // or
   // $mm=new MetaboxManager();
   // $mm->add(new Metabox(....));
   // $mm->add(new Metabox(....));
   // ...
   
   protected $metaboxes=[];
   
   public function __construct($metabox_=null)
   {
      //NOTE: Call at init action.
      
      //Register metaboxes factory:
      add_action("add_meta_boxes",[$this,"add_meta_boxes_callback"],10,2);
      
      //Register ajax requets handlers:
      add_action("save_post",[$this,"ajax_extra_media_save"],10,3);
      
      //Add initial metabox:
      if ($metabox_)
         $this->add($metabox_);
   }
   
   public function add($metabox_)
   {
      //Adds a metabox and a meta key. End-user method.
      //NOTE: Call at init action.
      
      $this->metaboxes[]=$metabox_;
   }
   
   public function add_meta_boxes_callback($post_type_,$post_)
   {
      //Adds a metaboxes.
      
      foreach ($this->metaboxes as $metabox)
         $metabox->register($post_type_);
   }
   
   public function ajax_extra_media_save($post_id_,$post_,$is_update_)
   {
      //Called when post is to be saved.
      
      if (current_user_can("edit_post",$post_id_)&&!(wp_is_post_autosave($post_id_)||wp_is_post_revision($post_id_)))
         foreach ($this->metaboxes as $metabox)
            if (in_array($post_->post_type,$metabox->post_types)) //This check made for the case if the one manager is used to add metaboxes to the many post types.
               $metabox->save($post_id_,$post_,$is_update_);
   }
}

class Metabox
{
   //Creates a metabox.
   //Usage:
   // $metaboxes->add(new Metabox("my_box","My box",new MetaboxText(["default"=>"nothing here yet"]),["page","post"]));
   // or
   // $metabox=new Metabox("meta_tags","Meta tags",null,["page"]);
   // $metabox->add_field(["key"=>"description","title"=>"Description"]);
   // $metabox->add_field(["key"=>"keywords","title"=>"Keywords"]);
   // $metaboxes->add($metabox);
   
   public $id="";
   public $title="";
   public $post_types=["post"];
   public $context="side";          //Where the metabox will be placed: "normal", "advanced" or "side".
   public $priority="default";      //Metabox position priority: "default", "high", "low"or "core".
   protected $fields=[];
   
   public function __construct($id_=null,$title_=null,InputField $field_=null,$post_types_=null)
   {
      ////Register metaboxes factory:
      //add_action("add_meta_boxes",[$this,"add_meta_boxes"],10,2);
      //
      ////Register ajax requets handlers:
      //add_action("save_post",[$this,"ajax_extra_media_save"]);
      //
      //reg meta data
      if ($id_)
         $this->id=$id_;
      if ($title_)
         $this->title=$title_;
      if ($post_types_)
         $this->post_types=$post_types_;
      if ($field_)
      {
         if (!$field_->key)
            $field_->key=$this->id;  //If metabox created with only one field, them its key and title may be omitted in the $field_ argument. However this shorthand doesn't denies to add more fields with different explicit keys and titles later.
         $this->add_field($field_);
      }
   }
   
   public function add_field(InputField $field_)
   {
      foreach ($this->post_types as $post_type) //Register meta for the own post types.
         register_meta("post",$field_->key,["object_subtype"=>$post_type,"type"=>$field_->get_data_type(),"description"=>$field_->title,"default"=>$field_->default,"single"=>true]);   //TODO: "sanitize_callback" and "show_in_rest" might be subjects of update.
      
      $this->fields[]=$field_;
   }
   
   public function render($post_,$metabox_params_)
   {
      //Almost universal metabox renderer.
      //TODO: Some of functional here seems expensive. It should be optimized after getting of enough usage experience.
      //dump("!!!",$post_,$metabox_params_);
      foreach ($this->fields as $field)
      {
         //dump("???",$post_->ID,$field->key,$value);
         $field->value=get_post_meta($post_->ID,$field->key,/*single=*/true);
         $field->render($post_);
      }
   }
   
   public function register($post_type_)
   {
      //Register matabox.
      
      if (in_array($post_type_,$this->post_types))   //Add metabox if it's intended to currently editing post type.
         add_meta_box($this->id,$this->title,[$this,"render"],$post_type_,$this->context,$this->priority);
   }
   
   public function save($post_id_,$post_,$is_update_)
   {
      //Should be called when post is to be saved.
      
      foreach ($this->fields as $field)
         if (key_exists($field->key,$_POST)) //Don't touch the field if it isn't sent from client.
         {
            $field->value=$_POST[$field->key]??null;
            if ($field->value!==null)
               update_post_meta($post_id_,$field->key,$field->get_safe_value());  //The $_POST contents is depends on how do the renderer named the inputs. So callback $par["on_save"] must return a correct value from the entire $_POST.
            else
               delete_post_meta($post_id_,$field->key);
         }
   }
}

?>