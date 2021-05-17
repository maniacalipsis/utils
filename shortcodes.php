<?php
/*==================================*/
/* Utilities plugin                 */
/* Copyright: FSG a.k.a ManiaC      */
/* Contact: imroot@maniacalipsis.ru */
/* License: GNU GPL v3              */
/*----------------------------------*/
/* Most common shortcodes           */
/*==================================*/

namespace UtilityShortcodes;

add_shortcode("date","UtilityShortcodes\date_shortcode");
function date_shortcode($params_="",$content_="")
{
   //Posts (basic post_type "post")

   //WARNING: If shortcode has no params then an empty string will be passed to $params_, not [], thus attempitng to access $params_ elements will cause warning "Illegal string offset".
   if (!is_array($params_))
      $params_=[];
   
   return date(arr_val($params_,"format","Y-m-d H:i:s"));
}

class DataListShortcode
{
   //A basic class for creating a parametrized multi-template shortcodes intended to output the lists of some data.
   // It supports a set of the most necessary parameters for output customization and has a flexible and extensible pipeline.
   // Also it provides a set of the most common list templates.
   //TODO: describe the usage.
   
   public $name="list";   //Unique name of the shortcode.
   protected $tpl_layers=["wrap_tpl","list_tpl","item_tpl"];
   protected $wrap_tpl="default_wrap_tpl";
   protected $list_tpl="default_list_tpl";
   protected $item_tpl="default_item_tpl";
   //Data-related properties:
   protected $filter=[];
   protected $data=[];
   //Rendering params, that can be redefined just at the backend:
   public $basic_list_class="list";
   public $basic_item_class="item";
   //Rendering params, obtained only from shortcode and having no defaults:
   protected $custom_class="";   //Custon css-class. Where it will appear - is a matter of the templates.
   protected $attr_id="";        //ID attribute to be attached  e.g. to the main shortcode layout element.
   protected $attr_data="";      //DATA-... attributes for some kinds of JS-controlled lists like a scrollers or slideshows.
   //Rendering params, that has defaults and can be redefined into shortcode:
   public $empties_count=0;   //Number of the empty blocks for orphans alignment.
   
   public function __construct($name_="")
   {
      if ($name_)
         $this->name=$name_;
      
      add_shortcode($this->name,[$this,"render"]);
   }
   
   public function render($params_="",$content_="")
   {
      //WARNING: If shortcode has no params then an empty string will be passed to $params_, not [], thus attempitng to access $params_ elements will cause warning "Illegal string offset".
      if (!is_array($params_))
         $params_=[];
      
      //Process params:
      $this->get_filtering_params($params_);
      $this->get_rendering_params($params_,$content_);
      
      //Get and render the data:
      $this->get_data();
      return $this->{$this->wrap_tpl}();  //Run the top-layer template.
   }
   
   protected function get_filtering_params($params_)
   {
      //Process data filtering params.
      //Abstract.
   }
   
   protected function get_rendering_params($params_,$content_)
   {
      //Get templates:
      foreach ($this->tpl_layers as $layer)
      {
         $tpl=arr_val($params_,$layer,"default")."_".$layer;
         if (method_exists($this,$tpl))
            $this->{$layer}=$tpl;
      }
      
      //Get list customizations params:
      $this->custom_class=arr_val($params_,"class",$this->custom_class);
      $this->empties_count=(int)arr_val($params_,"empties",$this->empties_count);
      
      //Get ID attribute:
      $id=arr_val($params_,"id","");
      if ($id!="")
         $this->attr_id="ID=\"".htmlspecialchars($id)."\"";
      
      //Get params for JS:
      foreach ($params_ as $key=>$val)
         if (str_starts_with($key,"data_"))
            $this->attr_data.=" ".strtoupper(str_replace("_","-",$key))."=\"".htmlspecialchars($val)."\"";
   }
   
   protected function get_data()
   {
      //Get and preformat the data.
      //Abstract.
   }
   
   protected function default_wrap_tpl()
   {
      //By default there is no wrapping, so just pass.
      
      return $this->{$this->list_tpl}();
   }
   
