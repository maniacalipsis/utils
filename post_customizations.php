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
                "supports"          =>["title","editor","excerpt","page-attributes","thumbnail"],
                "taxonomies"        =>["category"],
                //"query_var"=>true by WP default, that means it's equal to the $post_type_.
             ];
   $params_=array_replace_recursive($defaults,$params_);
   $params_["labels"]=$labels_;
   
   register_post_type($post_type_,$params_);
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
      add_action("save_post",[$this,"ajax_extra_media_save"],10,1);
      
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
   
   public function ajax_extra_media_save($post_id_)
   {
      //Called when post is to be saved.
      
      if (current_user_can("edit_post",$post_id_)&&!(wp_is_post_autosave($post_id_)||wp_is_post_revision($post_id_)))
         foreach ($this->metaboxes as $metabox)
            $metabox->save($post_id_);
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
   
   public function __construct($id_=null,$title_=null,MetaboxField $field_=null,$post_types_=null)
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
            $field_->key=$this->id;         //If metabox created with only one field, them its key and title may be omitted in the $field_ argument. However this shorthand doesn't denies to add more fields with different explicit keys and titles later.
         $this->add_field($field_);
      }
   }
   
   public function add_field($field_)
   {
      foreach ($this->post_types as $post_type) //Register meta for the own post types.
         $field_->register($post_type);
      
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
         $value=get_post_meta($post_->ID,$field->key,$field::SINGLE);
         $field->render($value);
      }
   }
   
   public function register($post_type_)
   {
      //Register matabox.
      
      if (in_array($post_type_,$this->post_types))   //Add metabox if it's intended to currently editing post type.
         add_meta_box($this->id,$this->title,[$this,"render"],$post_type_,$this->context,$this->priority);
   }
   
   public function save($post_id_)
   {
      //Should be called when post is to be saved.
      
      foreach ($this->fields as $field)
      {
         $value=arr_val($_POST,$field->key);
         //dump("^^^",$field->key,$value);
         if ($value!==null)
            update_post_meta($post_id_,$field->key,$field->on_save($value));  //The $_POST contents is depends on how do the renderer named the inputs. So callback $par["on_save"] must return a correct value from the entire $_POST.
         else
            delete_post_meta($post_id_,$field->key);
      }
   }
}

abstract class MetaboxField
{
   public $key="";
   public $title="";
   public $default="";
   public $params=[];
   protected const DATA_TYPE="string";
   public const SINGLE=true;
   
   public function __construct(array $params_=[])
   {
      //Read properties from constructor params:
      foreach ($params_ as $key=>$val)
         if (property_exists($this,$key))
            $this->{$key}=$val;
   }
   public function register($post_type_)
   {
      register_meta("post",$this->key,["object_subtype"=>$post_type_,"type"=>self::DATA_TYPE,"description"=>$this->title,"default"=>$this->default,"single"=>self::SINGLE/*,"show_in_rest"=>true*/]);   //TODO: "sanitize_callback" and "show_in_rest" might be subjects of update.
   }
   abstract public function render($val_);
   abstract public function on_save($val_);  //Returns [modified] $val_.
}

class MetaboxString extends MetaboxField
{
   public function render($val_)
   {
      $attrs=["type"=>"text","name"=>$this->key,"value"=>$val_]+$this->params;
      ?>
      <LABEL><SPAN><?=$this->title?></SPAN><INPUT<?=serialize_element_attrs($attrs)?>></LABEL>
      <?php
   }
   
   public function on_save($val_)
   {
      return $val_;
   }
}

class MetaboxText extends MetaboxString
{
   public function render($val_)
   {
      $attrs=["name"=>$this->key]+$this->params;
      ?>
      <LABEL><SPAN><?=$this->title?></SPAN><TEXTAREA <?=serialize_element_attrs($main_attrs+$this->misc_attrs)?>><?=htmlspecialchars($val_)?></TEXTAREA></LABEL>
      <?php
   }
}

class MetaboxRichText extends MetaboxText
{
   public function render($val_)
   {
      $wp_editor_params=["textarea_name"=>$this->key]+$this->params;
      ?>
      <LABEL><SPAN><?=$this->title?></SPAN><?=wp_editor($val_,$this->key,$wp_editor_params)?></LABEL>
      <?php
   }
}

class MetaboxInt extends MetaboxField
{
   protected const DATA_TYPE="integer";
   public function render($val_)
   {
      $attrs=["type"=>"number","name"=>$this->key,"value"=>$val_]+$this->params;
      ?>
      <LABEL><SPAN><?=$this->title?></SPAN><INPUT<?=serialize_element_attrs($attrs)?>></LABEL>
      <?php
   }
   public function on_save($val_)
   {
      return (int)$val_;
   }
}

class MetaboxFloat extends MetaboxInt
{
   protected const DATA_TYPE="number";
   public function on_save($val_)
   {
      return (float)$val_;
   }
}

class MetaboxBool extends MetaboxField
{
   protected const DATA_TYPE="boolean";
   public function render($val_)
   {
      $attrs=["type"=>"checkbox","name"=>$this->key,"checked"=>to_bool($val_)]+$this->params
      ?>
      <LABEL><SPAN><?=$this->title?></SPAN><INPUT<?=serialize_element_attrs($attrs)?>></LABEL>
      <?php
   }
   public function on_save($val_)
   {
      return to_bool($val_);
   }
}

class MetaboxJsonField extends MetaboxField
{
   public function on_save($val_)
   {
      return json_encode($val_,JSON_ENCODE_OPTIONS);
   }
   
   public function render($val_)
   {
      //This renderer may be called from the descendant classes to render the input.
      
      $attrs=["type"=>"hidden","name"=>$this->key,"value"=>$val_]+$this->params;
      ?>
      <INPUT<?=serialize_element_attrs($attrs)?>>
      <?php
   }
}

class MetaboxMedia extends MetaboxJsonField
{
   public function render($val_)
   {
      $container_id="extra_media_".$this->key;
      $list_params=[
                      "inputSelector"=>"#$container_id>input[type=hidden]",
                      "containerSelector"=>"#$container_id>.media_list",
                      "limit"=>arr_val($this->params,"limit",0),
                      "immediate"=>true,
                      "MediaSelectorParams"=>arr_val($this->params,"selector_params",["options"=>[]]),
                   ];
      $list_params_json=json_encode($list_params,JSON_ENCODE_OPTIONS);
      ?>
      <DIV ID="<?=$container_id?>">
         <INPUT TYPE="hidden" NAME="<?=$this->key?>" VALUE="<?=$val_?>">
         <DIV CLASS="media_list"></DIV>
         <SCRIPT>
            document.addEventListener('DOMContentLoaded',function(e_){let list=new MediaList(<?=$list_params_json?>);});
         </SCRIPT>
      </DIV>
      <?php
   }
}

?>