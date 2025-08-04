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

namespace Utilities;

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

class PostsRenderer implements \Stringable
{
   //Designed for use in dynamic block templates to select and render posts.
   //Usage example:
   //<file://./src/block/render.php>
   // echo new \Utilities\PostsRenderer($attributes,$content,$block);
   
   use TMetaQueryHepler;

   protected ?array $data=null;
   
   protected string $variation {get=>$this->attributes["variation"]??"default";} //A shorthand for the variation attribute.

   public function __construct(
      //NOTE: Following props/args correspond to those available in block's render.php. See https://developer.wordpress.org/block-editor/getting-started/fundamentals/static-dynamic-rendering/#how-to-define-dynamic-rendering-for-a-block for details.
      protected readonly ?array     $attributes=null, //The array of attributes for the block.
      protected readonly ?string    $content=null,    //The markup of the block as stored in the database, if any. (Usually empty unless block use inner blocks).
      protected readonly ?\WP_Block $block=null,      //The instance of the WP_Block class that represents the rendered block (metadata of the block).
   )
   {
      $this->load_data();
   }
   
   protected function load_data():void
   {
      //Loads posts using filter parameters from the block attributes.
      // This method allows to extend posts loading in a simplier way than extending the constructor.
      
      $filter=$this->attributes["filter"]??[];
      switch ($filter["selection_mode"]??"all")
      {
         case "include":
         {
            $filter["include"]=$filter["ids"];
            break;
         }
         case "exclude":
         {
            $filter["exclude"]=$filter["ids"];
            break;
         }
         case "exclude_current":
         {
            $filter["exclude"]=[get_post()?->ID];
            break;
         }
         default:
         {
            
         }
      }
      
      $this->data=get_posts($this->prepare_filter($filter,true));
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
?>
