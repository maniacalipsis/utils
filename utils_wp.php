<?php
/*==================================*/
/* Utilities plugin                 */
/* Copyright: FSG a.k.a ManiaC      */
/* Contact: imroot@maniacalipsis.ru */
/* License: GNU GPL v3              */
/*----------------------------------*/
/* Additional utilities for WP      */
/*==================================*/

//NOTE: This file contains some more useful code from ThePatternEngine, but from files other than /core/utils.php. Also it contains aditional utils originally written for this module.

class ClassesAutoloader
{
   //This is adapted version of the /core/core.php\ClassesAutoloader from ThePatternEngine.
   // Unlike the original one, it utilize error_log() and __() instead of core classes Report and LC. The rest is completely same.
   
   private function __construct(){}
   
   protected static array $map=[];
   
   public static function append(array $map_)
   {
      //Append mappings to the autoloader.
      //Arguments:
      // $map_ - array. Format: ["/absolute/path/to/classes/subfolder"=>"NameSpace\\Prefix",...]. See https://www.php-fig.org/psr/psr-4/ for details.
      
      foreach ($map_ as $base_dir=>$ns_prefix)
      {
         $prefix_len=0;
         if ($ns_prefix!="")                 //Namespace prefix may be an empty string if certain classes are declared in the global namespace or if subfolder structure represents namespaces from their beginnings.
         {
            $ns_prefix="$ns_prefix\\";       //Append trailing backslash to the namespace prefix to make sure it will not match namespace names partially or className in a whole. Due to autoloading optimization, do this in advance.
            $prefix_len=strlen($ns_prefix);  //Also cache the prefix length to optimize comparisons in the future.
         }
         self::$map[$base_dir]=["ns_prefix"=>$ns_prefix,"prefix_len"=>$prefix_len];
      }
   }
   
   public static function callback($class_name_)
   {
      //Callback function for classes autoloading.
      
      $php_rel_path=null;
      foreach (self::$map as $base_dir=>$entry)
      {
         if (($entry["prefix_len"]==0)||(strncmp($class_name_,$entry["ns_prefix"],$entry["prefix_len"])==0))
         {
            $php_rel_path??=strtr($class_name_,"\\","/").".php";                       //To minimize overhead, make cached relative file path from the whole fully qualified class name
            $php_abs_path=$base_dir."/".substr($php_rel_path,$entry["prefix_len"]);    // and then extract the rest of the path that follows the namespace prefix.
            if (file_exists($php_abs_path))
            try
            {
               require_once $php_abs_path;
               break;
            }
            catch (Error|Exception $ex)
            {
               error_log($ex->getMessage());
            }
         }
      }
      
      if (!(class_exists($class_name_,false)||trait_exists($class_name_,false)||interface_exists($class_name_,false)))
         error_log(__("Class autoloader failed to find required class ")."\"$class_name_\"");
   }
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

// -------------- WP-specific Database classes/functions -------------- //
trait TMetaQueryHepler
{
   public const META_QUERY_GLUE=";";
   public const INCLUDE_GLUE=",";
   public const NAMEVAL_GLUE="=";
   
   protected  array $filter_allowed =["post_type"=>"esc_str","category"=>"esc_int","category_name"=>"esc_str","tag"=>"esc_str","post_status"=>"esc_post_status","post_parent"=>"esc_int","orderby"=>"esc_str","order"=>"esc_order","offset"=>"esc_int","numberposts"=>"esc_int","exclude"=>"esc_int_arr","include"=>"esc_int_arr","meta_key"=>"esc_str","meta_value"=>"esc_str","meta_query"=>"esc_str_arr","tax_query"=>"esc_str_arr"];
   protected  array $filter_defaults=["post_type"=>"post","post_status"=>"publish","orderby"=>"date","order"=>"DESC","numberposts"=>-1,"exclude"=>[],"include"=>[],"meta_query"=>null,"tax_query"=>null];
   protected ?array $filter=null;   //Current filter state. Use after self::prepare_filter().
   
   
   protected function prepare_filter(array $params_,bool $escape_=false):array
   {
      //Cook the filter from the params_ and defaults.
      //This separate method allows a derived classes to interfere into the det_data() after the filter is ready.
      //As a side effect, sets internal property $this->filter.
      
      //Get the posts filtering params:
      $numberposts=$params_["numberposts"]??$params_["count"]??null; //Translate "count" to "numberposts" as the last one isn't intuitive.
      if ($numberposts!=null)                                        //
         $params_["numberposts"]=$numberposts;                       //
      
      //Parse meta query parameter:
      $params_["meta_query"]=self::parse_sub_query($params_["meta_query"]??null);
      $params_["tax_query"]=self::parse_sub_query($params_["tax_query"]??null);
      
      $this->filter=array_intersect_key($params_,$this->filter_allowed);      //Filter params of the filter.
      if ($escape_)
         foreach ($this->filter as $key=>$val)
            $this->filter[$key]=$this->{$this->filter_allowed[$key]}($val);
      $this->filter=array_merge($this->filter_defaults,$this->filter);
      
      return $this->filter;
   }
   
   protected static function parse_sub_query($sub_query_)
   {
      //Helper method.
      
      $res=null;
      
      if (($sub_query_!==null)&&(!is_array($sub_query_)))   //If "meta_query" is naturally passed as array (e.g. using $shortcode->do([...])) then let it be.
      {
         $res=[];
         
         $pairs=explode(self::META_QUERY_GLUE,$sub_query_);
         foreach ($pairs as $pair)
         {
            $name_val=explode(self::NAMEVAL_GLUE,$pair);
            $val=$name_val[1]??null;             //The equal sign may absent.
            
            if (($val=="true")||($val=="false")) //Convert exact "true"/"false" to boolean.
               $val=to_bool($val);
            
            $res[]=["key"=>$name_val[0],"value"=>$val];
         }
      }
      
      return $res;
   }
   
   protected function esc_int($val_):int
   {
      return (int)$val_;
   }
   
   protected function esc_str($val_):string
   {
      return strip_tags($val_);
   }
   
   protected function esc_int_arr($val_):array
   {
      $res=[];
      if (is_array($val_))
         foreach ($val_ as $k=>$v)
            $res[$k]=(int)$v;
      return $res;
   }
   
   protected function esc_str_arr($val_):array
   {
      $res=[];
      if (is_array($val_))
         foreach ($val_ as $k=>$v)
            $res[$k]=$this->esc_str($v);
      return $res;
   }
   
   protected function esc_post_status($val_):string
   {
      return "publish"; //Force selecting published posts when escaping request params.
   }
   
   protected function esc_order($val_):string
   {
      return ["ASC"=>"ASC","DESC"=>"DESC","asc"=>"ASC","desc"=>"DESC"][$val_]??"ASC";
   }
}

// ------------------------ Content rendering ------------------------- //
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

function get_post_image_src(WP_Post $post_,string $size_='full')
{
   //Shorthand for retrieving post's thumbnail image src.
   //Arguments:
   // $post_ - WP_Post instance.
   // $size_ - [full|large|medium|thumbnail].
   //Return value:
   // Post's thumbnail URL encoded with htmlspecialchars().
   
   return htmlspecialchars(wp_get_attachment_image_url(get_post_thumbnail_id($post_->ID),$size_??$this->image_size));
}

function get_breadcrumbs(bool $include_current=false):array
{
   $res=[];
   
   $curr_post=get_post();
   // var_dump($curr_post);
   
   return $res;
}
?>