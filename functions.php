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
function array_keys_to_labels(array $array_)
{
   //It is like array_keys(), but also adds [[ ]] to use keys in str_replace.
   //Usage: $data=["a"=>1,"b"=>2,"sum"=>3]; $template="[[a]]+[[b]]=[[sum]]"; echo str_replace(array_keys_to_labels($data),$data,$template);
   
   $res=[];
   
   foreach ($array_ as $key=>$val)
      $res[]="[[".$key."]]";
   
   return $res;
}

function array_take_a_place(&$array_,$value_=NULL)
{
   //Takes a place for a new element in the array and returns its key
   
   array_push($array_,$value_);
   end($array_);
   return key($array_);
}

function set_element_recursively(&$array_,array $key_sequence_,$value_)
{
   //[Re]places $value_ into multidimensional $array_, using a sequence of keys from the argument $key_sequence_. Makes missing dimensions.
   
   $curr_key=array_shift($key_sequence_);
   if ($curr_key=="")
      $curr_key=array_take_a_place($array_); //if key is empty, then new element with autoincremental numeric index will be appended.
   
   if (count($key_sequence_)>0)
   {
      if (!is_array($array_[$curr_key]??null))
         $array_[$curr_key]=[];
      set_element_recursively($array_[$curr_key],$key_sequence_,$value_);
   }
   else
      $array_[$curr_key]=$value_;
}

function get_array_element($array_,array $key_sequence_,&$element_exists_=false)
{
   //Gets an element, specified by the key sequence, from the depths of the nested array.
   
   foreach ($key_sequence_ as $key)
      if (is_array($array_)&&key_exists($key,$array_))
      {
         $array_=$array_[$key];
         $element_exists_=true;
      }
      else
      {
         $array_=NULL;
         $element_exists_=false;
         break;
      }
   
   return $array_;
}

class JSONAns extends ArrayObject implements Stringable,JsonSerializable
{
   //Array that automatically converts to JSON when casted to string.
   //Usefull for making of JSON answers, that can be directly echoed. Works correctly when multidimensional.
   
   public function jsonSerialize():mixed
   {
      //Represents $this to the json_encode() as normal array.
      // This solve the problem that json_encode() always encodes ArrayObject as object, regardless to its keys.
      
      return (array)$this;
   }
   
   public function __toString():string
   {
      return json_encode($this,JSON_ENCODE_OPTIONS);
   }
}

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

/* --------------------------------------- [de]serialization --------------------------------------- */
function deserialize_nameval($text_,$separator_="\n",$eq_="=",$val_trim_mask_=" \t")
{
   //Parses a simple name=value string data into associative array.
   //Arguments:
   // $text_ - string data with a plain list of the name=value pairs.
   // $separator_ - string, character[s] that separates the name=value pairs, 
   // $eq_ - string, character[s] that separates the name and the value.
   
   $res=[];

   $lines=explode($separator_,$text_);
   foreach ($lines as $line)
      {
         $pair=explode($eq_,$line,2);
         $name=trim($pair[0]);
         if ($name!="")
            $res[$name]=trim($pair[1],$val_trim_mask_);
      }

   return $res;
}

function serialize_element_attrs(array|string|null $attrs_=NULL):string
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
            if (is_bool($val)&&(!str_starts_with($name,"data-")))   //Boolean attribute like checked, disabled and so on.
            {
               if ($val)
                  $res.=" ".strtoupper($name);
            }
            else
               $res.=" ".strtoupper($name)."=\"".htmlspecialchars(str_replace("\n"," ",$val),ENT_COMPAT|ENT_HTML5)."\"";
         }
   }
   else
      $res=(string)$attrs_;
   
   return $res;
}

class URLParams implements ArrayAccess,Iterator,Countable,Stringable,JsonSerializable
{
   //Provides a convenient way to parse, modify amd serialize relative URLs, URL query strings and file paths.
   
   public const BACKREF_DISCARD     =0b0000_0000_0000_0001; //Discards ".." backreferences in the path.
   public const BACKREF_RESOLVE     =0b0000_0000_0000_0010; //Tries to resolve path backreferences. E.g. "/home/user1/../user2" will be translated to "/home/user2".
   public const SANITIZE_PATH       =0b0000_0000_0000_0100; //A sanitize_path() method will be applied to each path element. This implementation removes illegal characters.
   public const STRIP_EXT           =0b0000_0000_0001_0000; //If path ends with a kinda filename, the file extention will not be included into the last path element.
   public const STRIP_INDEX         =0b0000_0000_0010_0000; //If path ends with an index web document name, it will be not included into the path elements.
   public const STRIP_FILE_NAME     =0b0000_0000_0100_0000; //If path ends with a kinda filename, it will be not included into the path elements.
   public const PATH_ONLY           =0b0000_0000_1000_0000; //Parse only URL-path, discarding a query string. Affects only constructor, query elements can be added then, however.
   public const IMMUTABLE           =0b1000_0000_0000_0000; //Sets instance immutable. This flag can't be unset.
   
   public const SAFE_PATH   =self::BACKREF_DISCARD|self::SANITIZE_PATH|self::PATH_ONLY;   //Mode for using URLParams as filesystem path.
   public const URL_PARAMS  =self::SAFE_PATH|self::STRIP_INDEX|self::STRIP_EXT;           //Mode for parsing URL params (path basename is treated as request parameter).
   public const DEFAULT_MODE=self::URL_PARAMS;                                            //A shorthand for the mode, prferred as defult. (Useful to keep dafault mode consistent across the class methods.)
   
   public const TYPE_DIR  =0b0001;
   public const TYPE_FILE =0b0010;
   public const TYPE_INDEX=0b0100;
   
   protected const BACKREF_MODES =self::BACKREF_DISCARD|self::BACKREF_RESOLVE;  //Mask of all BACKREF_* modes.
   protected const PATH_MODIFYING=self::BACKREF_MODES|self::SANITIZE_PATH|self::STRIP_EXT|self::STRIP_INDEX|self::STRIP_FILE_NAME;  //Mask of all modes which can modify the path.
   
   protected const SANITIZING_REGEXP="/[\\t\\r\\n\\a\\cx\\f\\v\\113\\\\<>{}@#$&~!%:;*?`\"'\\0]/m"; //Used to remove illegal characters from path elements.
   protected const INDEX_FILE_REGEXP="/^index\\.(php|[djsx]?html?|xml)$/i";                        //Used to detect whether path is an index file. NOTE: Not any file named "index.*" is a directory index document, e.g. "index.png" - is not.
   
   protected const EX_IMMUTABLE_MSG="Attempt to modify immutable instance of ".self::class;
   
   protected  int    $_mode=self::DEFAULT_MODE;             //Flags, that regulates parsing and some other behaviours.
   protected  array  $_elements=["path"=>[],"query"=>[]];   //Underlying arrays with URL document path and query string elements.
   protected  int    $_path_depth    =0;                    //Actual depth of directory nesting, relative to the path start. Can be negative, if path contains unresolved backreferences. Unlike number of path elements, it doesnt depends on STRIP_FILE_NAME and STRIP_INDEX.
   protected  int    $_backrefs_count=0;                    //Number of unresolved backreferences. If mode has flag BACKREF_RESOLVE, it grows when backreferences underruns a current path depth. If mode has flag BACKREF_DISCARD, always stay 0.
   protected  string $_path_prefix="";                      //Starting slash from the document path. Allows to restore original document path from the underlying array.
   protected  string $_path_ending="";                      //Trailing slash or file extension or index document name, which was stripped from the document path while parsing. Allows to restore original document path from the underlying array.
   protected  string $_basename="";                         //Contains a file basename, independent from the parsing mode.
   protected  int    $_type=self::TYPE_DIR;                 //Flags of detected path type. Can be [TYPE_DIR|TYPE_FILE[TYPE_INDEX]].
   protected  bool   $_is_basename_stripped=false;          //True if the file basename was stripped while parsing a source path.
   protected  string $_file_ext ="";                        //Contains a file extension[s] w/o a leading dot, independent from the parsing mode.
   protected ?string $_path_cache        =null;             //Cache of original URL document path or filesystem path. Saves CPU when the property $this->path is accessed while unmodified.
   protected ?string $_query_string_cache=null;             //Cache of original URL query string. Saves CPU when the property $this->query_string is accessed while unmodified.
   
   public static function parse_url_query(string $query_string_):array
   {
      //This function is suitable to parse any string, containing array serialized like an URL query. Multidimensional arrays are supported.
      //NOTE: empty key names are understood literally: "=a&=b" will be parsed as [""=>"b"],
      //      but keys with empty indexes will result array with autoincremental indexes: "k[]=a&k[]=b" will be parsed as ["k"=>["a","b"]].
      //NOTE: unlike builtin parse_str(), this function don't restricts key names to valid variable identifiers and don't applies any replacements to them.
      //NOTE: to avoid incorrect parsing, keys and values that may contain "&", "=", "[" and "]" should be encoded with rawurlencode().
      
      $res=[];
      
      $statements=explode("&",$query_string_);
      foreach ($statements as $statement)
         if ($statement!="")
         {
            $pair=explode("=",$statement,2);
            if (preg_match("/^([^\[\]]+)\[(.*)\]$/",$pair[0],$name_matches))
               {
                  $keys=explode("][",$name_matches[2]);
                  array_unshift($keys,$name_matches[1]);
                  set_element_recursively($res,array_map("rawurldecode",$keys),rawurldecode($pair[1]));
               }
            else
               $res[rawurldecode($pair[0])]=rawurldecode($pair[1]);
         }
      
      return $res;
   }

