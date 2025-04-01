<?php
/*==================================*/
/* The Pattern Engine Version 3     */
/* Copyright: FSG a.k.a ManiaC      */
/* Contact: imroot@maniacalipsis.ru */
/* License: GNU GPL v3              */
/*----------------------------------*/
/* CAPTCHA functions                */
/*==================================*/

/*===========================================================================================================*/
/* This file is part of The Pattern Engine.                                                                  */
/* The Pattern Engine is free software: you can redistribute it and/or modify it under the terms of the      */
/* GNU General Public License as published by the Free Software Foundation, either version 3 of the License. */
/* The Pattern Engine is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;           */
/* without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.                 */
/* See the GNU General Public License for more details.                                                      */
/* You should have received a copy of the GNU General Public License along with The Pattern Engine.          */
/* If not, see http://www.gnu.org/licenses/.                                                                 */
/*===========================================================================================================*/

//Depends on:
// graphics.php


require_once("graphics.php");

//Constants for function generate_random_text:
define("CAPTCHA_CHARS","ABCEHKMPTXY12456789");
define("CAPTCHA_CHAR_ALIASES",["А"=>"A","В"=>"B","С"=>"C","Е"=>"E","Н"=>"H","К"=>"K","М"=>"M","Р"=>"P","Т"=>"T","Х"=>"X","У"=>"Y","О"=>"0","O"=>"0"]);


function generate_captcha_str()
{
   $res=substr(str_shuffle(CAPTCHA_CHARS.CAPTCHA_CHARS),0,strlen(CAPTCHA_CHARS));   //Some chars may appear twice.
   $res=substr(str_shuffle($res),0,rand(4,6));  //Shuffle one more time and get a random-length portion.
   return $res;
}

function compare_captcha_str($original_,$user_input_)
{
   $res=false;
   
   if ($original_!="")
   {
      $user_input_=mb_strtoupper($user_input_); //Allow to use any letter case
      
      if ($original_==$user_input_) //Fast strict check
         $res=true;
      else                          //Loose check (allows to mix up latin and cyrillic characters)
      {
         $orig_len=mb_strlen($original_);
         $user_len=mb_strlen($user_input_);
         if ($orig_len==$user_len)
         {
            $correct_chars_cnt=0;
            for ($i=0;$i<$orig_len;$i++)
            {
               $ch_orig=mb_substr($original_,$i,1);
               $ch_usr=mb_substr($user_input_,$i,1);
               if (($ch_usr==$ch_orig)||(CAPTCHA_CHAR_ALIASES[$ch_usr]==$ch_orig))
                  $correct_chars_cnt++;
            }
            
            $res=($correct_chars_cnt==$orig_len);
         }
      }
   }
   
   return $res;
}

//Usage example:
//  require_once("captcha.php");                                                                               //include this module
//  header("Content-Type:image/png",true);                                                                     //output png image
//  putenv('GDFONTPATH='.$_SERVER["DOCUMENT_ROOT"]."/fonts/");                                                 //define path to fonts
//  $fonts_avail=array(array("name"=>"decrepit","prescale"=>0.8),array("name"=>"lcddot","prescale"=>1.0));	   //define names of font files (excluding extention), and prescale multiplier to equalize different fonts
//  $code=generate_random_text(5,RANDOM_TEXT_LATIN_LOWER|RANDOM_TEXT_LATIN_UPPER|RANDOM_TEXT_DIGITS);          //make code (5 characters length, with upper/lower case latin characters and didits)
//  echo make_captcha($code,$fonts_avail,256,84);                                                              //make and output captcha png image

