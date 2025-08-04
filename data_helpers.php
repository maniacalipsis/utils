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
      $numberposts=$params_["numberposts"]??$params_["limit"]??null; //Translate "limit" to "numberposts" as the last one isn't intuitive.
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

trait TAsyncPostsLoader
{
   //Allows to load posts using XHR.
   //Shall be used with classes that extends PostsPrefabShortcode.
   
   public $items_container_class="items"; //CSS-class for the list items container.
   public $btn_load_class="load_more";    //CSS-class for the "Load More" button.
   public $btn_load_caption="Load More";  //Caption for the "Load More" button.
   
   protected ?int   $rows_total=null;
   protected  array $response=[];
   protected  int   $default_count=25;
   
   public function __construct($name_="")
   {
      parent::__construct($name_);
      
      if (wp_doing_ajax())
      {
         add_action("wp_ajax_nopriv_".$this->name,[$this,"handle_request"]);
         add_action("wp_ajax_".$this->name       ,[$this,"handle_request"]);
      }
   }
   
   public function handle_request():void
   {
      //Handle AJAX request from the feedback form.
      // This method is a parallel of the Shortcode::do().
      
      //Get data:
      try
      {
         $params=$_REQUEST;
         if (isset($params["count"]))
            $params["numberposts"]=$params["count"];  //Translate forntend's "count" back to the WP's "numberposts".
         $this->get_data($params,true);               //Get params from request and tell the self::prepare_filter() to escape'em.
         
         $this->response=[
                            "status"=>"ok",
                            "data"=>$this->data,               //Method self::get_data() shall set props $this->data
                            "rows_total"=>$this->rows_total,   // and $this->rows_total.
                         ];
      }
      catch (Exception $ex)
      {
         $this->response["status"]="fail";
         $this->response["errors"]=[$ex->getMessage()];
      }
      finally
      {
         //Finally, send a response:
         echo json_encode($this->response,JSON_ENCODE_OPTIONS);
         die();
      }
   }
   
   protected function get_rendering_params($params_,$content_)
   {
      parent::get_rendering_params($params_,$content_);
      
      //Static block params:
      $this->items_container_class=$params_["items_container_class"]??$this->items_container_class;
      $this->btn_load_class       =$params_["btn_load_class"       ]??$this->btn_load_class       ;
      $this->btn_load_caption     =$params_["btn_load_caption"     ]??$this->btn_load_caption     ;
      
      //Copy filter params to the list tag data attributes:
      $ajax_req_data=["action"=>$this->name,...array_intersect_key($params_,$this->filter_allowed)];
      if (isset($ajax_req_data["numberposts"]))
      {
         $ajax_req_data["count"]=$ajax_req_data["numberposts"];   //Translate WP's "numberposts" to "count" for compatibility with js_utils.js functions.
         unset($ajax_req_data["numberposts"]);
      }
      
      $this->attr_data.=" DATA-FILTER=\"".htmlspecialchars(json_encode($ajax_req_data,JSON_ENCODE_OPTIONS))."\"";
   }
   
   protected function default_list_tpl()
   {
      //Render the simple list.
      
      ob_start();
      ?>
      <DIV <?=$this->attr_id?> CLASS="<?=$this->identity_class?> <?=$this->list_class?> <?=$this->custom_class?>" <?=$this->attr_data?>>
         <DIV CLASS="<?=$this->items_container_class?>">
            <?php
               foreach ($this->data as $item)
                  echo $this->{$this->tpl_pipe["item_tpl"]}($item);
            ?>
         </DIV>
         <BUTTON TYPE="button" CLASS="<?=$this->btn_load_class?>"><?=$this->btn_load_caption?></BUTTON>
      </DIV>
      <?php
      return ob_get_clean();
   }
}

?>