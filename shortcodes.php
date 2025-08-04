<?php
/*==================================*/
/* Utilities plugin                 */
/* Copyright: FSG a.k.a ManiaC      */
/* Contact: imroot@maniacalipsis.ru */
/* License: GNU GPL v3              */
/*----------------------------------*/
/* Most common shortcodes           */
/*==================================*/

namespace Utilities;

add_shortcode("date",__NAMESPACE__."\\date_shortcode");
function date_shortcode($params_="",$content_="")
{
   //Posts (basic post_type "post")

   //WARNING: If shortcode has no params then an empty string will be passed to $params_, not [], thus attempitng to access $params_ elements will cause warning "Illegal string offset".
   if (!is_array($params_))
      $params_=[];
   
   return date($params_["format"]??"Y-m-d H:i:s");
}

abstract class Shortcode
{
   //A bare base for the parametrized multi-templated shortcodes.
   
   protected $name="";   //A unique name of the shortcode.
   protected $tpl_pipe=[/*"tpl"=>"default_tpl"*/];  //Templates pipe. This allow to use a nested templates for e.g. output of the some elements lists. NOTE: This array must be initialized with complete default templates pipe. Otherwise the shortcode rendering will be broken.
   protected $data=null;
   //Rendering params, that can be defined only at the backend:
   public $identity_class=null;  //CSS-class which identifies the certain shortcode's main node. If undefined, it's automatically set equal to shortcode's name.
   //Rendering params, obtained only from shortcode and having no defaults:
   protected $custom_class="";      //Custon css-class. Where it will appear - is a matter of the templates.
   protected $attr_id="";           //ID attribute to be attached  e.g. to the main shortcode layout element.
   protected $attr_data="";         //DATA-... attributes for some kinds of JS-controlled lists like a scrollers or slideshows.
   
   private $stack=[];
   
   public function __construct($name_="")
   {
      if ($name_!="")         //NOTE: For the single
         $this->name=$name_;
      
      $this->identity_class??=$this->name;
      
      //Register shortcode.
      add_shortcode($this->name,[$this,"do"]);
   }
   
   public function do(array|string $params_="",$content_="")
   {
      //This method does this shortcode.
      
      //WARNING: If shortcode has no params then an empty string will be passed to $params_, not [], thus attempitng to access $params_ elements will cause warning "Illegal string offset".
      if (!is_array($params_))
         $params_=[];
      
      $this->push_state(); //Save shortcode params in case of recursive call. NOTE: When shortcode rendering a post content which contains a same shortcode it will be called recursively. However there is only one instance of each shortcode is created. Thus such recursive call can mess params for the previous level.
      
      //Process params and get the data:
      $this->get_rendering_params($params_,$content_);
      $this->get_data($params_);
      
      //Render shortcode:
      $res=$this->{reset($this->tpl_pipe)}();  //Run the top-level template.
      
      $this->pop_state();  //Restore shortcode params after call.
      
      return $res;
   }
   
   protected function get_rendering_params($params_,$content_)
   {
      //Process the rendering params.
      
      //Select the templates:
      $this->setup_tpl_pipe($this->tpl_pipe,$params_);
      
      //Get customizations params:
      $this->custom_class=$params_["class"]??"";
      
      $id=$params_["id"]??"";
      if ($id!="")
         $this->attr_id="ID=\"".htmlspecialchars($id)."\"";
      
      //Get params with data for JS:
      foreach ($params_ as $key=>$val)
         if (str_starts_with($key,"data_")||str_starts_with($key,"data-"))                                  //TODO: WP supports dashes in shortcode attributes well, so this conversion may be removed.
            $this->attr_data.=" ".strtoupper(str_replace("_","-",$key))."=\"".htmlspecialchars($val)."\"";  //    
   }
   
   protected function get_data(array $params_=[])
   {
      //Get and preformat the data. Set results to $this->data.
      //Abstract, overridable.
   }
   
   //abstract protected function default_tpl();   //Return rendered shortcode. NOTE: this method isn't declared bacause the descendant classes may has a different template keys.
   
   protected function setup_tpl_pipe(&$tpl_pipe_,$params_)
   {
      //Assign templates to given $tpl_pipe_ from given $params_:
      foreach ($tpl_pipe_ as $key=>$tpl_name)
      {
         $tpl_method_name=($params_[$key]??"default")."_".$key;
         if (method_exists($this,$tpl_method_name))
            $tpl_pipe_[$key]=$tpl_method_name;
      }
   }
   
   private function push_state()
   {
      //Saves shortcode state for the case of recursive call.
      
      $state=[];
      foreach (get_object_vars($this) as $prop=>$val)
         switch ($prop)
         {
            case "stack":
            case "name":
            case "identity_class":
            {
               break;
            }
            default:
            {
               $state[$prop]=$val;
            }
         }
      array_push($this->stack,$state);
   }
   private function pop_state()
   {
      //Restores shortcode state for the case of recursive call.
      
      $state=array_pop($this->stack);
      if ($state)
         foreach ($state as $prop=>$val)
            $this->{$prop}=$val;
   }
}