//Usage example 2:
//  require_once("captcha.php");                                                                               //include this module
//  putenv('GDFONTPATH='.$_SERVER["DOCUMENT_ROOT"]."/fonts/");                                                 //define path to fonts
//  $fonts_avail=array(array("name"=>"decrepit","prescale"=>0.8),array("name"=>"lcddot","prescale"=>1.0));     //define names of font files (excluding extention), and prescale multiplier to equalize different fonts
//  $code=generate_random_text(5,RANDOM_TEXT_LATIN_LOWER|RANDOM_TEXT_LATIN_UPPER|RANDOM_TEXT_DIGITS);          //make code (5 characters length, with upper/lower case latin characters and didits)
//  $png_image=base64_encode(make_captcha($code,$fonts_avail,256,84));                                         //make captcha png and encode it using base64
//  ehco "<IMG SRC="data:image/png;base64,".$png_image"\">";                                                   //build in encoded image to html page
function make_captcha_image($str_,$fonts_dir_="",array $options=[])
{
   $output_stream=null;
   
   //Init parameters
   $size_x=256;
   $size_y=96;
   $bbox=["lt"=>["x"=>0,"y"=>0],"rb"=>["x"=>$size_x,"y"=>$size_y]];
   $content_bbox=["lt"=>["x"=>ceil($size_x*0.05),"y"=>ceil($size_y*0.07)],"rb"=>["x"=>floor($size_x*0.95),"y"=>floor($size_y*0.93)]];
   
   $debris_fugures_funcs=[null,null,null,null];//[null,null,"draw_randomized_triangle",null,null,"draw_randomized_star",null,null];
   $debris_fugures_funcs_cnt=count($debris_fugures_funcs);
   
   $fonts=iterator_to_array(new FSFilterIterator($fonts_dir_,show_files:true,show_folders:false,include_types:"/^application\\/(x-font-opentype|vnd.ms-opentype|x-font-truetype|x-font-ttf|font-woff)/"),false);  //Don't preserve keys, use numeric indexes.
   $fonts_cnt=count($fonts);
   
   //Set content allocation parameters:
   $chars_cnt=mb_strlen($str_);        //Number of chars in captcha string.
   $extra_col_cnt=rand(1,2);           //Cols with no chars.
   $col_cnt=$chars_cnt+$extra_col_cnt; //Total number of cols and rows of the table 
   $row_cnt=3;                         // where the chars or debris elements will be placed.
   
   //Create empty image:
   $res_img=imagecreatetruecolor($size_x,$size_y);    //background
   if (function_exists("imageantialias"))
      imageantialias($res_img,true);

   //Draw background
   $gradient_vector=[
                       "start"=>["x"=>rand(0,$size_x>>2),"y"=>rand(0,$size_y)],           //Generate a random vector from the 1st quarter of the image
                       "end"=>["x"=>rand(($size_x>>2)*3,$size_x),"y"=>rand(0,$size_y)]    // to the last quarter of the image.
                    ];
                    
   $key_colors=[random_color_hsv(["v"=>98,"a"=>100])];                        //The foreground colors will be a complementary ones for the background colors.
   $gradient_nodes=[["pos"=>0,"color"=>color_hsv_to_rgb($key_colors[0])]];    //1st random color will be a reference point for other gradient colors.
   for ($i=1;$i<$col_cnt+1;$i++)
   {
      $key_colors[]=deviated_color_hsv($key_colors[$i-1],["h"=>5,"s"=>30,"v"=>16,"a"=>0]);                              //Each next background color is a random deviation from the previous one.
      $gradient_nodes[]=["pos"=>(($i+(rand(-10,10)/100))/($col_cnt+2)),"color"=>color_hsv_to_rgb($key_colors[$i-1])];   // The most deviation range is by saturation and value.
   }
   $key_colors[]=deviated_color_hsv($key_colors[$i-1],["h"=>5,"s"=>30,"v"=>10,"a"=>0]);
   $gradient_nodes[]=["pos"=>1,"color"=>color_hsv_to_rgb($key_colors[$i-1])];
   
   switch ($options["bg"]??"gradient")
   {
      case "gradient":
      {
         gradient_fill($res_img,$bbox,$gradient_vector,$gradient_nodes);               //fill background with gradient
         break;
      }
      case "transparent":
      {
         imagefill($res_img,0,0,imagecolorallocatealpha($res_img,255,255,255,0));
         break;
      }
      default: //Custom color
      {
         $color=decode_color_rgba($options["bg"]??"#FFFFFF");
         imagefill($res_img,0,0,imagecolorallocatealpha($res_img,$color["r"],$color["g"],$color["b"],$color["a"]));
      }
   }
   
   //Generate randomized cells for the letters and debris
   $prev_x=array_fill(0,$row_cnt,$content_bbox["lt"]["x"]);
   $cells=[];
   $next_chr_index=0;
   for ($c=0;$c<$col_cnt;$c++)
   {
      $prev_y=$content_bbox["lt"]["y"];
      
      $char_row=-1;
      if (($next_chr_index<$chars_cnt)&&($extra_col_cnt>0))
      {
         $char_row=rand(0,$row_cnt-1);    //Select a row, where char from captcha str will appear.
         if ($char_row>$row_cnt-1)        // and if column remains empty, 
            $extra_col_cnt--;             // decrease the number of columns that may be left empty.
      }
      
      for ($r=0;$r<$row_cnt;$r++)
      {
         $next_x=min($prev_x[$r]+($content_bbox["rb"]["x"]/$col_cnt)*(1+rand(-30,30)/100),$content_bbox["rb"]["x"]);  //Each cell goes after previous one without overlap.
         $next_y=min($prev_y+($content_bbox["rb"]["y"]/$row_cnt)*(1+rand(-10,10)/100),$content_bbox["rb"]["y"]);      //Size of cells randomly varies from 0.7 to 1.3 of its regular size, defined by number od cols and rows.
         $cell=[
                  "lt"=>["x"=>$prev_x[$r],"y"=>$prev_y],
                  "rb"=>["x"=>$next_x,"y"=>$next_y],   
               ];
         if ($r==$char_row)
         {
            $cell["func"]="draw_randomized_char";
            $cell["char"]=mb_substr($str_,$next_chr_index,1);  //Alloc char to the cell.
            $cell["font"]=$fonts[rand(0,$fonts_cnt-1)]->getPathname();
            $cell["color"]=$key_colors[$c];                    //Char shall be painted with the color complementary to the nearby background.
            $next_chr_index++;
         }
         else
            $cell["func"]=$debris_fugures_funcs[rand(0,$debris_fugures_funcs_cnt-1)];   //Or alloc a debris figure.
         
         $cells[]=$cell;
         
         $prev_x[$r]=$next_x;
         $prev_y=$next_y;
      }
   }
   
   //DEBUG:
   //$wht=imagecolorallocatealpha($res_img,255,255,255,80);
   //foreach ($cells as $cell)
   //   imagefilledrectangle($res_img,$cell["lt"]["x"],$cell["lt"]["y"],$cell["rb"]["x"],$cell["rb"]["y"],$wht);
   //END OF DEBUG.
   
   //Paint generated content
   foreach ($cells as $cell)
      if ($cell["func"])
         $cell["func"]($res_img,$cell);
   
   //Post processing:
   imagefilter($res_img,IMG_FILTER_GAUSSIAN_BLUR);
   //imagefilter($res_img,IMG_FILTER_SMOOTH,5);

   //Get image data in png format:
   try
   {
      ob_start();                         //start sub-level output buffering
      imagepng($res_img);                 //png data will be output into this sub-level buffer instead of main output buffer.
      $output_stream=ob_get_clean();      //get png data from sub-level buffer and clean&close this sub-level buffering
   }
   catch (Error|Exception $ex)
   {
      $output_stream="";
   }
   
   imagedestroy($res_img);
   
   return $output_stream;
}

