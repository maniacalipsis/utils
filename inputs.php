<?php
/*==================================*/
/* Utilities plugin                 */
/* Copyright: FSG a.k.a ManiaC      */
/* Contact: imroot@maniacalipsis.ru */
/* License: GNU GPL v3              */
/*----------------------------------*/
/* Inputs handling classes          */
/*==================================*/

namespace Maniacalipsis\Utilities;

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
      <INPUT<?=render_element_attrs($attrs)?>>
      <?php
   }
}

class InputPwd extends InputField
{
   public function render()
   {
      $attrs=["type"=>"password","name"=>$this->key,"value"=>$this->value??$this->default]+$this->attrs;
      ?>
      <LABEL CLASS="<?=$this->key?>"><SPAN CLASS="caption"><?=$this->title?></SPAN> <INPUT<?=render_element_attrs($attrs)?>></LABEL>
      <?php
   }
}

class InputString extends InputField
{
   public function get_safe_value()
   {
      //Returns [properly modified] $value, safe for storing to DB or something else.
      $res=htmlspecialchars(strip_tags($this->value));
      $maxlen=$this->attrs["maxlength"]??0;
      if ($maxlen)
         $res=mb_substr($res,0,$maxlen);
      
      return $res;
   }
   
   public function render()
   {
      $attrs=["type"=>"text","name"=>$this->key,"value"=>$this->value??$this->default]+$this->attrs;
      ?>
      <LABEL CLASS="<?=$this->key?>"><SPAN CLASS="caption"><?=$this->title?></SPAN> <INPUT<?=render_element_attrs($attrs)?>></LABEL>
      <?php
   }
}

class InputText extends InputString
{
   public function render()
   {
      $attrs=["name"=>$this->key]+$this->attrs;
      ?>
      <LABEL CLASS="<?=$this->key?>"><SPAN CLASS="caption"><?=$this->title?></SPAN> <TEXTAREA <?=render_element_attrs($attrs)?>><?=htmlspecialchars($this->value??$this->default)?></TEXTAREA></LABEL>
      <?php
   }
}

class InputTrap extends InputString
{
   //Trap for spamer bots.
   
   public function validate()
   {
      //Validate a trap field.
      
      $this->errors=[];
      
      if ($this->value!="")
         $this->errors[]="Не заполняйте поле «".$this->title."»";
      
      return count($this->errors)==0;
   }
}

class InputCAPTCHA extends InputString
{
   protected string $fonts_dir="";
   protected array  $options=[];
   
   public function renew_captcha():?string
   {
      $res=null;
      if (session_start())
      {
         $captcha_str=generate_captcha_str();
         $_SESSION["CAPTCHA"]=$captcha_str;
         $res=make_captcha_image($captcha_str,$this->fonts_dir,$this->options);
      }
      return $res;
   }
   
   public function render()
   {
      ?>
      <BUTTON TYPE="button" CLASS="captcha" TITLE="<?=_("Обновить картинку")?>"><IMG CLASS="captcha" SRC="data:image/png;base64,<?=base64_encode($this->renew_captcha())?>" ALT="CAPTCHA"></BUTTON>
      <?php
      parent::render();
   }
   
   public function validate()
   {
      //Basic value validation.
      //Return boolean true if the value is valid. If not, return boolean false and put error messages into $this->errors.
      //Rules of validation:
      // - The required field must be filled correctly. The optional field must be filled correctly or not filled at all.
      // - If the field has alternatives, don't add "This field isn't filled" message individually, because such a thing should be generated for the whole group by the form's method validate(). However other specific errors should be reported.
      
      try
      {
         $res=false;
         $this->errors=[];
         
         if (!session_start())
            throw new \RuntimeException("Включите куки на сессию для прохождения каптчи.");
         
         if (($_SESSION["CAPTCHA"]??null)=="")
            throw new \RuntimeException("Ошибка инициализации каптчи. Попробуйте ещё раз");
            
         if (!compare_captcha_str($_SESSION["CAPTCHA"],$this->value))
            throw new \ValueError("Каптча введена неверно.");
            
         $res=true;
      }
      catch (\Error|\Exception $ex)
      {
         $this->errors[]=$ex->getMessage();
      }
      
      return $res;
   }
}

class InputRichText extends InputText
{
   public function render()
   {
      $wp_editor_params=["textarea_name"=>$this->key]+$this->attrs;
      ?>
      <LABEL CLASS="<?=$this->key?>"><SPAN CLASS="caption"><?=$this->title?></SPAN><?=wp_editor($this->value??$this->default,$this->key,$wp_editor_params)?></LABEL>
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
      <LABEL CLASS="<?=$this->key?>"><SPAN CLASS="caption"><?=$this->title?></SPAN> <INPUT<?=render_element_attrs($attrs)?>></LABEL>
      <?php
   }
}