abstract class DataListShortcode extends Shortcode
{
   //A base for the shortcodes intended to output the lists of an items.
   // It supports a set of the most necessary parameters for output customization and has a flexible and extensible pipeline.
   // Also it provides a set of the most common list templates.
   //TODO: describe the usage.
   
   protected $tpl_pipe=["wrap_tpl"=>"default_wrap_tpl","list_tpl"=>"default_list_tpl","item_tpl"=>"default_item_tpl"];
   //Data-related properties:
   protected $data=[];
   //Rendering params, that can be defined only at the backend:
   public $list_class="grid";       //CSS-class for the simple list node.
   public $item_class="";           //CSS-class for the items' nodes.
   public $default_empties_count=0; //Default values of the $empties_count.
   //Rendering params, obtained only from shortcode and having no defaults:
   protected $empties_count=0;      //Number of the empty blocks for orphans alignment.
   
   protected function get_rendering_params($params_,$content_)
   {
      //Process the rendering params.
      parent::get_rendering_params($params_,$content_);
      
      //Get list customizations params:
      $this->list_class=$params_["list_class"]??$this->list_class;
      $this->item_class=$params_["item_class"]??$this->item_class;
      $this->empties_count=(int)($params_["empties"]??$this->default_empties_count);
   }
   
   protected function default_wrap_tpl()
   {
      //The default template makes no wrapping.
      
      return $this->{$this->tpl_pipe["list_tpl"]}();  //Just pass and run the next template in the pipe.
   }
   
   protected function default_list_tpl()
   {
      //Render the simple list.
      
      ob_start();
      ?>
      <DIV <?=$this->attr_id?> CLASS="<?=$this->identity_class?> <?=$this->list_class?> <?=$this->custom_class?>">
         <?php
            foreach ($this->data as $item)
               echo $this->{$this->tpl_pipe["item_tpl"]}($item);
            
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
      <DIV <?=$this->attr_id?> CLASS="<?=$this->identity_class?> slideshow <?=$this->custom_class?>" <?=$this->attr_data?>>
         <?php
            foreach ($this->data as $item)
               echo $this->{$this->tpl_pipe["item_tpl"]}($item);
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
      <DIV <?=$this->attr_id?> CLASS="<?=$this->identity_class?> scroller <?=$this->custom_class?>" <?=$this->attr_data?>>
         <DIV CLASS="area">
            <DIV CLASS="content">
               <?php
                  foreach ($this->data as $item)
                     echo $this->{$this->tpl_pipe["item_tpl"]}($item);
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
          $res.=$this->{$this->tpl_pipe["item_tpl"]}($item);
      
      return $res;
   }
   
   abstract protected function default_item_tpl($item_data_);
   
   protected function empties_tpl()
   {
      //Returns a number of empty blocks to align the orphans in the flex grid.
      //NOTE: It's an auxiliary template, and is not intended to be used in the pipe.
      
      return str_repeat("\n         <DIV CLASS=\"".$this->item_class." empty\"></DIV>",$this->empties_count);
   }
}

abstract class PostsPrefabShortcode extends DataListShortcode
{
   //A basic class for creating a parametrized multi-template shortcodes intended to output the posts.
   
   use TMetaQueryHepler;
   
   //Rendering params, that can be redefined just at the backend:
   public $item_class="post";
   public $image_size=null;
   public $default_image_size="full";
   
   protected function get_rendering_params($params_,$content_)
   {
      //Process the rendering params.
      parent::get_rendering_params($params_,$content_);
      
      $this->image_size=$params_["image_size"]??$this->default_image_size;
   }
   
   protected function get_data(array $params_=[],bool $escape_=false)
   {
      //Get posts data.
      
      $this->data=get_posts($this->prepare_filter($params_,$escape_));
   }
   
   protected function get_link($post_)
   {
      //Returns post's link.
      // Helper function.
      
      return get_permalink($post_->ID);
   }
   
   protected function get_image($post_,$size_=null)
   {
      //Returns post's thumbnail src.
      //Helper function. 
      //$size_ - [full|large|medium|thumbnail].
      
      return htmlspecialchars(wp_get_attachment_image_url(get_post_thumbnail_id($post_->ID),$size_??$this->image_size));
   }
}