   public static function stringify_url_query(array $data_,int|string $parent_key_=NULL):string
   {
      //Serializes an associative array to the query tart of an URL.
      // This funs is opposite to parse_url_query();
      //NOTE: The standard http_build_query() designed to the same, but do it incorrectly, when data has nested arrays: it applies urlencode() to the whole parameter name, which makes v[]=1 become v%5B0%5D.
      
      $res="";
      $sep=null;
      foreach ($data_ as $key=>$val)
      {
         $full_key=($parent_key_!==null ? $parent_key_."[".rawurlencode($key)."]" : rawurlencode($key));
         $res.=$sep.(is_array($val) ? self::stringify_url_query($val,$full_key) : $full_key."=".rawurlencode($val));
         $sep??="&";
      }
      
      return $res;
   }
   
   public static function extract_file_ext(string $basename):null|string
   {
      //Extracts extension[s] from given file basename.
      //Arguments:
      // $basename - string. File basename.
      //Return value:
      // null, if no file extension detected;
      // string, containing file extension[s] w/o leading dot.
      
      $res=null;
      
      if (preg_match_all("/^(\\.?[^.]+)\\.([.a-z0-9_-]+)$/i",$basename,$matches))
         $res=$matches[2];
      
      return $res;
   }
   
   public function __construct(string|array|self|null $from_=null,int $mode=self::DEFAULT_MODE)  
   {
      //Arguments:
      // $from_ - string|array|self|null. Source entity. Optional, default is null.
      //          string: accepted formats are REQUEST_URI, URI document path, file path or URL query string, starting from "?".
      //          array: associative array, where values with numeric keys which precedes any alphanumeric key are considered as path elements and all values, starting from the first alphanumeric key, are considered as elements of URL query string.
      //          self: constructing a new instance from anoter one will copy its data, but not its mode.
      //          null: if source isn't given, an empty instance will be created.
      // $mode - int. Flags, that regulates parsing and some other behaviours. See class constants description for details. Optional, default is DEFAULT_MODE.
      
      $this->_mode=$mode&~self::IMMUTABLE;  //Temporary unset the IMMUTABLE flag to use $this->set_path() and $this->set_query_string() in the constructor.
      
      if (is_string($from_))
      {
         //Parse from string:
         $parts=explode("?",$from_,2);
         $this->set_path($parts[0]);
         if (!($this->_mode&self::PATH_ONLY))
            $this->set_query_string($parts[1]??"");
      }
      elseif (is_array($from_))
      {
         $is_query_offset=false;
         foreach ($from_ as $key=>$val)
         {
            $is_query_offset=$is_query_offset||!is_numeric($key); //Local one-way trigger, switching current underlying array from the path to the query elements.
            if (!$is_query_offset)
               $this->append_path_element($val);
            elseif (!($this->_mode&self::PATH_ONLY))
               $this->_elements["query"][$key]=$val;
         }
      }
      elseif ($from_ instanceof self)
      {
         //Copy data from the self instance:
         //Append path elements:
         foreach ($from_->_elements["path"] as $element)
            $this->append_path_element($element);
         //Copy props related to the path ending:
         $this->_type                =$from_->_type;
         $this->_path_prefix         =$from_->_path_prefix;
         $this->_path_ending         =$from_->_path_ending;
         $this->_basename            =$from_->_basename;
         $this->_file_ext            =$from_->_file_ext;
         $this->_is_basename_stripped=$from_->_is_basename_stripped;
         
         //Copy query elements:
         if (!($this->_mode&self::PATH_ONLY))
            $this->_elements["query"]=$from_->_elements["query"];
      }
      
      //After parsing done, restore the IMMUTABLE flag as it was given:
      $this->_mode=$mode;
   }
   
   public function __clone():void
   {
      $this->_mode&=~self::IMMUTABLE;  //When URLParams is cloned, it always become mutable.
   }
   
   public function __get($prop_)
   {
      return match ($prop_)
             {
                "mode"           =>$this->_mode,               //int. Parsing mode.
                "path_elements"  =>$this->_elements["path"],   //array. Parsed elements of am URL/filesystem path. Readonly (COW), look class methods for modification capabilities, including ArrayAccess features.
                "query_elements" =>$this->_elements["query"],  //array. Parsed URL query string. Readonly (COW), look class methods for modification capabilities, including ArrayAccess features.
                "path_depth"     =>$this->_path_depth,         //int. Depth of directory nesting. See protected _path_depth for details.
                "path"           =>$this->_path_cache??=$this->stringify_path(),                                        //string. URL/filesystem path. According to the parsing mode, can differ from the source path.
                "query_string"   =>$this->_query_string_cache??=self::stringify_url_query($this->_elements["query"]),   //string. URL query string.
                "basename"       =>$this->_basename,     //Readonly. File basename, parsed from the source URL/filesystem path. Empty string, if source path was recognized as directory.
                "file_ext"       =>$this->_file_ext,     //Readonly. Extension of the file basename. If file name has multiple extensions, this property includes only a trailing one. Doesn't include the dot.
                "_path_prefix"   =>$this->_path_prefix,  //Readonly. DEBUG.
                "_path_ending"   =>$this->_path_ending,  //Readonly. DEBUG.
             };
   }
   
   public function __set($prop_,$val_)
   {
      switch ($prop_)
      {
         case "mode"        : {$this->set_mode($val_); break;}          //Property-alias of method set_mode().
         case "path"        : {$this->set_path($val_); break;}          //Property-alias of method set_path().
         case "query_string": {$this->set_query_string($val_); break;}  //Property-alias of method set_query_string().
      }
   }
   
   public function set_immutable():self
   {
      //Set instance immutable. Can't be undone.
      
      $this->_mode|=URLParams::IMMUTABLE;
      
      return $this;
   }
   
   public function set_mode(int $mode_):self
   {
      //Set new parsing mode.
      
      if ($this->_mode&self::IMMUTABLE)   //Mode can't be changed if immutable, especially including flag IMMUTABLE can't be unset.
         throw new LogicException(self::EX_IMMUTABLE_MSG);
      
      $this->_mode=$mode_;
      
      return $this;
   }
   
   public function set_path(string $path_):self
   {
      //Set a new path separately from the query string.
      
      if ($this->_mode&self::IMMUTABLE)
         throw new LogicException(self::EX_IMMUTABLE_MSG);
      
      //Reset path-related properties:
      $this->_path_prefix="";
      $this->_elements["path"]=[];
      $this->_path_depth=0;
      $this->_backrefs_count=0;
      $this->_path_ending="";
      $this->_basename="";
      $this->_file_ext="";
      $this->_type=self::TYPE_DIR;
      $this->_is_basename_stripped=false;
      $this->_path_cache=null;
      
      $len=strlen($path_);
      if ($len>0)
      {
         //Store path prefix:
         if ($path_[0]=="/")                                   //Absolute path.
            $this->_path_prefix="/";
         elseif (($len>1)&&($path_[0]==".")&&($path_[1]=="/")) //Rel path, starting with a current dir reference.
            $this->_path_prefix="./";
         
         //Split path and collect elements:
         $elements_parsed=0;
         $element=strtok($path_,"/");
         while ($element!==false)
         {
            $this->append_path_element($element);
            
            $element=strtok("/");
         }
         
         //Parse trailing path element and store path ending:
         if ($path_[$len-1]=="/")  //If path contains trailing slash, it definitely recognized as a directory path.
            $this->_path_ending="/";
         else
         {
            $last_elem=end($this->_elements["path"]);
            if (preg_match("/^(\\.?[^.]+)\\.([.a-z0-9_-]+)$/i",$last_elem,$matches))  //If trailing path element looks like a file name (i.e. has a file extension), it uncertainly recognized as a file name.
            {
               $this->_basename=$last_elem;     //Original basename and file extension are always available independently of the parsing mode.
               $this->_file_ext=$matches[2];    //
               $this->_type=self::TYPE_FILE|(preg_match(self::INDEX_FILE_REGEXP,$last_elem) ? self::TYPE_INDEX : 0);
               
               if (($this->_mode&self::STRIP_FILE_NAME)||
                   (($this->_mode&self::STRIP_INDEX)&&($this->_type&self::TYPE_INDEX)))
               {
                  $this->_path_ending=array_pop($this->_elements["path"]); //NOTE: In this case, last path delimiter is not included in the path ending.
                  $this->_path_depth--;
                  $this->_is_basename_stripped=true;
               }
               elseif ($this->_mode&self::STRIP_EXT)
               {
                  $this->_elements["path"][count($this->_elements["path"])-1]=$matches[1];
                  $this->_path_ending=".".$matches[2];
               }
            }
         }
      }
      
      return $this;  //For chain call.
   }
   
   public function set_path_elements(array $path_elements_):self
   {
      //Assign new path elements separately from the query elements.
      
      if ($this->_mode&self::IMMUTABLE)
         throw new LogicException(self::EX_IMMUTABLE_MSG);
      
      $this->_elements["path"]=$path_elements_;
      
      $this->_path_cache=null;
      return $this;  //For chain call.
   }
   