function draw_randomized_char($img_,$params_)
{
   $color=color_hsv_to_rgb(($params_["color"] ? color_hsv_opposite($params_["color"]) : random_color_hsv(["v"=>20,"a"=>95])));
   $color_id=imagecolorallocatealpha($img_,$color["r"],$color["g"],$color["b"],round((255-$color["a"])/255*127));
   $size=floor(($params_["rb"]["y"]-$params_["lt"]["y"])*1.2); //in points.
   $angle=rand(-30,30); //in degrees
   $start_pt=rotate_point(["x"=>$params_["lt"]["x"],"y"=>$params_["rb"]["y"]],$angle,bbox_center($params_));
   imagefttext($img_,$size,$angle,$start_pt["x"],$start_pt["y"],$color_id,$params_["font"],$params_["char"]);  
}
function draw_randomized_triangle($img_,$params_)
{
   $mid_x=($params_["lt"]["x"]+$params_["rb"]["x"])>>1;
   $mid_y=($params_["lt"]["y"]+$params_["rb"]["y"])>>1;
   $angle=rand(0,270);
   $points=[
              ["x"=>$mid_x,"y"=>$params_["lt"]["y"]],
              ["x"=>$params_["rb"]["x"],"y"=>$mid_y],
              ["x"=>$mid_x,"y"=>$params_["rb"]["y"]],
           ];
   $points=rotate_polygon($points,$angle,["x"=>$mid_x,"y"=>$mid_y]);
   $color=color_hsv_to_rgb(($params_["color"] ? color_hsv_opposite($params_["color"]) : random_color_hsv(["v"=>20,"a"=>95])));
   $color_id=imagecolorallocatealpha($img_,$color["r"],$color["g"],$color["b"],round((255-$color["a"])/255*127));
   paint_polygon($img_,$points,null,$color_id);
}
function draw_randomized_star($img_,$params_)
{
   $mid_x=($params_["lt"]["x"]+$params_["rb"]["x"])>>1;
   $mid_y=($params_["lt"]["y"]+$params_["rb"]["y"])>>1;
   $angle=rand(0,135);
   $points=[
              ["x"=>$mid_x,"y"=>$params_["lt"]["y"]],
              ["x"=>$params_["rb"]["x"],"y"=>$mid_y],
              ["x"=>$mid_x,"y"=>$params_["rb"]["y"]],
              ["x"=>$params_["lt"]["x"],"y"=>$mid_y],
           ];
   $points=rotate_polygon($points,$angle,["x"=>$mid_x,"y"=>$mid_y]);
   $color=color_hsv_to_rgb(($params_["color"] ? color_hsv_opposite($params_["color"]) : random_color_hsv(["v"=>20,"a"=>95])));
   $color_id=imagecolorallocatealpha($img_,$color["r"],$color["g"],$color["b"],round((255-$color["a"])/255*127));
   paint_polygon($img_,$points,null,$color_id);
}

