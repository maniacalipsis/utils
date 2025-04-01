<?php
/*==================================*/
/* The Pattern Engine Version 3     */
/* Copyright: FSG a.k.a ManiaC      */
/* Contact: imroot@maniacalipsis.ru */
/* License: GNU GPL v3              */
/*----------------------------------*/
/* Core graphics utilities          */
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

//Const IMG_TYPES contains string aliases of GD image type constants.
//NOTE: here are only saveable formats.
//NOTE: The first format should be recognized as default for saving images that can't be saved in its original format.
define("IMG_TYPES",[IMAGETYPE_PNG=>"png",IMAGETYPE_GIF=>"gif",IMAGETYPE_JPEG=>"jpeg",IMAGETYPE_BMP=>"bmp",IMAGETYPE_WBMP=>"wbmp",IMAGETYPE_XBM=>"xbm",IMAGETYPE_SWC=>"swc",IMAGETYPE_WEBP=>"webp"]);
define("MAX_COLOR_ALPHA",127);

//Parsing functions
function parse_angle($angle_)
{
   //Returns css angle value in degrees.
   //NOTE: if units are omitted, it's recognized as degrees. rad2deg
   
   $res=floatval($angle_);
   if (preg_match("/[0-9. ](deg|rad|grad|turn)\\s*$/i",$angle_,$matches))
      switch ($matches[1])
      {
         case "rad": {$res=rad2deg($res); break;}
         case "grad": {$res/=400; break;}
         case "turn": {$res*=360; break;}
      }
   
   return $res;
}

function parse_aspect_ratio($str_ratio_)
{
   $res=1;
   
   $str_ratio_=trim($str_ratio_);
   $w_h=preg_split("/[\\/:]/",$str_ratio_);
   $res=floatval($w_h[0]);
   if ($w_h[1])
      $res/=floatval($w_h[1]);
   
   return $res;
}

function parse_offset($offset_)
{
   //Parses offset parameter and returns float coefficients.
   //Arguments:
   // $offset_ - string or array. $offset should contain one or two values, like a background position in  css, except here are no absolute values, but only literals like "left", "top", etc. or percents or float coefficients from 0 to 1.
   //            String must be whitespace-separated. Array may have numeric (0 and 1) or associative ("x" and "y") keys. 
   
   $res=["x"=>0.5,"y"=>0.5];
   $key_aliases=[0=>"x",1=>"y","x"=>"x","y"=>"y"];
   
   //Convert string $offset_ to array
   if (!is_array($offset_))
      $offset_=preg_split("/\s+/",$offset_,2,PREG_SPLIT_NO_EMPTY);
   
   //Parse values
   $cnt=count($offset_);
   foreach ($offset_ as $key=>&$val)
      switch ($val)
      {
         case "left":   {if ($key_aliases[$key]=="x") $res["x"]=0.0; break;}
         case "right":  {if ($key_aliases[$key]=="x") $res["x"]=1.0; break;}
         case "top":    {if (($key_aliases[$key]=="y")||($cnt==1)) $res["y"]=0.0; break;}
         case "bottom": {if (($key_aliases[$key]=="y")||($cnt==1)) $res["y"]=1.0; break;}
         default:
         {
            if (preg_match("/^-?[0-9.]+%$/",$val))
               $val=min(max(floatval($val)/100,0),1); //Clamp to [0..1]
            elseif (is_numeric($val))
               $val=min(max(floatval($val),0),1); //Clamp to [0..1]
         }
      }
   
   return $res;
}

function get_image_rotation_angle($path_,$exif_=null)
{
   //Returns clockwise image rotation angle from image metadata
   //Arguments:
   // $path_ - image file path
   // $info_ - 2-nd argument, returned by getimagesize(), if it's already obtained.
   // $exif_ - result of the exif_read_data(), if it's already obtained.
   
   $res=0;
   
   if (!$exif_)
      $exif_=exif_read_data($path_);
   
   switch($exif_["Orientation"])
   {
      case 3:{$res=180; break;}
      case 6:{$res=90; break;}
      case 8:{$res=-90; break;}
   }
   
   return $res;
}