   public function set_query_string(string $query_string_):self
   {
      //Set a new query string separately from the document path.
      
      if ($this->_mode&self::IMMUTABLE)
         throw new LogicException(self::EX_IMMUTABLE_MSG);
      
      //Save original query string to cache:
      $this->_query_string_cache=$query_string_;
      
      //Parse query string:
      $this->_elements["query"]=self::parse_url_query($query_string_);
      
      return $this;  //For chain call.
   }
   
   public function set_query_elements(array $query_elements_):self
   {
      //Assign new query elements separately from the path elements.
      
      if ($this->_mode&self::IMMUTABLE)
         throw new LogicException(self::EX_IMMUTABLE_MSG);
      
      $this->_elements["query"]=$query_elements_;
      
      $this->_query_string_cache=null;
      return $this;  //For chain call.
   }
   
   public function append(self|array|string $from_):self
   {
      //Appends path and query elements.
      // This method modifies original instance.
      
      if ($this->_mode&self::IMMUTABLE)
         throw new LogicException(self::EX_IMMUTABLE_MSG);
      
      //Remove file basename:
      if (($this->_type&self::TYPE_FILE)&&(!$this->_is_basename_stripped))
         array_pop($this->_elements["path"]);
      
      //Parse string:
      if (is_string($from_))
         $from_=new self($from_,$this->_mode);
      
      if ($from_ instanceof self)   //Append elements from instance of self:
      {
         //Append path elements:
         foreach ($from_->_elements["path"] as $element)
            $this->append_path_element($element);
         //Copy props related to the path ending:
         $this->_type                =$from_->_type;
         $this->_path_ending         =$from_->_path_ending;
         $this->_basename            =$from_->_basename;
         $this->_file_ext            =$from_->_file_ext;
         $this->_is_basename_stripped=$from_->_is_basename_stripped;
         
         $this->_path_cache=null;
         
         //Append query elements:
         if ($from_->_elements["query"])
         {
            $this->_elements["query"]=array_merge_recursive($this->_elements["query"],$from_->_elements["query"]);
            $this->_query_string_cache=null;
         }
      }
      else  //Append elements from array:
      {
         $is_query_offset=false;
         foreach ($from_ as $key=>$val)
         {
            $is_query_offset=$is_query_offset||!is_numeric($key); //Local one-way trigger, switching current underlying array from the path to the query elements.
            if (!$is_query_offset)
            {
               $this->append_path_element($val);
               $this->_path_cache=null;
            }
            else
            {
               $this->_elements["query"][$key]=$val;
               $this->_query_string_cache=null;
            }
         }
         
         //Update props related to the path ending:
         if (!$this->_is_basename_stripped)
         {
            $this->_type       =self::TYPE_DIR;
            $this->_path_ending="/";
            $this->_basename   ="";
            $this->_file_ext   ="";
         }
      }
      
      return $this;  //For chain call.
   }
   
   public function set_slashes(bool $starting=true,bool $trailing=true):self
   {
      //Sets/unsets starting and trailing slashes in the path.
      //Arguments:
      // $starting - bool. Whether starting slash should be set.
      // $trailing - bool. Whether trailing slash should be set. Takes effect only if type is TYPE_DIR.
      
      if ($this->_mode&self::IMMUTABLE)
         throw new LogicException(self::EX_IMMUTABLE_MSG);
      
      $this->_path_prefix=($starting ? "/" : "");
      if ($this->_type&self::TYPE_DIR)
         $this->_path_ending=($trailing ? "/" : "");
      
      return $this;
   }
   
   
   public function sanitize():self
   {
      //Sanitizes all path elements.
      
      if ($this->_mode&self::IMMUTABLE)
         throw new LogicException(self::EX_IMMUTABLE_MSG);
      
      foreach ($this->_elements["path"] as &$element)
         $element=preg_replace(self::SANITIZING_REGEXP,"",$element);   //Remove disallowed characters.
      unset($element);
      
      $this->_path_cache=null;
      
      return $this;  //For chain call.
   }
   
   public function path_intersection_depth(self $path_):int
   {
      //Counts number of equal elements between this and a given path, starting from 0th. Did not counts last element if it's a part of file basename or file basename itself.
      
      $res=0;
      
      $min_path_depth=min($this->_path_depth,$path_->_path_depth);
      for ($i=0;$i<$min_path_depth;$i++)
         if (strcmp($this->_elements["path"][$i],$path_->_elements["path"][$i])==0)
            $res++;
         else
            break;
      
      return $res;
   }
   
   public function is_sub_path_of(self $root_path_):bool
   {
      //Finds whether this path is a sub path of the given root path.
      
      return $this->path_intersection_depth($root_path_)==$root_path_->_path_depth;
   }
   
   public function get_rel_path_from(self $root_path_,bool $keep_query=true):?self
   {
      //Returns a part of this path relative to a given root path or null if this path isn't a sub path of a given root path.
      // This method checks paths intersection and didn't takes into account a path prefixes of both this and root path.
      
      $res=null;
      
      if ($this->is_sub_path_of($root_path_))
      {
         $res=clone $this;
         $res->_elements["path"]=array_slice($this->_elements["path"],count($root_path_->_elements["path"]));
         $res->_path_prefix="";
         $res->_path_depth=count($res->_elements["path"])-(($res->_type&self::TYPE_FILE)&&$res->_is_basename_stripped ? 1 : 0);
         $res->_path_cache=null;
         
         if (!$keep_query)
         {
            $res->_elements["query"]=[];
            $res->_query_string_cache="";
         }
      }
      
      return $res;
   }
   
   public function path_slice(int $offset,?int $length=null,bool $keep_query=true):self
   {
      //Extracts fragment of the path.
      
      $res=clone $this;
      
      $offset=($offset>=0 ? min($offset,$this->_path_depth) : max(0,$this->_path_depth-$offset));
      $res->_elements["path"]=array_slice($this->_elements["path"],$offset,$length);
      if ($offset>0)
         $res->_path_prefix="";
      if (($length!==null)&&(($offset+$length)<$this->_path_depth))
      {
         $res->_type=self::TYPE_DIR;
         $res->_basename="";
         $res->_file_ext="";
         $res->_path_ending="/";
      }
      
      $res->_path_depth=count($res->_elements["path"])-(($res->_type&self::TYPE_FILE)&&$res->_is_basename_stripped ? 1 : 0);
      
      $res->_path_cache=null;
      
      if (!$keep_query)
      {
         $res->_elements["query"]=[];
         $res->_query_string_cache="";
      }
         
      return $res;
   }
   
   //ArrayAccess implementation:
   public function offsetExists(mixed $offset):bool
   {
      return key_exists($offset,$this->_elements[is_numeric($offset) ? "path" : "query"]);
   }
   
   public function offsetGet(mixed $offset):mixed
   {
      return $this->_elements[is_numeric($offset) ? "path" : "query"][$offset]??null;
   }
   
   public function offsetSet(mixed $offset,mixed $value):void
   {
      if ($this->_mode&self::IMMUTABLE)
         throw new LogicException(self::EX_IMMUTABLE_MSG);
      
      if ($this->_mode&self::SANITIZE_PATH)
         $value=preg_replace(self::SANITIZING_REGEXP,"",$value);   //Remove disallowed characters.
      
      $is_path_offset=is_numeric($offset);
      $this->_elements[$is_path_offset ? "path" : "query"][$offset]=$value;
      
      if ($is_path_offset&&($offset==array_key_last($this->_elements["path"]))&&                                     //If assign value to the last element of the path
          ($this->_type&self::TYPE_FILE)&&(!$this->_is_basename_stripped))                                           // and this is a file path and the file basename wasn't stripped (whether it is a regular file or an index file),
      {
         $this->_basename=$value.".".$this->_file_ext;                                                               // then update the basename
         $this->_type=self::TYPE_FILE|(preg_match(self::INDEX_FILE_REGEXP,$this->_basename) ? self::TYPE_INDEX : 0); // and the type. NOTE: If assigned value is "index", the last element will not be removed, regardless the mode has flag STRIP_INDEX (otherwise, it may lead to trimming path elements to empty).
      }
      
      //Drop cache:
      if ($is_path_offset)
         $this->_path_cache=null;
      else
         $this->_query_string_cache=null;
   }
   
   public function offsetUnset(mixed $offset):void
   {
      if ($this->_mode&self::IMMUTABLE)
         throw new LogicException(self::EX_IMMUTABLE_MSG);
      
      if (is_numeric($offset))
      {
         $this->_elements["path"]=array_splice($this->_elements["path"],$offset,1);    //Avoid sparseness of numeric indexes.
         $this->_path_cache=null;
      }
      else
      {
         unset($this->_elements["query"][$offset]);
         $this->_query_string_cache=null;
      }
   }
   
   //Iterator implementation:
   public function current():mixed
   {
      return current(current($this->_elements));
   }
   
   public function key():mixed
   {
      return key(current($this->_elements));
   }
   
   public function next():void
   {
      $key=key($this->_elements);
      next($this->_elements[$key]);
      if (($key=="path")&&(key($this->_elements["path"])===null))
         next($this->_elements);
   }
   
   public function rewind(): void
   {
      reset($this->_elements);
      reset($this->_elements["path"]);
      reset($this->_elements["query"]);
   }
   
   public function valid(): bool
   {
      return (key(current($this->_elements))!==null);
   }
   
   //Countable implementation:
   public function count():int
   {
      return count($this->_elements["path"])+count($this->_elements["query"]);
   }
   
