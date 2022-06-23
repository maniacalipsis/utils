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

class CheckList
{
   //This class helps to maintain a long check sequences.
   //Usage example:
   // $errors=[];
   // $cl=new CheckList($errors);
   // $cl->check($val1==CORRECT_VAL1,"err1");      //<- The independent check.
   // if ($cl->check($val2==CORRECT_VAL2,"err2"))  //If master check fails, then dependent checks will not be made. But it's ok, because this one failed check made the list unable to pass the whole test.
   //    $cl->check($val3==CORRECT_VAL3,"err3");   //<- The dependent check.
   // if ($cl->is_passed())
   //    do_something();
   // else
   //    dump($errors);
   
   private $checks_made=0;
   private $checks_passed=0;
   private $errors=null;
   
   public function __construct(&$errors_)
   {
      $this->errors=&$errors_;   //Save ptr to put error messages directly into an external array.
   }
   
   public function check($check_res_,$err_msg_=null)
   {
      //Register a check result.
      
      $this->checks_made++;
      if ($check_res_)
         $this->checks_passed++;
      elseif ($err_msg_&&is_array($this->errors))
         if (is_array($err_msg_))
            $this->errors+=$err_msg_;
         else
            $this->errors[]=$err_msg_;
      
      return $check_res_;   //Return $check_res_ to enable the chained and conditional checks.
   }
   
   public function is_passed()
   {
      //Does the whole test is passed?
      // This method returns true if all checks are passed.
      // If any of checks failed false or also if there are no check was made at all, the false will be returned.
      
      return (($this->checks_made>0)&&($this->checks_passed==$this->checks_made));
   }
   
   public function reset()
   {
      $this->checks_made=0;
      $this->checks_passed=0;
   }
}

