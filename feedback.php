<?php
/*==================================*/
/* Utilities plugin                 */
/* Copyright: FSG a.k.a ManiaC      */
/* Contact: imroot@maniacalipsis.ru */
/* License: GNU GPL v3              */
/*----------------------------------*/
/* Feedback basic utils             */
/*==================================*/

class Feedback
{
   public $id="feedback"; //This string identifier is used as the shortcode tag, the form name and the "action" parameter value in the ajax request.
   public $fields=[
                     "name"   =>["title"=>"Имя"      ,"type"=>"text"    ,"required"=>true,"alt"=>[]       ,"params"=>["maxlength"=>64,"err_msg"=>"Пожалуйста, укажите имя."]],
                     "phone"  =>["title"=>"Телефон"  ,"type"=>"text"    ,"required"=>true,"alt"=>["email"],"params"=>["maxlength"=>32,"err_msg"=>"Пожалуйста, укажите телефон или e-mail."]],
                     "email"  =>["title"=>"E-mail"   ,"type"=>"text"    ,"required"=>true,"alt"=>["phone"],"params"=>["maxlength"=>32,"err_msg"=>"Пожалуйста, укажите телефон или e-mail."]],
                     "message"=>["title"=>"Сообщение","type"=>"textarea","required"=>true,"alt"=>[]       ,"params"=>["err_msg"=>"Пожалуйста, заполните поле &laquo;сообщение&raquo;."]],
                  ];

   public $public_styles=[];
   public $public_scripts=[];
   protected $shortcodes=[,"form_shortcode"];
   
   public function __construct($shortcode_)
   {
      add_action("init",[$this,"init"]);

      if (wp_doing_ajax())
      {
         add_action("wp_ajax_nopriv_".$this->id,[$this,"handle_request"]);
         add_action("wp_ajax_".$this->id       ,[$this,"handle_request"]);
      }
   }
   
   public function init()
   {
      //Process the redirection request (some WP feature):
      if (preg_match("/^\\/goto\\//",$_SERVER["REQUEST_URI"])&&$_REQUEST["r"])
      {
         header("Location: ".$_REQUEST["r"]);
         die();
      }
      
      //Continue normal operation:
      if (!is_admin())
      {
         //Enqueue JS and CSS, required by the form:
         foreach ($this->public_styles as $asset_key=>$asset_url)
            wp_enqueue_style($asset_key,(preg_match("/^http(s)?:/i",$asset_url) ? $asset_url : plugins_url($asset_url,__FILE__)));
         
         foreach ($this->public_scripts as $asset_key=>$asset_url)
            wp_enqueue_script($asset_key,(preg_match("/^http(s)?:/i",$asset_url) ? $asset_url : plugins_url($asset_url,__FILE__)));
         
         //Register form shortcode:
         add_shortcode($this->id,[$this,"form_shortcode"]);
      }
   }
   
   public function form_shortcode($params_="",$content_="")
   {
      //Returns a feedback form.
      //Overrideable.
      //NOTE: this is a simple example form which may be used as template for the descendant clases.
      
      //WARNING: If shortcode has no params then an empty string will be passed to $params_, not [], thus attempitng to access $params_ elements will cause warning "Illegal string offset".
      if (!is_array($params_))
         $params_=[];
      
      $custom_class=arr_val($params_,"custom_class","");
      $title=arr_val($params_,"title","Свяжитесь с нами");
      $notice=arr_val($params_,"notice","");
         
      ob_start();
      ?>
      <DIV CLASS="feedback_form <?=$custom_class?>">
         <H2 CLASS="title"><?=$title?></H2>
         <?=$this->form_open()?>
            <LABEL CLASS="name flex x-center">Имя <INPUT TYPE="text" NAME="name" VALUE="" MAXLENGTH="64"></LABEL>
            <LABEL CLASS="phone flex x-center">Телефон <INPUT TYPE="text" NAME="phone" VALUE="" MAXLENGTH="32"></LABEL>
            <LABEL CLASS="email flex x-center">E-mail <INPUT TYPE="text" NAME="email" VALUE="" MAXLENGTH="32"></LABEL>
            <LABEL CLASS="message flex x-center">Сообщение <TEXTAREA NAME="message"></TEXTAREA></LABEL>
            <DIV CLASS="submission flex end x-end">
               <SPAN CLASS="notice"><?=$notice?></SPAN>
               <INPUT TYPE="submit" VALUE="Отправить">
            </DIV>
            <DIV CLASS="result"></DIV>
         <?=$this->form_close()?>
      </DIV>
      <?php
      return ob_get_clean();
   }
   
   
   public function handle_request()
   {
      //Handle AJAX request from the feedback form.
   }
   