function read_img_resource($path_,&$size_=null,&$type_=null)
{
   $res=null;
   
   if (file_exists($path_))
   {
      $sz=getimagesize($path_,$img_info);
      $size_=["w"=>$sz[0],"h"=>$sz[1]];
      $type_=$sz[2]; //One of the GD's IMAGETYPE_XXX constants.
      
      $creator_func="imagecreatefrom".IMG_TYPES[$type_];
      if (function_exists($creator_func))
         $res=$creator_func($path_);
   }
   
   return $res;
}

function save_img_resource($img_resource_,string $dest_,$format_=IMAGETYPE_PNG,$quality_=95,$compression_=5)
{
   //Write image resource, created by GD imagefrom.* functions to disk.
   //Arguments:
   // $img_resource_ - image resource.
   // $dest_ - string, destination file path.
   // $format_ - one of the GD's IMAGETYPE_* constants or their string aliases from IMG_TYPES const array. If given format is not available, an image will be saved as PNG.
   // $quality_ - int, lossy compression quality for JPEG and WEBP. Values from 0 (worst) to 100 (best).
   // $compression_ - int, losless compression level. Values: 0 - no compression, 1 to 9 - PNG deflate? compression or compressed BMP, -1 - PNG zlib compression or compressed BMP.
   
   switch ($format_)
   {
      case IMAGETYPE_GIF:
      case "gif":
      {
         $res=imagegif($img_resource_,$dest_);
         break;
      }
      case IMAGETYPE_JPEG:
      case "jpeg":
      {
         $res=imagejpeg($img_resource_,$dest_,$quality_);   //$quality_ is from 0 to 100
         break;
      }
      case IMAGETYPE_WEBP:
      case "webp":
      {
         $res=imagewebp($img_resource_,$dest_,$quality_);   //$quality_ is from 0 to 100 as in JPEG
         break;
      }
      case IMAGETYPE_BMP:
      case "bmp":
      {
         $res=imagebmp($img_resource_,$dest_,(bool)$compression_); //Interprete compression parameter from imagepng().
         break;
      }
      case IMAGETYPE_WBMP:
      case "wbmp":
      {
         $res=imagewbmp ($img_resource_,$dest_);
         break;
      }
      case IMAGETYPE_XBM:
      case "xbm":
      {
         $res=imagexbm($img_resource_ ,$dest_);
         break;
      }
      case IMAGETYPE_PNG:
      case "png":
      default:
      {
         //Any format that is supported for reading but not supported for writing will be turned to PNG.
         $res=imagepng($img_resource_,$dest_,(int)$compression_);
         break;
      }
   }
   
   return $res;   //WARNING: However, if libgd fails to output the image, all its image.* function returns TRUE.
}

