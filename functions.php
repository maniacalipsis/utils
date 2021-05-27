<?php
/*==================================*/
/* Utilities plugin                 */
/* Copyright: FSG a.k.a ManiaC      */
/* Contact: imroot@maniacalipsis.ru */
/* License: GNU GPL v3              */
/*----------------------------------*/
/* Utility functions                */
/* (partially migrated from         */
/*  ThePatternEngine v3.3)          */
/*==================================*/

//Global namespace.

// ========================================== Utility Functions ========================================== //
function similar($a_,$b_)
{
   //$a_ == $b_ - Equal (after type juggling); $a_ === $b_ - Identical (both types and values are equal); same($a_,$b_) - meaning the similar things.
   //In some cases like a request, 0 and false doesn't means the same as NULL, "" and []. Also "" and [] are means the same - the "nothing".
   //Thus both of == and === aren't suitable for testing two values for similarity.
   //As the == is more equal for the task, the same() uses it after excluding of that cases when the == "misses".
   
   return (($a_===0||$a_===false)&&(is_null($b_)||$b_===""||$b_===[]))||(($b_===0||$b_===false)&&(is_null($a_)||$a_===""||$a_===[])) ? false : (($a_===""&&$b_===[])||($b_===""&&$a_===[]) ? true : $a_==$b_);
}

function wp_bs_escape($val_)
{
   //As WP applies the wp_unslash() to the data before putting to DB, the JSON 
   return str_replace("\\","[[_bs]]",$val_);
}

function wp_bs_unescape($val_)
{
   //As WP applies the wp_unslash() to the data before putting to DB, the JSON 
   return str_replace("[[_bs]]","\\",$val_);
}

function decode_request($raw_req_)
{
   if (is_array($raw_req_))
   {
      $res=[];
      foreach ($raw_req_ as $key=>$val)
         $res[$key]=decode_request($val);
   }
   else
      $res=stripcslashes($raw_req_);
   
   return $res;
}

/* --------------------------------------- string utilities --------------------------------------- */
function to_bool($val_)
{
   //Returns true if val_ may be understood as some variation of boolean true.

   return (is_bool($val_) ? $val_ : preg_match("/^(1|\+|on|ok|true|positive|y|yes|да)$/i",$val_));   //All, what isn't True - false.
}

function is_any_bool($val_)
{
   //Detects can the val_ be considered a some kind of boolean.
   
   return preg_match("/^(1|\+|on|ok|true|y|yes|да|0|-|off|not ok|false|negative|n|no|нет)$/i",$val_);
}

function mb_ucfirst($str_)
{
   //While mb_convert_case() has no native option to uppercase only the first letter as ucfirst() do, this function will do this instead it.
   
   return $str_=="" ? $str_ : mb_convert_case(mb_substr($str_,0,1),MB_CASE_UPPER).mb_convert_case(mb_substr($str_,1),MB_CASE_LOWER);
}


function mb_icmp($str1_,$str2_)
{
   //Multibyte case insensitive compare
   
   return strcmp(mb_convert_case($str1_,MB_CASE_LOWER),mb_convert_case($str2_,MB_CASE_LOWER));
}



function translate_date($date_str_,$is_genitive_=false)
{
   $months_l_en=["January","February","March","April","May","June","July","August","September","October","November","December"];
   $months_l_ru=[
                   ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"],
                   ["Января","Февраля","Марта","Апреля","Мая","Июня","Июля","Августа","Сентября","Октября","Ноября","Декабря"],
                ];
   return str_replace($months_l_en,$months_l_ru[$is_genitive_],$date_str_);
}

/* --------------------------------------- array utilities --------------------------------------- */
function arr_val($arr_,$key_,$default_=null)
{
   //As PHP 8.0 strict policy of array elements access, it needs a damn bunch of checks to avoid the warnings.
   
   return (is_array($arr_)&&key_exists($key_,$arr_) ? $arr_[$key_] : $default_);
}

