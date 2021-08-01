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

class DataField
{
   //Minimal class for making data compatible with the inputs classes.
   //NOTE: The DataField doesn't retrieves or stores its value by itself because this mechanism is usage-dependent and needs to be external.
   //      So it just lets its owner to retrieve/store the data in a right way,  using its property 'key' and setting/getting its property 'value'.
   
   public $key="";
   public $value=null;
   
   public function __construct(array $params_=[])
   {
      //Read properties from constructor params:
      foreach ($params_ as $key=>$val)
         if (property_exists($this,$key))
            $this->{$key}=$val;
   }
   
   public function get_safe_value()
   {
      //Returns [properly modified] $value, safe for storing to DB or something else.
      return htmlspecialchars($this->value);
   }
}

abstract class InputField extends DataField
{
   //Base class for various input fields.
   
   public $title="";
   public $default="";
   public $attrs=[];
   public $required=false; //If this field required. Flag for the form validation. NOTE: Its because the REQUIRED attribute can't be used to make an alternative requirements.
   public $group="";          //Name of the group of the alternatively required fields. If "", then the field is required without alternatives. NOTE: there is no sense to set this property for the optional fields.
   public $errors=[];         //The field's validate() puts error messages here, while the form's validate() method gets them from here.
   //TODO: change $required and $group to private and define getters/setters.
   
   public function get_data_type()
   {
      //Returns compatible data type (in particular for the function register_meta()).
      return "string";  //This is class-specific readonly value.
   }
   
   public function validate()
   {
      //Basic value validation.
      //Return boolean true if the value is valid. If not, return boolean false and put error messages into $this->errors.
      //Rules of validation:
      // - The required field must be filled correctly. The optional field must be filled correctly or not filled at all.
      // - If the field has alternatives, don't add "This field isn't filled" message individually, because such a thing should be generated for the whole group by the form's method validate(). However other specific errors should be reported.
      
      $this->errors=[];
      
      if ($this->required)
      {
         if (($this->value=="")&&(!$this->group))          
            $this->errors[]="Заполните поле «".$this->title."»";
      }
      
      return count($this->errors)==0;
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
      
      $attrs=["type"=>"hidden","name"=>$this->key,"value"=>(string)$this->value??$this->default]+$this->attrs;
      ?>
      <INPUT<?=serialize_element_attrs($attrs)?>>
      <?php
   }
}

class InputPwd extends InputField
{
   public function render()
   {
      $attrs=["type"=>"password","name"=>$this->key,"value"=>$this->value??$this->default]+$this->attrs;
      ?>
      <LABEL CLASS="<?=$this->key?>"><SPAN><?=$this->title?></SPAN> <INPUT<?=serialize_element_attrs($attrs)?>></LABEL>
      <?php
   }
}

class InputString extends InputField
{
   public function get_safe_value()
   {
      //Returns [properly modified] $value, safe for storing to DB or something else.
      $res=htmlspecialchars(strip_tags($this->value));
      $maxlen=arr_val($this->attrs,"maxlength");
      if ($maxlen)
         $res=mb_substr($res,0,$maxlen);
      
      return $res;
   }
   
   public function render()
   {
      $attrs=["type"=>"text","name"=>$this->key,"value"=>$this->value??$this->default]+$this->attrs;
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
      <LABEL CLASS="<?=$this->key?>"><SPAN><?=$this->title?></SPAN> <TEXTAREA <?=serialize_element_attrs($attrs)?>><?=htmlspecialchars($this->value??$this->default)?></TEXTAREA></LABEL>
      <?php
   }
}

class InputRichText extends InputText
{
   public function render()
   {
      $wp_editor_params=["textarea_name"=>$this->key]+$this->attrs;
      ?>
      <LABEL CLASS="<?=$this->key?>"><SPAN><?=$this->title?></SPAN><?=wp_editor($this->value??$this->default,$this->key,$wp_editor_params)?></LABEL>
      <?php
   }
}

