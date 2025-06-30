<?php
//Here are some functions that does not exists in older versions of PHP.

function mb_ucfirst($str_)
{
   //While mb_convert_case() has no native option to uppercase only the first letter as ucfirst() do, this function will do this instead it.
   
   return $str_=="" ? $str_ : mb_convert_case(mb_substr($str_,0,1),MB_CASE_UPPER).mb_convert_case(mb_substr($str_,1),MB_CASE_LOWER);
}
?>