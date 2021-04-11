<?php
/*==================================*/
/* Utilities plugin                 */
/* Copyright: FSG a.k.a ManiaC      */
/* Contact: imroot@maniacalipsis.ru */
/* License: GNU GPL v3              */
/*----------------------------------*/
/* Most common shortcodes           */
/*==================================*/

function utils_date_shortcode($params_="",$content_="")
{
   //Posts (basic post_type "post")

   //WARNING: If shortcode has no params then an empty string will be passed to $params_, not [], thus attempitng to access $params_ elements will cause warning "Illegal string offset".
   if (!is_array($params_))
      $params_=[];
   
   return date(arr_val($params_,"format","Y-m-d H:i:s"));
}
add_shortcode("date","utils_date_shortcode");
