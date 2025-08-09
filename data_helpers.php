<?php
/*==================================*/
/* Utilities plugin                 */
/* Copyright: FSG a.k.a ManiaC      */
/* Contact: imroot@maniacalipsis.ru */
/* License: GNU GPL v3              */
/*----------------------------------*/
/* Helpers and base classes for     */
/* data querying and requesting.    */
/*==================================*/

namespace Utilities;

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

?>