   //Stringable implementation:
   public function __toString():string
   {
      return ($this->_path_cache??=$this->stringify_path()).($this->_elements["query"] ? "?".($this->_query_string_cache??=self::stringify_url_query($this->_elements["query"])) : "");
   }
   
   //JsonSerializable implementation:
   public function jsonSerialize():mixed
   {
      return (string)$this;   //TODO: Return format is subject of development.
   }
   
   //misc
   protected function append_path_element(string $element_):void
   {
      $element_=rawurldecode($element_);
      if ($this->_mode&self::SANITIZE_PATH)
         $element_=preg_replace(self::SANITIZING_REGEXP,"",$element_);   //Remove disallowed characters.
      
      switch ($element_)
      {
         case ".":   //Current dir reference:
         {
            //Ignore.
            break;
         }
         case "..":  //Backreference:
         {
            switch ($this->_mode&self::BACKREF_MODES)
            {
               case self::BACKREF_RESOLVE:   //Try to resolve the backreference. NOTE: This could be potentially insecure.
               {
                  if (end($this->_elements["path"])!="..")  //If prev path element isn't backreference,
                     array_pop($this->_elements["path"]);   // then remove it,
                  else
                  {
                     $this->_elements["path"][]=$element_;  // else accumulate backreferences.
                     $this->_backrefs_count++;              //
                  }
                  $this->_path_depth--;
                  
                  break;
               }
               case self::BACKREF_DISCARD:   //Discard backreferences.
               {
                  break;
               }
               default:                      //Leave backrefs as is.
               {
                  $this->_elements["path"][]=$element_;
                  $this->_backrefs_count++;
                  $this->_path_depth--;
                  
                  break;
               }
            }
            break;
         }
         default:    //Normal path element:
         {
            $this->_elements["path"][]=$element_;
            $this->_path_depth++;
         }
      }
   }
   
