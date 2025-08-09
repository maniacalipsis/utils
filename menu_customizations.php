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

class CleanMenuWalker extends \Walker_Nav_Menu
{
   //Renders menu using <DIV> elements.
   //NOTE: This method does not respect filters.
   
	public function start_lvl(&$output,$depth=0,$args=[])
   {
      $real_depth=$depth+1;
		$indent=str_repeat("   ",$real_depth);
      
      $output.="\n$indent<DIV CLASS=\"sub_menu l$real_depth\">\n";
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
      
      $link_attrs=[
                     "href"=>$data_object->url,
                     "target"=>$data_object->target,
                     "rel"=>$data_object->xfn,
                     "title"=>$data_object->attr_title,
                  ];
      
      //Additional className[s]:
      foreach ($data_object->classes??[] as $class)
         $link_attrs["class"].=" $class";
		
      $output.="$indent<DIV CLASS=\"mi l$real_depth\">\n$indent<A".\render_element_attrs($link_attrs).">$data_object->title</A>\n";
	}
	
	public function end_el(&$output,$data_object,$depth=0,$args=[])
   {
      $real_depth=$depth+1;
		$indent=str_repeat("   ",$real_depth);
      
      $output.="$indent</DIV>\n";
   }
}

class BareMenuWalker extends \Walker_Nav_Menu
{
   //Renders bare menu links without submenus structure.
   
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
      
      $real_depth=$depth+1;
      
      $link_attrs=[
                     "class"=>"mi l$real_depth",
                     "href"=>$data_object->url,
                     "target"=>$data_object->target,
                     "rel"=>$data_object->xfn,
                     "title"=>$data_object->attr_title,
                  ];
      
      //Additional className[s]:
      foreach ($data_object->classes??[] as $class)
         $link_attrs["class"].=" $class";

		$output.="<A".\render_element_attrs($link_attrs).">$data_object->title</A>";
	}
	
	public function end_el(&$output,$data_object,$depth=0,$args=[])
   {
      
   }
}

?>