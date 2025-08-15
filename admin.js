import {
          TreeDataNode,
          DynamicHTMLList,
          cancelEvent,
          buildNodes,
          decorateInputFieldVal,
          bindEvtInputToDeferredChange,
       } from '@maniacalipsis/utils/utils';

//Media setter ------------------------------------------------------------------------------------------------------
export class StructuredDataList extends DynamicHTMLList
{
   //A list of the data structures.
   
   constructor(params_)
   {
      try
      {
         super(params_);
         
         this._maxSize=params_?.maxSize??this._maxSize;
         this._minSize=params_?.minSize??this._minSize;
         
         this._elements.inpData=this._elements.boxMain.querySelector('input[type=hidden]');
         this._elements.inpData.form?.addEventListener('submit',()=>{this.updateSourceInput();});
         this._elements.btnAdd=this._elements.boxMain.querySelector('button.add');
         this._elements.btnAdd?.addEventListener('click',(e_)=>{this.pad(this.size+1);});
         
         this._itemClass??=StructuredDataNode;
         
         //Handle own events:
         this.addEventListener('beforechildrenchange',
                               (e_)=>{
                                        //Prevent oversize and undersize:
                                        if ((e_.attach&&(this.size+e_.attach.length>(this._maxSize??Infinity)))||
                                            (e_.detach&&(this.size-e_.detach.length<this._minSize)))
                                           return cancelEvent(e_);
                                     });
         this.addEventListener('childrenchange',
                               (e_)=>{
                                        //Refresh items:
                                        // NOTE: This is an experimental implementation.
                                        this._elements.boxItems.innerHTML='';
                                        if (this.size>0)
                                        {
                                           const childBoxes=new DocumentFragment();
                                           for (let child of this.values())
                                              childBoxes.append(child.boxMain);
                                           this._elements.boxItems.appendChild(childBoxes);
                                        }
                                        
                                        //Update button state:
                                        this._elements.btnAdd.disabled=(this.size>=(this._maxSize??Infinity));
                                     });
         this.addEventListener('datachange',(e_)=>{this._elements.inpData.value=JSON.stringify(this.data); e_.stopPropagation();});
         
         //Get initial data and verify its type:
         if (this._elements.inpData.value)
            this.data=JSON.parse(this._elements.inpData.value);
         if (!(this.data instanceof Array))
            throw new TypeError('Initial data is not of type Array');
      }
      catch (err)
      {
         console.error('StructuredDataList.constructor suffers error:',err,' This:',this,' Params:',params_);
         if ((err instanceof TypeError)||(err instanceof SyntaxError))
            this.data=[];
      }
   }
   
   _minSize=0;
   _maxSize=null;
   
   //public methods
   updateSourceInput()
   {
      this._elements.inpData.value=JSON.stringify(this.data);
      this._elements.inpData.dispatchEvent(new Event('change',{cancelable:true}));
   }
}

export class StructuredDataNode extends TreeDataNode
{
   //Form fragment for a structured data list.
   
   constructor(params_)
   {
      super(params_);
      
      //Struct of item element:
      let nodeStruct={
                        tagName:'div',
                        className:'item',
                        childNodes:[
                                      ...this._makeInputStructs(params_.inputs,['inputs']),
                                      {tagName:'button',type:'button',className:'del',textContent:String.fromCharCode(9747),_collectAs:'btnDel'},
                                   ],
                        _collectAs:'boxMain',
                     };
      buildNodes(nodeStruct,this._elements);
      
      //Init inputs:
      for (let inpField of Object.values(this._elements.inputs))
      {
         decorateInputFieldVal(inpField);
         switch (inpField.type)
         {
            case 'checkbox':
            case 'radio':
            case 'select-one':
            case 'select-multiple':
            {break;}
            default:
            {
               bindEvtInputToDeferredChange(inpField);
            }
         }
         inpField.addEventListener('change',(e_)=>{this.dispatchEvent(new CustomEvent('datachange',{bubbles:true}));});
      }
      
      this._elements.btnDel.addEventListener('click',(e_)=>{this.parent?.delete(this); return cancelEvent(e_);});
   }
   
