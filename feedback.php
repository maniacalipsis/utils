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
   protected $tpl_pipe=["wrap_tpl"=>"default_wrap_tpl","form_tpl"=>"default_form_tpl","form_open_tpl"=>"default_form_open_tpl","form_submit_tpl"=>"default_form_submit_tpl","form_close_tpl"=>"default_form_close_tpl"];
   //Data-related properties:
   protected $fields=[];   //Form input fields,
   protected $response=[]; //
   protected $errors=[];   //List of messages about any kind of errors interrupted normal form processing.
   //Rendering params, that can be defined only at the backend:
   public $custom_form_class="";
   
   public function __construct($name_="")
   {
      parent::__construct($name_);
      
      if ($this->identity_class===null)
         $this->identity_class="feedback_form";
      
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
   
   public function add_field(InputField $field_)
   {
      //Add an input field to the form.
      
      $this->fields[$field_->key]=$field_;
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
            echo $this->{$this->tpl_pipe["form_open_tpl"]}();
            foreach ($this->fields as $field)
               echo $field->render();
            echo $this->{$this->tpl_pipe["form_submit_tpl"]}();
            echo $this->{$this->tpl_pipe["form_close_tpl"]}();
         ?>
      </DIV>
      <?php
      return ob_get_clean();
   }
   
   protected function default_form_open_tpl()
   {
      //Returns form open tag and some utility fields.
      //Helper for the *_form_tpl().
      ob_start();
      ?>
         <FORM ACTION="<?=admin_url("admin-ajax.php")?>" CLASS="<?=$this->custom_form_class?>" <?=$this->attr_data?>>
            <INPUT TYPE="hidden" NAME="action" VALUE="<?=$this->name?>">

      <?php
      return ob_get_clean();
   }
   
   protected function default_form_close_tpl()
   {
      //Returns form open tag and some utility fields.
      //Helper for the *_form_tpl().
      ob_start();
      ?>
      </FORM>

      <?php
      return ob_get_clean();
   }
   
   protected function default_form_submit_tpl()
   {
      //Returns form open tag and some utility fields.
      //Helper for the *_form_tpl().
      ob_start();
      ?>
            <DIV CLASS="submission flex end x-end">
               <INPUT TYPE="submit" VALUE="Отправить">
            </DIV>
            <DIV CLASS="result message"></DIV>
         
      <?php
      return ob_get_clean();
   }
   
   public function validate()
   {
      //Valide .
      // Overriding, return boolean true if all fields are valid or false if not. Put error messages into the array $this->errors.
      
      $valid_cnt=0;
      $valid_groups=[];
      $grouped_titles=[];
      
      //1st stage - validate all fields, counting grouped ones seperately:
      foreach ($this->fields as $field)
      {
         if ($field->group)
            $grouped_titles[$field->group][]=$field->title; //This will serve two purposes: count fields in the group and collect their titles for the case if all of them invalid.
         
         if ($field->validate())                //If the field is valid,
         {                                      //
            if ($field->group)                  //
               $valid_groups[]=$field->group;   // set its group valid.
            else                                //
               $valid_cnt++;                    // If it has no group, increase the common counter.
         }
         else
            $this->errors=array_merge($this->errors,$field->errors); //The keys will help JS to address errors next to the corresponding inputs.
      }
      
      //2nd stage - count fields in the valid groups:
      foreach ($grouped_titles as $group=>$titles)
         if (in_array($group,$valid_groups)) //If at least one valid field was detected in the group,
            $valid_cnt+=count($titles);      // count like all fields in it are valid.
         else
            $this->errors[]="Заполните хотя бы одно из обязательных полей: ".implode(", ",$titles);
      
      //Finally, check if the sum of the ungrouped valid fields and fields in the valid groups equals to the total amount of fields:
      return ($valid_cnt==count($this->fields));
   }
   
   public function handle_request()
   {
      //Handle AJAX request from the feedback form.
      // This method is a parallel of the Dhortcode::do().
      
      $this->errors=[]; //Reset errors list.
      $this->response=["res"=>false];
      
      //Get the from data from the request:
      foreach ($this->fields as $field)
         $field->value=arr_val($_REQUEST,$field->key);
      
      //Validate form data and do something useful: 
      if ($this->validate())
         $this->handle_request_payload(); //Payload is expected to set $this->response["res"] true on success and append some necessary data, if needed. On fail it shall only append a report to $this->errors[]. Howener it may report non critical issues even on success.
      
      //Report all errors to the client:
      if ($this->errors)
         $this->response["errors"]=$this->errors;
      
      //Finally, send a response:
      echo json_encode($this->response,JSON_ENCODE_OPTIONS);
      die();
   }
   
   public function handle_request_payload()
   {
      //This method is called at the handle_request() when the form is validated.
      //Do something useful here.
   }
}
?>