class InputInt extends InputFloat   //NOTE: The int is more tight than the float.
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
      $attrs_hdden=["type"=>"hidden","name"=>$this->key,"value"=>$this->value??$this->default];
      $attrs_ccheck=["type"=>"checkbox","checked"=>to_bool($this->value??$this->default),"onclick"=>"let inp=this.parentNode.querySelector('input[type=hidden]'); console.log(inp); if (inp) inp.value=(this.checked ? '1' : '0');"]+$this->attrs;
      ?>
      <LABEL CLASS="<?=$this->key?>"><SPAN CLASS="caption"><?=$this->title?></SPAN> <INPUT<?=render_element_attrs($attrs_hdden)?>> <INPUT<?=render_element_attrs($attrs_ccheck)?>></LABEL>
      <?php
   }
}

class InputJson extends InputHidden
{
   public function get_safe_value()
   {
      try
      {
         $res=json_encode(json_decode(stripcslashes($this->value),flags:JSON_DECODE_OPTIONS)??null,JSON_ENCODE_OPTIONS);   //Make a double conversion to be sure the value is JSON-encoded, not whatever else may come from outside.
      }
      catch (\JsonException $ex)
      {
         error_log($ex->getMessage()." Value=".$this->value);
         $res=null;
      }
      return $res;
   }
   
   public function print()
   {
      //Outputs the value to any kind of document.
      try
      {
         echo json_encode(json_decode(stripcslashes($this->value),flags:JSON_DECODE_OPTIONS),JSON_ENCODE_OPTIONS|JSON_PRETTY_PRINT);
      }
      catch (\JsonException $ex)
      {
         error_log($ex->getMessage());
      }
   }
}

class InputStruct extends InputJson
{
   public  int    $min_size=0;
   public ?int    $max_size=null;
   public ?array  $item_class=null; //Format: ["name"=>"ClassName","from"=>"module/name"].
   public  array  $struct=[];
   
   protected string $container_class_name="struct_data";
   
   public function render()
   {
      $container_id="extra_media_".$this->key;
      $struct_params_json=json_encode($this->struct,JSON_ENCODE_OPTIONS);
      ?>
      <DIV ID="<?=$container_id?>" CLASS="<?=$this->container_class_name?>">
         <SPAN CLASS="caption"><?=$this->title?></SPAN>
         <?=parent::render()?>
         <DIV CLASS="items"></DIV>
         <BUTTON TYPE="button" CLASS="add" TITLE="<?=__("Add")?>">+</BUTTON>
         <SCRIPT TYPE="module">
            import {StructuredDataList} from 'maniacalipsis/utils/admin';
            <?php if ($this->item_class["from"]??null):?>
            import {<?=$this->item_class["name"]?>} from '<?=$this->item_class["from"]?>';
            <?php endif;?>
            document.addEventListener('DOMContentLoaded',(e_)=>{new StructuredDataList({boxMain:document.getElementById('<?=$container_id?>'),minSize:<?=$this->min_size?>,maxSize:<?=$this->max_size??"undefined"?>,itemClass:<?=$this->item_class["name"]??"undefined"?>,itemClassParams:{inputs:<?=$struct_params_json?>}});});
         </SCRIPT>
      </DIV>
      <?php
   }
}

class InputPlaceMarks extends InputStruct
{
   public function __construct(array $params_=[])
   {
      parent::__construct($params_);
      
      $this->container_class_name.=" placemarks";
      $this->item_class=["name"=>"PlaceMarkDataNode","from"=>"maniacalipsis/utils/admin"];
   }
}

class InputMedia extends InputStruct
{
   public function __construct(array $params_=[])
   {
      parent::__construct($params_);
      
      $this->container_class_name.=" placemarks";
      $this->item_class=["name"=>"MediaDataNode","from"=>"maniacalipsis/utils/admin"];
   }   
}

class InputSelectRaw extends InputField
{
   //TODO: This class actually can't support mulitple selection.
   public $variants=[];
   public $empty_option=null;
   
   public function __construct(array $params_=[])
   {
      parent::__construct($params_);
      
      //Prepend an empty option:
      $this->reset_variants();
      $this->variants+=$this->variants;
   }
   
   public function reset_variants()
   {
      //Empties the selection variants array and appends an empty option if defined.
      
      if ($this->empty_option!==null)
         $this->variants=[""=>$this->empty_option];
   }
   
   public function validate()
   {
      //Valid value must match the selection variants and, if required, must not be empty.
      
      try
      {
         $res=false;
         $this->errors=[];
         
         if ($this->attrs["multiple"]??false)
         {
            $has_opts=(count($this->value)>0);
            if ($this->required&&!$has_opts)
               throw new \RuntimeException("Заполните поле «".$this->title."»");
            
            if ($this->required&&$has_opts&&(count(array_intersect($this->value,array_keys($this->variants)))==0))
               throw new \OutOfBoundsException("Ни одно из выбранных значений поля «".$this->title."» не соответствует списку");
         }
         else
         {
            if ($this->required&&($this->value==""))
               throw new \RuntimeException("Заполните поле «".$this->title."»");
               
            if ($this->required&&$has_opts&&(($this->variants[$this->value]??null)===null))
               throw new OutOfBoundsException("Значение поля «".$this->title."» не соответствует списку");
         }
         
         $res=true;
      }
      catch (\TypeError|\RuntimeException $ex)
      {
         $this->errors[]=$ex->getMessage();
      }
      
      return $res;
   }
   
