import {
          TreeDataNode,
          DynamicHTMLList,
          cancelEvent,
          buildNodes,
          decorateInputFieldVal,
          bindEvtInputToDeferredChange,
          reqServer,
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
         this.addEventListener('datachange',(e_)=>{this.updateSourceInput(); e_.stopPropagation();});
         
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
   // This class manages an editing of structured data utilizing unnamed input fields that are never submitted to the server directly, but their values are collected and submitted to a parent StructuredDataList.
   
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
      this._initInputs(this._elements.inputs);
      
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
      
      this.dispatchEvent(new CustomEvent('dataassigned',{bubbles:true}));
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
   
   _initInputs(inputs_)
   {
      //Recursively initialize input fields.
      //Arguments:
      // inputs_ - Object. A dictionary with inputs.
      
      for (let inpField of Object.values(inputs_))
      {
         decorateInputFieldVal(inpField); //All inputs are decorated with unified accessor to value, named valueAsMixed.
         switch (inpField.type)
         {
            case 'checkbox':
            case 'radio':
            case 'select-one':
            case 'select-multiple':
            {
               //For these fields the 'change' dispatched immediately.
               break;
            } 
            default:
            {
               bindEvtInputToDeferredChange(inpField);   //For other inputs the 'change' is usually dispatched after the focus loss.
            }
         }
         inpField.addEventListener('change',(e_)=>{this.dispatchEvent(new CustomEvent('datachange',{bubbles:true}));}); //All inputs are notifies this class of their value changes.
      }
   }
}

export class PlaceMarkDataNode extends StructuredDataNode
{
   constructor(params_)
   {
      super(params_);
      
      this._elements.btnOpenMap.addEventListener('click',(e_)=>{if (this._elements.inputs.address.valueAsMixed!='') window.open(this.mapURLTmpl.replace('%s',encodeURIComponent(this._elements.inputs.address.valueAsMixed.replaceAll('\n',''))),'_blank').focus(); return cancelEvent(e_);})
      
      this._elements.inputs.lat .addEventListener('paste',(e_)=>{if (this._distributeCoordsStr(e_.clipboardData.getData('text'),'lat','long')) return cancelEvent(e_);});
      this._elements.inputs.long.addEventListener('paste',(e_)=>{if (this._distributeCoordsStr(e_.clipboardData.getData('text'),'long','lat')) return cancelEvent(e_);});
      this._elements.btnSwap.addEventListener('click',(e_)=>{this._swapCoords();});   //Swap latitude and longitude.
      
      this._elements.btnMediaSet  .addEventListener('click',(e_)=>{this._openMediaDialog(); return cancelEvent(e_);});
      this._elements.btnMediaUnset.addEventListener('click',(e_)=>{this._unsetMedia(); return cancelEvent(e_);});
      
      this.addEventListener('dataassigned',(e_)=>{this._fetchPreview();});
      
      this.preview=null;   //Initialize preview state.
   }
   
   get preview() {return this._elements.btnMediaSet.children[0]?.src;}
   set preview(url_)
   {
      if (url_)
      {
         this._elements.btnMediaSet.innerHTML='';
         let img=document.createElement('img');
         img.src=url_;
         this._elements.btnMediaSet.appendChild(img);
         
         this._elements.btnMediaUnset.classList.remove('hidden');
      }
      else
      {
         this._elements.btnMediaSet.innerHTML='Select image';
         this._elements.btnMediaUnset.classList.add('hidden');
      }
   }
   