   protected function message_to_manager()
   {
      //Returns a formatted message for the manager.
      //Overrideable.
      $email_text="";
      
      return $email_text;
   }
   
   protected function message_to_user()
   {
      //Returns a formatted confirmation message for the user.
      //Overrideable.
      $email_text="";
      
      return $email_text;
   }
   
   protected form_open()
   {
      //Returns and form open tag and some utility fields.
      //Helper for the form_shortcode().
      ob_start
      ?>
         <FORM ACTION="<?=admin_url("admin-ajax.php")?>" CLASS="flex">
            <INPUT TYPE="hidden" NAME="action" VALUE="<?=$this->id?>">
            <LABEL CLASS="hidden">Field <INPUT TYPE="text" NAME="trap" VALUE=""></LABEL>

      <?php
      return ob_get_clean();
   }
   
   protected form_close($title_="Field",$key_="trap")
   {
      //Returns and form open tag and some utility fields.
      //Helper for the form_shortcode().
      ob_start
      ?>
      </FORM>

      <?php
      return ob_get_clean();
   }
   
   protected function validate_n_wrap_form()
   {
      $res_data=[];
      $this->errors=[]; //Reset errors list.
      
      //1st pass - wrap src data:
      foreach ($this->fields as $key=>$field)
      {
         $wrp=arr_val($field,"wrp","wrap_".arr_val($field,"type","text")); //Get the wrapping method name.
         $res_data[$key]=$wrp(arr_val($_REQUEST,$key),$key,$field);        //Wrap the value from the request.
      }
      
      //2nd pass - check if all required fields are filled:
      $check_list=$this->fields; //NOTE: The copy-on-write will not duplicate sub arrays 
      foreach ($check_list as $key=>$field)
         if (!in_array($key,$checked_alts))                                         //Skip the fields already checked.
            if (($res_data[$key]===null)&&arr_val($this->fields[$key],"required"))  //Check if the field is required but wasn't filled.
            {
               $alt_keys=arr_val($field,"alt",[]);
               if ($alt_keys)
               {
                  $alt_titles=[];
                  
                  //Find at least one filled alternative field:
                  $is_alt_filled=false;
                  foreach ($alt_keys as $alt_key)
                     if (($res_data[$alt_key]!==null))
                     {
                        $is_alt_filled=true;
                        break;
                     }
                     else
                        $titles[]=$this->fields[$alt_key]["title"];  //By the way collect titles of the alt fields.
                  
                  if (!$is_alt_filled)                                                                            //If all alternatives aren't filled
                     $this->errors[]="Заполните хотя бы одно из обязательных полей: ".implode(", ",$alt_titles);  // then set a collective error
                  $checked_alts=array_merge($checked_alts,$field["alt"]);                                         // and 
               }
               else
                  $this->errors[]="Заполните";
            }
      
      return $res_data;
   }
   
   protected field_text($str_)
   {
      
   }
   
   protected wrap_text($str_)
   {
      
   }
   
   protected field_texterea($text_)
   {
      
   }
   
   protected wrap_texterea($text_)
   {
      
   }
}
?>