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
   public $default="";
   public $attrs=[];
   protected $value=null;
   
   public function __construct(array $params_=[])
   {
      //Read properties from constructor params:
      foreach ($params_ as $key=>$val)
         if (property_exists($this,$key))
            $this->{$key}=$val;
   }
   
   public function get_is_required()
   {
      //returns if the field id required.
      return to_bool(arr_val($this->attrs,"required"));
   }
   
   public function validate()
   {
      //Basic value validation.
      
      return !($this->get_is_required()&&($this->value==""));
   }
   
   public function set_value($val_)
   {
      //Usually, directly assigns $val_ to the value.
      $this->value=$val_;
   }
   
   public function get_value()
   {
      //Returns [properly modified] $value.
      return $this->value;
   }
   
   abstract public function render();  //Returns an input's html.
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

class InputInt extends InputField
{
   public function render()
   {
      $attrs=["type"=>"number","name"=>$this->key,"value"=>$this->value]+$this->attrs;
      ?>
      <LABEL CLASS="<?=$this->key?>"><SPAN><?=$this->title?></SPAN> <INPUT<?=serialize_element_attrs($attrs)?>></LABEL>
      <?php
   }
}

class InputFloat extends InputInt
{
   public function get_value()
   {
      return (float)$this->value;
   }
}

class InputBool extends InputField
{
   public function render()
   {
      $attrs=["type"=>"checkbox","name"=>$this->key,"checked"=>to_bool($this->value)]+$this->attrs
      ?>
      <LABEL> CLASS="<?=$this->key?>"<SPAN><?=$this->title?></SPAN> <INPUT<?=serialize_element_attrs($attrs)?>></LABEL>
      <?php
   }
   public function get_value()
   {
      return to_bool($this->value);
   }
}

class InputJsonField extends InputField
{
   public function get_value()
   {
      return json_encode($this->value,JSON_ENCODE_OPTIONS);
   }
   
   public function render()
   {
      //This renderer may be called from the descendant classes to render the input.
      
      $attrs=["type"=>"hidden","name"=>$this->key,"value"=>$this->value]+$this->attrs;
      ?>
      <INPUT<?=serialize_element_attrs($attrs)?>>
      <?php
   }
}

class InputMedia extends InputJsonField
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


?>