//Image transformation
function resize_image(string $source_,array $params_,string $dest_=NULL)
{
   //Function for preproduction of uploaded images.
   //Pipeline:
   // Rotate->Crop->Resize->Watermark->Convert.
   //Arguments:
   // $source_ - string, path to input file.
   // $params_ - assoc array.
   //    Rotate params:
   //       "rotate" - int/string, -90 or "ccw", 90 or "cw",180,"auto". Optional, default - no rotation. Rotate "auto" will try to use image orientation data.
   //    Crop params:
   //       "crop"=["left"=>int,"top"=>int,"w"=>int,"h"=>int] - assoc array, with position and size of the cropping frame in pixels. Optional, alternative to "autocrop".
   //       "autocrop"=["ratio"=>mixed,"offset"=>mixed]. Optional, alternative to "crop".
   //          "ratio" - string or float, image aspect ratio as width/height. It may be defined as natural fraction like "3/2" or "3:2", or as float value.
   //          "offset" - string or array, its like a css background-position, except absolute values aren't allowed. E.g. "center 10%", [0.5,"10%"], ["y"=>0.1] - are ok, but "20px 5px" - not ok.
   //    Resize params:
   //       "w" - int, maximum image width in pixels. Optional, if omitted image will be scaled only by height.
   //       "h" - int, maximum image height in pixels. Optional, if omitted image will be scaled only by width. If both of "w" and "h" omitted, then image will not be scaled at all.
   //       "upscale", bool. Allow or deny to upscale smaller images. Optional, default - false.
   //    Watermark params:
   //       "watermark"=["src"=>string,"w"=>float,"h"=>float,"x"=>float,"y"=>float,"note"=>string,"mode"=>string] - assoc array, optional.
   //          "src" - path to watermark file,
   //          "w","h" - maximum relative width and height (from 0 to 1) of the watermark projection on the image. Optional, default value is 0.2, i.e. watermark will cover 20% of image. 
   //          "x","y" - relative offset (from 0 to 1) of the left top corner of the watermark projection from top left corner of the image. Optional, default value "x"=1-"w" and "y"=1-"h", i.e. watermark will be placed at the bottom right corner of image.
   //          "note" - copyright note, that will be stored in jpeg\tiff IPTC data to signal that watermark was applied. Optional. Default is "Copyrighted". Affects only jpeg/tiff.
   //          "mode" - watermark will be applied to the image if its IPTC tag Copyright is: "empty" - empty, "ne" - not equal to "mote" value, "forced" - anyway (use with care because may result a multiply watermark overlays).
   //    Format conversion params:
   //       "formats" - comma-seperated string or array of strings, with list of desired output formats. See available values in IMG_TYPES const. If the source image has undesired format (not in this list), it'll be converted to the first format in this list. Default value is whole IMG_TYPES array.
   //       "quality" - int. Affects only JPEG and WEBP images. See save_img_resource() for details. Default is 98.
   //       "compression" - int. Affects PNG and BMP. See save_img_resource() for details. Default is 5.
   
   
   $res=false; //Success or fail. NOTE: See save_img_resource() for details of saving result.
   
   $modified=false;
      
   //Get a source image resource and params:
   $img_resource=read_img_resource($source_,$src_size,$src_type);
   if ($img_resource&&($src_size["w"]>1)&&($src_size["h"]>1))
   {
      imageantialias($img_resource,true);
      imagesetinterpolation($img_resource,IMG_MITCHELL);
      
      //Rotate:
      //TODO: may be image orientation should be appended to the given angle, if browser autorotates images.
      if (($params_["rotate"]??0)=="auto")
         $angle=get_image_rotation_angle($source_);
      else
         $angle=parse_angle($params_["rotate"]??0);
      
      if ($angle)
      {
         $img_resource=imagerotate($img_resource,$angle,0); //Rotation on angle not divisible by 90deg will cause enlargement of the image and filling the extra background with 0-th color from the image palette.
         $src_size=["w"=>imagesx($img_resource),"h"=>imagesy($img_resource)]; //Get new inage size after rotation.
         //TODO: reset orientation
         
         $modified=true;
      }
      
      //Crop:
      $crop_frame=null;
      if ($params_["crop"]??null)   //Crop to exactly given frame, this option prevails over "autocrop".
      {
         //Limit crop frame to source image bounds:
         $params_["crop"]["w"]=min(max($params_["crop"]["w"],1),$src_size["w"]);
         $params_["crop"]["h"]=min(max($params_["crop"]["h"],1),$src_size["h"]);
         $params_["crop"]["x"]=min(max($params_["crop"]["x"],0),$src_size["w"]-$params_["crop"]["w"]);
         $params_["crop"]["y"]=min(max($params_["crop"]["y"],0),$src_size["h"]-$params_["crop"]["h"]);
         
         if (($params_["crop"]["w"]<$src_size["w"])||($params_["crop"]["h"]<$src_size["h"])) //If cropping is actually needed
            $crop_frame=["x"=>$params_["crop"]["x"],"y"=>$params_["crop"]["y"],"width"=>$params_["crop"]["w"],"height"=>$params_["crop"]["h"]];
      }
      elseif ($params_["autocrop"]??null) //Crop to given aspect ratio.
      {
         $ratio=parse_aspect_ratio($params_["autocrop"]["ratio"]);
         if (($src_size["w"]/$src_size["h"])!=$ratio)
         {
            //Calc crop frame size and position:
            $crop_frame=$src_size+["x"=>0,"y"=>0,"width"=>$src_size["w"],"height"=>$src_size["h"]];   //Defaults.
            
            $offset=parse_offset($params_["autocrop"]["offset"]);
            $new_w=round($src_size["h"]*$ratio);
            $new_h=round($src_size["w"]/$ratio);
            if ($new_w<$src_size["w"])
            {
               $crop_frame["width"]=$new_w;
               $crop_frame["x"]=round(($src_size["w"]-$new_w)*$offset["x"]);
            }
            elseif ($new_h<$src_size["h"])
            {
               $crop_frame["height"]=$new_h;
               $crop_frame["y"]=round(($src_size["h"]-$new_h)*$offset["y"]);
            }
         }
      }
      
      if ($crop_frame)
      {
         $img_resource=imagecrop($img_resource,$crop_frame);
         $src_size=["w"=>imagesx($img_resource),"h"=>imagesy($img_resource)]; //Get new inage size after cropping.
            
         $modified=true;
      }
      
      //Resize:
      if (($params_["w"]??null)||($params_["h"]??null))
      {
         $scale_x=($params_["w"]??null ? $params_["w"]/$src_size["w"] : 1);   //Calc scale that will satisfy width limit
         $scale_y=($params_["h"]??null ? $params_["h"]/$src_size["h"] : 1);   // and the same for the height limit.
         $scale=min($scale_x,$scale_y);                                       //And choose a minimal one.
         if (($scale<1)||(($scale>1)&&to_bool($params_["upscale"])))
         {
            $tmp=imagescale($img_resource,$src_size["w"]*$scale,-1,IMG_MITCHELL); //NOTE: imagescale() does not modify the passed image; instead, a new image is returned.
            if ($tmp!==false)
            {
               imagedestroy($img_resource);
               $img_resource=$tmp;
               unset($tmp);
               
               $src_size=["w"=>imagesx($img_resource),"h"=>imagesy($img_resource)]; //Get new inage size after resizing.
               
               $modified=true;
            }
         }
      }
      
      //Apply watermark:
      if ($params_["watermark"]??null)
      {
         $wm_resource=read_img_resource(abs_path($params_["watermark"]["src"]));
         if ($wm_resource)
         {
            
            $modified=imagecopyresampled($img_resource,$wm_resource,$dst_x,$dst_y,$src_x,$src_y,$dst_w,$dst_h,$src_w,$src_h);
         }
      }
      
      
      //Finally, convert and save:
      $params_["formats"]=array_map("strtolower",(is_array($params_["formats"]??null) ? $params_["formats"] : explode(",",$params_["formats"])));  //Turn user-defined list of desired formats to lowercase array.
      $formats_available=array_intersect(IMG_TYPES,$params_["formats"]);   //Restrict user-defined list to formats available for writing.
      if (!$formats_available)                                             //If there is no user-defined formats or no valid format was given,
         $formats_available=IMG_TYPES;                                     // use all available formats.

      if (                                      //Save image if it:
            $modified||                         // was modified,
            (!$formats_available[$src_type])||  // should be saved in different format,
            (($dest_)&&($dest_!=$source_))      // should be saved with another file path.
         )                                      //
      {
         if (!$dest_)
            $dest_=$source_;
         
         $format=($formats_available[$src_type] ? $formats_available[$src_type] : reset($formats_available));  //Select output format,
         $quality=($params_["quality"]!==null ? (int)$params_["quality"] : 98);                                // lossy compression quality
         $compression=($params_["compression"]!==null ? (int)$params_["compression"] : 5);                     // and losless compression level.
         
         $res=save_img_resource($img_resource,$dest_,$format,$quality,$compression);
      }
      else
         $res=true;  //Return true if no modifications was needed.
   }
   
   return $res;
}

