//Media setter ------------------------------------------------------------------------------------------------------
class MediaList
{
   constructor(params_)
   {
      //Precheck wp.media:
      if (!wp.media)
         console.error('MediaList: wp.media is not defined. Make shure you call the wp_enqueue_media(); in the plugin initialization at server side.');
      
      //Init:
      this._input=params_.input??document.querySelector(params_.inputSelector);
      this._container=params_.container??document.querySelector(params_.containerSelector);

      this._MediaSelectorClass=params_.MediaSelector??this._MediaSelectorClass;
      this._mediaSelectorParams=params_.MediaSelectorParams??this._mediaSelectorParams;
      
      this._limit=params_.limit??this._limit;
      this.onChange=params_.onChange??params_.onchange??null;  //Allow to pass onchange handler via params.
      
      if (wp.media&&this._input&&this._container)
      {
         //Get the media:
         let mediaData=null;
         try
         {
            //TODO: This try-catch section seems not catching a parse errors. This need to be fixed.
            if (this._input.value)
               mediaData=JSON.parse(this._input.value);
            
            mediaData??(mediaData=[]);
            for (let media of mediaData)
               this.add(new this._MediaSelectorClass(media,this,this._mediaSelectorParams));
         }
         catch (ex)
         {
            console.error('MediaList.constructor suffers JSON error:',ex,' Input value is ',this._input.value);
         }
         finally
         {
            this.add(); //+ one empty selector.
            
            this._input.form?.addEventListener('submit',()=>{this.updateSourceInput();});
         }
      }
   }
   
   //public props
   get list()
   {
      let list=[];
      for (let selector of this._selectors)
         if (selector.hasMedia)
            list.push(selector.media);
      return list;
   }
   
   //private props
   _input=null;      //The input which hold the media files list
   _container=null;  //DOM node that is a container for the media selectors.
   _selectors=[];    //Array of the media selectors.
   _MediaSelectorClass=MediaSelector;  //MediaSelector class.
   _mediaSelectorParams=null;          //Params for MediaSelector's constructor.
   _limit=0;         //Maximal amount of media files selected.
   
   //public methods
   add(mediaSelector_)
   {
      let res=false;
      
      if (!this._limit||(this._selectors.length<this._limit))
      {
         mediaSelector_??(mediaSelector_=new this._MediaSelectorClass(null,this,this._mediaSelectorParams));
         
         this._selectors.push(mediaSelector_);
         this._container.appendChild(mediaSelector_.node);
         
         res=true;
      }
      
      return res;
   }
   
   insert(mediaSelector_,after_)
   {
      for (let i in this._selectors)
         if (after_==this._selectors[i])
         {
            if (after_.node.nextSibling)
               this._container.insertBefore(mediaSelector_.node,after_.node.nextSibling);
            else
               this._container.appendChild(mediaSelector_.node);
            this._selectors.splice(i,0,mediaSelector_);
            break;
         }
   }
   
   remove(mediaSelector_)
   {
      //Remove selector
      if (mediaSelector_.hasMedia)
      {
         for (let i in this._selectors)
            if (mediaSelector_==this._selectors[i])
            {
               this._container.removeChild(mediaSelector_.node);
               this._selectors.splice(i,1);
               break;
            }
         
         if (this._selectors.length==0)
            this.add(new this._MediaSelectorClass(null,this,this._mediaSelectorParams));
         
         this.onChange?.(this);
      }
   }
   
   onMediaSelected(mediaSelector_)
   {
      //Add one more selector if all is filled
      let allHasMedia=true;
      for (let selector of this._selectors)
         if (!selector.hasMedia)
         {
            allHasMedia=false;
            break;
         }
      if (allHasMedia)
         this.add(new this._MediaSelectorClass(null,this,this._mediaSelectorParams));
      
      this.onChange?.(this);
   }
   