   protected function stringify_path():string
   {
      $res=$this->_path_prefix;
      
      $sep=null;
      foreach ($this->_elements["path"] as $element)
      {
         $res.=$sep.$element;
         $sep??="/";
      }
      
      if ($this->_type&self::TYPE_DIR)
      {
         if (!(($this->_path_prefix!="")&&(count($this->_elements["path"])==0)))
            $res.=$this->_path_ending;
      }
      else
         $res.=($this->_is_basename_stripped&&(count($this->_elements["path"])>0) ? "/".$this->_path_ending : $this->_path_ending);
      
      return $res;
   }
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

/* --------------------------------------- error reporting,etc --------------------------------------- */
function message_box($type_,$messages_)
{
   return "<DIV CLASS=\"message ".$type_."\">".(is_array($messages_) ? "<P>".implode("</P><P>",$messages_)."</P>" : $messages_)."</DIV>";
}

define("SPOILER_FOLDED","");
define("SPOILER_UNFOLDED","unfolded");
define("SPOILER_SEMI","semi");
function spoiler($contents_,$state_=SPOILER_FOLDED,$additional_classes_="")
{
   return "<DIV CLASS=\"spoiler ".$additional_classes_." ".$state_."\">\n".
          "  <DIV CLASS=\"button top\"></DIV>\n".
          "  <DIV CLASS=\"content\">\n".
          $contents_.
          "  </DIV>\n".
          "  <DIV CLASS=\"button bottom\"></DIV>\n".
          "</DIV>\n";
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

/* --------------------------------------- File sistem utils --------------------------------------- */
interface IFileInfoMIME extends Stringable
{
   public function getMIME():string;
   //Basic features, inherited from SplFileInfo:
   public function __construct(string $filename);
   public function getExtension();     // \
   public function getFilename();      //  |
   public function getLinkTarget();    //  |
   public function getPathname();      //  |
   public function getPerms();         //  | NOTE: Prior to PHP 8.3 these methods of SplFileInfo was untyped.
   public function getRealPath();      //  |
   public function getSize();          //  |
   public function isDir();            //  |
   public function isFile();           //  |
   public function isLink();           //  /
}

class ImpFInfo extends SplFileInfo implements IFileInfoMIME
{
   //Improoved SplFileInfo.
   // Use this class for paths of the files and directories that would be accessed or created. To process requested (and any untrusted) paths or to output paths use URLParams.
   
   public const REL_PATH_NORM_REGEXP="/(^\\.\\/|^\\.$|\\/$)/"; //Regexp used to unify path notation by removing starting "./", trailing "/" and a single dot filename.
   public const DEFAULT_ATTRS_KEY_LIST=["filename"=>null,"extension"=>null,"pathname"=>null,"path"=>null,"link_target"=>null,"is_dir"=>null,"is_executable"=>null,"is_file"=>null,"is_link"=>null,"mime"=>null,"encoding"=>null,"c_time"=>null,"m_time"=>null,"a_time"=>null,"group"=>null,"owner"=>null,"perms"=>null,"size"=>null];
   
   protected static $finfo_mime=null;
   protected static $finfo_enc=null;
   protected static $finfo_ext=null;
   
   protected $mime=null;
   protected $encoding=null;
   protected $supposed_ext=null;
   
   public function getExtension(bool $secure=false,string $prefix="",string $default=""):string
   {
      //Return an extension from file name or path. Works correctly with unix hidden files.
      //NOTE: Overrides SplFileInfo::getExtension().
      //NOTE: Same as file_ext($this->getFilename(),$prefix,$default).
      // If file name has a multiple extension, only the last one will be returned.
      //Arguments:
      // $secure - bool. If true, then extensions, which contains characters other than alphanumeric, dash and underscore will be rejected and the $default will be used. Optional, default is false.  This argument is useful when file will be securely renamed, but the extension will be retained.
      // $prefix - string. Will be prepended, if result is not empty. Optional. Typical case: set it "." to get extension with dot included.
      // $default - string. Allows to set custom extension, if the file name doesn't have one or it doesn't pass the secure matching.
      
      $regexp=($secure ? "/[^\\/]+\\.([a-z0-9_-]{1,10})$/i" : "/[^\\/]+\\.([^.\\/]+)$/");          //In secure mode filename extension is restricted to the safe characters (latin alphanumeric, underscore and dash) and limited by length.
      $ext=(preg_match($regexp,$this->getFilename(),$matches) ? $prefix.$matches[1] : $default);   //Get bare extension (w/o dot).
      return (($ext!="")&&($prefix!="") ? $prefix.$ext : $ext);                                    //Add prefix, if resulting extention isn't empty.
   }
   
   public function getMIME():string
   {
      self::$finfo_mime??=finfo_open(FILEINFO_MIME_TYPE|FILEINFO_SYMLINK);
      
      return $this->mime??=finfo_file(self::$finfo_mime,$this);
   }
   
   public function getEncoding():string
   {
      self::$finfo_enc??=finfo_open(FILEINFO_MIME_ENCODING|FILEINFO_SYMLINK);
      
      return $this->encoding??=finfo_file(self::$finfo_enc,$this);
   }
   
   public function supposedExt():string
   {
      //Returns the file extension appropriate for the MIME type detected in the file. 
      //NOTE: Seems it has a small use, because it fails to return correct value for some widely used types, like image/svg+xml or text/plain.
      
      self::$finfo_ext??=finfo_open(FILEINFO_EXTENSION|FILEINFO_SYMLINK);
      
      return $this->supposed_ext??=finfo_file(self::$finfo_ext,$this);
   }
   
   public function isSubPathOf(string|ImpFInfo $root_):bool
   {
      //Normalize path notation:
      $root_path=preg_replace(self::REL_PATH_NORM_REGEXP,"",($root_ instanceof SplFileInfo ? $root_->getPathname() : $root_))."/";  //The trailing slash, added to both paths, does a trick of avoiding
      $this_path=preg_replace(self::REL_PATH_NORM_REGEXP,"",$this->getPathname())."/";                                              // a partial match of subfolder names between this and root paths.
      //Test, whether $this starts with the $root_:
      $root_len=strlen($root_path);
      return (strncmp($root_path,$this_path,$root_len)==0);
   }
   
   public function getRelPath(null|string|self $root_=null):?string
   {
      //Extracts a relative path from the $root_ to this.
      //Argumants:
      // $root_ - null|string|self. A path, supposed to be root of this. Optional. By default, the $_SERVER["DOCUMENT_ROOT"] is used.
      //Return value:
      // If $root_ is absolute and $this is relative, this path is returned.
      // If $root_ and $this are both absolute or both relative, and $this is a subpath of the $root, a remnant of this path is returned.
      // In other cases null is returned.
      // The result is neither starts with "./" nor ends with "/".
      // NOTE: Method can return an empty string if the $root_ and $this are the same paths.
      
      $res=null;
      
      $root_??=$_SERVER["DOCUMENT_ROOT"];
      
      //Normalize path notation:
      $root_path=preg_replace(self::REL_PATH_NORM_REGEXP,"",($root_ instanceof SplFileInfo ? $root_->getPathname() : $root_))."/";  //The trailing slash, added to both paths, does a trick of avoiding
      $this_path=preg_replace(self::REL_PATH_NORM_REGEXP,"",$this->getPathname())."/";                                              // a partial match of subfolder names between this and root paths.
      //Test, whether $this starts with the $root_ and extract relative path:
      $root_len=strlen($root_path);
      if ((($root_path[0]??null)=="/")&&(($this_path[0]??null)!="/"))
         $res=substr($this_path,0,-1);          //Copy this path, excluding that tricky trailing slash.
      elseif (strncmp($root_path,$this_path,$root_len)==0)
         $res=substr($this_path,$root_len,-1);  //Extract a part of $this_path, starting right after the trailing slash of the $root_path and excluding that tricky trailing slash.
      
      return $res;
   }
   
   function getAbsPath(null|string|self $root_=null):self
   {
      //Makes am absolute path, considering $this as relative from the $root_.
      //Arguments:
      // $root_ - null|string|ImpFInfo. A path that will be root of the result. Optional. By default, the $_SERVER["DOCUMENT_ROOT"] is used.
      //Return value:
      // If $this is subpath of the $root_ then a copy of $this is returned.
      // Else, concatenation of $root_ and $this is returned. I.e. even $this is absolute, but not a subpath of the $root_, the result is forsed to be a subpath of the $root_.
      
      $root_??=$_SERVER["DOCUMENT_ROOT"];
      
      return ((($this_path[0]??null)=="/")&&$this->isSubPathOf($root_) ? clone $this : $this->concat($root_));
   }
   
   public function isExists():bool
   {
      //A shorthand, prefer to use $this->isDir()||$this->isFile().
      //NOTE: If the file or directory exists and if a user under that the PHP runs has permissions to access it, one of SplFileInfo::isFile() or SplFileInfo::isDir() definitely returns true.
      
      return $this->isDir()||$this->isFile();   
   }
   
   public function remove(bool $recursively=true)
   {
      //Removes this entry from the filesystem.
      //Arguments:
      // $recursively - bool. If this entry is a folder, it will be removed with all contents, unless this argument is set false. It may be useful to protect not empty folders from accidental remove. Has no use if the entry is a file. Optional, default true.
      
      return ($this->isLink()||$this->isFile() ? unlink($this) : ($recursively ? rmdir_r($this) : rmdir($this)));
   }
   
   public function concat(string|SplFileInfo ...$paths_):self
   {
      //Concatenates this and a given paths. If any of paths, including this, is a filepath a filename will be omitted.
      // Unlike the URLParams::append(), doesn't modifies the original instance.
      //Arguments:
      // $paths_ - string|SplFileInfo. Paths to concat.
      //Return value:
      // New instance of self, containing all paths concatenated.
      
      $res_path=($this->isFile() ? $this->getPath() : (string)$this);
      foreach ($paths_ as $path)
         $res_path.="/".preg_replace("/^\\.?\\//","",($path instanceof SplFileInfo)&&$path->isFile() ? $path->getPath() : (string)$path); //NOTE: Stringified SplFileInfo instance is always has no trailing slash, even if it was constructed from a string that contained it.
         
      return new self($res_path);
   }
   
   public function toArray(?array $attrs_=null):array
   {
      //Converts selected attributes of the file system entry to array.
      //Arguments:
      // $attrs_ - array|null. Assoc array, where each key is an attribute name to include and value is an optional arguments, available for some get*() methods. Optional, by default, returns arguments, listed in the const self::DEFAULT_ATTRS_KEY_LIST.
      //           If $attrs_ keys contain an invalid name, then an UnhandledMatchError is thrown.
      
      $res=[];
      
      $attrs_??=self::DEFAULT_ATTRS_KEY_LIST;
      foreach ($attrs_ as $attr=>$args)
         $res[$attr]=match($attr)
                     {
                        "filename"=>$this->getFilename(),
                        "extension"=>$this->getExtension(...($args??[])),
                        "pathname"=>$this->getPathname(),
                        "path"=>$this->getPath(),
                        "rel_path"=>$this->getRelPath(...($args??[])),
                        "link_target"=>($this->isLink() ? $this->getLinkTarget() : null),
                        "real_path"=>$this->getRealPath(),
                        "is_dir"=>$this->isDir(),
                        "is_executable"=>$this->isExecutable(),
                        "is_file"=>$this->isFile(),
                        "is_link"=>$this->isLink(),
                        "is_readable"=>$this->isReadable(),
                        "is_writable"=>$this->isWritable(),
                        "mime"=>$this->getMIME(),
                        "encoding"=>$this->getEncoding(),
                        "c_time"=>$this->getCTime(),
                        "m_time"=>$this->getMTime(),
                        "a_time"=>$this->getATime(),
                        "group"=>$this->getGroup(),
                        "owner"=>$this->getOwner(),
                        "perms"=>$this->getPerms(),
                        "size"=>$this->getSize(),
                        "type"=>$this->getType(),
                     };
      
      return $res;
   }
   
}

trait TArrayableFSIterator
{
   public function toArray(?array $props_=null):array
   {
      //Returns an array, where each entry of this iterator is converted to array too.
      //Arguments:
      // $props_ - see ImpFInfo::toArray() for details.
      //NOTE: To simply get array of entries themselves, use function iterator_to_array().
      
      $res=[];
      
      foreach ($this as $key=>$finfo)
         $res[$key]=$finfo->toArray();
      
      return $res;
   }
}

class FSIterator extends FilesystemIterator
{
   //A shorthand for FilesystemIterator with ImpFInfo and file names as keys.
   //NOTE: When the iterated folder contents change, the changes are reflected after the iterator rewind. This behaviour is inherited by this class and the FilesystemIterator from the DirectoryIterator.
   
   use TArrayableFSIterator;
   
   public function __construct(string $directory,int $flags=self::KEY_AS_FILENAME|self::CURRENT_AS_FILEINFO|self::SKIP_DOTS)
   {
      parent::__construct($directory,$flags);
      $this->setInfoClass("ImpFInfo");
   }
}

class FSFilterIterator extends FilterIterator implements Stringable
{
   //Implements applying some usual filterings to FilesystemIterator.
   
   use TArrayableFSIterator;
   
   public function __construct(
              string $directory="",          //The path of the filesystem item to be iterated over.
              int    $flags=FilesystemIterator::KEY_AS_FILENAME|FilesystemIterator::CURRENT_AS_FILEINFO|FilesystemIterator::SKIP_DOTS, //See FilesystemIterator flags.
      public  bool   $show_files=true,       // \
      public  bool   $show_folders=true,     // | Toggles which of the files, folders and hidden entries will be iterated.
      public  bool   $show_hidden=false,     // /
      public ?string $include_names=null,    // \
      public ?string $include_types=null,    // | Regexps to filter in or out certain names and MIME types.
      public ?string $exclude_names=null,    // | 
      public ?string $exclude_types=null,    // /
      ?FilesystemIterator $iterator=null,    //Allows to reuse existing FilesystemIterator instance. If defined, then $directory and $flags has no effect.
   )
   {
      $iterator??=new FSIterator($directory,$flags);
      parent::__construct($iterator);
   }
   
   public function accept():bool
   {
      $fs_entry=$this->getInnerIterator()->current();
      
      if ((!$this->show_files)&&($fs_entry->isFile()))
         return false;
      if ((!$this->show_folders)&&($fs_entry->isDir()))
         return false;
      if ((!$this->show_hidden)&&($fs_entry->getFilename()[0]=="."))
         return false;
      if (($this->include_types)&&(!preg_match($this->include_types,$fs_entry->getMIME())))
         return false;
      if (($this->exclude_types)&&preg_match($this->exclude_types,$fs_entry->getMIME()))
         return false;
      if (($this->include_names)&&(!preg_match($this->include_names,$fs_entry->getFilename())))
         return false;
      if (($this->exclude_names)&&preg_match($this->exclude_names,$fs_entry->getFilename()))
         return false;
      
      return true;
   }
   
   public function __toString():string
   {
      return (string)$this->current();
   }
}

class FSSortedIterator extends ArrayIterator
{
   //Implements fast parametrized sorting over FSIterator or FSFilterIterator.
   //NOTE: This iterator don't update entries since it created, unlike the DirectoryIterator and its descendants. This because it fetches all entries from the underlying iterator, and updating in rewind() has no benefit over creating this iterator anew.
   //      So, any changes made in the folder after this iterator was created will not be reflected.
   //NOTE: To sort the file system entries in other ways, just use something like this: 
   //      $it=new ArrayIterator(iterator_to_array($this->iterator)); $it->uasort($callback); foreach ($it as $key=>$fs_entry) {...}.
   //WARNING: This class is experimental. Its behaviour and method signatures can be changed in near future.
   
   use TArrayableFSIterator;
   
   const CURRENT_AS_FILEINFO=0b0001;
   const CURRENT_AS_PROPS   =0b0010;
   
   public function __construct(
                string   $directory="",                           //The path of the filesystem item to be iterated over. Used to create FSIterator for given directory path, only when $iterator isn't defined.
                int      $flags=FilesystemIterator::KEY_AS_FILENAME|FilesystemIterator::CURRENT_AS_FILEINFO|FilesystemIterator::SKIP_DOTS, //See FilesystemIterator flags. Used with the $directory.
      protected array    $sortings=[],                            //Array of sorting parameters, used by the self::cmp(). Format: ["attr"=>"ASC"|"DESC",...], where "attr" is one of the attributes, extracted by the ImpFInfo::toArray().
      protected string   $name_cmp="strnatcmp",                   //Callback, used to compare file name, path etc. of the entries being compared while sorting.
                null|FSIterator|FSFilterIterator $iterator=null,  //Allows to reuse existing FilesystemIterator instance. If defined, then $directory and $flags has no effect.
   )
   {
      //Create the source data iterator:
      $iterator??=new FSIterator($directory,$flags);
      
      //Extract list of sortable props:
      $sortable_props=[];
      foreach ($this->sortings as $prop=>$direction)
         $sortable_props[$prop]=null;  //Use no arguments for property getting methods.
      
      //Extract data to sort:
      $data=[];
      foreach ($iterator as $key=>$fs_entry)
         $data[$key]=["fs_entry"=>$fs_entry,"attrs"=>$fs_entry->toArray($sortable_props)];
      parent::__construct($data);
      
      //Sort:
      $this->uasort([$this,"cmp"]);
   }
   
   public function current():mixed
   {
      return parent::current()["fs_entry"];
   }
   
   protected function cmp($a,$b)
   {
      //Comparison callback for uasort(), used in the self::sort(). Compares properties of $a and $b until a difference will be found.
      //Arguments:
      // $a,$b - arrays. File system entries, converted into arrays by ImpFInfo::toArray(). These arrays must contain all keys, which exists in $this->sortings.
      
      $res=0;
      
      $a_attrs=$a["attrs"];
      $b_attrs=$b["attrs"];
      foreach ($this->sortings as $attr=>$direction)
      {
         switch ($attr)
         {
            //File system names:
            case "filename"     :
            case "extension"    :
            case "pathname"     :
            case "path"         :
            case "real_path"    :
            case "link_target"  :{$res=($this->name_cmp)($a_attrs[$attr],$b_attrs[$attr]); break;}
            //String attributes:
            case "mime"         :
            case "encoding"     :
            case "type"         :{$res=strcmp($a_attrs[$attr],$b_attrs[$attr]); break;}
            
            case "is_dir"       :
            case "is_executable":
            case "is_file"      :
            case "is_link"      :
            case "is_readable"  :
            case "is_writable"  :{$res=(int)$a_attrs[$attr]-(int)$b_attrs[$attr]; break;}
            
            case "c_time"       :
            case "m_time"       :
            case "a_time"       :
            case "group"        :
            case "owner"        :
            case "size"         :{$res=$a_attrs[$attr]-$b_attrs[$attr]; break;}
            
            case "perms"        :{$res=$a_attrs[$attr]-$b_attrs[$attr]; break;}
         }
         
         if ($res!=0)
         {
            if ($direction=="DESC")
               $res=-$res;
            
            break;
         }
      }
      
      return $res;
   }
}

class Uploads
{
   //Extensible class for rocessing uploads.
   //Usage examples:
   // Chain call:
   //    <INPUT TYPE="file" NAME="data[0][col_name][]" MULTIPLE>
   //    dump((new Uploads(...[<params>]))->extract_info(["data","0","col_name"])->validate()->init_autoincrement()->rename_enumerated()->move()->moved_info);
   //    dump((new Uploads(...[<params>]))->extract_info(["data","0","col_name"])->req_info);
   //    dump((new Uploads(...[<params>]))->extract_info(["data","0","col_name"])->validate()->rename_original()->valid_info);
   //    dump((new Uploads(...[<params>]))->extract_info("data[0][col_name]")->validate()->init_autoincrement()->rename_enumerated()->move()->moved_info);
   // Use one instance multiple times:
   //    <INPUT TYPE="file" NAME="data[0][col_name_a][]">
   //    <INPUT TYPE="file" NAME="data[0][col_name_b][]">
   //    <INPUT TYPE="file" NAME="data[1][col_name_a][]">
   //    <INPUT TYPE="file" NAME="data[1][col_name_b][]">
   //    $uploads=new Uploads(...["max_total_size"=>160*1024*1024]);
   //    foreach ($_REQUEST["data"] as $r=>$row)
   //    {
   //       $uploads->dest_folder="user_uploads/".$row["index"]."/"; //Assign a separate destination folder for each row.
   //       dump($uploads->extract_info("data[$r]",["col_name_a"])->init_validation()->validate()->init_autoincrement()->rename_enumerated()->move()->moved_info);   //Reset limit and enumeration counters and process first portion of uploads.
   //       dump($uploads->extract_info("data[$r]",["col_name_b"])->validate()->rename_enumerated()->move()->moved_info);                                            //Then continue with the second portion of uploads.
   //    }
   
   public const UPLOADED_EX_FILE_TYPE  =-1;  //\
   public const UPLOADED_EX_FILE_NAME  =-2;  // |
   public const UPLOADED_EX_FILE_SIZE  =-3;  // |
   public const UPLOADED_EX_MAX_COUNT  =-4;  // | Exception error codes.
   public const UPLOADED_EX_MAX_SIZE   =-5;  // |
   public const UPLOADED_EX_DEST_FOLDER=-6;  // |
   public const UPLOADED_EX_MOVE       =-7;  // |
   public const UPLOADED_EX_CHMOD      =-8;  ///
   
   public const DEFAULT_FILE_CLASS="ImpFInfo";
   
   protected ?ImpFInfo $_dest_folder=null;                  //Path to the destination folder where uploads will be moved.
   protected ?FSFilterIterator $_existing_files=null;       //Files, which already exists in the destination folder. Used in methods init_validation() and init_autoincrement().
   protected  string $_file_class=self::DEFAULT_FILE_CLASS; //Class name of the file instances. Should implement IFileInfoMIME.
   protected  int    $_count=0;                             //Counter of successfully validated uploads.
   protected  int    $_total_size=0;                        //Counter of total size of successfully validated uploads.
                                                            
   protected  array  $_req_info=[];                         //Uploads info, extracted from the $_FILES (see method extract_info()). 
   protected  array  $_valid_info=[];                       //Uploads info, passed validation (see method validate()).
   protected  array  $_validation_exceptions=[];            //List of exceptions, occured during validation.
   protected  array  $_moved_info=[];                       //Successfully moved uploads info (see method move() and move_zipped()).
   protected  array  $_move_exceptions=[];                  //List of exceptions, occured during moving uploads to the destination folder.
                                                            
   public function __construct(                             
             ?string $dest_folder=null,                     //string|null. Path to the destination folder where uploads will be moved. Must be in absolute notation, valid and safe. Optional, can be [re]assigned later, but before call the $this->init_validation(), $this->init_autoincrement() and $this->move().
      //Validation params:                                  
      public ?string $types_allowed=null,                   //string|null. Regexp, matching welcomed mime types. Others considered as prohibited.
      public ?string $types_disallowed=null,                //string|null. Regexp, matching unwelcome mime types. Others considered as welcomed. Has priority over "types_allowed".
      public ?string $names_allowed=null,                   //string|null. Regexp, matching welcomed file names. Others considered as prohibited. Useful when uploads will be stored with their original names.
      public ?string $names_disallowed=null,                //string|null. Regexp, matching unwelcome file names. Others considered as welcomed. Has priority over "names_allowed". Useful when uploads will be stored with their original names.
      public ?int    $max_size=null,                        //int|null. Maximum size of each file. Allows to set more tight limit then php's upload_max_filesize for particular uploads.
      public ?int    $max_count=null,                       //int|null. Limit of the number of uploaded files. Files, that not passed previous tests, will not be counted.
      public ?int    $max_total_size=null,                  //int|null. Limit of the total size of uploaded files.
      //Incremental renaming params:                        
      public  int    $file_number=0,                        //int. Uploads enumeration counter. Incrementing before each upload rename.
      public  string $fname_format="%1\$d.%2\$s",           //string. File name format string, used for the incremental uploads rename and for extracting numbers of existing uploads (see sprintf(), sscanf(), $this->init_autoincrement() and $this->rename_enumerated() for details). NOTE: shouldn't contain directory separators.
      public ?string $fname_filter=null,                    //string|null. Regexp, used to filter existing uploads in the destination folder (see $this->init_validation() and $this->init_autoincrement()).
      //Moving params:                                      
      public  int    $dest_folder_permissions=0750,         //int. Permissions for the destination folder (set when it created).
      public  int    $files_permissions=0640,               //int. Permissions for moved files.
      public  bool   $require_permissions=false,            //bool. If true, the moved files will be deleted on chmod fail.
              string $file_class=self::DEFAULT_FILE_CLASS,  //string. Class name of the file instances. Should implement IFileInfoMIME.
   )
   {
      $this->_dest_folder=$dest_folder;
   }
   
   public function __get($prop_)
   {
      return match ($prop_)
             {
                "dest_folder"          =>$this->_dest_folder,
                "existing_files"       =>($this->_existing_files??=($this->_dest_folder->isDir() ? new FSFilterIterator($this->_dest_folder,show_files:true,show_folders:false,include_names:$this->fname_filter) : null)),   //Readonly. Can be used outside. NOTE: Will be NULL if the destination folder is not defined or not exist.
                "req_info"             =>$this->_req_info,              //Readonly.
                "valid_info"           =>$this->_valid_info,            //Readonly.
                "validation_exceptions"=>$this->_validation_exceptions, //Readonly.
                "moved_info"           =>$this->_moved_info,            //Readonly.
                "move_exceptions"      =>$this->_move_exceptions,       //Readonly.
             };
   }
   
   public function __set($prop_,$val_)
   {
      switch ($prop_)
      {
         case "dest_folder":{$this->_dest_folder=($val_ instanceof ImpFInfo ? $val_ : new ImpFInfo($val_)); $this->_existing_files=null; break;}
      }
   }
   
   public function extract_info(array|string $key_sequence_,null|array|string $key_sequence_tail_=null):self
   {
      //Extracts an uploads info, requested from the particular file input field[s]. Stores result to internal property.
      //Arguments:
      // $key_sequence_ - array|string, a sequence of keys in the name of particular input field, or the input field name itself. If need to extraxt uploads info from a bunch of similarly-named fields, then $key_sequence_ should be a starting common part of their names.
      // $key_sequence_tail_ - array|null, a tail common sequence of keys in the names of the input fields bunch.
      //Usage examples:
      //    <INPUT TYPE="file" NAME="data[0][col_name][]" MULTIPLE>
      //    dump((new Uploads(...[<params>]))->extract_info(["data","0","col_name"])->req_info));  //Result will be like [0=>["name"=>"local_fname.jpg","full_path"=>"local_fname.jpg","type"=>"image/jpeg","tmp_name"=>"/tmp/phpY270IU","error"=>0,"size"=>1234567],...];
      // or
      //    <INPUT TYPE="file" NAME="data[1][col_name]">
      //    <INPUT TYPE="file" NAME="data[2][col_name]">
      //    dump((new Uploads(...[<params>]))->extract_info(["data"],["col_name"])->req_info));    //Result will be like [1=>["name"=>"local_fname1.jpg","full_path"=>"local_fname1.jpg","type"=>"image/jpeg","tmp_name"=>"/tmp/phpY270IU","error"=>0,"size"=>1234567],2=>["name"=>"local_fname1.jpg",...]];
      
      $this->_req_info=[];
      
      $key_sequence_=(is_string($key_sequence_) ? preg_split("/(\\[|\\]\\[|\\]$)/",$key_sequence_,-1,PREG_SPLIT_NO_EMPTY) : $key_sequence_);
      $root_key=array_shift($key_sequence_);
      $key_sequence_tail_=(is_string($key_sequence_tail_) ? preg_split("/(\\[|\\]\\[|\\]$)/",$key_sequence_tail_,-1,PREG_SPLIT_NO_EMPTY) : $key_sequence_tail_);
      
      //Extract info:
      $buf=[];
      foreach ($_FILES[$root_key]??[] as $attr_key=>$attr_val)
      {
         $frag=($key_sequence_ ? get_array_element($attr_val,$key_sequence_) : $attr_val);
         if (!is_array($frag))
            $frag=[$frag];
         
         foreach ($frag as $i=>$sub_frag)
         {
            $val=($key_sequence_tail_ ? get_array_element($sub_frag,$key_sequence_tail_) : $sub_frag);
            if ($val!==null)
            {
               $buf[$i]??=[];
               $buf[$i][$attr_key]=$val;
            }
         }
      }
      
      //Rearrange info:
      foreach ($buf as $i=>$raw_info)
         $this->_req_info[$i]=[
                                 "error"    =>$raw_info["error"],
                                 "name"     =>new URLParams($raw_info["name"],mode:URLParams::SAFE_PATH),        //Make name and path safe at the earliest step to make sure that these values will not be accidentally written to the filesystem w/o being treated.
                                 "full_path"=>new URLParams($raw_info["full_path"],mode:URLParams::SAFE_PATH),   // Also, this ensures that name filters will not be fooled by injecting an invalid characters.
                                 "file"     =>($raw_info["error"]==UPLOAD_ERR_OK ? new $this->_file_class($raw_info["tmp_name"]) : null),  //Replace tmp_name with much flexible ImpFInfo (or a custom class). Also, the key "tmp_name" is very confusing with the "name", which is a user-provided file name. It may look ok for common cases, but when one need to append something like "thumb", "thumb_name" or "thumb_path", the keys naming becomes really messy.)
                              ];
      
      return $this;  //For chain call.
   }
   
   public function init_validation():self
   {
      //Resets uploads counters which used in validation. Then, if any of max_count or max_total_size limits is set, scans destination folder to count already existing files.
      // Uses $this->fname_filter to filter existing files.
      
      $this->_count=0;
      $this->_total_size=0;
      
      if ((($this->max_count>0)||($this->max_total_size>0))&&$this->_dest_folder?->isDir())   //Check, if the destination folder is defined and exist, before accessing $this->existing_files iterator, which is instantiated on demand.
      {
         foreach ($this->existing_files as $entry)
         {
            $this->_count++;
            $this->_total_size+=$entry->getSize();
         }
      }
      
      return $this;  //For chain call.
   }
   
   public function validate():self
   {
      //Validates requested uploads info from $this->req_info and stores valid entries to $this->valid_info and exceptions to $this->validation_exceptions, keeping indexes of the source array.
      // BTW, it replaces requested value of the "type" attribute with the server-detected one.
      //Returns number of entries, passed validation.
      
      $this->_valid_info=[];
      $this->_validation_exceptions=[];
      
      foreach ($this->req_info as $i=>$upload_info)
         try
         {
            //Check if a file was uploaded:
            if ($upload_info["error"]==UPLOAD_ERR_NO_FILE)
               continue;   //Emit no error, just continue.
            
            //Test each file against given conditions:
            if ($upload_info["error"])
               throw new \RuntimeException("UPLOAD_ERR".$upload_info["error"],$upload_info["error"]);  //String "UPLOAD_ERRxx" refers to the localized error message.
            if (!is_uploaded_file($upload_info["file"]))
               throw new \RuntimeException("Not an uploaded file");
            
            //First, validate file type and name:
            if ((($this->types_disallowed)&&preg_match($this->types_disallowed,$upload_info["file"]->getMIME()))||
                (($this->types_allowed)&&(!preg_match($this->types_allowed,$upload_info["file"]->getMIME()))))
               throw new \RuntimeException("File type is not allowed",self::UPLOADED_EX_FILE_TYPE);
            if ((($this->names_disallowed)&&(preg_match($this->names_disallowed,$upload_info["name"])))||
                (($this->names_allowed)&&(!preg_match($this->names_allowed,$upload_info["name"]))))
               throw new \RuntimeException("File name is not allowed",self::UPLOADED_EX_FILE_NAME);
            
            //Second, validate file size:
            if (($this->max_size)&&($upload_info["file"]->getSize()>$this->max_size))
               throw new \RuntimeException("File is too large",self::UPLOADED_EX_FILE_SIZE);
            
            //Last, validate summary size and amount of the files:
            if (($this->max_count)&&($this->_count>$this->max_count))
               throw new \RuntimeException("Too many files",self::UPLOADED_EX_MAX_COUNT);
            elseif (($this->max_total_size)&&($this->_total_size+$upload_info["file"]->getSize()>$this->max_total_size))
               throw new \RuntimeException("Total uploads size exceeded",self::UPLOADED_EX_MAX_SIZE);
            
            //If no exception occures, add entry to valid uploads:
            unset($upload_info["error"]);          //There are no upload errors in validated entries.
            $this->_valid_info[$i]=$upload_info;   //NOTE: Keep original indexes.
            
            $this->_count++;
            $this->_total_size+=$upload_info["file"]->getSize();
         }
         catch (\RuntimeException $ex)
         {
            $this->_validation_exceptions[$i]=$ex; //NOTE: Keep original indexes.
            
            if (match ($ex->getCode()) {self::UPLOADED_EX_MAX_COUNT,self::UPLOADED_EX_MAX_SIZE=>true,default=>false}) //Stop uploads processing on certain exceptions.
               break;   //Break the cycle after the finally section executed.
         }
      
      return $this;  //For chain call.
   }
   
   public function init_autoincrement():self
   {
      //Scans destination folder to find a file with name having a maximum number, and sets this number to property file_number.
      // Use this method prior to $this->rename_enumerated().
      // NOTE: This method requires property $this->fname_filter to be a valid regexp string. The regexp should contain a 1st subpattern, matching the file number.
      
      $this->file_number=0;   //Reset enumeration counter.
      
      if ($this->_dest_folder?->isDir())  //Check, if the destination folder is defined and exist, before accessing $this->existing_files iterator, which is instantiated on demand.
      {
         //Find a maximum existing number amongst the already existing files:
         foreach ($this->existing_files as $entry)
         {
            sscanf($entry->getFilename(),$this->fname_format,$num,$ext);   //Extract the number (and extension) from the filename. (Use sscanf() for the symmetry to sprintf(), used in $this->rename_enumerated().)
            if (($num!==null)&&($num>$this->file_number))
               $this->file_number=$num;
         }
      }
      
      return $this;  //For chain call.
   }
   
   public function rename_enumerated():self
   {
      //Enumerates files incrementally.
      
      foreach ($this->_valid_info as &$upload_info)
         $upload_info["name"]=sprintf($this->fname_format,++$this->file_number,$upload_info["name"]->file_ext);   //Enumerate files, using the sprintf() capabilities to format a number.
      
      return $this;  //For chain call.
   }
   
   public function rename_original():self
   {
      //Do nothing, just leaves user-defined filenames as is.
      // This empty method remains for the case of parametrized renaming. It may also be overriden in custom descendants.
      //NOTE: The user-defined filename is already escaped by the extract_info().
      
      return $this;  //For chain call.
   }
   
   public function rename_temp():self
   {
      //Sets the temporary file name to a permanent name.
      
      foreach ($this->_valid_info as &$upload_info)
         $upload_info["name"]=$upload_info["file"]->getFilename();
      
      return $this;  //For chain call.
   }
   
   public function move():self
   {
      //Moves the validated files to the dest_folder. 
      //NOTE: Destination folder is creating lazily, to not litter a file system.
      //Return value:
      // Array, containing info entries of the successfully moved uploads.
      
      $this->_moved_info=[];
      
      try
      {
         if ($this->_valid_info&&(!$this->_dest_folder->isDir()))    //Do not create destination folder if there are no files to move.
            if (!mkdir($this->_dest_folder,$this->dest_folder_permissions,true))
               throw new \RuntimeException("Failed to create destination folder",self::UPLOADED_EX_DEST_FOLDER);
         
         foreach ($this->_valid_info as $i=>$upload_info)
            try
            {
               //Move file to uploads folder (if it was given):
               if ($this->_dest_folder)
               {
                  $dest_path=$this->_dest_folder->concat($upload_info["name"]->basename);  //NOTE: The user-defined filename is already escaped by the extract_info(). Also, use URLParams::$basename to ensure that no subfolder will be appended to the destination path.
                  if (!move_uploaded_file($upload_info["file"],$dest_path))
                     throw new \RuntimeException("Failed to move uploaded file",self::UPLOADED_EX_MOVE);
                     
                  if ((!chmod($dest_path,$this->files_permissions))&&$this->require_permissions)
                  {
                     unlink($dest_path);
                     throw new \RuntimeException("Failed to change uploaded file permissions",self::UPLOADED_EX_CHMOD);
                  }
                  
                  $upload_info["file"]=new $this->_file_class($dest_path); //Replace outdated temporary path to the file with an actual one.
               }
               
               //If no exception occurs, copy info to result:
               $this->_moved_info[$i]=$upload_info;   //NOTE: Keep original indexes.
            }
            catch (\RuntimeException $ex)
            {
               $this->_move_exceptions[$i]=$ex; //NOTE: Keep original indexes.
               
               if (match ($ex.getCode()) {self::UPLOADED_EX_MAX_COUNT,self::UPLOADED_EX_MAX_SIZE=>true,default=>false}) //Stop uploads processing on certain exceptions.
                  break;   //Break the cycle after the finally section executed.
            }
      }
      catch (\RuntimeException $ex)
      {
         $this->_move_exceptions["dest_folder"]=$ex;
      }
      
      return $this;  //For chain call.
   }
   
   public function move_zipped():self
   {
      //Zip the validated files and moves archive to destination folder.
      //Return value:
      // Absolute path to archive or null on failure.
      
      //TODO: Currently is not implemented.
      
      return $this;  //For chain call.
   }
   
   public function valid_files():array
   {
      //A shorthand, extracts $this->valid_info[*]["file"] to a new array. Keeps entry indexes.
      
      $res=[];
      
      foreach ($this->_moved_info as $i=>$upload_info)
         $res[$i]=$upload_info["file"];
      
      return $res;
   }
   
   public function moved_files():array
   {
      //A shorthand, extracts $this->moved_info[*]["file"] to a new array. Keeps entry indexes.
      
      $res=[];
      
      foreach ($this->_moved_info as $i=>$upload_info)
         $res[$i]=$upload_info["file"];
      
      return $res;
   }
   
   public function set_file_class(string $class=self::DEFAULT_FILE_CLASS)
   {
      //Allows to substitute default class of $this->req_info[*]["file"], $this->valid_info[*]["file"] and $this->moved_info[*]["file"].
      
      $this->_file_class=(class_implements($class,"IFileInfoMIME") ? $class : self::DEFAULT_FILE_CLASS);
   }
}

function format_bytes($val_,$precision_=2,$space_=" ")
{
   $prefixes=["B","KB","MB","GB","TB"];   //binary prefixes
   $pow=floor(log($val_,1024));           //get real power of $val_
   $pow=min($pow,count($prefixes)-1);
   return round($val_/(1<<($pow*10)),$precision_).$space_.$prefixes[$pow];
}

function permissions_encode(int $perms,bool $is_link=false):string
{
   //Returns symbolic notation of permissions.
   //Arguments:
   // $perms - int. Premissions value.
   // $is_link - bool. Whether a file or folder is a symlink. Should be detected externally, because the $perms show no difference (at least in php's functions).
   //NOTE: To get octal representation, use e.g. sprintf("%04o",$perms&07777).
   
   $chars=[
             0b00=>"----------",
             0b01=>"drwxrwxrwx",
             0b10=>"l--S--S--T",
             0b11=>"lrwsrwsrwt",
          ];
   
   $res="          ";
   
   $res[0]=$chars[(int)(($perms&040000)!=0)+((int)$is_link<<1)][0];
   $spec_bits=($perms&07000)>>8; //Special permissions bits: SUID, SGID, and sticky bit.
   for ($i=9;$i>0;$i--)
   {
      $res[$i]=$chars[($perms&0b001)+($spec_bits&02)][$i];
      $perms>>=1;
      $spec_bits>>=(!($i%3));
   }
   
   return $res;
}

function permissions_decode(string $perms_sym):int
{
   //Decodes symbolic representation of permissions to integer value.
   //Arguments:
   // $perms_sym - string. The 9 characters of premissions symbolic notation. Shouldn't contain the directory/symlink specifier, which permissions_encode() includes.
   
   $bits=["-"=>00,"S"=>00,"T"=>00,"r"=>04,"w"=>02,"x"=>01,"s"=>01,"t"=>01];
   $spec_bits=["-"=>00,"r"=>00,"w"=>00,"x"=>00,"s"=>01,"t"=>01,"S"=>01,"T"=>01];
   
   $res=0;
   
   for ($i=2;$i<9;$i+=3)
   {
      $res<<=1;
      $res|=$spec_bits[$perms_sym[$i]];   //Special permissions bits: SUID, SGID, and sticky bit.
   }
   for ($i=0;$i<9;$i++)
   {
      $res<<=(!($i%3))*3;
      $res|=$bits[$perms_sym[$i]];
   }
   
   return $res;
}

/* --------------------------------------- email --------------------------------------- */
function send_email(string|array $recipients,string $subject,string $text,?array $attachments=null,string $sender="noreply"):bool
{
   //Send an email with optional attachments
   //Arguments:
   // $recipients - string|array. Comma-separated list (string) or array with recipient emails.
   // $subject - string. Email subject.
   // $text - string. Email text.
   // $attachments - array. An array, contains a ImpFInfo instances or rows with format, compartible to Uploads::$valid_info: ["name"=>"display-file-name","file"=>new ImpFInfo("/absolute/filepath")].
   // $sender - an email that will appears in From and Reply-To. 
   
   //WARNING: contents of $text, $subject and file names and paths in $attachments array are MUST BE MADE SAFE in advance.
   //NOTE: If you have/need any restrictions for attachments, you have to test and filter $attachments in advance.
   //      This function only test
   
   //Detect text mime subtype
   $is_html=preg_match("/<([!]doctype|html|body)/i",substr($text,24));
   $texttype="text/".($is_html ? "html" : "plain")."; charset=\"utf-8\"";

   if (!$is_html)
      $text=wordwrap($text,70);   //wrap too long strings into 70 characters max in according with email specification
   
   //Make email:
   if (!$attachments)              //Make a simple email
   {
      $content_main_type=$texttype;
      $content=$text;
   }
   else  //Make email with attachments
   {
      //Include text:
      $content_main_type="multipart/mixed; boundary=\"/*--------*/\"";
      $content="--/*--------*/\n".
               "Content-type: ".$texttype."\r\n".
               "Content-Transfer-Encoding: base64\r\n\r\n".
               base64_encode($text)."\r\n";

      //Attach files:
      foreach($attachments as $attachment)
      {
         $attachment=(is_array($attachment) ? $attachment : ["name"=>$attachment->getFilename(),"file"=>$attachment]);
         
         if ($attachment["file"]->isFile()||$attachment["file"]->isReadable())   //[Re]test the file exists and readable, but don't emit error if not.
         {
            //Append file as part of message:
            $content.="--/*--------*/\r\n".
                      "Content-type: ".$attachment["file"]->getMIME()."; name=\"".$attachment["name"]."\"\r\n".
                      "Content-Transfer-Encoding: base64\r\n".
                      "Content-Disposition: attachment\r\n\r\n".
                      base64_encode(file_get_contents($attachment["file"]))."\r\n";
         }
      }

      $content."/*--------*/--";   //insert message end
   }
   
   //Make headers:
   $headers="From: ".$sender."\r\n".
            "Reply-To: ".$sender."\r\n".
            "X-Mailer: PHP/".phpversion()."\r\n".
            "Content-type: ".$content_main_type."\r\n";
   
   if (is_array($recipients))
   {
      $recipient_groups=[];
      foreach ($recipients as $recipient)
         if (preg_match("/^ *((To|Cc|Bcc):)?([a-z0-9@а-яё_., -]+)/i",$recipient,$matches))
            $recipient_groups[($matches[2] ? $matches[2] : "To")][]=$matches[3];
      
      $recipients=implode(",",$recipient_groups["To"]??[]);
      unset($recipient_groups["To"]);
      if ($recipient_groups)
         foreach ($recipient_groups as $hdr=>$grp)
            $headers[$hdr]=implode(",",$grp);
   }
   //TODO: else var_dump(preg_split("/(To|Cc|Bcc):/i","trerert@mail.net,wasd@mail.net  To:Yo_wasd@mail.net, Q_wasd@mail.net",-1,PREG_SPLIT_DELIM_CAPTURE|PREG_SPLIT_NO_EMPTY));
   
   //Send
   return mail($recipients,$subject,$content,$headers);
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

?>