/* --------- Paint functions --------- */
function gradient_fill($img_,$bounding_box_,$vector_,$nodes_,$interpolation_="cos")
{
   //Fill the rectangle area with a linear gradient along the vector.
   //Arguments:
   // $img_ - image resource, created by GD.
   // $bounding_box_ - array ["lt"=>["x"=>int,"y"=>int],"rb"=>["x"=>int,"y"=>int]], where "lt" - left top and "rb" - right bottom corners of filling rectangle.
   // $vector_ - array ["start"=>["x"=>int,"y"=>int],"end"=>["x"=>int,"y"=>int]]. The gradient vector.
   // $nodes_ - 
   // $function_ - color transition function, "cos" or "linear".
   
   //Precalculate coordinates conversion from image-based reference frame to the gradient vector-based reference frame
   // x_gr = X cos α— Y sin α, where the x_gr is projection of the pixel onto gradient vector
   $vector_pol=round_vector(vector_to_polar($vector_));
   $cos_a=cos($vector_pol["a"]);
   $sin_a=sin($vector_pol["a"]);
   
   //Generate and allocate colors
   $colors=generate_gradient_colors($nodes_,$vector_pol["l"],$interpolation_);
   $color_ids=[];
   foreach ($colors as $color)
      $color_ids[]=imagecolorallocatealpha($img_,$color["r"],$color["g"],$color["b"],127-round($color["a"]/255*127));
   
   //Paint gradient
   for ($y=$bounding_box_["lt"]["y"];$y<=$bounding_box_["rb"]["y"];$y++)
      for ($x=$bounding_box_["lt"]["x"];$x<=$bounding_box_["rb"]["x"];$x++)
      {
         $x_gr=round($x*$cos_a-$y*$sin_a);                     //Get projection of the pixel onto gradient vector.
         $color_index=min(max(0,$x_gr),$vector_pol["l"]-1);    //All pixels before the gradient start will be painted with the 0th color, and all pixels after the gradient end will be painted with the last one.
         imagesetpixel($img_,$x,$y,$color_ids[$color_index]);
      }
}