   protected function default_list_tpl()
   {
      //Render the simple list.
      
      ob_start();
      ?>
      <DIV <?=$this->attr_id?> CLASS="<?=$this->basic_list_class?> grid <?=$this->custom_class?>">
         <?php
            foreach ($this->data as $item)
               echo $this->{$this->item_tpl}($item);
            
            echo $this->empties_tpl(); //Pad the items with empty blocks to align the orphans in the flex grid.
         ?>
      </DIV>
      <?php
      return ob_get_clean();
   }
   
   protected function slideshow_list_tpl()
   {
      //Render the slideshow.
      
      ob_start();
      ?>
      <DIV <?=$this->attr_id?> CLASS="<?=$this->basic_list_class?> slideshow <?=$this->custom_class?>" <?=$this->attr_data?>>
         <?php
            foreach ($this->data as $item)
               echo $this->{$this->item_tpl}($item);
         ?>
         <DIV CLASS="button prev"></DIV>
         <DIV CLASS="button next"></DIV>
      </DIV>
      <?php
      return ob_get_clean();
   }
   
   protected function scroller_list_tpl()
   {
      //Render the scroller.
      
      ob_start();
      ?>
      <DIV <?=$this->attr_id?> CLASS="<?=$this->basic_list_class?> scroller <?=$this->custom_class?>" <?=$this->attr_data?>>
         <DIV CLASS="area">
            <DIV CLASS="content">
               <?php
                  foreach ($this->data as $item)
                     echo $this->{$this->item_tpl}($item);
               ?>
            </DIV>
         </DIV>
         <DIV CLASS="button left"></DIV>
         <DIV CLASS="button right"></DIV>
      </DIV>
      <?php
      return ob_get_clean();
   }
   
   protected function pass_list_tpl()
   {
      //Output items directly.
      
      $res="";
      
      //Add the nav label:
      if ($this->attr_id)
         $res.="<SPAN ".$this->attr_id." CLASS=\"hidden\"></SPAN>";
      
      //Output the list items:
      foreach ($this->data as $item)
          $res.=$this->{$this->item_tpl}($item);
      
      return $res;
   }
   
   protected function default_item_tpl($item_data_)
   {
      //An example template for the data item.
      //Abstract.
      
      ob_start();
      ?>
         <DIV CLASS="<?=$this->basic_item_class?>">
            <?php
            var_dump($item_data_)
            ?>
         </DIV>
      <?php
      return ob_get_clean();
   }
   
   protected function empties_tpl()
   {
      //Returns a number of empty blocks to align the orphans in the flex grid.
      
      return str_repeat("\n         <DIV CLASS=\"".$this->basic_item_class." empty\"></DIV>",$this->empties_count);
   }
}

class PostsPrefabShortcode extends DataListShortcode
{
   //A basic class for creating a parametrized multi-template shortcodes intended to output the posts.
   
   public $name="posts";   //Shortcode name.
   public $filter_defaults=["post_type"=>"post","category"=>1,"post_status"=>"publish","orderby"=>"date","order"=>"DESC","numberposts"=>-1];
   //Data-related properties:
   protected $filter=[];
   //Rendering params, that can be redefined just at the backend:
   public $basic_list_class="posts_list";
   public $basic_item_class="post";
   //Rendering params, that has defaults and can be redefined into shortcode:
   
   protected function get_filtering_params($params_)
   {
      //Get the posts filtering params.
      
      $params_["numberposts"]=arr_val($params_,"limit",arr_val($params_,"numberposts",$this->filter_defaults["numberposts"]));  //Translate "limit" to "numberposts" as the last one isn't intuitive.
      $this->filter=array_replace($this->filter_defaults,array_intersect_key($params_,$this->filter_defaults));   //Filter params of the filter.
   }
   
   protected function get_data()
   {
      //Get the posts.
      $this->data=get_posts($this->filter);
   }
   
   protected function get_link($post_)
   {
      //Returns post's link.
      // Helper function.
      
      return get_permalink($post_->ID);
   }
   
   protected function get_image($post_,$size_="full")
   {
      //Returns post's thumbnail src.
      //Helper function. 
      
      return htmlspecialchars(wp_get_attachment_image_url(get_post_thumbnail_id($post_->ID),$size_));
   }
}

?>