function random_color_hsv($default_=null)
{
   return [
             "h"=>($default_["h"]===null ? rand( 0,360) : $default_["h"]),
             "s"=>($default_["s"]===null ? rand(50,100) : $default_["s"]),
             "v"=>($default_["v"]===null ? rand( 0,100) : $default_["v"]),
             "a"=>($default_["a"]===null ? rand( 0,100) : $default_["a"]),
          ];
}

function deviated_color_hsv(array $default_,array $deviation_)
{
   return [
             "h"=>($default_["h"]+($deviation_["h"] ? rand(-$deviation_["h"],$deviation_["h"]) : 0)),
             "s"=>($default_["s"]+($deviation_["s"] ? rand(-$deviation_["s"],$deviation_["s"]) : 0)),
             "v"=>($default_["v"]+($deviation_["v"] ? rand(-$deviation_["v"],$deviation_["v"]) : 0)),
             "a"=>($default_["a"]+($deviation_["a"] ? rand(-$deviation_["a"],$deviation_["a"]) : 0)),
          ];
}

function color_hsv_opposite(array $hsv_color_,$hue_max_=360)
{
   $res=[
           "h"=>($hsv_color_["h"]<ceil($hue_max_/2) ? $hsv_color_["h"]+180 : $hsv_color_["h"]-180),
           "s"=>$hsv_color_["s"],//($hsv_color_["s"]*$hsv_color_["v"])/((100-$hsv_color_["s"])*$hsv_color_["v"]),
           "v"=>($hsv_color_["v"]<50 ? $hsv_color_["v"]+50 : $hsv_color_["v"]-50),
        ];
        
   if ($hsv_color_["a"]!==null)
      $res["a"]=$hsv_color_["a"];
   
   return $res;
}
?>