   //public props
   get data()
   {
      let res={};
      for (let key in this._elements.inputs)
         res[key]=this._elements.inputs[key].valueAsMixed;
      
      return res;
   }
   set data(data_)
   {
      for (let key in this._elements.inputs)
         this._elements.inputs[key].valueAsMixed=data_[key]??'';
   }
   
   get boxMain(){return this._elements.boxMain;}
   
   //private props
   _inputs=null;
   
   _makeInputStructs(inpParams_,baseKeySeq_)
   {
      //Arguments:
      // inpParams_ - Array|Object. Parameters of input fields. Format: [{type:'<type>'[,name:'<inpName>'],...},...] or {'<inpName>':{type:'<type>',...},...}.
      // baseKeySeq_ - Array. Base key for _collectAs parameter (see js_utils.js\buildNodes() for details).
      
      baseKeySeq_??=[];
      
      let res=[];
      
      for (let key in inpParams_)
      {
         let inpStruct;
         switch(inpParams_[key].type)
         {
            case 'select':
            {
               inpStruct={tagName:'select',...inpParams_[key]}
               break;
            }
            case 'textarea':
            {
               inpStruct={tagName:'textarea',...inpParams_[key]}
               break;
            }
            default:
            {
               inpStruct={tagName:'input',type:'text',...inpParams_[key]};
            }
         }
         delete inpStruct.label;
         inpStruct._collectAs=[...baseKeySeq_,inpParams_[key].name??key];
         res.push({
                    tagName:'label',
                    className:key,
                    childNodes:[
                                  {tagName:'span',className:'caption',textContent:inpParams_[key].label??''},    //Input's caption, optional.
                                  inpStruct,
                               ]
                  });
      }
      
      return res;
   }
}

export class PlaceMarkDataNode extends StructuredDataNode
{
   constructor(params_)
   {
      super(params_);
      
      this._elements.btnOpenMap.addEventListener('click',(e_)=>{if (this._elements.inputs.address.valueAsMixed!='') window.open('https://2gis.ru/search/'+encodeURIComponent(this._elements.inputs.address.valueAsMixed.replaceAll('\n','')),'_blank').focus(); return cancelEvent(e_);})
      
      this._elements.inputs.lat .addEventListener('paste',(e_)=>{if (this._distributeCoordsStr(e_.clipboardData.getData('text'),'lat','long')) return cancelEvent(e_);});
      this._elements.inputs.long.addEventListener('paste',(e_)=>{if (this._distributeCoordsStr(e_.clipboardData.getData('text'),'long','lat')) return cancelEvent(e_);});
      this._elements.btnSwap.addEventListener('click',(e_)=>{this._swapCoords();});   //Swap latitude and longitude.
   }
   