function generate_gradient_colors($nodes_,$length_,$interpolation_="cos")
{
   //Generate an array of transition colors of the gradient.
   //Arguments:
   //  $nodes_ - array, nodes of the gradient. Each node is ["pos"=>float,"color"=>mixed);
   //    "pos" is a float number from 0 to 1 that defines relative position of the node. At least two nodes required: with "pos" equal to 0 and 1. NOTE: nodes must be sorted by "pos" ascending.
   //    "color" string contains a color in any RGB[A] CSS notation or an associative array like ["r"=>int,"g"=>int,"b"=>int,"a"=>int] ("a" is optional).
   //  $length_ - int, total length of colors array that should be generated. In fact, it's a gradient length in pixels.
   //  $interpolation_ - "cos" or "linear". A function that will be used to calculate transitional colors.
   
   $colors=[];
   $nodes_count=count($nodes_);

   if (($nodes_count>1)&&($length_>1))
   {
      $interpolation_func="gradient_intarpolation_".$interpolation_;
      
      //Turn colors to the ["r"=>int,"g"=>int,"b"=>int,"a"=>int] format.
      foreach ($nodes_ as &$node)
         $node["color"]=decode_color_rgba($node["color"]);
      unset($node);
      
      //Calculate colors
      $prev=0;
      $next=1;
      $segment_start=0;
      while ($next<$nodes_count)
      {
         $segment_end=$length_*$nodes_[$next]["pos"];
         $segm_l=$segment_end-$segment_start;
         $dl=0;
         for ($l=$segment_start;$l<$segment_end;$l++)
         {
            $new_color=[];
            foreach ($nodes_[$prev]["color"] as $channel=>$prev_val)
               $new_color[$channel]=$interpolation_func($prev_val,$nodes_[$next]["color"][$channel],$dl,$segm_l);
            
            $colors[$l]=$new_color;
            $dl++;
         }
         $prev=$next;
         $next++;
         $segment_start=$segment_end;
      }
   }
   
   return $colors;
}

function gradient_intarpolation_cos($prev__,$next_,$dl_,$segment_length_)
{
   return round($prev__+($next_-$prev__)*(-cos($dl_/$segment_length_*Pi())/2+0.5));
}
function gradient_intarpolation_linear($prev_,$next_,$dl_,$segment_length_)
{
   return round($prev_+($prev_-$next_)*($dl_/$segment_length_));
}