   public function get_safe_value()
   {
      //Reurns a key[s] of selected option[s].
      
      return ($this->attrs["multiple"]??false ? array_intersect($this->value??[],array_keys($this->variants)) : (key_exists($this->value,$this->variants) ? $this->value : $this->default));
   }
   
   public function render()
   {
      $attrs=["name"=>$this->key]+$this->attrs
      ?>
      <LABEL CLASS="<?=$this->key?>"><SPAN CLASS="caption"><?=$this->title?></SPAN> <SPAN CLASS="select"><?=html_select($this->key,$this->variants,$this->value??$this->default,$attrs)?></SPAN></LABEL>
      <?php
   }
}

class InputSelect extends InputSelectRaw
{
   public function get_safe_raw_value()
   {
      return parent::get_safe_value();
   }
   
   public function get_safe_value()
   {
      //Returns a value[s] of $this->variants by selected key[s].
      
      $res="";
      
      $safe_keys=parent::get_safe_value();
      
      if ($this->attrs["multiple"]??false)
      {
         $sep=null;
         foreach ($safe_keys as $key)
         {
            $res.=$sep.(is_array($this->variants[$key]??null) ? $this->variants[$key]["text"]??"" : $this->variants[$key]);
            $sep??=", ";
         }
      }
      else
         $res=(is_array($this->variants[$safe_keys]??null) ? $this->variants[$safe_keys]["text"]??"" : $this->variants[$safe_keys]);
      
      return $res;
   }
}

class InputPostsSelect extends InputSelectRaw
{
   use TMetaQueryHepler;
   
   public function __construct(array $params_=[])
   {
      parent::__construct($params_);
      
      //Get the posts and fill the selection variants with them:
      $posts=get_posts($this->prepare_filter($this->filter));
      foreach ($posts as $post)
         $this->variants[$post->ID]=$this->render_option_text($post);
   }
   
   protected function render_option_text($post_)
   {
      //Makes an <OPTION> content.
      return $post_->post_title;
   }
}

class InputFile extends InputField
{
   protected  string   $default_accept="image/png,image/jpeg,image/pjpeg,image/webp,image/heic,image/heif,image/gif,image/tiff,image/svg+xml,text/plain,text/rtf,text/x-markdown,application/pdf";
   protected ?\Uploads $uploads=null;
   protected  bool     $uploads_renamed=false;
   
   public function __construct(array $params_=[])
   {
      $params_["attrs"]["accept"]??=$this->default_accept;  //Disallow to accept anything by default.
      parent::__construct($params_);
      
      $args=array_intersect_key($params_,["dest_folder","types_allowed","types_disallowed","names_allowed","names_disallowed","max_size","max_count","max_total_size","file_number","fname_format","fname_filter","dest_folder_permissions","files_permissions","require_permissions"]);
      $args["types_allowed"]="/^(".str_replace([",","/"],["|","\\/"],$params_["attrs"]["accept"]).")$/i";
      $this->uploads=new \Uploads(...$args);
   }
   
   public function get_data_type()
   {
      //Returns compatible data type (in particular for the function register_meta()).
      return "file";  //This is class-specific readonly value.
   }
   
   public function validate()
   {
      //Uploads validation.
      
      $this->errors=[];
      
      foreach ($this->uploads->extract_info([$this->key])->validate()->validation_exceptions as $ex)
         $this->errors[]="#".$ex->getCode().": ".$ex->getMessage();
      
      if (($this->required)&&(!$this->uploads->valid_info))
         $this->errors[]="Заполните поле «".$this->title."»";
      
      return count($this->errors)==0;
   }
   
   public function get_safe_value()
   {
      //Returns an uploads info, passed validation.
      
      $cnt=count($this->uploads->valid_info);
      return sprintf(_n( '%s media file attached.', '%s media files attached.',$cnt),(string)$cnt);
   }
   
   public function get_attachments(string $mailer="send_email"):array
   {
      if (!$this->uploads_renamed)
         $this->uploads->rename_enumerated();
      
      $res=[];
      
      switch ($mailer)
      {
         case "wp_mail":
         {
            $res=[];
            foreach ($this->uploads->valid_info as $row)
               $res[$row["name"]]=$row["file"]->getPathname();
            
            break;
         }
         case "send_email":
         {
            $res=$this->uploads->valid_info;
            
            break;
         }
      }
      
      return $res;
   }
   
   public function render()
   {
      $attrs=["type"=>"file","name"=>$this->key.($this->attrs["multiple"]??false ? "[]" : ""),"value"=>$this->value??$this->default]+$this->attrs;
      ?>
      <LABEL CLASS="<?=$this->key?>"><SPAN CLASS="caption"><?=$this->title?></SPAN> <INPUT<?=render_element_attrs($attrs)?>></LABEL>
      <?php
   }
}

?>