/* --------------------------------------- string utilities --------------------------------------- */
function to_bool($val_)
{
   //Returns true if val_ may be understood as some variation of boolean true.

   return (is_bool($val_) ? $val_ : preg_match("/^(1|\+|on|ok|true|positive|y|yes|да)$/i",$val_)==1);   //All, what isn't True - false.
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

function blend_with_spices($substance_,$spice_)
{
   //Blends login and password withh salt and pepper before frying with hash().
   //This function works in pair with the same JS one on the client side.
   
   $len=min(mb_strlen($substance_),mb_strlen($spice_));
   $mix="";
   for ($i=0;$i<$len;$i++)
      $mix.=mb_substr($spice_,$i,1).mb_substr($substance_,$i,1);
   $mix.=(mb_strlen($spice_)>$len) ? mb_substr($spice_,$len) : mb_substr($substance_,$len);
   
   return $mix;
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
function array_extend(array $defaults_,array $array_)
{
   //Recursively replaces $defaults_ elements having the string keys and appends elements with the numeric keys.
   $res=$defaults_;
   
   foreach ($array_ as $key=>$val)
      if (is_int($key))
         $res[]=$val;
      else
         $res[$key]=(is_array($val)&&is_array($res[$key]??null) ? array_extend($res[$key],$val) : $val);   //If $defaults_ has no key of $array_, then recursion is needless.
   
   return $res;
}

class JSONAns extends ArrayObject implements Stringable
{
   //Array, automatically convertable to JSON. 
   //Usefull for making of JSON answers, that can be directly echoed.
   
   public function __toString():string
   {
      return json_encode($this,JSON_ENCODE_OPTIONS);
   }
}

/* --------------------------------------- [de]serialization --------------------------------------- */
function serialize_element_attrs(array|string|null $attrs_=NULL)
{
   //This function allows to almost completely make any HTML element from associative array of its attributes. E.g.: echo "<INPUT".serialize_element_attrs(["name"=>"a","class"=>"someclass","value"=>$value]).">";
   //Arguments:
   // $attrs_ - array of tag attributes, where key is attribute name and val is its value.
   //           If the attribute value type is boolean, it will be recognized as a boolean attribute, which is true if its name exist in the tag and false if not. But note that if not boolean attribute will come with boolean value, it will esult a logically incorrect result.
   //           If the $attrs_ is a string, it will be returned as is. This feature can be used for optimization.
   //NOTE: this function doesn't checks are the attributes correct and suitable for the HTML element you making with it.
   
   if (is_array($attrs_))
   {
      $res="";
      foreach ($attrs_ as $name=>$val)
         if ($val!==null)
         {
            //TODO: The following line is an name-based detection of the boolean attributes which can appear with no value. 
            //      Now it was replaced with the more lightweight check, but there may be a problem if the DATA-.. attribute will have boolean value.
            //      E.g. for ["smth"=>true] and ["smth"=>false] the new code will output " DATA-SMTH" and "" respectively, instead of " DATA-SMTH=\"1\"" and " DATA-SMTH=\"0\"". Its will not break HTML validity, but JS will recognize it as empty string and null respectively.
            //      If this problem will not trouble, then 
            //if (preg_match("/^(autofocus|allowfullscreen|checked|disabled|formnovalidate|hidden|multiple|readonly|required|selected)$/i",$name))
            if (is_bool($val))   //Valid ONLY for the boolean attributes: autofocus, allowfullscreen, checked, disabled, formnovalidate, hidden, multiple, readonly, required, selected.
            {
               if ($val)
                  $res.=strtoupper($name);
            }
            else
               $res.=" ".strtoupper($name)."=\"".htmlspecialchars(str_replace("\n"," ",$val),ENT_COMPAT|ENT_HTML5)."\"";
         }
   }
   else
      $res=$attrs_;
   
   return $res;
}

/* --------------------------------------- HTML forms, inputs --------------------------------------- */
function html_select($name,array $var,array|string|null $default="",array|string|null $attrs="",$is_multiple=null)
{
   //Arguments:
   // $name - name of the element.
   // $var  - ["val"=>_opt_,...] array of variants of choise, where 
   //          "val" - is a value of option,
   //          _opt_ - is a string or array. The string is just a simple option text, whereas array allows to add some attribute to the option tag, its format is ["text"=>"Option text","attrs"=>_tag_attrs_], where _tag_attrs_ can be string or array (see serialize_element_attrs() for details).
   // $default - the value[s] of selected option[s]. NOTE: this function doesn't care if the number of $default values doesn't conform the "multiple" attribute.
   // $attrs - attributes for <SELECT> tag. The value can be an array or a precomplied string (see serialize_element_attrs() for details).
   // $is_multiple - NOTE: Use this argument only if $attrs is a precomplied string. Otherwise use $attrs["multiple"].
   
   $is_multiple??=$attrs["multiple"]??false;
   
   $default??="";                  //The null has to match option with value "" but not with int(0). Btw, array key can't be null (it's casted to "").
   $is_def_arr=is_array($default); //Array will be treaten as array, regardless to $is_multiple.
   
   $res="<SELECT NAME=\"".$name.($is_multiple ? "[]" : "")."\"".serialize_element_attrs($attrs).">";
   
   foreach ($var as $val=>$opt)
   {
      if (is_array($opt))
      {
         $opt_text=$opt["text"];
         $opt_attrs=serialize_element_attrs($opt["attrs"]??null);
      }
      else
      {
         $opt_attrs="";
         $opt_text=$opt;
      }
      
      if (($is_def_arr&&$default&&array_search($val,$default)!==false)||($val==$default)) //NOTE: Conditions order is important! Also $is_def_arr&&$default allows to avoid useless call of the array_search for the empty array.
         $opt_attrs.=" SELECTED";
      
      $res.="<OPTION VALUE=\"".htmlspecialchars($val,ENT_COMPAT|ENT_HTML5)."\"".$opt_attrs.">".$opt_text."</OPTION>";
   }
   
   $res.="</SELECT>";
   
   return $res;
}

/* --------------------------------------- File sistem utils --------------------------------------- */
//scan_catalog filtering
define("SCANCAT_FOLDERS",1);
define("SCANCAT_FILES",2);
define("SCANCAT_HIDDEN",4);
//scan_catalog sorting
define("SORTCAT_ASC",0);
define("SORTCAT_DESC",1);
define("SORTCAT_BY_NAME",2);
define("SORTCAT_BY_SIZE",4);
define("SORTCAT_BY_CREATED",8);
define("SORTCAT_BY_MODIFIED",16);
define("SORTCAT_BY_FORMAT",32);
define("SORTCAT_BY_EXT",64);
function scan_catalog($catalog_,$options_=[])
{
   //Options:
   // "sort" - is a binary combination of <comparing_attribute>&<sort_direction>. Comparing attributes are: SORTCAT_NAME, SORTCAT_SIZE, SORTCAT_CREATED, SORTCAT_MODIFIED, SORTCAT_FORMAT or SORTCAT_EXT. NOTE: these constants should NOT be combited together.
   //          Sort directions are: SORTCAT_ASC and SORTCAT_DESC. NOTE: ascending sorting is default and it is not necessary to designate it literally.
   // "filter" - regexp
   // "show"   - binary mask, defines what type of FS entries will be shown: SCANCAT_FOLDERS, SCANCAT_FILES, SCANCAT_HIDDEN.
   // "group"  - list folders and files separately. If true, array ["folders"=>[<folder_entries...>],"files"=>[<file_entries...>]] will be returned, otherwise - [<any_entries...>].
   // "extended" - display additional info about files and folders. If true, each returned entry will be array like ["name"=>"<entrie_name>",<entrie_attributes...>], otherwise each returned entry will be a string containing its name.
   
   $res=($options_["group"]??false ? ["folders"=>[],"files"=>[]] : []);
   
   //Init default options
   $options_["show"]=$options_["show"]??SCANCAT_FOLDERS|SCANCAT_FILES;
   
   //Init filter
   if (is_array($options_["filter"]??null))
   {
      $filter_folders=$options_["filter"]["folders"]??"";
      $filter_files  =$options_["filter"]["files"]??"";
   }
   else
      $filter_folders=$filter_files=$options_["filter"]??"";
      
   //Get catalog contents
   $names=scandir($catalog_);
   foreach ($names as $name)
      if (($name!=".")&&($name!=".."))   //Skip "." and "..", then apply filter if it has defined.
      {
         $pass=true; //Pass the entry into result
         
         $fullpath=concat_paths($catalog_,$name);
         $is_dir=is_dir($fullpath);
         $is_hidden=($name[0]==".");
         
         //Filter entry by flags (file/folder,hidden)
         $flags=($is_dir ? SCANCAT_FOLDERS : SCANCAT_FILES)|($is_hidden ? SCANCAT_HIDDEN : 0);
         if (!($flags&$options_["show"]))
            $pass=false;
         
         //Filter entry by name
         if ($is_dir&&$filter_folders&&!preg_match($filter_folders,$name))
            $pass=false;
         elseif (!$is_dir&&$filter_files&&!preg_match($filter_files,$name))
            $pass=false;
         
         //Append entry to result
         if ($pass)
         {
            if ($options_["extended"])
            {
               $entry=[
                        "name"=>($options_["fullpath"] ? $fullpath : $name),
                        "ext"=>file_ext($name),
                        "hidden"=>$is_hidden,
                        "link"=>is_link($fullpath)
                      ];
               if ($entry["link"])
               {
                  $fullpath=readlink($fullpath);
                  $entry["link_to"]=$fullpath;
                  $entry["broken"]=!file_exists($fullpath);
               }
               if (!$entry["broken"])
               {
                  $entry["size"]=filesize($fullpath);
                  $entry["mime"]=mime_content_type($fullpath);
                  $entry["permissions"]=fileperms($fullpath);
                  $entry["owner"]=fileowner($fullpath);
                  $entry["group"]=filegroup($fullpath);
                  $entry["created"]=filectime($fullpath);
                  $entry["modified"]=filemtime($fullpath);
               }
            }
            else
               $entry=($options_["fullpath"] ? $fullpath : $name);
            
            //Group entries
            if ($options_["group"])
               $res[($is_dir ? "folders" : "files")][]=$entry;
            else
               $res[]=$entry;
         }
      }
   
   //Sort entries with callbacks
   $acceptable_sort=($options_["extended"] ? 0b1111110 : SORTCAT_BY_NAME);
   if ($options_["sort"]&$acceptable_sort)
   {
      $sort_callback="scan_cat_cmp_".$options_["sort"];
      if ($options_["group"])
      {
         usort($res["folders"],$sort_callback);
         usort($res["files"],$sort_callback);
      }
      else
         usort($res,$sort_callback);
   }
   
   return $res;
}
//Comparing callbacks for scan_catalog():
function scan_cat_cmp_2($a_,$b_)   //name asc
{
   return is_array($a_) ? strnatcmp($a_["name"],$b_["name"]) : strnatcmp($a_,$b_);
}
function scan_cat_cmp_3($a_,$b_)   //name desc
{
   return is_array($a_) ? strnatcmp($b_["name"],$a_["name"]) : strnatcmp($b_,$a_);
}
function scan_cat_cmp_4($a_,$b_)   //size asc
{
   return $a_["size"]-$b_["size"];
}
function scan_cat_cmp_5($a_,$b_)   //size desc
{
   return $b_["size"]-$a_["size"];
}
function scan_cat_cmp_8($a_,$b_)   //created asc
{
   return $a_["created"]-$b_["created"];
}
function scan_cat_cmp_9($a_,$b_)   //created desc
{
   return $b_["created"]-$a_["created"];
}
function scan_cat_cmp_16($a_,$b_)  //modified asc
{
   return $a_["modified"]-$b_["modified"];
}
function scan_cat_cmp_17($a_,$b_)  //modified desc
{
   return $b_["modified"]-$a_["modified"];
}
function scan_cat_cmp_32($a_,$b_)  //format asc
{
   return strnatcmp($a_["format"],$b_["format"]);
}
function scan_cat_cmp_33($a_,$b_)  //format desc
{
   return strnatcmp($b_["format"],$a_["format"]);
}
function scan_cat_cmp_64($a_,$b_)  //extension asc
{
   return strnatcmp($a_["ext"],$b_["ext"]);
}
function scan_cat_cmp_65($a_,$b_)  //extension desc
{
   return strnatcmp($b_["ext"],$a_["ext"]);
}

function format_bytes($val_,$precision_=2,$space_=" ")
{
   $prefixes=["B","KB","MB","GB","TB"];   //binary prefixes
   $pow=floor(log($val_,1024));           //get real power of $val_
   $pow=min($pow,count($prefixes)-1);
   return round($val_/(1<<($pow*10)),$precision_).$space_.$prefixes[$pow];
}

function permissions_to_str($perm_)
{
   return decoct($perm_&0777); //TODO: change to rwx
}

function permissions_to_int($perm_)
{
   return (is_int($perm_) ? $perm_ : ""); //TODO:
}

function concat_paths(...$dirs_)
{
   //Concatenates several parts of FS path.
   
   $res=rtrim(reset($dirs_),"/");
   while ($dir=next($dirs_))
      $res.="/".trim($dir,"/");
   
   return $res;
}

function file_ext($name_)
{
   //Return an extension from file name or path. Works correctly with unix hidden files.
   
   return (preg_match("/[^\\/]+\\.([^.\\/]+)$/",$name_,$matches) ? $matches[1] : "");
}

function escape_file_path($path_)
{
   //Removes potentially riskful, illegal and masking characters and character sequences.
   //  It is NOT recommended to use this function at high loaded scripts and large cycles, if it not very necessary.
   //if $path_ starts not from "/", then it is resolving as relative from top directory
   
   $path_=preg_replace("/[\\t\\r\\n\\\\<>{}@#$&~!%:;*?`\"'\\0]/m","",$path_); //remove disallowed characters
   $path_=preg_replace("/^\\.{2}\\/|\\/(\s*\\.{2}\s*\\/)+/","/",$path_);      //remove /../
   $path_=preg_replace("/\\/+/","/",$path_);                                  //collapse multiple slashes (//)
   
   return $path_;
}

function escape_file_name($name_)
{
   //Removes path to file, leaves only name. removes illegal and masking characters.
   
   $name_=preg_replace("/[\\t\\r\\n\\/\\\\<>{}@#$&~!%:;*?`\"'\\0]/m","",$name_); //remove disallowed characters
   if ($name_=="."||$name_=="..") //disallow special names
      $name_="";
   
   return $name_;
}

function abs_path($path_,$root_="")
{
   //Force $path_ to absolute according to the $root_ directory
   if (!$root_)
      $root_=$_SERVER["DOCUMENT_ROOT"];
   
   if (($path_[0]!="/")||(strncmp($path_,$root_,strlen($root_))!=0)) //attach $path_ to the $root_ directory
      $path_=concat_paths($root_,$path_);
   
   return $path_;
}

function rel_path($path_,$root_="")
{
   //Extracts relative path from absolute
   if (!$root_)
      $root_=$_SERVER["DOCUMENT_ROOT"];
   
   $root_=rtrim($root_,"/");                          //remove trailing slash from the root directory
   $root_len=strlen($root_);
   if (strncmp($path_,$root_,$root_len)==0)
      $path_=substr($path_,$root_len);
   
   return $path_;
}

function uploaded_files($key_,$params_=[])
{
   //Minimal action: make some tests on uploaded files and return info in more friendly-formed array.
   //Additional action: move these files to specified destination and rename as needed.
   //Arguments:
   // $key_ - name of the file input. WARNING: the actual file input name in the form MUST ends with "[]".
   // $params_ - optional set of parameters. 
   //Parameters:
   // "max_count" - limit amount of files. The file will not be counted if it doesn't met other conditions or it wasn't successfully uploaded.
   // "max_size" - filter files by maximum size.
   // "max_total_size" - limit total size of uploaded files.
   // "move_to" - destination folder, where uploaded files should be moved from temp folder.
   // "rename" - Tells what name to assign to the uploadeded file when it permanently stored on server. NOTE: works only with $params_["move_to"].
   //            Possible values:
   //             "original" - use the name originally given by user.
   //             "incremental" - scan destination folder and find an existing file with the same prefix and the largest number. Store the newly uploaded file with the number incremented by one. NOTE: file extensions will be kept.
   //             NULL or any false - store the file keeping it's temporary name.
   // "prefix" - string, prefix of the file name, when incremental naming is selected (see "rename").
   // "decimals" - int, While incremental renaming, the file numbers will be padded with leading zeros up to this number of digits. The default value is 0.
   
   global $LOCALE;
   
   $res=[];
   
   $count=0;         //counter of successfully added files (that was uploaded, passed all tests and optionally moved to dest folder)
   $total_size=0;    //total size off these files
   $stop=false;      //termination flag
   
   $params_defaults=["move_to"=>null,"count_existing"=>false,"max_count"=>null,"max_size"=>null,"total_size"=>null,"allowed"=>null,"disallowed"=>null,"names_allowed"=>null,"names_disallowed"=>null,"rename"=>null,"prefix"=>"","decimals"=>0];
   $params_=array_extend($params_defaults,$params_);
   $params_["prefix"]=escape_file_name($params_["prefix"]);
   
   //Prepare error codes explanation
   //See http://php.net/manual/en/features.file-upload.errors.php for details
   $err_expl=[
                UPLOAD_ERR_OK=>"",
                UPLOAD_ERR_INI_SIZE=>"The uploaded file exceeds the upload_max_filesize directive.",
                UPLOAD_ERR_FORM_SIZE=>"The uploaded file exceeds the MAX_FILE_SIZE directive that was specified in the HTML form.",
                UPLOAD_ERR_PARTIAL=>"The uploaded file was only partially uploaded.",
                UPLOAD_ERR_NO_TMP_DIR=>"Missing a temporary folder.",
                UPLOAD_ERR_CANT_WRITE=>"Failed to write file to disk.",
                UPLOAD_ERR_EXTENSION=>"A PHP extension stopped the file upload.",
             ];
   
   //Get destination folder and check if it exists:
   $dest_dir=($params_["move_to"]!==null ? abs_path(escape_file_path($params_["move_to"])) : null);
   $dest_dir_exists=($dest_dir!==null)&&(file_exists($dest_dir)&&is_dir($dest_dir));
   
   if ((($dest_dir!==null)&&$dest_dir_exists)&&(($params_["rename"]=="incremental")||$params_["count_existing"]))
   {
      $files=scan_catalog($dest_dir,["show"=>SCANCAT_FILES]);
      
      //Start files count from existing ones:
      if ($params_["count_existing"])
         $count=count($files);
      
      //Find a maximum existing number for incremental renaming:
      if ($params_["rename"]=="incremental")
      {
         $max_num=0;
         $number_regexp="/^".preg_replace("/[\\[\\]\\(\\)\\.\\/\\\\]/","\\\\$0",$params_["prefix"])."([0-9]+)(\\.|$)/"; //Escape regexp special characters in the prefix. Also the pattern will ignore filename extension.
         foreach ($files as $file)
            if (preg_match($number_regexp,$file,$matches))   //Get a number from the filename
            {
               $num=(int)$matches[1];
               if ($num>$max_num)
                  $max_num=$num;
            }
      }
   }
   
   //Process files
   foreach ($_FILES[$key_]["error"] as $i=>$upload_err_code)
   {
      $error=null;
      
      //Check is any file was uploaded by each input.
      if ($upload_err_code==UPLOAD_ERR_NO_FILE)
         continue;
      
      //Test each file against given conditions:
      if ($upload_err_code)
         $error=$err_expl[$upload_err_code];   //Turn error code to human-readable
      elseif (!is_uploaded_file($_FILES[$key_]["tmp_name"][$i]))
         $error=($LOCALE ? $LOCALE["Not_uploaded_file"] : "Not an uploaded file").".";
      elseif ($params_["max_size"]&&($_FILES[$key_]["size"][$i]>$params_["max_size"]))
         $error=($LOCALE ? $LOCALE["File_too_large"] : "File is too large").".";
      elseif (($params_["disallowed"]&&(is_array($params_["disallowed"]) ? array_search($_FILES[$key_]["type"][$i],$params_["disallowed"])!==false : preg_match($params_["disallowed"],$_FILES[$key_]["type"][$i])))||
              ($params_["allowed"]&&(is_array($params_["allowed"]) ? array_search($_FILES[$key_]["type"][$i],$params_["allowed"])===false : !preg_match($params_["allowed"],$_FILES[$key_]["type"][$i])))||
              ($params_["names_disallowed"]&&(preg_match($params_["names_disallowed"],$_FILES[$key_]["name"][$i])))||
              ($params_["names_allowed"]&&(!preg_match($params_["names_allowed"],$_FILES[$key_]["name"][$i]))))
         $error=($LOCALE ? $LOCALE["File_is_not_allowed"] : "File type or name is not allowed").".";
      elseif (($params_["max_count"]!==null)&&($count>=$params_["max_count"]))   //NOTE: If all previous checks are passed, then the current file is to be added, but if  $count is already equal to params_["max_count"], then the limit will be exceeded.
      {
         $error=($LOCALE ? $LOCALE["Too_many_files"] : "Too many files").".";
         $stop=true;
      }
      elseif ($params_["total_size"]&&($total_size+$_FILES[$key_]["size"][$i]>$params_["total_size"]))
      {
         $error=($LOCALE ? $LOCALE["Total_uploads_size_exceeded"] : "Total uploads size exceeded").".";
         $stop=true;
      }
      
      $filepath=$_FILES[$key_]["tmp_name"][$i];
      
      //Move file to uploads folder (if it was given)
      if (!$error&&($dest_dir!==null))
      {
         switch ($params_["rename"]??null)
         {
            case "original":
            {
               $new_file_name=escape_file_name($_FILES[$key_]["name"][$i]); //Use user-defined filename
               
               break;
            }
            case "incremental":
            {
               $ext=file_ext($_FILES[$key_]["name"][$i]);
               $new_file_name=$params_["prefix"].str_pad(++$max_num,(int)$params_["decimals"],"0",STR_PAD_LEFT).($ext ? ".".$ext : "");   //Concatenate a constant prefix, file number (incremented and padded to specified length) and original filename extension if it exists.
               break;
            }
            default:
            {
               $new_file_name=escape_file_name($_FILES[$key_]["tmp_name"][$i]);   //Use temporary name, given to the file by server.
            }
         }
         
         if (!$dest_dir_exists)
            $dest_dir_exists=mkdir($dest_dir,0775,true); //Create destination folder on demand
         
         $filepath=concat_paths($dest_dir,$new_file_name);
         if (!move_uploaded_file($_FILES[$key_]["tmp_name"][$i],$filepath))
            $error=($LOCALE ? $LOCALE["Moving_uploaded_file_failed"] : "Moving to destination folder has failed").".";
      }
      
      //Add file info to result in both success and error cases. In case of error it will provide error messsage with additional info.
      if ($upload_err_code!=UPLOAD_ERR_NO_FILE) //Simply skip items on this error
         $res[$i]=[
                     "error"=>$error,
                     "tmp_name"=>$filepath,
                     "name"=>$new_file_name,
                     "orig_name"=>$_FILES[$key_]["name"][$i],
                     "type"=>$_FILES[$key_]["type"][$i],
                     "size"=>$_FILES[$key_]["size"][$i],
                  ];
      
      //Continue if there was no error that requires termination
      if (!$stop)
      {
         $count++;
         $total_size+=$_FILES[$key_]["size"][$i];
      }
      else
         break;   //Terminate process if error requires so. The last element in $res will contain message of the error, caused termination.
   }
   
   return $res;
}

function check_perms($path_,$perms_list_)
{
   //
   
   $res=["perms"=>0,"top_dir"=>""];
   
   $max_matched=0;
   foreach ($perms_list_ as $dir=>$perms)
   {
      $len=strlen($dir);
      if ((strncmp($path_,$dir,$len)==0)&&($len>$max_matched))  //Find permissions with the most long path amongst all matching ones.
      {
         $res["perms"]=$perms; //Current permissions
         $res["top_dir"]=$dir; //The topmost directory permitted at selected branch of FS-tree
         $max_matched=$len;
      }
   }
   
   return $res;
}

function rmdir_r($path_)
{
   //Remove deirectory recursively. 
   //NOTE: exec("rm -rf ".$path_) is good thing, but may not work on some hostings. 
   
   $path_=rtrim($path_,"/");
   $list=scan_catalog($path_,["group"=>"true","show"=>SCANCAT_FOLDERS|SCANCAT_FILES|SCANCAT_HIDDEN]);
   foreach ($list["files"] as $file)
      unlink($path_."/".$file);
   
   foreach ($list["folders"] as $folder)
   {
      $dir=$path_."/".$folder;
      rmdir_r($dir);
      rmdir($dir);
   }
   
   rmdir($path_);
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
   $headers=[
               "From"=>$sender_,
               "Reply-To"=>$sender_,
               "X-Mailer"=>"PHP/".phpversion(),
               "Content-type"=>$content_main_type,
            ];
   
   if (is_array($recipients_))
   {
      $recipient_groups=[];
      foreach ($recipients_ as $recipient)
         if (preg_match("/^ *((To|Cc|Bcc):)?([a-z0-9@а-яё_., -]+)/i",$recipient,$matches))
            $recipient_groups[($matches[2] ? $matches[2] : "To")][]=$matches[3];
      
      $recipients_=implode(",",$recipient_groups["To"]??[]);
      unset($recipient_groups["To"]);
      if ($recipient_groups)
         foreach ($recipient_groups as $hdr=>$grp)
            $headers[$hdr]=implode(",",$grp);
   }
   
   //TODO: else var_dump(preg_split("/(To|Cc|Bcc):/i","trerert@mail.net,wasd@mail.net  To:Yo_wasd@mail.net, Q_wasd@mail.net",-1,PREG_SPLIT_DELIM_CAPTURE|PREG_SPLIT_NO_EMPTY));
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

function dumpf(...$args_)
{
   //WP-specific version of the writing to file dump function.
   
   ob_start();
   foreach ($args_ as $arg)
   {
      var_dump($arg);
      echo "\n";
   }
   $dump=ob_get_clean();
   if (defined("WP_DEBUG_LOG"))
      file_put_contents(WP_DEBUG_LOG,$dump,FILE_APPEND);
   else
      return $dump;
}

// =============================================== Wrappers =============================================== //
function phones_output($val_,$params_=NULL)
{
   $glue=$params_["glue"]??",";
   $out_glue=$params_["out_glue"]??" ";
   
   $attrs_str=is_array($params_["attrs"]??null) ? " ".serialize_element_attrs($params_["attrs"]) : "";
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
   
   $attrs_str=(is_array($params_["attrs"]??null) ? " ".serialize_element_attrs($params_["attrs"]) : "");
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

// ------------------------ Unified form validation ------------------------//

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