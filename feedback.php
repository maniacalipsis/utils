<?php
/*==================================*/
/* Utilities plugin                 */
/* Copyright: FSG a.k.a ManiaC      */
/* Contact: imroot@maniacalipsis.ru */
/* License: GNU GPL v3              */
/*----------------------------------*/
/* Feedback basic utils             */
/*==================================*/

namespace Utilities;

class Feedback extends Shortcode
{
   //Rendering
   protected $tpl_pipe=["wrap_tpl"=>"default_wrap_tpl","form_tpl"=>"default_form_tpl"];
   //Data-related properties:
   protected $data=[];     //Form data.
   protected $fields=[];   //Form input fields,
   //Rendering params, that can be defined only at the backend:
   public $identity_class="feedback_form"; //CSS-class for the form's outermost block.
   public $custom_form_class="";
   
   public function __construct($name_="")
   {
      parent::__construct($name_);
      
      add_action("init",[$this,"on_init"]);
      
      if (wp_doing_ajax())
      {
         add_action("wp_ajax_nopriv_".$this->name,[$this,"handle_request"]);
         add_action("wp_ajax_".$this->name       ,[$this,"handle_request"]);
      }
   }
   
   public function on_init()
   {
      //Process the redirection request (some WP feature):
      if (preg_match("/^\\/goto\\//",$_SERVER["REQUEST_URI"])&&$_REQUEST["r"])
      {
         header("Location: ".$_REQUEST["r"]);
         die();
      }
   }
   
   public function add_field(FeedbackField $field_)
   {
      //Add an input field to the form.
      
      $this->fields[$field_->key]=$field_;
   }
   
   protected function get_data($params_)
   {
      //Get the default form data before the rendering.
      
      $this->data=[];
      foreach ($this->fields as $field)
         $this->data[$field->key]="";//$field->default;
   }
   
   protected function default_wrap_tpl()
   {
      //The default template makes no wrapping.
      
      return $this->{$this->tpl_pipe["form_tpl"]}();  //Just pass and run the next template in the pipe.
   }
   
   protected function default_form_tpl()
   {
      //Render the simple list.
      ob_start();
      ?>
      <DIV <?=$this->attr_id?> CLASS="<?=$this->identity_class?> <?=$this->custom_class?>">
         <?php
            echo $this->form_open_tpl();
            foreach ($this->fields as $field)
               echo $field->render();
            echo $this->form_submit_tpl();
            echo $this->form_close_tpl();
         ?>
      </DIV>
      <?php
      return ob_get_clean();
   }
   
   protected function form_open_tpl()
   {
      //Returns form open tag and some utility fields.
      //Helper for the *_form_tpl().
      ob_start();
      ?>
         <FORM ACTION="<?=admin_url("admin-ajax.php")?>" CLASS="<?=$this->custom_form_class?>">
            <INPUT TYPE="hidden" NAME="action" VALUE="<?=$this->name?>">

      <?php
      return ob_get_clean();
   }
   
   protected function form_close_tpl()
   {
      //Returns form open tag and some utility fields.
      //Helper for the *_form_tpl().
      ob_start();
      ?>
      </FORM>

      <?php
      return ob_get_clean();
   }
   
   protected function form_submit_tpl()
   {
      //Returns form open tag and some utility fields.
      //Helper for the *_form_tpl().
      ob_start();
      ?>
            <DIV CLASS="submission flex end x-end">
               <INPUT TYPE="submit" VALUE="Отправить">
            </DIV>
            <DIV CLASS="result"></DIV>
         
      <?php
      return ob_get_clean();
   }
   
   public function validate()
   {
      $this->errors=[]; //Reset errors list.
      
      //1st pass - wrap request:
      foreach ($this->fields as $field)
         $field->value=arr_val($_REQUEST,$field->key); //Get and wrap values from the request.
      
      //2nd pass - check if all required fields are filled:
      $check_list=$this->fields; //Duplicate fields array (not the fields themselves).
      foreach ($check_list as $key=>$field)
         if (!$field->validate())
         {
            if ($field->alt_fields_keys)
            {
               $invalid_alts_titles=[];   //Precollect titles for the error message.
                  
               //Find at least one filled alternative field:
               $is_alt_filled=false;
               foreach ($field->alt_fields_keys as $alt_key)
                  if (key_exists($alt_key,$this->fields))
                  {
                     if (!$this->fields[$alt_key]->validate())
                     {
                        $invalid_alts_titles[]=$this->fields[$alt_key]->get_title();  //By the way collect titles of the alt fields.
                        //$this->errors[]="Заполните ".$field->get_title;                      //Individual error.
                     }
                     else
                     {
                        $is_alt_filled=true;
                        break;
                     }
                     unset($check_list[$alt_key]);
                  }
                  else
                     $titles[]=$alt_key; //Expose the alt field key instead of the title if the form was made inconsistently.
                  
               if (!$is_alt_filled)                                                                                     //If all alternatives aren't filled
                  $this->errors[]="Заполните хотя бы одно из обязательных полей: ".implode(", ",$invalid_alts_titles);  // then set a collective error.
            }
            else
               $this->errors[]="Заполните ".$field->get_title();
         }
      
      return count($this->errors)==0;
   }
   
   public function handle_request()
   {
      //Handle AJAX request from the feedback form.
      
      $response=["res"=>false];
      
      if ($this->validate())
         $this->handle_request_payload();
      
      if ($this->errors)
         $response["errors"]=$this->errors;
      
      echo json_encode($response,JSON_ENCODE_OPTIONS);
      die();
   }
   
   public function handle_request_payload()
   {
      //This method is called at the handle_request() when the form is validated.
      //Do something useful here.
   }
}

//Input fields' classes for the feedback forms:
abstract class FeedbackField
{
   protected $input_class=""; //Mixin class. NOTE: parent constructor sees a perent's consts, even if descendant overrides'em.
   protected $input=null;     //Mixin.

   public $required=false;
   public $alt_fields_keys=[]; //List of alternatively required fields.
   public $error_msg="";
   
   public function __construct(array $params_=[])
   {
      $this->input=new (__NAMESPACE__."\\".$this->input_class)($params_);
   }
   
   //Proxy the mixin's properties:
   public function __call($name_,$args_)
   {
      return $this->input->{$name_}($args_);
   }
   public function __get (string $name_)
   {
      return $this->input->{$name_};
   }
   public function __set (string $name_,$val_)
   {
      $this->input->{$name_}=$val_;
   }
}

class FeedbackString extends FeedbackField
{
   protected $input_class="InputString";
}

class FeedbackPwd extends FeedbackField
{
   protected $input_class="InputPwd";
}

class FeedbackText extends FeedbackField
{
   protected $input_class="InputText";
}

class FeedbackRichText extends FeedbackField
{
   protected $input_class="InputRichText";
}

class FeedbackInt extends FeedbackField
{
   protected const DATA_TYPE="integer";
   protected $input_class="InputInt";
}

class FeedbackFloat extends FeedbackField
{
   protected const DATA_TYPE="number";
   protected $input_class="InputFloat";
}

class FeedbackBool extends FeedbackField
{
   protected const DATA_TYPE="boolean";
   protected $input_class="InputBool";
}

// class FeedbackMedia extends FeedbackField
// {
//    protected $input_class="InputMedia";
// }

class FeedbackSelect extends FeedbackField
{
   protected $input_class="InputSelect";
}

?>