   updateSourceInput()
   {
      this._input.value=JSON.stringify(this.list);
      this._input.dispatchEvent(new Event('change',{cancelable:true}));
   }
}

class MediaSelector
{
   //Selector of the WP media file[s]. It makes a node with the inputs that allows to select a file from the WP media library and annotate it.
   //NOTE: All the inputs the MediaSelector makes are not related to any form and normally will NOT be sent on submit. Instead the parent has to get the data from its MediaSelector[s] and deal with it on its own.
   //Arguments:
   // mixedMedia_ - th default/initial value of the selected media. 
   //                In the 1st case it's an object like {id:123,displayName:'some name'} where id - is ID of the file within WP media library and displayName - is some text that may be used as a pretty text in the download link, annotation, whatever.
   //                In the 2nd case it's a attachment attributes retrieved from the WP media library dialog. This variation used internally by method _onMediaSelected().
   // parent_ - some master class that e.g. controls a dynamic list of media files.
   //             The primary duty of the parent is to send the data from its MediaSelector[s] to the server in the way is needed. To get the data refer to the properties MediaSelector.media and MediaSelector.hasMedia.
   //             Optional feature is to maintain a multiple selection. For this parent should implement two methods: insert(newMediaSelector,afterMediaSelector) and remove(mediaSelector).
   //             Additionally parent may has onMediaSelected(fromMediaSelector) listener. The argument is that selector which has opened the WP media library dialog.
   //             NOTE: in case of multiple selection the onMediaSelected() will be called after all insert()s.
   
   constructor(mixedMedia_,parent_,params_)
   {
      this._parent=parent_;
      this.isMultiple=true; //NOTE: Multiple selection will be not allowed if the parent doesn't support method insert().
      this._params=params_??{label:null};
      this._params.options??(this._params.options={displayName:{label:null,default:null}});
      
      this._build();
      if (mixedMedia_?.id)
      {
         if (mixedMedia_.sizes&&mixedMedia_.icon&&mixedMedia_.editLink) //Detect if the mixedMedia_ is WP media file attributes obtained from WP media dialog.
            this._setAttachmentAttrs(mixedMedia_);                      //If so, store these attributes to this._wpAttachmentAttrs, by the way filling empty optional data properties.
         else                                                           //But if mixedMedia_ is a data then:
            this.media=mixedMedia_;                                     // then assign it as data.
      }
   }
   
   //public props
   get node(){return this._node;}
   
   get hasMedia(){return (this._wpAttachmentAttrs ? true : false);}
   
   get media()
   {
      let res=null;
      
      if (this._wpAttachmentAttrs)
      {
         res={id:this._wpAttachmentAttrs.id};
         for (let key in this._params.options)
            res[key]=this._subNodes[key].value;
      }
      
      return res;
   }
   set media(mediaData_)
   {
      //First, set the optional properties of the media data:
      for (let key in this._params.options)
         if (this._subNodes[key])
            this._subNodes[key].value=mediaData_?.[key]??this._params.options[key].default; 
   
      //Next, get WP media file attributes:
      if (mediaData_?.id!=null)
         wp.media.attachment(mediaData_.id).fetch().then((attrs_)=>{/*console.log(attrs_);*/if (attrs_){this._setAttachmentAttrs(attrs_); this._render();} else console.error('MediaSelector: Failed to retrieve media file attributes.');});
      else
      {
         this._wpAttachmentAttrs=null;
         this._render();
      }
   }
   
   get isMultiple(){return this._isMultiple;}
   set isMultiple(val_){this._isMultiple=val_&&(typeof this._parent?.insert == 'function');}  //The parent has to support the method insert() to set this property true.
   
   //private props
   _parent=null;              //Reference to the parent. 
   _node=null;                //The DOM node with selector's UI.
   _subNodes={};              //Pointers to the editable/changeable elements of UI.
   _isMultiple=false;         //Allow or deny the multiple selection.
   _wpAttachmentAttrs=null;   //Attributes of the selected media retrieved from WP.
   _wpMediaDialog=null;       //WordPress media popup dialog. 
   _params=null;              //Sonstructor params.
   
