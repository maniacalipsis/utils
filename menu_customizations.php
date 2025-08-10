<?php
/*==================================*/
/* Utilities plugin                 */
/* Copyright: FSG a.k.a ManiaC      */
/* Contact: imroot@maniacalipsis.ru */
/* License: GNU GPL v3              */
/*----------------------------------*/
/* Custom menu                      */
/*==================================*/

namespace Maniacalipsis\Utilities;

use \stdClass;
use \Walker_Nav_Menu;
use \WP_Post;
use function \render_element_attrs;

trait TMakeLinkAttrs
{
   protected function make_link_attrs(WP_Post $data_object,int $depth,null|array|stdClass $args):array
   {
      return [
                "class"=>($data_object->classes ? implode(" ",$data_object->classes) : null),
                "href"=>htmlspecialchars($data_object->url),
                "target"=>$data_object->target,
                "rel"=>$data_object->xfn,
                "title"=>htmlspecialchars($data_object->attr_title),
             ];
   }
}

class CleanMenuWalker extends Walker_Nav_Menu
{
   //Renders menu using <DIV> elements.
   //NOTE: This method does not respect filters.
   
   use TMakeLinkAttrs;
   
	public function start_lvl(&$output,$depth=0,$args=[])
   {
		$indent=str_repeat("   ",$real_depth);
      $lvl_attrs_str=render_element_attrs($this->make_lvl_attrs($depth,$args));
      
      $output.="\n$indent<DIV $lvl_attrs_str>\n";
	}
	
	public function end_lvl(&$output,$depth=0,$args=array())
   {
      $real_depth=$depth+1;
		$indent=str_repeat("   ",$real_depth);
      
      $output.="\n$indent</DIV>\n";
   }
	
	public function start_el(&$output,$data_object,$depth=0,$args=[],$current_object_id=0)
   {
      $real_depth=$depth+1;
		$indent=str_repeat("   ",$real_depth);
      
      $elem_attrs_str=render_element_attrs($this->make_el_attrs($data_object,$depth,$args));
      $link_attrs_str=render_element_attrs($this->make_link_attrs($data_object,$depth,$args));
		
      $output.="$indent<DIV $elem_attrs_str>\n$indent<A $link_attrs_str>$data_object->title</A>\n";
	}
	
	public function end_el(&$output,$data_object,$depth=0,$args=[])
   {
      $real_depth=$depth+1;
		$indent=str_repeat("   ",$real_depth);
      
      $output.="$indent</DIV>\n";
   }
   
   protected function make_lvl_attrs(int $depth,null|array|stdClass $args):array
   {
      $real_depth=$depth+1;
      
      return [
                "class"=>"sub_menu l$real_depth",
             ];
   }
   
   protected function make_el_attrs(WP_Post $data_object,int $depth,null|array|stdClass $args):array
   {
      $real_depth=$depth+1;
      
      return [
                "class"=>"mi l$real_depth",
             ];
   }
}

class BareMenuWalker extends Walker_Nav_Menu
{
   //Renders bare menu links without submenus structure.
   use TMakeLinkAttrs {TMakeLinkAttrs::make_link_attrs as _base_make_link_attrs;}
   
	public function start_lvl(&$output,$depth=0,$args=[])
   {
      //Does nothing.
	}
	
	public function end_lvl(&$output,$depth=0,$args=array())
   {
      //Does nothing.
   }
	
	public function start_el(&$output,$data_object,$depth=0,$args=[],$current_object_id=0)
   {
      //Renders clean link for menu item.
      //NOTE: This method does not respect filters.
      
      $link_attrs_str=render_element_attrs($this->make_link_attrs($data_object,$depth,$args));

		$output.="<A $link_attrs_str>$data_object->title</A>";
	}
	
	public function end_el(&$output,$data_object,$depth=0,$args=[])
   {
      //Does nothing.
   }
   
   protected function make_link_attrs(WP_Post $data_object,int $depth,null|array|stdClass $args):array
   {
      $res=$this->_base_make_link_attrs($data_object,$depth,$args);
      $res["class"]="mi l$real_depth ".$res["class"];
      
      return $res;
   }
}

?>