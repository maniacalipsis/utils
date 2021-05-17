<?php
/*==================================*/
/* Utilities plugin                 */
/* Copyright: FSG a.k.a ManiaC      */
/* Contact: imroot@maniacalipsis.ru */
/* License: GNU GPL v3              */
/*----------------------------------*/
/* Custom posts metaboxes           */
/*==================================*/

class CustomMeta
{
   //Allows to add a metabox[es], attaching a custom meta data to the posts, pages etc.
   //Usage:
   // new CustomMeta($params);
   // or
   // $mb=new CustomMeta();
   // foreach ($several_params as $params)
   //    $mb->add($params);
   //
   // Parameters:
   //    "key" - matedata key. Required.
   //    "post_types" - Types of the post (or exactly an object_subtype of the object type "post" in terms of WP register_meta()). Values available: "post", "page",  Default=["post"].
   //    "data_type" - Type of the data. Values available: "string", "boolean", "integer", "number", "array" (since WP 5.3), "object" (since WP 5.3). Default="string".
   //    "default_value" - Dafault value  of this meta data. Default="".
   //    "title" - Title text of the metabox. Default="Custom meta".
   //    "context" - A place where metabox to be appear. Values available: "normal" - above the editor, "advanced" - below the editor, "side" - editor's sidebar. Default="side".
   //    "priority" - Metabox placement priority. Values available: "core", "default", "high", "low". Default="default".
   //    "renderer" - A callback for the WP add_meta_box(). This function should output a metabox contents as a part of the normal HTML form. Inputs naming is on renderer's own.
   //                 Default - the build-in default_metabox_renderer(). NOTE: Use of the default renderer will force the "on_save" to be a build-in default_on_save().
   //    "renderer_params" - User-defined params for the renderer callback. It can be accessed by the renderer via <2nd argument>["args"]. Default=null.
   //    "on_save" - A callback that will be called at saving of the post. It must collect the valu[e] form the inputs the renderer made from the entire $_POST, do somewhat with'em and return the ready-for-saving value.
   //                To do so, the callback may refer the "key" as its 1st argument and the "renderer_params" as its 2nd argument, Required (if the custom "renderer" is set).
   //    "sanitizer" - THe sanitize_callback for the WP register_meta(). Default=null.
   
   public function __construct($params_=null)
   {
      //NOTE: Call at init action.
      
      //Register metaboxes factory:
      add_action("add_meta_boxes",[$this,"add_meta_boxes"],10,2);
      
      //Register ajax requets handlers:
      add_action("save_post",[$this,"ajax_extra_media_save"]);
      
      //Add initial metabox:
      if ($params_)
         $this->add($params_);
   }
   
   public function add($params_)
   {
      //Adds a metabox and a meta key. End-user method.
      //NOTE: Call at init action.
      
      if (arr_val($params_,"key"))
      {
         //Apply defaults and unify params format:
         $par=array_replace_recursive($this->default_params,$params_);
         
         if (!is_array($par["post_types"]))
            $par["post_types"]=[$par["post_types"]];
         if (!$par["renderer"])
         {
            $par["renderer"]=[$this,"default_metabox_renderer"];
            $par["on_save"]=[$this,"default_on_save"];
         }
         
         //reg meta data
         foreach ($par["post_types"] as $post_type)
            register_meta("post",$par["key"],["object_subtype"=>$post_type,"type"=>$par["data_type"],"description"=>$par["title"],"default"=>$par["default_value"],"single"=>true,"sanitize_callback"=>$par["sanitizer"]]);
         
         //Store params:
         $this->metaboxes_params[$params_["key"]]=$par;
         
      }
   }
   
   public function add_meta_boxes($post_type_,$post_)
   {
      //Adds a metaboxes.
      
      foreach ($this->metaboxes_params as $par)
         if (in_array($post_type_,$par["post_types"]))   //Add metabox if it's intended to currently editing post type.
            add_meta_box($par["key"],$par["title"],$par["renderer"],$post_type_,$par["context"],$par["priority"],$par["renderer_params"]); //NOTE: the $par["renderer_params"] will be available via <2nd argument>["args"] in the renderer function.
   }
   
   public function default_metabox_renderer($post_,$metabox_params_)
   {
      //Renders default metabox with a simple text input.
      //NOTE: Access "renderer_params" via $metabox_params_["args"]
      
      $value=htmlspecialchars(get_post_meta($post_->ID,$metabox_params_["id"],true));  //NOTE: $metabox_params_["id"] is a $par["key"].
      ?>
      <INPUT TYPE="text" NAME="<?=$metabox_params_["id"]?>" VALUE="<?=$value?>">
      <?php
   }
   
   public function default_on_save($key_,$renderer_params_)
   {
      //Returns a value of the input, made by $tis->default_metabox_renderer().
      
      return arr_val($_POST,$key_);
   }
   
   
   public function ajax_extra_media_save($post_id_)
   {
      //Called when post is to be saved.
      
      if (current_user_can("edit_post",$post_id_)&&!(wp_is_post_autosave($post_id_)||wp_is_post_revision($post_id_)))
         foreach ($this->metaboxes_params as $par)
         {
            $val=$par["on_save"]($par["key"],$par["renderer_params"]);
            if ($val!==null)
               update_post_meta($post_id_,$par["key"],$val);  //The $_POST contents is depends on how do the renderer named the inputs. So callback $par["on_save"] must return a correct value from the entire $_POST.
            else
               delete_post_meta($post_id_,$par["key"]);
         }
   }
   
   protected $default_params=["key"=>null,"post_types"=>["post"],"data_type"=>"string","default_value"=>"","title"=>"Custom meta","context"=>"side","priority"=>"default","renderer"=>null,"renderer_params"=>null,"on_save"=>null,"sanitizer"=>null];
   protected $metaboxes_params=[];
}

class ExtraMedia extends CustomMeta
{
   //Allows to add a metabox[es], attaching an extra media files to the posts, pages etc.
   //Usage:
   // new ExtraMedia($metabox_params);
   // or
   // $mb=new ExtraMedia();
   // foreach ($several_metabox_params as $metabox_params)
   //    $mb->add($metabox_params);
   //
   // Parameters:
   //    TODO: Describe the parameters.
   
   public function __construct($params_=null)
   {
      parent::__construct($params_);
      $this->default_params["renderer_params"]=["limit"=>0,"selector_params"=>["options"=>[]]];
   }
   
   public function default_metabox_renderer($post_,$metabox_params_)
   {
      //Renders metabox content.
      
      $list_params=[
                      "inputSelector"=>"#".$metabox_params_["id"]." input",
                      "containerSelector"=>"#".$metabox_params_["id"]." .media_list",
                      "limit"=>$metabox_params_["args"]["limit"],
                      "immediate"=>true,
                      "MediaSelectorParams"=>$metabox_params_["args"]["selector_params"],
                   ];
      $list_params_json=json_encode($list_params,JSON_ENCODE_OPTIONS);
      
      $value=htmlspecialchars(get_post_meta($post_->ID,$metabox_params_["id"],true));
      ?>
      <INPUT TYPE="hidden" NAME="<?=$metabox_params_["id"]?>" VALUE="<?=$value?>">
      <DIV CLASS="media_list"></DIV>
      <SCRIPT>
         document.addEventListener('DOMContentLoaded',function(e_){let list=new MediaList(<?=$list_params_json?>);});
      </SCRIPT>
      <?php
   }
}

?>