class MapShortcode extends Shortcode
{
   public $name="map";
   public $key="map";
   protected $data="";  //JSON encoded data.
   protected $tpl_pipe=["wrap_tpl"=>"default_wrap_tpl","map_tpl"=>"default_map_tpl","balloon_tpl"=>"default_balloon_tpl"];  //Templates pipe.
   //Map parameters' defaults:
   public $default_map_id="ymap";
   public $default_map_zoom=16;
   public $default_map_state=["controls"=>["typeSelector","fullscreenControl","geolocationControl","trafficControl","zoomControl","routeEditor","rulerControl"]];
   public $default_map_options=["yandexMapDisablePoiInteractivity"=>true];
   public $default_place_options=["preset"=>"islands#blueStretchyIcon"];
   //Map parameters set by shortcode params:
   protected $map_id=null;
   protected $map_zoom=null;
   //Mapa data source::
   protected $map_data_meta=null;   //Name of user meta field which contains a JSON map data.
   protected $default_map_data_meta="map_data";
   
   protected function get_rendering_params($params_,$content_)
   {
      //Process the rendering params.
      parent::get_rendering_params($params_,$content_);
      
      $this->map_id=$params_["map_id"]??$this->default_map_id;
      $this->map_zoom=(int)($params_["zoom"]??$this->default_map_zoom);
      
      $this->map_data_meta=$params_["map_data_meta"]??$this->default_map_data_meta;
   }
   
   protected function get_data(array $params_=[])
   {
      $this->data=json_decode(get_option($this->map_data_meta,"[]"),true);
   }
   
   protected function default_wrap_tpl()
   {
      //The default template makes no wrapping.
      
      return $this->{$this->tpl_pipe["map_tpl"]}();  //Just pass and run the next template in the pipe.
   }
   
   protected function default_map_tpl()
   {
      //Render the simple list.
      ob_start();
      ?>
      <DIV <?=$this->attr_id?> CLASS="map <?=$this->custom_class?>" <?=$attr_data?>><DIV CLASS="inner" ID="<?=$this->map_id?>"></DIV></DIV>
      <?=$this->script_tpl()?>
      <?php
      return ob_get_clean();
   }
   
   protected function section_map_tpl()
   {
      //Render the simple list.
      ob_start();
      ?>
      <SECTION <?=$this->attr_id?> CLASS="map <?=$this->custom_class?>"><MAP CLASS="inner" ID="<?=$this->map_id?>"></MAP></SECTION>
      <?=$this->script_tpl()?>
      <?php
      return ob_get_clean();
   }
   
   protected function default_balloon_tpl($place_)
   {
      ob_start();
      ?>
      <H6><?=$place_["hint"]??""?></H6>
      <P CLASS="address"><?=$place_["address"]??""?></P>
      <P CLASS="coords"><?=$place_["lat_long"]??""?></P>
      <?php
      return ob_get_clean();
   }
   
   protected function script_tpl()
   {
      //Prepare map data:
      $data=[];
      foreach ($this->data as $place)
         if ($place["lat_long"]??null)
         {
            $place["lat_long"]=(is_array($place["lat_long"]) ? $place["lat_long"] : array_map("floatval",explode(",",$place["lat_long"])));
            $place["balloon"]=addcslashes($place["balloon"]??$this->{$this->tpl_pipe["balloon_tpl"]}($place),"'\\");  //Use a predefined balloon contents or the template. Then, escape resulting plaintext or HTML for use as JS string value.
            $data[]=$place;
         }
         //TODO: Report warning.
      
      ob_start();
      ?>
      <SCRIPT>
        function mapInitCallback()
        {
           //Source data:
           let places=<?=json_encode($data,JSON_ENCODE_OPTIONS)?>;
           
           let mapId='<?=$this->map_id?>';
           let zoom=<?=$this->map_zoom?>;
           let mapState=<?=json_encode($this->default_map_state,JSON_ENCODE_OPTIONS)?>;
           let mapOptions=<?=json_encode($this->default_map_options,JSON_ENCODE_OPTIONS)?>;
           let placeOptions=<?=json_encode($this->default_place_options)?>;
           
           //Create places:
           let yClusterer=new ymaps.Clusterer();
           for (let place of places)
              yClusterer.add(new ymaps.Placemark(place.lat_long,{iconContent:place.text??'',hintContent:place.hint??'',balloonContent:place.balloon},{...placeOptions,preset:place.preset??'islands#redStretchyIcon'}));
           
           //Adjust view area:
           if (places.length>1)
              mapState.bounds=yClusterer.getBounds();
           else
              mapState={...mapState,center:places[0]?.lat_long??[55.755819,37.617644],zoom:zoom};
           
           //Create map and add the places on it:
           let yMap=new ymaps.Map(mapId,mapState,mapOptions);
           yMap.geoObjects.add(yClusterer);
           //Bounds hotfix:
           if (mapState.bounds)
              window.setTimeout(()=>{yMap.setBounds(mapState.bounds);},1000);
           
           window.yMap=yMap;  //Debug.
        }
        ymaps.ready(mapInitCallback);
      </SCRIPT>
      <?php
      return ob_get_clean();
      
   }
   
}

?>