function paint_polygon($img_,$points_,$fill_color_=NULL,$stroke_color_=NULL,$thikness_=1)
{
   //Paint a polygon.
   //Arguments:
   // $img_ - image resource, created by GD.
   // $points_ - array of points, each point is ["x"=>float,"y"=>float]. At leat 3 points required.
   // $fill_color_ and $stroke_color_ - color identifiers created with GD's imagecolorallocate(). Each is optional,
   // $thikness_ - int, stroke thikness_ in pixels. Optional.
   
   $coords_arr=[];
   foreach ($points_ as $point)  //Convert points array to GD format [x1,y0,x1,y1,...,xn,yn];
   {
      $coords_arr[]=$point["x"];
      $coords_arr[]=$point["y"];
   }
   $points_cnt=count($points_);
   
   if ($fill_color_)
      imagefilledpolygon($img_,$coords_arr,$points_cnt,$fill_color_);   //Fill before stroke, because the inner half of the stroke line must overlap the fill.
   
   if ($stroke_color_)
   {
      imagesetthickness($img_,$thikness_);
      imagepolygon($img_,$coords_arr,$points_cnt,$stroke_color_);
   }
}

/* ------------- Color utilities ------------- */
function decode_color_rgba($color_)
{
   $res=["r"=>0,"g"=>0,"b"=>0,"a"=>MAX_COLOR_ALPHA];
   
   if (is_array($color_))
   {
      foreach ($res as $key=>$val)
         if ($color_[$key])
            $res[$key]=$color_[$key];
   }
   elseif (preg_match("/rgba?\\(\ *([0-9]{1,3}) *, *([0-9]{1,3}) *, *([0-9]{1,3}) *(, *([0-9.]{1,3}))? *\)/i",$color_,$matches)) //"rgb(int,int,int)" or "rgba(int,int,int,float)" notation.
   {
      $res["r"]=(int)$matches[1];
      $res["g"]=(int)$matches[2];
      $res["b"]=(int)$matches[3];
      if ($matches[5]!==NULL)
         $res["a"]=round(MAX_COLOR_ALPHA*(float)$matches[5]); //Alpha is supposed to be [0.0..1.0].
   }
   elseif (preg_match("/^ *#([0-9A-F]{2})([0-9A-F]{2})([0-9A-F]{2})([0-9A-F]{2})? *$/i",$color_,$matches))  //"#RRGGBB" or "#RRGGBBAA" hexadecimal notation.
   {
      $res["r"]=hexdec($matches[1]);
      $res["g"]=hexdec($matches[2]);
      $res["b"]=hexdec($matches[3]);
      if ($matches[4]!="")
         $res["a"]=hexdec($matches[4]);
   }
   elseif (preg_match("/^ *#([0-9A-F])([0-9A-F])([0-9A-F])([0-9A-F])? *$/i",$color_,$matches))   //"#RGB" or "#RGBA" shortened notation.
   {
      $res["r"]=hexdec($matches[1].$matches[1]);
      $res["g"]=hexdec($matches[2].$matches[2]);
      $res["b"]=hexdec($matches[3].$matches[3]);
      if ($matches[4]!="")
         $res["a"]=hexdec($matches[4].$matches[4]);
   }
   
   return $res;
}

function color_hsv_to_rgb(array $hsv_color_,$hue_max_=360,$alpha_max_=100)
{
   $H_sextus=floor($hue_max_/6);
   $Hi=ceil($hsv_color_["h"]/$H_sextus)%6;
   $Vmin=((100-$hsv_color_["s"])*$hsv_color_["v"])/100;
   $a=($hsv_color_["v"]-$Vmin)*($hsv_color_["h"]%$H_sextus)/$H_sextus;
   $Vinc=$Vmin+$a;
   $Vdec=$hsv_color_["v"]-$a;
   
   switch($Hi)
   {
      case 0:{$res=["r"=>$hsv_color_["v"],"g"=>$Vinc,"b"=>$Vmin]; break;}
      case 1:{$res=["r"=>$Vdec,"g"=>$hsv_color_["v"],"b"=>$Vmin]; break;}
      case 2:{$res=["r"=>$Vmin,"g"=>$hsv_color_["v"],"b"=>$Vinc]; break;}
      case 3:{$res=["r"=>$Vmin,"g"=>$Vdec,"b"=>$hsv_color_["v"]]; break;}
      case 4:{$res=["r"=>$Vinc,"g"=>$Vmin,"b"=>$hsv_color_["v"]]; break;}
      case 5:{$res=["r"=>$hsv_color_["v"],"g"=>$Vmin,"b"=>$Vdec]; break;}
   }
   
   foreach ($res as &$val)
      $val=(int)min(max(0,round($val/100*255)),255);
   
   if ($hsv_color_["a"]!==NULL)
      $res["a"]=(int)min(max(0,round($hsv_color_["a"]/$alpha_max_*255)),255);
   
   return $res;
}