   //public methods
   
   //private methods
   _build()
   {
      //Create selector's DOM node:
      let struct={
                    tagName:'div',
                    className:'media_selector',
                    childNodes:[
                                  {
                                     tagName:'label',
                                     className:'media',
                                     childNodes:[
                                                   this._params.label,
                                                   {tagName:'img',className:'glyph',src:'',alt:'',_collectAs:'_glyphImg'},
                                                   {tagName:'span',className:'url',textContent:'',title:'',_collectAs:'_urlBox'},
                                                   {tagName:'input',className:'open',type:'button',value:'Выбрать файл',onclick:(e_)=>{this._openMediaDialog();},_collectAs:'_selBtn'},
                                                ]
                                  }
                               ]
                 };
      for (let key in this._params.options)
      {
         let inputStruct=this._params.options[key].inputStruct??{tagName:'input',type:'text',value:''};
         inputStruct._collectAs=key;
         struct.childNodes.push({tagName:'label',className:key,childNodes:[this._params.options[key].label,inputStruct]});
      }
      struct.childNodes.push({tagName:'input',className:'close',type:'button',value:'☓',onclick:(e_)=>{this._parent?.remove?.(this);}});
      
      this._node=buildNodes(struct,this._subNodes);
   }
   
   _render()
   {
      //Displays changes at media file select.
      
      if (this._wpAttachmentAttrs)
      {
         //console.log(this._wpAttachmentAttrs.sizes);
         this._subNodes._glyphImg.src=(this._wpAttachmentAttrs.type=='image' ? this._wpAttachmentAttrs.sizes.thumbnail?.url??this._wpAttachmentAttrs.sizes.full.url : this._wpAttachmentAttrs.icon);
         this._subNodes._glyphImg.alt=this._wpAttachmentAttrs.title;
         this._subNodes._glyphImg.title=this._subNodes._glyphImg.src;
         
         this._subNodes._urlBox.textContent=this._wpAttachmentAttrs.url;
         this._subNodes._urlBox.title=this._wpAttachmentAttrs.url;
         
         this._subNodes._selBtn.value='Сменить файл';
      }
      else
      {
         this._subNodes._glyphImg.src='';
         this._subNodes._glyphImg.alt='';
         this._subNodes._glyphImg.title='';
         
         this._subNodes._urlBox.textContent='';
         this._subNodes._urlBox.title='';
         
         this._subNodes._selBtn.value='Выбрать файл';
      }
   }
   
   _openMediaDialog()
   {
      //Lazy instantiate the WP media dialog:
      if (!this._wpMediaDialog)
      {
         this._wpMediaDialog=wp.media({title:'Выбарите файл[ы]',multiple:this.isMultiple});
         this._wpMediaDialog.on('select',()=>{this._onMediaSelected();}); //This event will be fired when user confirms the selection by pressing the 'Select' button in the WP media dialog.
      }
      
      //Open
      this._wpMediaDialog.open();
   }
   
   _onMediaSelected()
   {
      //Callback for the wp.media instance 'select' event.
      let selection=this._wpMediaDialog.state().get('selection');
      let attachment;
      let isMediaSelected=false;
      
      //Get out the 1st selected media:
      if (selection.length>0)
      {
         attachment=selection.shift();
         this._setAttachmentAttrs(attachment.attributes);
         isMediaSelected=true;
      }
      
      //Ask parent to add more selectors for the rest attachments:
      if (this._isMultiple&&(selection.length>0))  //Force blocking of the multiple selection. However normally it should be allowed/disallowed by passing this._isMultiple to wp.media() parameters.
      {
         let afterWhich=this;
         for (attachment of selection)
         {
            let selector=new MediaSelector(attachment.attributes,this._parent,this._params);
            this._parent?.insert?.(selector,afterWhich);
            afterWhich=selector;
         }
      }
      
      //Notify the parent about media was selected.
      if (isMediaSelected)
         this._parent?.onMediaSelected?.(this);
   }
   