   mapURLTmpl='https://2gis.ru/search/%s';
   _wpMediaDialog=null;       //WordPress media popup dialog.
   
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
                  className:'balloon',
                  childNodes:[
                                {tagName:'span',className:'caption',textContent:'balloon content'},
                                {tagName:'textarea',_collectAs:[...baseKeySeq_,'balloon']},
                             ]
                },
                {
                   tagName:'details',
                   className:'glyph_params',
                   childNodes:[
                                 {
                                    tagName:'summary',
                                    className:'caption',
                                    childNodes:[
                                                  {
                                                     tagName:'div',
                                                     className:'media glyph',
                                                     childNodes:[
                                                                   {tagName:'span',className:'caption',textContent:'Glyph'},
                                                                   {
                                                                      tagName:'div',
                                                                      className:'image',
                                                                      childNodes:[
                                                                                    {tagName:'button',type:'button',className:'set_image',_collectAs:'btnMediaSet'},
                                                                                    {tagName:'button',type:'button',className:'unset_image',innerHTML:'&#9746;',_collectAs:'btnMediaUnset'},
                                                                                 ],
                                                                   },
                                                                   {tagName:'input',type:'number',className:'hidden',_collectAs:[...baseKeySeq_,'glyph_id']},
                                                                ],
                                                  },
                                               ],
                                 },
                                 {
                                    tagName:'div',
                                    className:'group size',
                                    childNodes:[
                                                  {tagName:'span',className:'caption',textContent:'Size'},
                                                  {
                                                    tagName:'label',
                                                    className:'width',
                                                    childNodes:[
                                                                  {tagName:'span',className:'caption',textContent:'W'},
                                                                  {tagName:'input',type:'number',_collectAs:[...baseKeySeq_,'glyph_size_w']},
                                                               ]
                                                  },
                                                  {
                                                    tagName:'label',
                                                    className:'height',
                                                    childNodes:[
                                                                  {tagName:'span',className:'caption',textContent:'H'},
                                                                  {tagName:'input',type:'number',_collectAs:[...baseKeySeq_,'glyph_size_h']},
                                                               ]
                                                  },
                                               ],
                                 },
                                 {
                                    tagName:'div',
                                    className:'group offset',
                                    childNodes:[
                                                  {tagName:'span',className:'caption',textContent:'Offset'},
                                                  {
                                                    tagName:'label',
                                                    className:'x',
                                                    childNodes:[
                                                                  {tagName:'span',className:'caption',textContent:'X'},
                                                                  {tagName:'input',type:'number',_collectAs:[...baseKeySeq_,'glyph_offset_x']},
                                                               ]
                                                  },
                                                  {
                                                    tagName:'label',
                                                    className:'y',
                                                    childNodes:[
                                                                  {tagName:'span',className:'caption',textContent:'Y'},
                                                                  {tagName:'input',type:'number',_collectAs:[...baseKeySeq_,'glyph_offset_y']},
                                                               ]
                                                  },
                                               ],
                                 },
                              ],
                   _collectAs:'boxGlyphParams',
                },
             ];
   }
   
   _distributeCoordsStr(str_,inpNameA_,inpNameB_)
   {
      //Distribute coords pair by inputs. Helper for the paste event handlers.
      
      let res=false;
      
      let matches=/^ *(-?[0-9]{1,3}(.[0-9]+)?)( *, *|%2C)(-?[0-9]{1,3}(.[0-9]+)?) *$/.exec(str_);
      if (matches)
      {
         this._elements.inputs[inpNameA_].valueAsMixed=matches[1];
         this._elements.inputs[inpNameB_].valueAsMixed=matches[4];
         
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
   
   _openMediaDialog()
   {
      //Lazy instantiate the WP media dialog:
      if (!this._wpMediaDialog)
      {
         this._wpMediaDialog=wp.media({title:'Выбарите файл[ы]',multiple:this.isMultiple});
         this._wpMediaDialog.on('select',()=>{this._onMediaSelected(this._wpMediaDialog.state().get('selection'));}); //This event will be fired when user confirms the selection by pressing the 'Select' button in the WP media dialog.
      }
      
      //Open
      this._wpMediaDialog.open();
   }
   
   _onMediaSelected(selection_)
   {
      //Callback for the wp.media instance 'select' event.
      for (let media of selection_) //NOTE: selection_ is iterable but accessing elements by the bracket syntax doesn't work.
      {
         //Store media ID to the hidden input:
         this._elements.inputs.glyph_id.valueAsMixed=media?.attributes.id??null;
         this.preview=media?.attributes.url;
         
         //Notify listeners that data was changed:
         this.dispatchEvent(new CustomEvent('datachange',{bubbles:true}));
         
         break;   //Use only one (first) media.
      }
   }
   
   _unsetMedia()
   {
      this._elements.inputs.glyph_id.valueAsMixed=null;
      this.dispatchEvent(new CustomEvent('datachange',{bubbles:true}));
      this.preview=null;
   }
   
   _fetchPreview()
   {
      //Fetches URL of selected media by its ID.
      // This method is used when only stored ID is available.
      
      if (this.data?.glyph_id&&!this.preview)
         reqServer('/wp-json/wp/v2/media/'+this.data.glyph_id,null,'GET').then((ans_)=>{this.preview=ans_.source_url;});   //NOTE: Answer format is not the same as media retrieved from wp.media().get('selection').
   }
}

export class MediaDataNode extends StructuredDataNode
{
   constructor(params_)
   {
      super(params_);
      
      this._elements.btnMediaSet  .addEventListener('click',(e_)=>{this._openMediaDialog(); return cancelEvent(e_);});
      this._elements.btnMediaUnset.addEventListener('click',(e_)=>{this._unsetMedia(); return cancelEvent(e_);});
      
      this.addEventListener('dataassigned',(e_)=>{this._fetchPreview();});
      
      this.preview=null;   //Initialize preview state.
   }
   
   //protected props
   _isMultiple=false;         //Allow or deny the multiple selection.
   _wpMediaDialog=null;       //WordPress media popup dialog. 
   //_params=null;              //Constructor params.
   
   get preview() {return this._elements.btnMediaSet.children[0]?.src;}
   set preview(url_)
   {
      if (url_)
      {
         this._elements.btnMediaSet.innerHTML='';
         let img=document.createElement('img');
         img.src=url_;
         this._elements.btnMediaSet.appendChild(img);
         
         this._elements.btnMediaUnset.classList.remove('hidden');
      }
      else
      {
         this._elements.btnMediaSet.innerHTML='Select image';
         this._elements.btnMediaUnset.classList.add('hidden');
      }
   }
   
   //protected methods
   _makeInputStructs(inpParams_,baseKeySeq_)
   {
      //Arguments:
      // inpParams_ - Array|Object. Parameters of input fields. Format: [{type:'<type>'[,name:'<inpName>'],...},...] or {'<inpName>':{type:'<type>',...},...}.
      // baseKeySeq_ - Array. Base key for _collectAs parameter (see js_utils.js\buildNodes() for details).
      
      baseKeySeq_??=[];
      
      let res=super._makeInputStructs(inpParams_,baseKeySeq_);
      
      res.unshift({
                    tagName:'label',
                    className:'media',
                    childNodes:[
                                  {tagName:'span',className:'caption',textContent:'Media'},
                                  {
                                     tagName:'div',
                                     className:'image',
                                     childNodes:[
                                                   {tagName:'button',type:'button',className:'set_image',_collectAs:'btnMediaSet'},
                                                   {tagName:'button',type:'button',className:'unset_image',innerHTML:'&#9746;',_collectAs:'btnMediaUnset'},
                                                ],
                                  },
                                  {tagName:'input',type:'number',className:'hidden',_collectAs:[...baseKeySeq_,'media']},
                               ],
                  });
      
      return res;
   }
   
   _openMediaDialog()
   {
      //Lazy instantiate the WP media dialog:
      if (!this._wpMediaDialog)
      {
         this._wpMediaDialog=wp.media({title:'Выбарите файл[ы]',multiple:this.isMultiple});
         this._wpMediaDialog.on('select',()=>{this._onMediaSelected(this._wpMediaDialog.state().get('selection'));}); //This event will be fired when user confirms the selection by pressing the 'Select' button in the WP media dialog.
      }
      
      //Open
      this._wpMediaDialog.open();
   }
   
   _onMediaSelected(selection_)
   {
      //Callback for the wp.media instance 'select' event.
      for (let media of selection_) //NOTE: selection_ is iterable but accessing elements by the bracket syntax doesn't work.
      {
         //Store media ID to the hidden input:
         //console.log(media);
         this._elements.inputs.media.valueAsMixed=media?.attributes.id??null;
         this.preview=media?.attributes.url;
         
         //Try to propagate media attributes to relevant input fields:
         for (let key of ['alt','title','description'])
            if (this._elements.inputs[key]&&(this._elements.inputs[key].valueAsMixed==''))   //Don't overwrite already filled inputs.
               this._elements.inputs[key].valueAsMixed=media?.attributes[key];               //Set value w/o dispatching a 'change' event to each one, but dispatch 'datachange' after all changes.
         
         //Notify listeners that data was changed:
         //console.log(this._data,this.data);
         this.dispatchEvent(new CustomEvent('datachange',{bubbles:true}));
         
         break;   //Use only one (first) media.
      }
   }
   
   _unsetMedia()
   {
      this._elements.inputs.media.valueAsMixed=null;
      this.dispatchEvent(new CustomEvent('datachange',{bubbles:true}));
      this.preview=null;
   }
   
   _fetchPreview()
   {
      //Fetches URL of selected media by its ID.
      // This method is used when only stored ID is available.
      
      if (this.data?.media&&!this.preview)
         reqServer('/wp-json/wp/v2/media/'+this.data.media,null,'GET').then((ans_)=>{this.preview=ans_.source_url;});   //NOTE: Answer format is not the same as media retrieved from wp.media().get('selection').
   }
}