class InputFloat extends InputField
{
   public $default=0.0;
   
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
      $attrs=["type"=>"number","name"=>$this->key,"value"=>$this->value??$this->default]+$this->attrs;
      ?>
      <LABEL CLASS="<?=$this->key?>"><SPAN><?=$this->title?></SPAN> <INPUT<?=serialize_element_attrs($attrs)?>></LABEL>
      <?php
   }
}

class InputInt extends InputFloat   //NOTE: THe int is more tight than the float.
{
   public $default=0;
   
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
   public $default=false;
   
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
      $attrs=["type"=>"checkbox","name"=>$this->key,"checked"=>to_bool($this->value??$this->default)]+$this->attrs;
      ?>
      <LABEL CLASS="<?=$this->key?>"><SPAN><?=$this->title?></SPAN> <INPUT<?=serialize_element_attrs($attrs)?>></LABEL>
      <?php
   }
}

class InputJson extends InputHidden
{
   public function get_safe_value()
   {
      return json_encode(json_decode(stripcslashes($this->value),true)??[],JSON_ENCODE_OPTIONS);   //Make a double conversion to be sure the value is JSON-encoded, not whatever else may come from outside.
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
                      "inputSelector"=>"#$container_id input[type=hidden][name=".$this->key."]",
                      "containerSelector"=>"#$container_id .media_list",
                      "limit"=>$this->limit,
                      "MediaSelectorParams"=>$this->selector_params,
                   ];
      $list_params_json=json_encode($list_params,JSON_ENCODE_OPTIONS);
      parent::render();
      ?>
      <DIV ID="<?=$container_id?>" CLASS="media">
         <INPUT TYPE="hidden" NAME="<?=$this->key?>" VALUE="<?=$this->value??$this->default?>">
         <DIV CLASS="media_list"></DIV>
         <SCRIPT>
            document.addEventListener('DOMContentLoaded',function(e_){let list=new MediaList(<?=$list_params_json?>); list.onChange=function(mediaList_){mediaList_.updateSourceInput();};});
         </SCRIPT>
      </DIV>
      <?php
   }
}

class InputSelect extends InputField
{
   //TODO: This class actually can't support mulitple selection.
   public $variants=[];
   public $empty_option=null;
   
   public function __construct(array $params_=[])
   {
      parent::__construct($params_);
      
      //Prepend an empty option:
      if ($this->empty_option!==null)
         $this->variants=[""=>$this->empty_option]+$this->variants;
   }
   
   public function validate()
   {
      //Valid value must match the selection variants and, if required, must not be empty.
      $this->errors=[];
      
      $checks_cnt=2;
      $checks_passed=0;
      if (!$this->required||($this->value!=""))
         $checks_passed++;
      else
      {
         if (!$this->group)
            $this->errors[]="Заполните поле «".$this->title."»";
      }
      
      if (key_exists($this->value,$this->variants))
         $checks_passed++;
      else
         $this->errors[]="Значение поля «".$this->title."» не соответствует списку";
      
      return ($checks_passed==$checks_cnt);
   }
   
   public function get_safe_value()
   {
      return (key_exists($this->value,$this->variants) ? $this->value : $this->default);
   }
   
   public function render()
   {
      $attrs=["name"=>$this->key]+$this->attrs
      ?>
      <LABEL CLASS="<?=$this->key?>"><SPAN><?=$this->title?></SPAN> <SPAN CLASS="select"><?=html_select($this->key,$this->variants,$this->value??$this->default,$attrs)?></SPAN></LABEL>
      <?php
   }
}

class InputPostsSelect extends InputSelect
{
   public $filter=[];
   
   public function __construct(array $params_=[])
   {
      parent::__construct($params_);
      
      //Get the posts and fill the selection variants with them:
      $posts=get_posts($this->filter);
      foreach ($posts as $post)
         $this->variants[$post->ID]=$this->render_option_text($post);
   }
   
   protected function render_option_text($post_)
   {
      //Makes an <OPTION> content.
      return $post_->post_title;
   }
}


?>