/* --------------------------------------- [de]serialization --------------------------------------- */
function serialize_element_attrs($attrs_)
{
   //This function allows to almost completely make any HTML element from associative array of its attributes. E.g.: echo "<INPUT".serialize_element_attrs(["name"=>"a","class"=>"someclass","value"=>$value]).">";
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

/* --------------------------------------- HTML forms, inputs --------------------------------------- */
function html_select($name_,array $variants_,$default_="",$attrs_=[])
{
   //Arguments:
   // $name_ - name of the element.
   // $variants_ - "key"=>"val" associative array of variants of choise, where "key" is an actual value of option and "val" is a text displaying for the option.
   // $default_ - the value of selected option.
   // $attrs_ - any attributes, suitable for this HTML element.
   
   //NOTE: set attribute "multiple" to allow multiple selection
   $is_multiple=arr_val($attrs_,"multiple");
   
   $res="<SELECT NAME=\"".$name_.($is_multiple ? "[]" : "")."\"".serialize_element_attrs($attrs_).">";
   
   $defaults=is_array($default_) ? $default_ : explode(",",$default_);
   foreach ($variants_ as $val=>$opt)
   {
      $sel="";
      if (is_array($opt))
      {
         $opt_text=$opt["text"];
         $opt_attrs=serialize_element_attrs($opt["attrs"]);
      }
      else
      {
         $opt_text=$opt;
         $opt_attrs="";
      }
      
      if ($is_multiple)
      {
         foreach ($defaults as $def)
            if (similar($val,$def))
            {
               $sel=" SELECTED";
               break;
            }
      }
      elseif (similar($val,$default_))
         $sel=" SELECTED";
      
      $res.="<OPTION VALUE=\"".htmlspecialchars($val,ENT_COMPAT|ENT_HTML5)."\"".$opt_attrs.$sel.">".$opt_text."</OPTION>";
   }
   
   $res.="</SELECT>";
   
   return $res;
}

/* --------------------------------------- email --------------------------------------- */
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

// ------------------------ Database functions ------------------------ //
function name_to_query($name_)
{
   //Permanently replaces characters depreciated in the names of databases, tables, columns.
   //This function don't needs complementary decoding one, cause the correct names needs not any encoding.
   return "`".strtr($name_,"\0\"\n\\ `'[](){}<>.,/?!@#$%^&*-+=:;|","_________________________________")."`";
}

function data_to_query($val_)
{
   //General purpose function that protects queries from breaking or injections by means of special characters in data.
   //Usage: "UPDATE `table` SET `col_a`=".data_to_query($value).";";
   //NOTE: performance tests shows that str_replace() noticeably slows code only when it called for huge strings.
   //      But when it applied on a short values, the fact of calling of a function has more effect on execution time, so differentiation of, e.g., numbers will not make it faster because of caling of a type-checking functions.
   //NOTE: In MySQL the TRUE and the FALSE are aliases of '1' and '0', so raw boolean values in the data will be correctly type-casted.
   
   return is_null($val_) ? "NULL" : (array_search($val_,DB_CONSTANTS)!==false ? $val_ : "'".str_replace(["\0","`","'","\\"],["[[_0]]","[[_bq]]","[[_q]]","[[_bs]]"],$val_)."'");
}

function data_from_query($val_)
{
   //General purpose function that decodes special characters in data, encoded by data_to_query() and the same.
   
   return is_null($val_) ? NULL : str_replace(["[[_0]]","[[_bq]]","[[_q]]","[[_bs]]"],["\0","`","'","\\"],$val_);
}

// ------------------------ Debug functions ------------------------//
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

// =============================================== Wrappers =============================================== //
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

function text_clip_output($val_,$params_=NULL)
{
   $max=arr_val($params_,"max",512);            //Max output length.
   $min=arr_val($params_,"min",max(1,$max-64)); //Min output length.
   $keep_trailing_punct=to_bool(arr_val($params_,"keep_punct"));
      
   $val_=strip_tags($val_);   //Tags currently unsupported.
   $chr_len=mb_strlen($val_); //String length in characters.
   if ($chr_len>$max)
   {
      $str_end=mb_substr($val_,$min,$max-$min); //Seek punctuation marks and whitespaces between $min and $max characters.
      $max_pref=0;     //Rightest byte offset of one of the most preferred punctuation marks,
      $max_def=0;      // and the same but for deffered punctuation marks and whitespaces.
      if (preg_match_all("/[.!?;)(\]\[,\"& -]|\n/",$str_end,$matches,PREG_OFFSET_CAPTURE))   //Search single-byte punctuation marks.
      {
         foreach ($matches[0] as $match)  //Find byte offsets of the most right punctuation marks
            switch ($match[0])
            {
               case ".":
               case "!":
               case "?":
               {
                  if ($max_pref<$match[1])
                     $max_pref=$match[1];
                  break;
               }
               default:
               {
                  if ($max_def<$match[1])
                     $max_def=$match[1];
               }
            }
         
         $break_pos=($max_pref ? $max_pref : $max_def);        //Cut string end at the rightmost preferred punctuation mark, or, if it wasn't found, at the deffered one.
         if (!$keep_trailing_punct||($val_[$break_pos]==" "))
            $break_pos--;
         
         $val_=mb_substr($val_,0,$min).substr($str_end,0,$break_pos+1).arr_val($params_,"suffix","");   //Concat start of the string ($min characters length) and the end of the string, truncated at the $break_pos byte offset.
      }
      else
         $val_=mb_substr($val_,0,$max).arr_val($params_,"suffix","");
   }
   
   return $val_;
}

// ------------------------ Unified form validation ------------------------//
//Usage example:
// $errors=[];
// $fields=[
//            "trap"      =>["wrp"=>"feedback_check_trap" ,"required"=>true,"alt"=>[]       ,"err_msg"=>"Что-то тут не то."],
//            "name"      =>["wrp"=>"feedback_wrap_string","required"=>true,"alt"=>[]       ,"err_msg"=>"Пожалуйста, укажите имя."],
//            "phone"     =>["wrp"=>"feedback_wrap_string","required"=>true,"alt"=>["email"],"err_msg"=>"Пожалуйста, укажите телефон или e-mail."],
//            "email"     =>["wrp"=>"feedback_wrap_string","required"=>true,"alt"=>["phone"],"err_msg"=>"Пожалуйста, укажите телефон или e-mail."],
//         ];
// $wrapped_data=validate_n_wrap_form($_POST,$fields,$errors);

function validate_n_wrap_form($src_data,$fields_,&$errors_)
{
   $res_data=[];
   
   //1st pass - wrap src data:
   foreach ($fields_ as $key=>$params)
      if (key_exists($key,$src_data))
         $res_data[$key]=$params["wrp"]($src_data[$key]);
      else
         $res_data[$key]="";
   
   //2nd pass - check if all required fields filled:
   $checked_alts=[];
   foreach ($fields_ as $key=>$params)
      if (!in_array($key,$checked_alts)) //Skip the fields already checked.
         if (($res_data[$key]==="")&&$params["required"])
         {
            //When current field isn't filled, try to ckeck an alternative ones:
            $is_alt_filled=false;
            foreach ($params["alt"] as $alt_key)
               if ($res_data[$alt_key]!=="")
               {
                  $is_alt_filled=true;
                  break;
               }
            
            if (!$is_alt_filled)
               $errors_[]=$params["err_msg"];   //Error message of the current field should notice about all its alternatives.
            $checked_alts+=$params["alt"];      //NOTE: There is no need to ckeck exactly all the alternative fields if at least one of them is filled.
         }
   
   return $res_data;
}

function feedback_check_trap($val_)
{
   return ($val_=="" ? "ok" : ""); //Trap must be empty to pass the test. //NOTE: The feedback_validate_n_wrap_form() requires exact "" to teat $val_ as inacceptable.
}

function feedback_wrap_string($val_)
{
   return htmlspecialchars(trim(substr(strip_tags($val_),0,255)));   //NOTE: The feedback_validate_n_wrap_form() requires exact "" to teat $val_ as inacceptable.
}

function feedback_wrap_text($val_)
{
   return htmlspecialchars(trim(substr(strip_tags($val_),0,20480))); //NOTE: The feedback_validate_n_wrap_form() requires exact "" to teat $val_ as inacceptable.
}

function feedback_wrap_int($val_)
{
   return (is_numeric($val_) ? intval($val_) : ""); //NOTE: The feedback_validate_n_wrap_form() requires exact "" to teat $val_ as inacceptable.
}

?>