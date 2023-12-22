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
   protected $tpl_pipe=["wrap_tpl"=>"default_wrap_tpl","header_tpl"=>"default_header_tpl","form_tpl"=>"default_form_tpl","form_open_tpl"=>"default_form_open_tpl","fields_tpl"=>"default_fields_tpl","form_submit_tpl"=>"default_form_submit_tpl","form_close_tpl"=>"default_form_close_tpl"];
   protected $method="post";
   protected $enctype="application/x-www-form-urlencoded";
   protected $email_tpl_pipe=["subject_tpl"=>"default_subject_tpl","email_tpl"=>"default_email_tpl"];
   //Data-related properties:
   protected $fields=[];   //Form input fields,
   protected $response=[]; //
   protected $errors=[];   //List of messages about any kind of errors interrupted normal form processing.
   //Rendering params, that can be defined only at the backend:
   public $h_level=3;      //Level of the form header.
   public $header=null;    //Form header.
   public $form_class="";  //Form class attribute.
   public $default_h_level=3;
   //Email params:
   protected $recipients_meta_key="feedback_recipients"; //Name of user meta field contains a recipients emails. NOTE: See method get_recipients() to learn about recipients processing capabilities.
   protected $params_meta_key="feedback_params";         //Name of user meta field contains a mailing params.
   
   public function __construct($name_="")
   {
      parent::__construct($name_);
      
      if ($this->identity_class===null)
         $this->identity_class="feedback_form";
      
      $params=$this->get_params();
      if ($params["mailer"]=="wp_mail")
         add_action("phpmailer_init",[$this,"phpmailer_init_action"]);
      
      add_action("init",[$this,"on_init"]);
      
      if (wp_doing_ajax())
      {
         add_action("wp_ajax_nopriv_".$this->name,[$this,"handle_request"]);
         add_action("wp_ajax_".$this->name       ,[$this,"handle_request"]);
      }
   }
   
   protected function get_rendering_params($params_,$content_)
   {
      //Process the rendering params.
      parent::get_rendering_params($params_,$content_);
      
      $this->header=$params_["header"]??null;
      $this->h_level=$params_["h_level"]??$this->default_h_level;
      $this->form_class=$params_["form_class"]??$this->form_class;
      
      $this->setup_tpl_pipe($this->email_tpl_pipe,$params_);
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
   
   public function phpmailer_init_action($phpmailer_)
   {
      $params=$this->get_params();
      
      $phpmailer_->IsSMTP();

      $phpmailer_->CharSet   =$params["charset"  ]??"UTF-8";

      $phpmailer_->Host      =$params["host"     ]??"";
      $phpmailer_->Username  =$params["user"     ]??"";
      $phpmailer_->Password  =$params["pwd"      ]??"";
      $phpmailer_->SMTPAuth  =$params["auth"     ]??true;
      $phpmailer_->Port=(int)($params["port"     ]??$phpmailer_->Port);
      $phpmailer_->SMTPSecure=$params["secure"   ]??($phpmailer_->Port==465 ? "ssl" : $phpmailer_->SMTPSecure);
 
      $phpmailer_->From      =$params["from"     ]??"no-reply@".$_SERVER["HTTP_HOST"];
      $phpmailer_->FromName  =$params["from_name"]??"";

      $phpmailer_->isHTML(($params["format"]??"html")=="html");
      //var_dump($phpmailer_);
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
            echo $this->{$this->tpl_pipe["header_tpl"]}();
            echo $this->{$this->tpl_pipe["form_open_tpl"]}();
            echo $this->{$this->tpl_pipe["fields_tpl"]}();
            echo $this->{$this->tpl_pipe["form_submit_tpl"]}();
            echo $this->{$this->tpl_pipe["form_close_tpl"]}();
         ?>
      </DIV>
      <?php
      return ob_get_clean();
   }
   
   protected function default_header_tpl()
   {
      return ($this->header!==null ? "         <H".$this->h_level.">".$this->header."</H".$this->h_level.">\n" : "");
   }
   
   protected function default_form_open_tpl()
   {
      //Returns form open tag and some utility fields.
      //Helper for the *_form_tpl().
      ob_start();
      ?>
         <FORM ACTION="<?=admin_url("admin-ajax.php")?>" METHOD="<?=$this->method?>" ENCTYPE="<?=$this->enctype?>" CLASS="<?=$this->form_class?>" <?=$this->attr_data?>>
            <INPUT TYPE="hidden" NAME="action" VALUE="<?=$this->name?>">

      <?php
      return ob_get_clean();
   }
   
   protected function default_fields_tpl()
   {
      //Returns rendered input fields.
      $res="";
      
      foreach ($this->fields as $field)
         $res.=$field->render();
      
      return $res;
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
   
   protected function default_subject_tpl()
   {
      return "Письмо с сайта ".$_SERVER["SERVER_NAME"];
   }
   
   protected function plain_email_tpl($title_="")
   {
      $res="";
      foreach ($this->fields as $field)
         $res.=$field->title.": ".strip_tags($field->get_safe_value())."\n";
      
      return $res;
   }
   
   protected function default_email_tpl($title_="")
   {
      ob_start();
      ?><!DOCTYPE HTML>
<HTML LANG="ru">
<HEAD>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE><?=$title_?></TITLE>
</HEAD>
   <BODY>
      <TABLE>
         <?php foreach($this->fields as $field): ?>
         <TR><TH><?=$field->title?></TH><TD><?=$field->get_safe_value()?></TD></TR>
         <?php endforeach; ?>
      </TABLE>
   </BODY>
</HTML><?php
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
         $field->value=$_REQUEST[$field->key]??null;
      
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
      
      $params=$this->get_params();
      $recipients=$this->get_recipients();
      if ($recipients)
      {
         $subj=$this->{$this->email_tpl_pipe["subject_tpl"]}();
         $text=$this->{$this->email_tpl_pipe["email_tpl"]}($subj);
         
         switch ($params["mailer"]??"send_email")
         {
            case "wp_mail":
            {
               $this->response["res"]=wp_mail($recipients,$subj,$text);
               break;
            }
            case "send_email":
            {
               $this->response["res"]=send_email($recipients,$subj,$text);
               break;
            }
         }
         if ($this->response["res"])
            $this->response["message"]="Письмо отправлено успешно.";
         else
            $this->errors[]="Не удалось отправить письмо: ошибка на сервере.";
      }
      else
         $this->response["errors"][]="Не удалось отправить письмо: на сайте не настроены адреса получателей.";
   }
   
   protected function get_params()
   {
      //Misc method, retrieving mailing params from WP site options.
      //Options setup example (use in theme/functions.php):
      //$theme_setting_section->add_field(new InputStruct(["key"=>"feedback_params","title"=>"Параметры","struct"=>[
      //                                                                                                              "mailer"=>["label"=>"Функция:","input"=>["tagName"=>"select","childNodes"=>[["tagName"=>"option","textContent"=>"send_mail"],["tagName"=>"option","textContent"=>"wp_mail"],]]],
      //                                                                                                              "host"=>["label"=>"Хост:"],
      //                                                                                                              "user"=>["label"=>"Логин:"],
      //                                                                                                              "pwd" =>["label"=>"Пароль:"],
      //                                                                                                           ],"limit"=>1]));
      
      $opts=json_decode(get_option($this->params_meta_key,"null"),true);
      $res=$opts[0]??[];      
      return $res;
   }
   
   protected function get_recipients()
   {
      //Misc method, allows to override the way to get feedback recipients. E.g. it may use JSON-encoded meta field and some key from request or any other solution.
      
      return get_option($this->recipients_meta_key,"");
   }
}
?>