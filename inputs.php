<?php
/*==================================*/
/* Utilities plugin                 */
/* Copyright: FSG a.k.a ManiaC      */
/* Contact: imroot@maniacalipsis.ru */
/* License: GNU GPL v3              */
/*----------------------------------*/
/* Inputs handling classes          */
/*==================================*/

namespace Utilities;

abstract class InputField
{
   public $key="";
   public $title="";
   public $value=null;
   public $default="";
   public $attrs=[];
   public $is_required=false; //If this field required. Flag for the form validation. NOTE: Its because the REQUIRED attribute can't be used to make an alternative requirements.
   public $alt_required=[];   //Alternatively required fields.
   
   public function __construct(array $params_=[])
   {
      //Read properties from constructor params:
      foreach ($params_ as $key=>$val)
         if (property_exists($this,$key))
            $this->{$key}=$val;
   }
   
   public function get_data_type()
   {
      //Returns compatible data type (in particular for the function register_meta()).
      return "string";  //This is class-specific readonly value.
   }
   
   public function validate()
   {
      //Basic value validation.
      
      return !($this->is_required&&($this->value==""));
   }
   
   public function get_safe_value()
   {
      //Returns [properly modified] $value, safe for storing to DB or something else.
      return $this->value; //TODO: write the basic sanitizing.
   }
   
   abstract public function render();  //Returns an input's html.
   
   public function print()
   {
      //Outputs the value to any kind of document. 
      echo $this->get_safe_value();
   }
}

class InputHidden extends InputField
{
   public function render()
   {
      //This renderer may be called from the descendant classes to render the input.
      
      $attrs=["type"=>"hidden","name"=>$this->key,"value"=>$this->value]+$this->attrs;
      ?>
      <INPUT<?=serialize_element_attrs($attrs)?>>
      <?php
   }
}

class InputString extends InputField
{
   public function render()
   {
      $attrs=["type"=>"text","name"=>$this->key,"value"=>$this->value]+$this->attrs;
      ?>
      <LABEL CLASS="<?=$this->key?>"><SPAN><?=$this->title?></SPAN> <INPUT<?=serialize_element_attrs($attrs)?>></LABEL>
      <?php
   }
}

class InputPwd extends InputString
{
   public function render()
   {
      $attrs=["type"=>"password","name"=>$this->key,"value"=>$this->value]+$this->attrs;
      ?>
      <LABEL CLASS="<?=$this->key?>"><SPAN><?=$this->title?></SPAN> <INPUT<?=serialize_element_attrs($attrs)?>></LABEL>
      <?php
   }
}

class InputText extends InputString
{
   public function render()
   {
      $attrs=["name"=>$this->key]+$this->attrs;
      ?>
      <LABEL CLASS="<?=$this->key?>"><SPAN><?=$this->title?></SPAN> <TEXTAREA <?=serialize_element_attrs($main_attrs+$this->misc_attrs)?>><?=htmlspecialchars($this->value)?></TEXTAREA></LABEL>
      <?php
   }
}

class InputRichText extends InputText
{
   public function render()
   {
      $wp_editor_params=["textarea_name"=>$this->key]+$this->attrs;
      ?>
      <LABEL CLASS="<?=$this->key?>"><SPAN><?=$this->title?></SPAN><?=wp_editor($this->value,$this->key,$wp_editor_params)?></LABEL>
      <?php
   }
}

class InputFloat extends InputField
{
   public function get_data_type()
   {
      //Returns compatible data type (in particular for the function register_meta()).
      return "number";  //This is class-specific readonly value.
   }
   
   public function get_safe_value()
   {
      return (float)$this->value;
   }
   
   public function render()
   {
      $attrs=["type"=>"number","name"=>$this->key,"value"=>$this->value]+$this->attrs;
      ?>
      <LABEL CLASS="<?=$this->key?>"><SPAN><?=$this->title?></SPAN> <INPUT<?=serialize_element_attrs($attrs)?>></LABEL>
      <?php
   }
}

class InputInt extends InputFloat   //NOTE: THe int is more tight than the float.
{
   public function get_data_type()
   {
      //Returns compatible data type (in particular for the function register_meta()).
      return "integer";  //This is class-specific readonly value.
   }
   
   public function get_safe_value()
   {
      return (int)$this->value;
   }
}

class InputBool extends InputField
{
   public function get_data_type()
   {
      //Returns compatible data type (in particular for the function register_meta()).
      return "boolean";  //This is class-specific readonly value.
   }
   
   public function get_safe_value()
   {
      return to_bool($this->value);
   }
   
   public function render()
   {
      $attrs=["type"=>"checkbox","name"=>$this->key,"checked"=>to_bool($this->value)]+$this->attrs
      ?>
      <LABEL> CLASS="<?=$this->key?>"<SPAN><?=$this->title?></SPAN> <INPUT<?=serialize_element_attrs($attrs)?>></LABEL>
      <?php
   }
}

class InputJson extends InputHidden
{
   public function get_safe_value()
   {
      return $this->value; //TODO: Later, try to use something like try{ $res=json_encode(json_decode($this->value),JSON_ENCODE_OPTIONS); }....
   }
   
   public function print()
   {
      //Outputs the value to any kind of document. 
      echo json_encode(json_decode($this->value),JSON_ENCODE_OPTIONS|JSON_PRETTY_PRINT);
   }
}

class InputMedia extends InputJson
{
   public $limit=0;
   public $selector_params=["options"=>[]];
   
   public function render()
   {
      $container_id="extra_media_".$this->key;
      $list_params=[
                      "inputSelector"=>"#$container_id>input[type=hidden]",
                      "containerSelector"=>"#$container_id>.media_list",
                      "limit"=>$this->limit,
                      "immediate"=>true,
                      "MediaSelectorParams"=>$this->selector_params,
                   ];
      $list_params_json=json_encode($list_params,JSON_ENCODE_OPTIONS);
      parent::render();
      ?>
      <DIV ID="<?=$container_id?>" CLASS="media">
         <INPUT TYPE="hidden" NAME="<?=$this->key?>" VALUE="<?=$this->value?>">
         <DIV CLASS="list"></DIV>
         <SCRIPT>
            document.addEventListener('DOMContentLoaded',function(e_){let list=new MediaList(<?=$list_params_json?>);});
         </SCRIPT>
      </DIV>
      <?php
   }
}

class InputSelect extends InputField
{
   //TODO: This class actually can't support mulitple selection.
   public $variants=[];
   
   public function validate()
   {
      //Valid value must match the selection variants and, if required, must not be empty.
      return !($this->is_required&&($this->value!=""))&&key_exists($this->value,$this->variants);
   }
   
   public function get_safe_value()
   {
      return (key_exists($this->value,$this->variants) ? $this->value : $this->default);
   }
   
   public function render()
   {
      $attrs=["type"=>"checkbox","name"=>$this->key,"checked"=>to_bool($this->value)]+$this->attrs
      ?>
      <LABEL CLASS="<?=$this->key?>"><SPAN><?=$this->title?></SPAN> <SPAN CLASS="select"><?=html_select($this->key,$this->variants,$this->value,$attrs)?></SPAN></LABEL>
      <?php
   }
}


?>