/* ------------- Vector utilities ------------- */
function rotate_point($point_,$angle_,$center_)
{
   //Rotate the point on given angle around the center.
   //Arguments:
   // $point_ - array, ["x"=>float,"y"=>float]. Initial coords of the point.
   // $angle_ - float, angle of rotation in degrees.
   // $center_ - array, ["x"=>float,"y"=>float]. Coordinates of the center of rotation.
   
   $angle_=deg2rad($angle_);
   $x=$point_["x"]-$center_["x"];
   $y=$point_["y"]-$center_["y"];
   return [
             "x"=>($center_["x"]+$x*cos($angle_)+$y*sin($angle_)),
             "y"=>($center_["y"]-$x*sin($angle_)+$y*cos($angle_))
          ];
}

function scale_point($point_,$multiplier_,$center_)
{
   //Scale the position of the point relative to the center.
   //Arguments:
   // $point_ - array, ["x"=>float,"y"=>float]. Initial coords of the point.
   // $multiplier_ - float, scalar multiplier.
   // $center_ - array, ["x"=>float,"y"=>float]. Coordinates of the center of scaling.
   
   $w=$point_["x"]-$center_["x"];
   $h=$point_["y"]-$center_["y"];
   return [
             "x"=>($center_["x"]+$w*$multiplier_),
             "y"=>($center_["y"]+$h*$multiplier_)
          ];
}

function round_point($point_)
{
   return ["x"=>round($point_["x"]),"y"=>round($point_["y"])];
}

function rotate_vector($vector_,$angle_,$center_=NULL)
{
   //Rotate vector around given center or its own start.
   //Arguments:
   // $vector_ - array ["start"=>["x"=>float,"y"=>float],"end"=>["x"=>float,"y"=>float]]. Initial vector.
   // $angle_ - float, angle of rotation in degrees.
   // $center_ - array ["x"=>float,"y"=>float]. Coordinates of the center of scaling. Optional, if omitted, the $vector_["start"] will be used instead.
   
   return [
             "start"=>($center_ ? rotate_point($vector_["start"],$angle_,$center_) : $vector_["start"]),
             "end"=>rotate_point($vector_["end"],$angle_,($center_ ? $center_ : $vector_["start"]))
          ];
}

function scale_vector($vector_,$multiplier_,$center_)
{
   //Scale vector relative given center or its own start.
   //Arguments:
   // $vector_ - array ["start"=>["x"=>float,"y"=>float],"end"=>["x"=>float,"y"=>float]]. Initial vector.
   // $multiplier_ - float, scalar multiplier.
   // $center_ - array, ["x"=>float,"y"=>float]. Coordinates of the center of scaling. Optional, if omitted, the $vector_["start"] will be used instead.
   
   return array(
                  "start"=>($center_ ? scale_point($vector_["start"],$angle_,$center_) : $vector_["start"]),
                  "end"  =>scale_point($vector_["end"],($center_ ? $center_ : $vector_["start"]))
               );
}

function sum_vectors(...$vectors_)
{
   //Summarize variable sequence of vectors.
   
   $res=reset($vectors_);
   
   while ($vector=next($vectors_))
      $res["end"]=[
                     "x"=>($res["end"]["x"]+($vector["end"]["x"]-$vector["start"]["x"])),
                     "y"=>($res["end"]["y"]+($vector["end"]["y"]-$vector["start"]["y"]))                  
                  ];
   
   return $res;
}

function vector_length($vector_)
{
   return sqrt(pow($vector_["end"]["x"]-$vector_["start"]["x"],2)+pow($vector_["end"]["y"]-$vector_["start"]["y"],2));
}

