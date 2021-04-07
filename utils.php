<?php
/*
Plugin Name: Utlilties
Description: Set of utility functions
Version: 1.0
Author: FSG a.k.a ManiaC
Author URI: http://maniacalipsis.ru/
Plugin URI:
*/

function utilities_init()
{
   //Common utility scripts for both of front and back ends:
   wp_enqueue_script("js_utils",plugins_url("/js_utils.js",__FILE__));
   
   //Backend-specific utils:
   if (is_admin())
   {
      wp_enqueue_script("backend_utils",plugins_url("/backend.js",__FILE__));
      wp_enqueue_style("backend_utils",plugins_url("/backend.css",__FILE__));
   }
   else
   {
      add_shortcode("date","date_shortcode");
   }
      
}
add_action("init","utilities_init");

//----------------------------------------- Shurtcodes -----------------------------------------//
function date_shortcode($params_="",$content_="")
{
   //Posts (basic post_type "post")

   //WARNING: If shortcode has no params then an empty string will be passed to $params_, not [], thus attempitng to access $params_ elements will cause warning "Illegal string offset".
   if (!is_array($params_))
      $params_=[];
   
   return date(arr_val($params_,"format","Y-m-d H:i:s"));
}

//----------------------------------------- Utility Functions -----------------------------------------//
function to_bool($val_)
{
   //Returns true if val_ may be understood as some variation of boolean true.

   return (is_bool($val_) ? $val_ : preg_match("/^(1|\+|on|ok|true|positive|y|yes|да)$/i",$val_));   //All, what isn't True - false.
}

function arr_val($arr_,$key_,$default_=null)
{
   //As PHP 8.0 strict policy of array elements access, it needs a damn bunch of checks to avoid the warnings.
   
   return (is_array($arr_)&&key_exists($key_,$arr_) ? $arr_[$key_] : $default_);
}

function serialize_element_attrs($attrs_=NULL)
{
   //TODO: RENAME THIS FUNCTION TO serialize_element_attrs cause it is reverse for DEserialization.
   
   //This function allows to almost completely make any HTML element from associative array of its attributes. E.g.: echo "<INPUT".serialize_element_attrs(["name"=>"a","class"=>"someclass","value"=>$value]).">";
   //NOTE: but it is actually slower than echo "<INPUT NAME=\"a\" CLASS=\"someclass\" VALUE=\"".$value."\">";
   //NOTE: this function doesn't checks are the attributes correct and suitable for the HTML element you making with it.
   
   $res="";
   if ($attrs_)
   {
      foreach ($attrs_ as $aname_=>$aval_)
         if (preg_match("/^(autofocus|allowfullscreen|checked|disabled|formnovalidate|hidden|multiple|readonly|required|selected)$/i",$aname_))
            $res.=(to_bool($aval_) ? " ".strtoupper($aname_) : "");
         else
            $res.=" ".strtoupper($aname_)."=\"".htmlspecialchars(str_replace("\n"," ",$aval_),ENT_COMPAT|ENT_HTML5)."\"";
   }
   
   return $res;
}

function phones_output($val_,$params_=NULL)
{
   $glue=arr_val($params_,"glue","/");
   $out_glue=arr_val($params_,"out_glue"," ");
   
   $attrs_str=(is_array(arr_val($params_,"attrs")) ? " ".serialize_element_attrs($params_["attrs"]) : "");
   $phones=is_array($val_) ? $val_ : explode($glue,$val_);
   $links=[];
   foreach ($phones as $phone)
      $links[]="<A HREF=\"tel:".preg_replace(["/^ *8/","/доб(авочный)?/i","/[^0-9+,.]/"],["+7",",",""],$phone)."\"".$attrs_str.">".htmlspecialchars(trim($phone))."</A>";
   
   return implode($out_glue,$links);
}

function emails_output($val_,$params_=NULL)
{
   $glue=arr_val($params_,"glue",",");
   $out_glue=arr_val($params_,"out_glue"," ");
   
   $attrs_str=(is_array(arr_val($params_,"attrs")) ? " ".serialize_element_attrs($params_["attrs"]) : "");
   $emails=is_array($val_) ? $val_ : explode($glue,$val_);
   $links=[];
   foreach ($emails as $email)
   {
      $email=htmlspecialchars($email);
      $links[]="<A HREF=\"mailto:".$email."\"".$attrs_str.">".$email."</A>";
   }
   
   return implode($out_glue,$links);
}

