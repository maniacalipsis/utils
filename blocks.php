<?php
/*==================================*/
/* Utilities plugin                 */
/* Copyright: FSG a.k.a ManiaC      */
/* Contact: imroot@maniacalipsis.ru */
/* License: GNU GPL v3              */
/*----------------------------------*/
/* Helper functions and classes     */
/* for blocks rendering.            */
/*==================================*/

namespace Maniacalipsis\Utilities;

use \ClassesAutoloader;
use \ImpFInfo;
use \JSONAns;
use \WP_Block;

function blocks_plugin_init(ImpFInfo|string $plugin_dir,ImpFInfo|string $build_rel_path="/build",ImpFInfo|string $manifest_rel_path="/build/blocks-manifest.php",string $namespace=""):void
{
   //Initializes plugin with Guttenberg blocks.
   /**
    * Registers the block using a `blocks-manifest.php` file, which improves the performance of block type registration.
    * Behind the scenes, it also registers all assets so they can be enqueued
    * through the block editor in the corresponding context.
    *
    * @see https://make.wordpress.org/core/2025/03/13/more-efficient-block-type-registration-in-6-8/
    * @see https://make.wordpress.org/core/2024/10/17/new-block-type-registration-apis-to-improve-performance-in-wordpress-6-7/
    */

   if (!($plugin_dir instanceof ImpFInfo))
      $plugin_dir=new ImpFInfo($plugin_dir);
   
   $manifest_file=$plugin_dir->concat($manifest_rel_path);
   $build_dir=$plugin_dir->concat($build_rel_path);
   
   //Register the block(s) metadata from the `blocks-manifest.php` and registers the block type(s):
   \wp_register_block_types_from_metadata_collection($build_dir,$manifest_file);

   //Registers blocks extra features:
   //NOTE: The metadata keys used below are non-standard for WP.
   $manifest_data=require $manifest_file;
   foreach ($manifest_data as $block_type=>$block_meta)
      if ($block_meta["extra"]??null)
      {
         $block_extra=$block_meta["extra"];  //All extra metadata are grouped in the "extra".
         
         //Block-specific classes autoload:
         //NOTE: Directories with autoloading clases shall be registered before registration of AJAX handlers.
         if ($block_extra["autoloadDir"]??null)
            ClassesAutoloader::append([(string)$build_dir->concat($block_type,remove_block_asset_path_prefix($block_extra["autoloadDir"]))=>($block_extra["namespacePrefix"]??$namespace)]);
         
         //AJAX processing:
         if (($block_extra["ajax"]??null)||($block_extra["ajaxClass"]??null))
         {
            $action=get_block_action($block_meta["name"]);  //Convert fully qualified block name to the action parameter used in XHR requests.
            
            if ($block_extra["ajax"]??null)  //PHP script for processing the AJAX requests.
            {
               $handler_path=$plugin_dir->concat(remove_block_asset_path_prefix($block_extra["ajax"]));
               $callback=function()use($handler_path){require($handler_path);};
            }
            elseif ($block_extra["ajaxClass"]??null)  //Class able to process AJAX requests.
               $callback=function()use($block_extra){die(new $block_extra["ajaxClass"]($_REQUEST)->get_ans());};
            
            add_action("wp_ajax_$action",$callback);
            add_action("wp_ajax_nopriv_$action",$callback);
         }
      }
}

function render_block_attributes(array $attributes,string $attrs_prefix="",array $attrs_map=["anchor"=>"id","className"=>"class","style"=>"style"]):string
{
	//Helps to convert Guttenberg block attributes to HTML element's ones and render'em to string.
	//Arguments:
	// $attributes - array. A Guttenberg block attributes. Note that, in general, they has no correlation with HTML element attributes.
	//TODO: Currently, this function implements "strict" mode i.e. it filters-off all that is not listed in the $attrs_map. However, there is a thought to add feature to pass all $attributes as is if $attrs_map is explicitly set [] or null.

   $mapped_attrs=[];
	foreach ($attrs_map as $key=>$attr_name)
		if (!empty($attributes[$attrs_prefix.$key]))
         $mapped_attrs[$attr_name]=$attributes[$attrs_prefix.$key];

	return render_element_attrs($mapped_attrs);
}

function get_block_action(WP_Block|string $from):string
{
   return strtr(($from instanceof WP_Block  ? $from->name : $from),"-/","__");
}

abstract class ABlockRenderer implements \Stringable
{
   protected ?array  $data=null; //Primary dynamic data to render, e.g. array of posts.
   protected  string $variation {get=>$this->attributes["variation"]??"default";} //A shorthand for the variation attribute.
   
   public function __construct(
      //NOTE: Following props/args correspond to those available in block's render.php. See https://developer.wordpress.org/block-editor/getting-started/fundamentals/static-dynamic-rendering/#how-to-define-dynamic-rendering-for-a-block for details.
      protected readonly ?array     $attributes=null, //The array of attributes for the block.
      protected readonly ?string    $content=null,    //The markup of the block as stored in the database, if any. (Usually empty unless block use inner blocks).
      protected readonly ?WP_Block  $block=null,      //The instance of the WP_Block class that represents the rendered block (metadata of the block).
   )
   {
      $this->load_data();
   }
   
   //Method load_data() retrieves all data the dynamic block require tyo be rendered.
   // This is not limited to filling $this->data property, but may include any other props, defined in descendant classes. Thus this method designed as procedure, not a function.
   abstract protected function load_data():void;
}

class PostsRenderer extends ABlockRenderer
{
   //Designed for use in dynamic block templates to select and render posts.
   //Usage example:
   //<file://./src/block/render.php>
   // echo new \Utilities\PostsRenderer($attributes,$content,$block);
   