   _setAttachmentAttrs(attrs_)
   {
      this._wpAttachmentAttrs=attrs_;
      for (let key in ['displayName','title'])
         if (this._subNodes[key]&&!this._subNodes[key].value)
            this._subNodes[key].value=attrs_.title;
      
      this._render();
   }
}

class wpJSONForm
{
   //This class handles a [part] of a static form that represents JSON data from the hidden inupt.
   constructor(params_)
   {
      //Init:
      let container=params_.container??document.querySelector(params_.containerSelector);
      console.log(container);
      this._sourceInput=params_.sourceInput??container?.querySelector(params_.sourceInputSelector??'input[type=hidden]');  //By default, a first hidden input will be the data source.
      this._defaultsInput=params_.sourceInput??container?.querySelector(params_.sourceInputSelector??'input.defaults[type=hidden]');
      this._inputs=this._filterInputs(params_.inputs??container?.querySelectorAll(params_.inputsSelector??'input,select,textarea'));   //Select all inputs and then filter-off unwanted ones (e.g.buttons).
      
      try
      {
         this._loadData();
      }
      catch (exc)
      {
         console.error('wpJSONForm failed to get JSON data from the source or defaults input.',exc,this);
      }
      finally
      {
         this._initInputs();
         console.log(this);
      }
   }
   
   assignValue(keysSeq_,value_)
   {
      console.log(keysSeq_,value_);
      this._data=setElementRecursively(this._data,keysSeq_,value_);
      this._sourceInput.value=JSON.stringify(this._data);   //TODO: hook to post save event.
   }
   
   //private props
   _sourceInput=null;
   _defaultsInput=null;
   _inputs=[];
   _data=null;
   
   //private methods
   _loadData()
   {
      //Get data and apply defaults (if given):
      
      this._data=JSON.parse(this._sourceInput.value);
      if (this._defaultsInput)
         this._data=cloneOverriden(JSON.parse(this._defaultsInput.value),this._data);
   }
   
   _initInputs()
   {
      this._keysCache=[];
      for (var input of this._inputs)
      {
         switch (input.type)
         {
            case 'hidden':
            {
               input.value=getElementRecursively(this._data,this._getKeysSequence(input));
               input.addEventListener('change',(e_)=>{console.log('Hidden changed:',e_.target); this.assignValue(this._getKeysSequence(e_.target),e_.target.value);});
            }
            case 'image':
            case 'radio':
            {
               console.warn('wpJSONForm didn\'t learned how to treat inputs of types image and radio yet.');
               break;
            }
            case 'checkbox':
            {
               input.checked=toBool(getElementRecursively(this._data,this._getKeysSequence(input)));
               input.addEventListener('click',(e_)=>{this.assignValue(this._getKeysSequence(e_.target),toBool(e_.target.checked));});
               break;
            }
            default:
            {
               input.value=getElementRecursively(this._data,this._getKeysSequence(input));
               input.addEventListener('input',(e_)=>{this.assignValue(this._getKeysSequence(e_.target),e_.target.value);});
            }
         }
      }
   }
   
   _getKeysSequence(input_)
   {
      if (!input_.keysSequenceCache)
         input_.keysSequenceCache=input_.dataset.keys_seq?.split(',');
      
      return input_.keysSequenceCache;
   }
   
   _filterInputs(inputs_)
   {
      //This method filters inputs. It nade to simplify the inputs selector, and also to check that selector can't.
      //NOTE: overrde this method to make more custom checks or to cancel them all.
      
      let res=[];
      
      for (let input of inputs_)
         if (input!=this._sourceInput&&
             input!=this._defaultsInput&&
             this._getKeysSequence(input))
            res.push(input);
      
      return res;
   }
   //
}