function send_email($recipients_,$subject_,$text_,$attachments_=null,$sender_="noreply")
{
   //Send an email with optional attachments
   //Arguments:
   // $recipients_ - array or string with comma-separated list of recipient emails
   // $subject_ - email subject
   // $text_ - email text
   // $attachments_ - array of attachments. Each element may be a path to file on server or assoc array with two fileds: ["name"=>"original-file-name","tmp_name"=>"/absolute/filepath"]. The last case is to attach uploaded file directly from temp folder.
   // $sender_ - an email that will appears in From and Reply-To. 
   
   //WARNING: contents of $text_, $subject_ and file names and paths in $attachments_ array are MUST BE MADE SAFE in advance.
   //NOTE: If you have/need any restrictions for attachments, you have to test and filter $attachments_ in advance.
   //      This function only test
   
   global $LOCALE;
   global $ERRORS;
   
   //Detect text mime subtype
   $is_html=preg_match("/<([!]doctype|html|body)/i",substr($text_,24));
   $text_type="text/".($is_html ? "html" : "plain")."; charset=\"utf-8\"";

   if (!$is_html)
      $text_=wordwrap($text_,70);   //wrap too long strings into 70 characters max in according with email specification
   
   //Make email:
   if (!$attachments_)              //Make a simple email
   {
      $content_main_type=$text_type;
      $content=$text_;
   }
   else  //Make email with attachments
   {
      //Include text:
      $content_main_type="multipart/mixed; boundary=\"/*--------*/\"";
      $content="--/*--------*/\n".
               "Content-type: ".$text_type."\r\n".
               "Content-Transfer-Encoding: base64\r\n\r\n".
               base64_encode($text_)."\r\n";

      //Attach files:
      foreach($attachments_ as $attachment)
      {
         $attachment=(is_array($attachment) ? $attachment : ["name"=>basename($attachment),"tmp_name"=>$attachment]);
         
         if (!$attachment["error"]&&file_exists($attachment["tmp_name"])) //Retest file existence, but don't emit error if it wasn't found
         {
            //Get and encode file contents:
            $file_content=base64_encode(file_get_contents($attachment["tmp_name"]));
               
            //Try to detect file type:
            $file_type="application/octet-stream";                      //By default - recognize file as untyped binary stream.
            if (function_exists("finfo_open"))                          //If the finfo PECL extention exists,
            {                                                           //   try to obtain real mime type of file:
               $finfo=finfo_open(FILEINFO_MIME_TYPE);                   // - open finfo database
               $file_type=finfo_file($finfo,$attachment["tmp_name"]);   // - try to get file type
               finfo_close($finfo);                                     // - close finfo database
            }
            
            //Append file as part of message:
            $content.="--/*--------*/\r\n".
                      "Content-type: ".$file_type."; name=\"".$attachment["name"]."\"\r\n".
                      "Content-Transfer-Encoding: base64\r\n".
                      "Content-Disposition: attachment\r\n\r\n".
                      $file_content."\r\n";
         }
      }

      $content."/*--------*/--";   //insert message end
   }
   
   //Make headers:
   $headers="From: ".$sender_."\r\n".
            "Reply-To: ".$sender_."\r\n".
            "X-Mailer: PHP/".phpversion()."\r\n".
            "Content-type: ".$content_main_type."\r\n";
   
   if (is_array($recipients_))
      $recipients_=implode(",",$recipients_);
   
   //Send
   return mail($recipients_,$subject_,$content,$headers);
}

function dump(...$args_)
{
   foreach ($args_ as $arg)
   {
      echo "\n<pre>";
      var_dump($arg);
      echo "</pre>\n";
   }
}

function dumpr(...$args_)
{
   foreach ($args_ as $arg)
   {
      echo "\n<pre>";
      
      if (is_array($arg))
         print_r($arg);
      else
         echo $arg;
      
      echo "</pre>\n";
   }
}
?>