function vector_mid($vector_)
{
   return array("x"=>(($vector_["start"]["x"]+$vector_["end"]["x"])/2),"y"=>(($vector_["start"]["y"]+$vector_["end"]["y"])/2));
}

function vector_to_polar($vector_,$angle_unit_="rad")
{
   //Converts a vector to polar coordinate system.
   //Arguments:
   // $vector_ - array, ["start"=>["x"=>float,"y"=>float],"end"=>["x"=>float,"y"=>float]]
   
   $l=vector_length($vector_);
   if ($l==0)
      $a=0;
   else
       {
          $dx=$vector_["end"]["x"]-$vector_["start"]["x"];
          $dy=$vector_["end"]["y"]-$vector_["start"]["y"];

          if (abs($dx)>abs($dy))
             $a=(($dy>=0) ? 1 : -1)*acos($dx/$l);
          else
              $a=($dx>=0) ? asin($dy/$l) : Pi()-asin($dy/$l);

          if ($angle_unit_=="deg")
             $a=rad2deg(-$a);
       }

   return ["start"=>$vector_["start"],"a"=>$a,"l"=>$l];
}

function round_vector($vector_)
{
   //Round the vector coordinates (and the vector length in polar coordinates notation) to integer.
   //Arguments:
   // $vector_ - array, ["start"=>["x"=>float,"y"=>float],"end"=>["x"=>float,"y"=>float]] or ["start"=>["x"=>float,"y"=>float],"a"=>float_angle,"l"=>float_length].
   
   $res=["start"=>round_point($vector_["start"])];
   if ($vector_["end"])
      $res["end"]=round_point($vector_["end"]);
   else
   {
      $res["a"]=$vector_["a"];
      $res["l"]=round($vector_["l"]);
   }
      
   return $res;
}

function bbox_center($bbox_)
{
   //Find a center of bounding box, defined by top-left and bottom-right points
   
   return array("x"=>(($bbox_["lt"]["x"]+$bbox_["rb"]["x"])/2),"y"=>(($bbox_["lt"]["y"]+$bbox_["rb"]["y"])/2));
}

function get_polygon_center($points_)
{
   //Find a barycenter of the polygon.
   //Arguments:
   // $points_ - array of points, each point is ["x"=>float,"y"=>float]. The polygon, defined by vertexes.
   
   $res=["x"=>0,"y"=>0];
   
   foreach ($points_ as $point)
   {
      $res["x"]+=$point["x"];
      $res["y"]+=$point["y"];
   }
   $points_cnt=count($points_);
   $res["x"]=$res["x"]/$points_cnt;
   $res["y"]=$res["y"]/$points_cnt;
   
   return $res;
}

function rotate_polygon($points_,$angle_,$center_=NULL)
{
   //Rotate a polygon around given center or its own center.
   //Arguments:
   // $points_ - array of points, each point is ["x"=>float,"y"=>float]. Initial polygon, defined by vertexes.
   // $angle_ - float, angle of rotation in degrees.
   // $center_ - array, ["x"=>float,"y"=>float]. Coordinates of the center of rotation. Optional, if omitted, the polygon center will be used instead.
   
   if (!$center_)
      $center_=get_polygon_center($points_);
   
   $res=[];
   foreach ($points_ as $point)
      $res[]=rotate_point($point,$angle_,$center_);
   
   return $res;
}

function scale_polygon($points_,$multiplier_,$center_=NULL)
{
   //Rotate a polygon around given center or its own center.
   //Arguments:
   // $points_ - array of points, each point is ["x"=>float,"y"=>float]. Initial polygon, defined by vertexes.
   // $multiplier_ - float, scalar multiplier.
   // $center_ - array, ["x"=>float,"y"=>float]. Coordinates of the center of scaling. Optional, if omitted, the polygon center will be used instead.
   
   if (!$center_)
      $center_=get_polygon_center($points_);
   
   $res=[];
   foreach ($points_ as $point)
      $res[]=scale_point($point,$multiplier_,$center_);
   
   return $res;
}

function round_polygon($points_)
{
   $res=[];
   
   foreach ($points_ as $point)
      $res[]=round_point($point);
   
   return $res;
}

?>