   use TMetaQueryHepler
   {
      TMetaQueryHepler::prepare_filter as _helper_prepare_filter;
   }

   protected function prepare_filter(array $params_,bool $escape_=false):array
   {
      switch ($params_["selection_mode"]??"all")
      {
         case "include":
         {
            $params_["include"]=$params_["ids"];
            break;
         }
         case "exclude":
         {
            $params_["exclude"]=$params_["ids"];
            break;
         }
         case "exclude_current":
         {
            $params_["exclude"]=[get_post()?->ID];
            break;
         }
         default:
         {
            
         }
      }
      
      return $this->_helper_prepare_filter($params_,$escape_);
   }
   
   protected function load_data():void
   {
      //Loads posts using filter parameters from the block attributes.
      // This method allows to extend posts loading in a simplier way than extending the constructor.
      
      $this->data=get_posts($this->prepare_filter($this->attributes["filter"]??[],true));
   }
   
   public function __toString():string
   {
      //Renders block's HTML.

      $item_attrs=$this->attributes;
      $item_attrs["className"]=$this->filter["post_type"]." ".$item_attrs["className"];
      $item_attrs_str=render_block_attributes($item_attrs);
      
      $header_tag=$this->attributes["header_tag"]??"div";

      ob_start();
      foreach ($this->data as $post)
      {
         $post_url=htmlspecialchars(get_permalink($post->ID));
         $image_src=get_post_image_src($post);
         $img_alt=htmlspecialchars($post->post_title);
         ?>
         <A HREF="<?=$post_url?>" <?=$item_attrs_str?>>
            <?php
            //Featured image:
            switch ($this->attributes["image_tag"]??"")
            {
               case "div":
               {
                  ?><DIV CLASS="image" STYLE="background-image:url('<?=$image_src?>')" TITLE="<?=$img_alt?>"></DIV><?php
                  break;
               }
               case "figure":
               {
                  ?><FIGURE CLASS="image"><IMG SRC="<?=$image_src?>" ALT="<?=$img_alt?>"></FIGURE><?php
                  break;
               }
               case "img":
               {
                  ?><IMG SRC="<?=$image_src?>" ALT="<?=$img_alt?>"><?php
                  break;
               }
               default:
               {
                  //Do not show featured image.
               }
            }
            //Header:
            ?>
            <<?=$header_tag?> CLASS="header"><?=$post->post_title?></<?=$header_tag?>>
            <?php if ($this->attributes["show_excerpt"]):?>
            <DIV CLASS="text">
               <?=$post->post_excerpt?>
            </DIV>
            <?php endif;?>
         </A>
         <?php
      }
      return ob_get_clean();
   }
}

class AsyncPostsList extends PostsRenderer
{
   public function get_ans():JSONAns
   {
      return new JSONAns(["status"=>"ok","data"=>$this->data]);
   }
   
   protected function make_list_attrs():array
   {
      //Returns array of attributes for rendering a static part of the block.
      // Designed for convenient extending.
      
      return [
                "id"=>$this->attributes["anchor"],
                "class"=>$this->filter["post_type"]." ".($this->attributes["className"]??""),
                "data-request"=>new JSONAns(["action"=>get_block_action($this->block),"filter"=>$this->attributes["filter"]??[]]),   //Allow descendant classes to append request params.
             ];
   }
   
   public function __toString():string
   {
      //Renders a static part of the block, i.e. an empty list, supplied with request parameters the JS shall use to load items.

      $item_attrs_str=render_element_attrs($this->make_list_attrs());
      
      ob_start();
         ?>
         <DIV <?=$item_attrs_str?>></DIV>
         <?php
      return ob_get_clean();
   }
}

abstract class AMapRenderer extends ABlockRenderer
{
   //Abstract map renderer.
   //Usage example:
   // class MyMapRenderer extends \Utilities\AMapRenderer
   // {
   //    protected function load_data():void
   //    {
   //       $this->json_data=get_option($this->attributes["optName"],$this->json_data);
   //    }
   // }
   
   //Map data:
   protected string $json_data="[]";   //This property is used instead of parent::$data (for decode-encode optimization) and must be filled with actual data by method load_data().
   
   //Map parameters' defaults:
   protected string $map_id {get=>htmlspecialchars(($this->attributes["anchor"]??"")!="" ? $this->attributes["anchor"] : "ymap");}
   protected int    $map_zoom {get=>(int)($this->attributes["mapZoom"]??16);}
   protected array  $default_map_state     {get=>["controls"=>["typeSelector","fullscreenControl","geolocationControl","trafficControl","zoomControl","routeEditor","rulerControl"]];}
   protected array  $default_map_options   {get=>["yandexMapDisablePoiInteractivity"=>true];}
   protected array  $default_place_options {get=>["preset"=>"islands#blueStretchyIcon"];}
   
   public function __toString():string
   {
      $outer_attrs=array_diff_key($this->attributes,["anchor"=>null]);
      $outer_attrs["className"]="map ".$outer_attrs["className"];
      
      ob_start();
      ?>
      <SCRIPT TYPE="module">
        function mapInitCallback()
        {
           //Source data:
           let places=<?=$this->json_data?>;
           
           let mapId='<?=$this->map_id?>';
           let zoom=<?=$this->map_zoom?>;
           let mapState=<?=json_encode($this->default_map_state,JSON_ENCODE_OPTIONS)?>;
           let mapOptions=<?=json_encode($this->default_map_options,JSON_ENCODE_OPTIONS)?>;
           let placeOptions=<?=json_encode($this->default_place_options,JSON_ENCODE_OPTIONS)?>;
           
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
      <DIV <?=render_block_attributes($outer_attrs)?>><DIV ID="<?=$this->map_id?>" CLASS="inner"></DIV></DIV>
      <?php
      return ob_get_clean();
   }
}
?>