   _makeInputStructs(inpParams_,baseKeySeq_)
   {
      //Arguments:
      // inpParams_ - Array|Object. Parameters of input fields. Format: [{type:'<type>'[,name:'<inpName>'],...},...] or {'<inpName>':{type:'<type>',...},...}.
      // baseKeySeq_ - Array. Base key for _collectAs parameter (see js_utils.js\buildNodes() for details).
      
      baseKeySeq_??=[];
      
      return [
                {
                  tagName:'label',
                  className:'address',
                  childNodes:[
                                {tagName:'span',className:'caption',textContent:'Address'},
                                {tagName:'textarea',_collectAs:[...baseKeySeq_,'address']},
                                {tagName:'button',type:'button',className:'open_map dashicons',title:'Find on the map',textContent:String.fromCharCode(0xf231/*dashicons-location-alt*/),_collectAs:'btnOpenMap'},
                             ]
                },
                {
                   tagName:'div',
                   className:'coords',
                   childNodes:[
                                 {
                                   tagName:'label',
                                   className:'lat',
                                   childNodes:[
                                                 {tagName:'span',className:'caption',textContent:'Lat.'},
                                                 {tagName:'input',type:'text',_collectAs:[...baseKeySeq_,'lat']},
                                              ]
                                 },
                                 {
                                   tagName:'label',
                                   className:'lat_long',
                                   childNodes:[
                                                 {tagName:'span',className:'caption',textContent:'Long.'},
                                                 {tagName:'input',type:'text',_collectAs:[...baseKeySeq_,'long']},
                                              ]
                                 },
                                 {tagName:'button',type:'button',className:'swap dashicons',title:'Swap coords',textContent:String.fromCharCode(0xf463/*dashicons-update*/),_collectAs:'btnSwap'},
                              ],
                },
                {
                  tagName:'label',
                  className:'text',
                  childNodes:[
                                {tagName:'span',className:'caption',textContent:'Label text'},
                                {tagName:'input',type:'text',_collectAs:[...baseKeySeq_,'text']},
                             ]
                },
                {
                  tagName:'label',
                  className:'hint',
                  childNodes:[
                                {tagName:'span',className:'caption',textContent:'Label hint'},
                                {tagName:'input',type:'text',_collectAs:[...baseKeySeq_,'hint']},
                             ]
                },
                {
                  tagName:'label',
                  className:'baloon',
                  childNodes:[
                                {tagName:'span',className:'caption',textContent:'Baloon content'},
                                {tagName:'textarea',_collectAs:[...baseKeySeq_,'baloon']},
                             ]
                },
             ];
   }
   
   _distributeCoordsStr(str_,inpNameA_,inpNameB_)
   {
      //Distribute coords pair by inputs. Helper for the paste event handlers.
      
      let res=false;
      
      if (/^ *-?[0-9]{1,3}(.[0-9]+)? *, *-?[0-9]{1,3}(.[0-9]+)? *$/.test(str_))
      {
         let coords=str_.replace(/[^0-9,.-]/g,'').split(',');
         this._elements.inputs[inpNameA_].valueAsMixed=coords[0];
         this._elements.inputs[inpNameB_].valueAsMixed=coords[1];
         
         this.dispatchEvent(new CustomEvent('datachange',{bubbles:true}));
         
         res=true;
      }
      
      return res;
   }
   
   _swapCoords()
   {
      let buf=this._elements.inputs.lat.valueAsMixed;
      this._elements.inputs.lat.valueAsMixed=this._elements.inputs.long.valueAsMixed;
      this._elements.inputs.long.valueAsMixed=buf;
      
      this.dispatchEvent(new CustomEvent('datachange',{bubbles:true}));
   }
}

//DEPRECATED:
class _MediaSelector
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
                                                   {tagName:'span',className:'glyph flex center x-center',childNodes:[{tagName:'img',src:'',alt:'',_collectAs:'_glyphImg'}]},
                                                   {tagName:'span',className:'url',textContent:'',title:'',_collectAs:'_urlBox'},
                                                   {tagName:'input',className:'open',type:'button',value:'Выбрать файл',onclick:(e_)=>{this._openMediaDialog();},_collectAs:'_selBtn'},
                                                   {tagName:'span',className:'spacer'},
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
      struct.childNodes.push({tagName:'input',className:'close',type:'button',value:String.fromCharCode(9747),onclick:(e_)=>{this._parent?.remove?.(this);}});
      
      this._node=buildNodes(struct,this._subNodes);
   }
   
   _render()
   {
      //Displays changes at media file select.
      
      if (this._wpAttachmentAttrs)
      {
         //console.log(this._wpAttachmentAttrs.sizes);
         this._subNodes._glyphImg.src=(this._wpAttachmentAttrs.type=='image' ? this._wpAttachmentAttrs.sizes?.thumbnail?.url??this._wpAttachmentAttrs.sizes?.full?.url : this._wpAttachmentAttrs.icon);
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

//DEPRECATED:
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
