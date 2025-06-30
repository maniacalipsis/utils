<?php
/*==================================*/
/* Utilities plugin                 */
/* Copyright: FSG a.k.a ManiaC      */
/* Contact: imroot@maniacalipsis.ru */
/* License: GNU GPL v3              */
/*----------------------------------*/
/* Additional utilities             */
/*==================================*/

//NOTE: This file contains some more useful code from ThePatternEngine, but from files other than /core/utils.php. Also it contains aditional utils originally written for this module.

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

// =============================================== Wrappers =============================================== //
function phones_output($val_,$params_=NULL)
{
   $glue=$params_["glue"]??",";
   $out_glue=$params_["out_glue"]??" ";
   
   $attrs_str=is_array($params_["attrs"]??null) ? " ".render_element_attrs($params_["attrs"]) : "";
   $phones=is_array($val_) ? $val_ : explode($glue,$val_);
   $links=[];
   foreach ($phones as $phone)
      $links[]="<A HREF=\"tel:".preg_replace(["/^ *8/","/доб(авочный)?|ext/i","/[^0-9+]/"],["+7",""],$phone)."\"".$attrs_str.">".htmlspecialchars(trim($phone))."</A>";
   
   return implode($out_glue,$links);
}

function emails_output($val_,$params_=NULL)
{
   $glue=$params_["glue"]??",";
   $out_glue=$params_["out_glue"]??" ";
   
   $attrs_str=(is_array($params_["attrs"]??null) ? " ".render_element_attrs($params_["attrs"]) : "");
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
   $max=$params_["max"]??512;            //Max output length.
   $min=$params_["min"]??max(1,$max-64); //Min output length.
   $keep_trailing_punct=to_bool($params_["keep_punct"]??false);
      
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
         
         $val_=mb_substr($val_,0,$min).substr($str_end,0,$break_pos+1).($params_["suffix"]??"");   //Concat start of the string ($min characters length) and the end of the string, truncated at the $break_pos byte offset.
      }
      else
         $val_=mb_substr($val_,0,$max).($params_["suffix"]??"");
   }
   
   return $val_;
}


function render_block_attributes(array $attributes,string $attrs_prefix="",array $attrs_map=["anchor"=>"id","className"=>"class","style"=>"style"]):string
{
	//Helps to convert Guttenberg block attributes to HTML element's ones and render'em to string.
	//Arguments:
	// $attributes - array. A Guttenberg block attributes. Note that, in general, they has no correlation with HTML element attributes.
	//TODO: Currently, this function implements "strict" mode i.e. it filters-off all that is not listed in the $attrs_map. However, there is a thought to add feature to pass all $attributes as is if $attrs_map is explicitly set [] or null.

   $mapped_attrs=[];
	foreach ($attrs_map as $key=>$attr_name)
		if (!empty($attributes[$attrs_prefix.$key]))
         $mapped_attrs[$attr_name]=$attributes[$attrs_prefix.$key];

	return render_element_attrs($mapped_attrs);
}
?>