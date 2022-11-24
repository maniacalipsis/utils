/*==================================*/
/* The Pattern Engine Version 4     */
/* Copyright: FSG a.k.a ManiaC      */
/* Contact: imroot@maniacalipsis.ru */
/* License: GNU GPL v3              */
/*----------------------------------*/
/* Main JS utils, useful for public */
/* and admin sides.                 */
/*==================================*/

/*===========================================================================================================*/
/* This file is part of The Pattern Engine.                                                                  */
/* The Pattern Engine is free software: you can redistribute it and/or modify it under the terms of the      */
/* GNU General Public License as published by the Free Software Foundation, either version 3 of the License. */
/* The Pattern Engine is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;           */
/* without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.                 */
/* See the GNU General Public License for more details.                                                      */
/* You should have received a copy of the GNU General Public License along with The Pattern Engine.          */
/* If not, see http://www.gnu.org/licenses/.                                                                 */
/*===========================================================================================================*/

//------ common funcs for working with content sizes and positions ------//
function touchesToRelative(e_,node_)
{
   //Gets coordinates of the touches from touch events relative to specific node_. Its helpful if the node_ can't be positioned as relative, absolute or fixed to directly use e_.layerX and e_.layerY.
   var res=[];
   var nodeRect=node_.getBoundingClientRect();
   
   var touches=e_.changedTouches;   //TODO: unchanged touches?
   for (var touch of touches)
      res.push({x:touch.clientX-nodeRect.x,y:touch.clientY-nodeRect.y});
   
   return res;
}

function cursorToRelative(e_,node_)
{
   //Converts event coordinates to the node_ basis. Its helpful if the node_ can't be positioned as relative, absolute or fixed to directly use e_.layerX and e_.layerY.
   var nodeRect=node_.getBoundingClientRect();
   return {x:e_.clientX-nodeRect.x,y:e_.clientY-nodeRect.y};
}

function getElementOffset(element_,fromElement_)
{
   //Calculates offset of one element from another.
   //TODO: This is rarely needed function and is a subject to delete.
   
   var res={top:0,left:0};
   while (element_&&(element_!=fromElement_))
   {
      res.top+=element_.offsetTop;
      res.left+=element_.offsetLeft;
      
      element_=element_.offsetParent;
   }
   return res;
}

//------------------------------- Utilities for several common site elements ----------------------------------------//

//------- Functions for customized input elements -------//
function decorateCheckbox(checkbox_)
{
   //Decorate checkbox checked and disabled setters to make checkbox repainted when it changed by code:
   {
      let descr=Object.getOwnPropertyDescriptor(checkbox_.__proto__,'checked');
      let orig_setter=descr.set;
      descr.set=function (newVal_){orig_setter.call(this,newVal_); this.closest('label')?.classList.toggle('checked',this.checked);};
      Object.defineProperty(checkbox_,'checked',descr);
   }
   {
      let descr=Object.getOwnPropertyDescriptor(checkbox_.__proto__,'disabled');
      let orig_setter=descr.set;
      descr.set=function (newVal_){orig_setter.call(this,newVal_); this.closest('label')?.classList.toggle('disabled',this.disabled);};
      Object.defineProperty(checkbox_,'disabled',descr);
   }
   
   //Also repaint on user input:
   checkbox_.addEventListener('click',function(e_){this.closest('label')?.classList.toggle('checked',this.checked);});  //NOTE: click doesn't invoke the checkbox_.checked setter.
   checkbox_.addEventListener('focus',function(e_){this.closest('label')?.classList.toggle('focused',document.activeElement==this);});
   checkbox_.addEventListener('blur' ,function(e_){this.closest('label')?.classList.toggle('focused',document.activeElement==this);});
}

function initCheckboxes(params_)
{
   //Initializes all customized checkboxes into the given container_ or entire document.
   //Usage: 
   // Wrap each checkbox with <LABEL> and write some css to make it looks like a checkbox you want.
   
   var checkboxes=(params_?.container??document).querySelectorAll((params_?.containerSelector ? params_.containerSelector+' ' : '')+(params_?.selector??'label.checkbox input[type=checkbox]'));
   for (let checkbox of checkboxes)
   {
      decorateCheckbox(checkbox);        //TODO: Find how to detect already decorated checkboxes.
      checkbox.checked=checkbox.checked; //Reflect initial state.
   }
}

function radioRepaint(initial_repaint_)
{
   //Reflects changes of the customized radio button[s] state. See initRadios() for details.
   
   if (initial_repaint_)
      this.parentNode.classList.toggle('checked',this.checked);   //Use while batch initialization.
   else
   {
      var coupled_radios=document.querySelectorAll('input[type=radio][name=\''+this.name+'\']');   //Select all radios with the same name as they are coupled together
      for (let radio of coupled_radios)                                                            // but only the currently checked one receives a certain event.
         radio.parentNode.classList.toggle('checked',radio.checked);
   }
   
   this.parentNode.classList.toggle('focused',document.activeElement==this);
}

function initRadios(params_)
{
   //Initializes all customized radio buttons into the given container_ or entire document.
   //Usage:
   // Refer description of the initCheckboxes() as it's the same in an essence.
   // The only difference in that the radios with the same name are coupled but the automatically unchecking radios doesn't receive any event and thus they should be handled from the checked one.
   
   var radios=(params_?.container??document).querySelectorAll((params_?.containerSelector ? params_.containerSelector+' ' : '')+(params_?.selector??'.radio>input[type=radio]'));
   for (let radio of radios)
   {
      radio.repaint=radioRepaint;
      radio.addEventListener('click',(e_)=>{radio.repaint();});
      //radio.addEventListener('focus',onWrappedInputFocusChange);  //Unlike a click,change and input, 
      //radio.addEventListener('blur' ,onWrappedInputFocusChange);  // the focus and blur events are delivering as normal.
      
      radio.repaint(true); //Reflect initial state. (Set initial_repaint_ argument ony while an initialization.)
   }
}

function numericInputScroll(e_) //allows to change value of text input using a mouse wheel (for inputs, intended only for numeric values)
{
   //TODO: revision required
   var ort=mouseWheelOrt(e_);
   if (e_.target)
      {
         var max=e_.target.max;
         var min=e_.target.min||0;
         var inc=e_.target.step||1;
         
         if (isFinite(e_.target.value)) //if target.value is numeric, then inc or dec it.
         {
            var newVal=Number(e_.target.value)+(ort*inc);
            newVal.toPrecision(3);
            
            if (max!==undefined)   //bound new value to limits
               if (newVal>max)
                  newVal=max;
            if (newVal<min)
               newVal=min;
            
            e_.target.value=newVal;         //assign new value
         }
         else
             e_.target.value=(ort>0) ? min : max||min;   //if target.value is not numeric, assign a numeric value.
         
         if (e_.preventDefault)
            e_.preventDefault();
         return false;
      }
   else 
       return true;
}

function mixed_input_scroll(e_) //allow to change numeric values of text input using mouse wheel, but not changes a NaN values
{
   //TODO: revision required
   var ort=mouseWheelOrt(e_);
   if (e_.target)
      {
         var max=e_.target.max;
         var min=e_.target.min||0;
         
         if ((e_.target.value===undefined)||(e_.target.value==''))	//if target has no value, assign min or max numeric value. Do nothing, if value is not numeric, nor empty string
            e_.target.value=(ort>0) ? min : max||min;
         else
             if (e_.target.value&&isFinite(e_.target.value))
                if (((e_.target.value==min)&&(ort<0))||                       //if target.value is min or max, then assign ''
                    ((e_.target.value==max)&&(ort>0)))
                   e_.target.value='';
                else
                    numeric_input_scroll(e_);                                 //if target.value is other numeric, then use numeric_input_scroll
         
         if (e_.preventDefault)
            e_.preventDefault();
         return false;
      }
   else 
       return true;
}

function toggle(val_,val1_,val2_)
{
   //TODO: Removal candidate. Reason: rarely needed.
   return (val_==val1_) ? val2_ : val1_;
}

function InitNumericInputs()
{
   var numInputs=document.querySelectorAll('input[type=number],input[class~=number]');
   for (var inp of numInputs)
      inp.addEventListener('keypress',numericInputRestrict);
}

function numericInputRestrict(e_)
{
   if ((!(/^([0-9.,-]|Tab|Backspace|Del|Enter|Escape|Arrow.*|Page.*|Home|End|Insert)$/i.test(e_.key)||e_.ctrlKey||e_.altKey))||((e_.key=='.'||e_.key==',')&&(/[,.]/.test(this.value))))
      return cancelEvent(e_);
}

function switch_val(form_name_,input_name_,val1_,val2_,case_sensitive_)  //assigns val2_ to input's value if it is equal to val1_, Otherwise assigns val1_.
{
   //TODO: Removal candidate.  Reason: rarely needed.
   var input__=document.forms[form_name_][input_name_];
   var reg=new RegExp('^'+val1_+'$',(case_sensitive_ ? 'i' : ''));
   if (input__.value&&reg.test(input__.value))
      input__.value=val2_;
   else
       input__.value=val1_;
}

function forceKbLayout(e_,dest_)  //convert entering characters to target layout
{
   //TODO: Seems should be moved to separate library. Reason: rarely used.
   //console.log(e_);
   var char=e_.charCode; 
   char=String.fromCharCode(char);
   
   var input=e_.target;
   
   var L1='qwert`yuiop[]asdfghjkl;\'zxcvbnm,./QWERT~YUIOP{}ASDFGHJKL:"ZXCVBNM<>?@#$%^&', //complement latin characters on standard cyrillic keyboard keys
       L2='йцукеёнгшщзхъфывапролджэячсмитьбю.ЙЦУКЕЁНГШЩЗХЪФЫВАПРОЛДЖЭЯЧСМИТЬБЮ,"№;%:?';  //cyrillic character set.
   var from_str,to_str,
       pos,res;
   
   switch (dest_)
         {
            case 'r':
            case 'R':
            case 'c':
            case 'C': {
                         from_str=L1;
                         to_str=L2;
                         break;
                      }
            case 'e':
            case 'E':
            case 'l':
            case 'L' : {
                          from_str=L2;
                          to_str=L1;
                          break;
                       }
            default: return true;
         }
    
   pos=from_str.indexOf(char);
   if (pos>-1)
      res=to_str[pos];
   else
       return true;
   
   var sel_start=(input.selectionDirection=="forward") ? input.selectionStart : input.selectionEnd   ;
   var sel_end  =(input.selectionDirection=="forward") ? input.selectionEnd   : input.selectionStart ;
   var sel_dir  = input.selectionDirection;
   
   input.value=input.value.substring(0,sel_start)+res+input.value.substring(sel_start);
   
   sel_start++;
   
   input.selectionStart=sel_start;
   input.selectionEnd  =sel_start;
   input.selectionDirection="forward";
   
   e_.preventDefault? e_.preventDefault() : e_.returnValue=false;
   return true;
}

function decorateInputFieldVal(inpField_,propName_)
{
   //This is an almost decorator of the HTMLInputElements.
   //It allows to uniformly access the fields value in a sae manner as it would be with form data on a server-side or with JSON data in the response.
   
   propName_??='valueAsMixed';
   
   let getter;
   let setter;
   
   switch (inpField_.type)
   {
      case 'number':
      {
         getter=function (){return ((this.step??1)==1 ? parseInt(this.value) : parseFloat(this.value));};
         setter=function (newVal_){this.value=((this.step??1)==1 ? parseInt(newVal_??0) : parseFloat(newVal_??0));};
         inpField_.addEventListener('keypress',(e_)=>{if (['0','1','2','3','4','5','6','7','8','9','e','-','+','.',','].indexOf(e_.key)<0) {e_.key=''; return cancelEvent(e_);}});
         break;
      }
      case 'checkbox':
      {
         getter=function (){return this.checked;};
         setter=function (newVal_){this.checked=toBool(newVal_??false);};
         break;
      }
      case 'select-multiple':
      {
         getter=function ()
                {
                   let res=[];
                   for (let opt of this.options)
                      if (opt.selected)
                         res.push(opt.value);
                   return res;
                };
         setter=function (newVal_)
                {
                   if (newVal_ instanceof Array)
                      for (let opt of this.options)
                         opt.selected=(newVal_.indexOf(opt.value)>=0);
                   else
                      this.value=newVal_??'';
                };
         break;
      }
      default:
      {
         getter=function (){return this.value;};
         setter=function (newVal_){this.value=newVal_;};
      }
   }
   
   Object.defineProperty(inpField_,propName_,{configurable:true,enumerable:true,get:getter,set:setter});
   
   return inpField_;
}

class RadioGroup
{
   //This class allows to work with the group of radios as with a single input fueld.
   
   constructor(mixed_)
   {
      //NOTE: Don't forget that this.add() rejects the radios which names doesn't match the first one added.
      
      if (!(mixed_ instanceof Array))
         mixed_=[mixed_];
      
      for (let radio of mixed_)
         this.add(radio);
   }
   
   //public props
   get type()
   {
      return 'radiogroup'; //Return a synthetic type to make user don't mess this class with the radios themselves.
   }
   
   get name()
   {
      return this._radios[0]?.name??null;
   }
   set name(newVal_)
   {
      for (let radio of this._radios)
         radio.name=newVal_;
      
      this.on_rename?.();
   }
   
   get value()
   {
      let res=null;
      for (let radio of this._radios)
         if (radio.checked)
         {
            res=radio.value;
            break;
         }
      return res;
   }
   set value(newVal_)
   {
      for (let radio of this._radios)
      {
         radio.checked=(radio.value==newVal_);
         radio.repaint?.();
      }
      
      this.on_set_value?.(this.value);
   }
   
   get disabled()
   {
      //Returns false if at least one radio is not disabled.
      let res=true;
      for (let radio of this._radios)
         if (!radio.disabled)
         {
            res=false
            break;
         }
      return res;
   }
   set disabled(newVal_)
   {
      for (let radio of this._radios)
         radio.disabled=newVal_;
      
      this.on_set_disabled?.(this.disabled);
   }
   
   get required(){return this._required; /*TODO: this is a draft.*/}
   set required(newVal_){this._required=newVal_; /*TODO: this is a draft.*/}
   
   //private props
   _radios=[];
   _required=false;
   
   //public methods
   add(radio_)
   {
      //NOTE: As the radios in the group must have exactly equal names, this method rejects the radios which names doesn't match the first one added.
      
      if (((radio_ instanceof HTMLInputElement)&&(radio_.type=='radio'))&&    //Type check, //TODO: test type check on <radio>
          (this._radios.indexOf(radio_)<0)&&                                  // disallow duplicates,
          ((this._radios.length==0)||(radio_.name==this.name)))               // same name check.
      {
         this._radios.push(radio_);
         radio_.parentRadioGroup=this;
         radio_.addEventListener('click',this._on_radio_click);
      }
   }
   
   remove(what_)
   {
      let indx=(typeof what_ == 'number' ? what_ : this._radios.indexOf(what_));
      if (indx>-1)
      {
         let removed=this._radios.splice(indx,1)[0];
         removed.removeEventListener('click',this._on_radio_click);
         removed.parentRadioGroup=null;
      }
   }
   
   //private methods
   _on_radio_click(e_)
   {
      e_.target.parentRadioGroup.on_set_value?.(e_.target.parentRadioGroup.value);
   }
}

function filterSelectOptions(selectInp_,callback_,postprocess_)
{
   let enabledOpts=[];
   let selectedOpts=[];
   for (let opt of selectInp_.options)
   {
      let matched=callback_(opt);
      if (matched!==null)                    //If null, leave unchanged,
         opt.hidden=opt.disabled=!matched;   // else hide and disable unmatching options.
                                             //
      if (opt.disabled)                      //
         opt.selected=false;                 //Deselect disabled options.
      else                                   //
         enabledOpts.push(opt);              //Collect supplementary data for postprocess.
                                             //
      if (opt.selected)                      //
         selectedOpts.push(opt);             //Collect supplementary data for postprocess.
   }
   
   postprocess_?.call(this,selectInp_,enabledOpts,selectedOpts);
}

//------- Cookie-based sorting controls -------//
class SortingController
{
   constructor(params_)
   {
      this._root=params_?.container??(params_?.containerSelector ? document.querySelector(params_.containerSelector) : null);
      if (this._root)
      {
         //Get sorting data source:
         this._cookieKey=params_?.cookieKey??this._root.dataset?.sortingCookie??this._cookieKey;
         this._cookiePath=params_?.cookiePath??this._cookiePath;
         this.onChange=params_.onChange;
         
         //Init buttons:
         let buttons=params_?.buttons??this._root.querySelectorAll(params_?.buttonsSelector??'.sort_btn');   //Find buttons into container.
         for (let btn of buttons)
            if ((btn.dataset.key!='')&&(/^(ASC|DESC)$/i.test(btn.dataset.order)))   //Buttons must has correct DATA-KEY and DATA-ORDER attributes.
            {
               btn.dataset.order=btn.dataset.order.toUpperCase();       //Normalize order's char case.
               this._buttons[btn.dataset.key]??={ASC:null,DESC:null};   //Cache buttons by key and order 
               this._buttons[btn.dataset.key][btn.dataset.order]=btn;   // for easy access.
               
               btn.addEventListener('click',(e_)=>{this.toggle_sorting(e_.target.dataset.key,e_.target.dataset.order,e_.ctrlKey);});   //NOTE: If click with the Ctrl key pressed, then new sorting will be appended to existing ones, else the previous sortings will be discarded.
               btn.classList.toggle(this._selClassName,this.sortings[btn.dataset.key]==btn.dataset.order); //Init button state: set button selected if its order match corresponding sorting.
            }
      }
   }
   
   //public props
   get sortings()
   {
      try
      {
         this._sortings??=JSON.parse(getCookie(this._cookieKey)??'{}'); //NOTE: JSON.parse(null) doesn't rise exception, while JSON.parse(undefined) and JSON.parse('') does.
      }
      catch (ex)
      {
         this._sortings={};
      }
      finally
      {
         return this._sortings;
      }
   }
   set sortings(newVal_)
   {
      this._sortings=newVal_;
      
      let cookieVal=(this._sortings&&(Object.keys(this._sortings).length) ? JSON.stringify(this._sortings) : '');  //If sortings is empty, the cookie will be unset.
      setCookie(this._cookieKey,cookieVal,31,this._cookiePath);
      console.log('set sortings',this._cookieKey,this._sortings);
   }
   
   //private props
   _root=null;
   _buttons={};
   _selClassName='sel';
   _cookieKey='sort';
   _cookiePath=document.location.pathname;
   _sortings=null;
   
   //public methods
   toggle_sorting(key_,order_,append_)
   {
      //Toggle sorting.
      // If there is only one sorting it will be simply toggled. The same if append_ is set.
      // If there are many sortings, they will be replaced with the key_+order_, unless append_ is set.
      
      if ((this.sortings[key_]==order_)&&(append_||(Object.keys(this.sortings).length==1)))
         order_='';
      this.set_sorting(key_,order_,append_);
   }
   
   set_sorting(key_,order_,append_)
   {
      //Set sorting by the key_ to the order_.
      // If order_
      // If key_ already exists, its order will be updated with new value. By the way, if append_==false then all previous sortings will be discarded.
      // If key_ doesn't exists and append_==true, it will be appended to the end of existing sortings.
      
      if (this._buttons[key_]&&/^(ASC|DESC)?$/i.test(order_))   //First, check is key_ and order_ are valid (as this method may be called manually).
      {
         if (!append_)
            this.discard_sortings()
         
         let sortings=this.sortings;
         if (order_!='')
            sortings[key_]=order_;
         else
            delete sortings[key_];
         
         this._buttons[key_].ASC.classList.toggle(this._selClassName,order_=='ASC');
         this._buttons[key_].DESC.classList.toggle(this._selClassName,order_=='DESC');
         
         this.sortings=sortings;
         this.onChange?.();
      }
   }
   
   discard_sortings()
   {
      this.sortings={};
      for (const key in this._buttons)
      {
         this._buttons[key].ASC.classList.remove(this._selClassName);
         this._buttons[key].DESC.classList.remove(this._selClassName);
      }
   }
}

//------- Scrolling boxes handling -------//
class Scroller
{
   //Animates a scroller.
   //Usage:
   // Typical HTML layout is:
   //    <DIV CLASS="scroller" DATA-HANDLE="click,wheel,touch" DATA-SPEED="100%" DATA-CYCLED="true">
   //      <DIV CLASS="area">
   //        <DIV CLASS="content">
   //          <!-- here are the payload of the scroller -->
   //        </DIV>
   //      </DIV>
   //      <DIV CLASS="button left"></DIV>
   //      <DIV CLASS="button right"></DIV>
   //    </DIV>
   // Where
   //    div.scroller - main container for the area and the buttons.
   //    div.area - an area where the content moves. This block must be positioned relatively or absolutely and typically has a hidden overflow.
   //    div.content - container for something that needs to be scrolled. If the area is positioned relatively the content must be positioned absolutely, if the area is positioned absolutely the content may be positioned both of absolutely or relatively.
   //                  NOTE: use of justify-content:center; for this block will result in it being incorrectly positioned.
   //    div.button - a click listeners that will scroll the content on amount of SPEED.
   // Params:
   //    node_ - the main scroller container. All scroller presets may be set via its DATA-... attributes.
   //       data-handle - toggles an input events which scroller should handle. TODO: complete the docs and implementation of this feature.
   //       data-speed - mixed. Speed is distance which content block covers per iteration. It may be defined in px, em, vw, vh or %. The % are counted from the current area width. For other units conversion details see the function toPixels().
   //       data-cycled - boolean. If true the scrolling will be infinite, if false it will stop when the content end reaches the same end of the area.
   //       data-interval - interval of autoscrolling iterations in msec.
   // The buttons are optional.
   
   //TODO: Revision required!
   //       1) replace back referrences with arrow functions.
   //       2) optimize?
   //       3) add support of the vertical scrolling
   //       4) implement handling of the thouch events and other that was declared.
   
   constructor(params_)
   {
      //Get key elements:
      this._root=params_?.container??(params_?.containerSelector ? document.querySelector(params_.containerSelector) : null);
      if (this._root)
      {
         
         //Init params
         this.speed=params_?.speed??this._root.dataset.speed??this.speed;
         this.cycled=toBool(params_?.cycled??this._root.dataset.cycled??this.cycled);
         this._handle=params_?.handle??this._root.dataset.handle?.split(',')??this._handle;
         this.treshold=parseInt(params_?.treshold??this._root.dataset.treshold??this.treshold);
         this._interval=parseInt(params_?.interval??this._root?.dataset?.interval??this._interval);
         
         //Init nodes:
         //root node
         this._root.classList.remove('inactive');   //class "inactive" may be used to alter scroller view/behavior while it isn't initialized.
         
         //scroling area
         this._area=this._root.querySelector('.area');
         this._area.scroller=this;  //back referrence
         
         //buttons
         var buttons=this._root.querySelectorAll('.button');
         for (var i=0;i<buttons.length;i++)
         {
            buttons[i].scroller=this;  //back referrence
            if (buttons[i].classList.contains('left'))
               this._buttons.left=buttons[i];
            else if (buttons[i].classList.contains('right'))
               this._buttons.right=buttons[i];
         }
         
         //content container that scrolls into scroling area
         this._content=this._root.querySelector('.content');
         this.recalcContentSize();
                  
         //Attach event handlers:
         for (var i=0;i<this._handle.length;i++)
         {
            switch (this._handle[i])
            {
               case 'click':
               {
                  if (this._buttons.left)
                     this._buttons.left.addEventListener('click',function(e_){this.scroller.scroll(-1); return cancelEvent(e_);});
                  if (this._buttons.right)
                     this._buttons.right.addEventListener('click',function(e_){this.scroller.scroll(+1); return cancelEvent(e_);});
                  
                  break;
               }
               case 'wheel':
               {
                  this._area.addEventListener('wheel',function(e_){this.scroller.scroll(Math.sign(e_.deltaY)); return cancelEvent(e_);});
                  break;
               }
               case 'touch':
               {
                  break;
               }
               case 'drag':
               {
                  break;
               }
               case 'middlebtn':
               {
                  break;
               }
            }
         }
         
         //Start autoscrolling timer (if the interval>0):
         this.resume();
      }
   }
   
   //public props
   speed='33%';    //scrolling speed (affects scrolling by cklicking on buttons and by mouse wheel scrolling).
   cycled=false;   //allow to continue from the opposite end or stop scrolling when the end or the start has reached.
   treshold=10;    //corner positions detection treshold
   get interval(){return this._interval;}
   set interval(val_)
   {
      if (!isNaN(val_))
      {
         this._interval=parseInt(val_);
         if (this._interval<=0)
            this.pause();
      }
   }
   
   //private props
   _root=null;      //root node.
   _area=null;      //scrolling area node.
   _content=null;   //content container node.
   _buttons={left:null,right:null};   //nodes of left and right buttons.
   _handle=['click','wheel','touch']; //default handled events. Full list: 'click' - clicking on button nodes; 'wheel' - mouse wheel scrolling; 'touch' - gragging by touch input device; 'drag' - like touch, but by main mouse button; 'middlebtn' - like touch, but by the middle mouse button.
   _interval=0;
   _intervalID=null;
   
   //public methods
   scroll(ort_)
   {
      //Scroll in left or right direction, using the speed parameter to get scrolling amount
      
      if (ort_!=0)   //ort_ should be -1 or +1.
         this.scrollBy((ort_*parseFloat(this.speed))+mUnit(this.speed));
   }
   
   scrollBy(deltaX_,from_start_)
   {
      //Scroll on specified amount of pixels or percents.
      
      let offset=toPixels(deltaX_,{subj:this._content,axis:'x'});
      //console.log('scroll by ',offset,'px (computed from ',deltaX_,') at ',this._root);
      let conStyle=window.getComputedStyle(this._content);
      let oldPos=(from_start_ ? 0 : -parseFloat(conStyle.marginLeft));
      let maxPos=Math.max(0,parseFloat(conStyle.width)-this._area.clientWidth);
      let pos=oldPos+offset;
      
      if (this.cycled)
      {
         //Handle position out of range cases:
         if (pos<0)
            pos=oldPos>0 ? 0 : maxPos; //Step to beginning, then turn to the end.
         else if (pos>maxPos)
            pos=oldPos<maxPos ? maxPos : 0;  //Step to the end, then return to beginning.
      }
      else
         pos=Math.min(Math.max(0,pos),maxPos);
      
      this._content.style.marginLeft=(-pos)+'px';
      this.updateButtons();
   }
   
   scrollTo(target_)
   {
      //Scroll to the specific node.
      
      let offset=0;
      for (let child of this._content.childNodes)
         if (child==target_)
         {
            offset=child.offsetLeft;
            break;
         }
      
      this.scrollBy(offset,true);
   }
   
   resume()
   {
      //[Re]start the scroller timer (only if the interval>0).
      //NOTE: This method named "resume" because it doesn't affect the currIndex, which might be implied for "reset" or "restart".
      //NOTE: This method doesnt preserves a time passed from the last tick to the stop and this is the feature.
      
      if (this._interval>0)
      {
         this.stop();
         this._intervalID=setInterval((e_)=>{this.scroll(Math.sign(this._interval));},Math.abs(this._interval));
      }
   }
   
   stop()
   {
      //Stop the scroller timer.
      
      if (this._intervalID)
      {
         clearInterval(this._intervalID);
         this._intervalID=null;
      }
   }
   
   recalcContentSize()
   {
      //Recalculates summary width of the items into content block.
      //TODO: in future, this method should calculate elements' sizes by the scrolling axis.
      
      let style=window.getComputedStyle(this._content);
      let w=parseFloat(style.paddingLeft)+parseFloat(style.paddingRight);
      for (let child of this._content.children)
         w+=this._calcItemPlaceWidth(child);
      this._content.style.width=w+'px';
      
      this.updateButtons();
   }
   
   updateButtons()
   {
      let conStyle=window.getComputedStyle(this._content);
      
      if (this._buttons.left)
      {
         if (-parseFloat(conStyle.marginLeft)<=this.treshold)
            this._buttons.left.classList.add('disabled');
         else
            this._buttons.left.classList.remove('disabled');
      }
      if (this._buttons.right)
      {
         if ((parseFloat(conStyle.width)+parseFloat(conStyle.marginLeft)-this._area.clientWidth)<=this.treshold)
            this._buttons.right.classList.add('disabled');
         else
            this._buttons.right.classList.remove('disabled');
      }
   }
   
   //private methods
   _calcItemPlaceWidth(item_)
   {
      let style=window.getComputedStyle(item_);
      let w=(item_.getBoundingClientRect().width+parseFloat(style.marginLeft)+parseFloat(style.marginRight));
      return w;
   }
}

function initScrollers(selector_,scrollerClass_,defaultParams_)
{
   var containers=document.body.querySelectorAll(selector_??'.scroller');
   for (var container of containers)
      if (!container.scroller)
         container.scroller=new (scrollerClass_??Scroller)({...defaultParams_,container:container});
   
   return containers;
}

//------- Tabs -------//
class TabsController
{
   //The bare controller of the tabs.
   //Params:
   // tabs - array of the tabs themselves. Useful if you already has them.
   // container - container of the tabs. Without the "tabsSelector" param, all container's children will become the tabs.
   // containerSelector - a css-selector to get the tabs' container.
   // tabsSelector - css-selector, used to get the tabs. If "container" or "containerSelector" is defined, the tabs will be searched into this container (and if container will not be found, the tabs will not too), otherwise the tabs will be searched into the entire document.
   // NOTE: Requirement diagram of params above: 
   //    tabs|((container|containerSelector)[,tabsSelector])|tabsSelector.
   // selClassName - a class will be added to classList of the selected tab. Optional, default is 'sel'.
   // switchCmpCallback - callback that will be assigned to aponymous public property.
   //Properties:
   // switchCmpCallback - default callback for the switchTo() method. The stock one checks if the tab's classList contains a given string. See switchTo() description for details.
   //Event handlers:
   // onSwitch() - called when tab was switched. Will not fire if the tab is already current or if an error had occurred.
   
   constructor(params_)
   {
      //Set the properties from params:
      this._selClassName=params_.selClassName??this._selClassName;
      this.switchCmpCallback=params_.switchCmpCallback??this.switchCmpCallback;
      this.allowOutOfRange=params_.allowOutOfRange??this.allowOutOfRange;
      
      //Construct:
      if (params_.tabs)                                                                                                             //At 1st, check if the tabs are given directly.
         this._tabs=params_.tabs;
      else if (params_.container||params_.containerSelector)                                                                        //At 2nd: get container with the tabs into it.
      {
         let container=params_.container??(params_.containerSelector ? document.querySelector(params_.containerSelector) : null);   // If container isn't given directly, then try to find it by selector.
         this._tabs=(params_.tabsSelector ? container?.querySelectorAll(params_.tabsSelector) : container?.children);               // If the tabsSelector isn't set, then get all children of the container.
      }
      else
         this._tabs=document.querySelectorAll(params_.tabsSelector);                                                                //At 3rd: try to find tabs by selector from the entire document.
      
      //Init:
      this.currIndex=arraySearch(this._selClassName,this._tabs,(class_,tab_)=>{return tab_.classList.contains(class_);})??(this.allowOutOfRange ? null : 0);   //Find the statically selected tab, and if not so, then select the 1st tab, unless the out-of-range is allowed.
   }
   
   //public props
   get tabs(){return [...this._tabs];}                //Returns a clonned array of the tabs. NOTE: this protects the original property from unsynced modifications, while the tabs, being the DOM nodes, themselves are naturally unprotactable from e.g. detaching/destroying.
   get length(){return this._tabs.length;}
   get currTab(){return this._tabs[this._currIndex]}  //The currently selected tab itself.
   
   get currIndex(){return this._currIndex;}           //Index of the currently selected tab.
   set currIndex(val_)
   {
      if (val_!=this._currIndex)
      {
         if ((val_!==null)&&!isNaN(val_)&&(0<=val_)&&(val_<=this._tabs.length))
         {
            this._tabs[this._currIndex]?.classList.remove(this._selClassName);
            this._currIndex=val_;
            this._tabs[this._currIndex]?.classList.add(this._selClassName);
            
            this._onSwitch?.();
         }
         else if (this.allowOutOfRange)
         {
            this._tabs[this._currIndex]?.classList.remove(this._selClassName);
            this._currIndex=null;
         }
      }
   }
   
   allowOutOfRange=false;
   switchCmpCallback=(class_,tab_)=>{return tab_.classList.contains(class_);};
   
   //private props
   _tabs=[];
   _currIndex=null;
   _selClassName='sel'; //Class will be assigned to selected switch and tab and removed from the other ones.
   
   //public methods
   switchToTab(tab_)
   {
      //Switch to the given tab. If the tab_ actually isn't this controller's tab, then nothing will happen.
      this.currIndex=arraySearch(tab_,this._tabs);
   }
   
   switchTo(somewhat_,callback_)
   {
      //Switch to the tab which matches the somewhat_ using callback.
      //Arguments:
      // somewhat_ - a value, that one of the tabs should match.
      // callback_ - a function, that decides if a tab matches the somewhat_ (see arraySearch() description for details). Optional. If omitted the switchCmpCallback will be used instead.
      
      callback_??=this.switchCmpCallback;
      this.currIndex=arraySearch(somewhat_,this._tabs,callback_);
   }
   
   //private methods
   _onSwitch()
   {
      //This method is intended to extend the switching behavior in the descendant classes.
      
      this.onSwitch?.(this);   //Event handler.
   }
}

class TabBox extends TabsController
{
   //TabBox controller. It controls the tabs, while tab-buttons are delegated to the child TabsController instance.
   // Note that params are slightly differs from the bare TabsController.
   //Params:
   // tabs - same as eponymous TabsController's param.
   // buttons - array of the buttons themselves. Useful if you already has them. A called "buttons" may be actually any kind of the HTMLElement.
   // generateButtons - sub params, which sets up the dynamic generatiion of the tab-buttons from the tabs.
   //    callback - function that create a button's HTMLElement from the tab. Optional, by default the button will be a simple DIV with class name 'tab_btn' and content equal to the tab's DATA-CAPTION attribute (w/o DATA-CAPTION the tab-buttons will be empty, that however can make a sense).
   //    container - container, where the generated buttons will be placed. Optional if the "generateButtons.containerSelector" is set.
   //    containerSelector - css-selector, used to get the buttons container. Optional if the "generateButtons.container" is set.
   // container - the main tabbox container itself. It should contain both of the buttons and the tabs.
   // containerSelector - css-selector, used to get the tabbox container.
   // tabsSelector - same as eponymous TabsController's param. If "container" or "containerSelector" is set, it becomes '.tab' by default.
   // buttonsSelector - same as the tabsSelector, but for the buttons. If "container" or "containerSelector" is set, it becomes '.tab_btn' by default.
   // NOTE: Requirement diagrams of params above:
   //    tabs|((container|containerSelector)[,tabsSelector])|tabsSelector
   //    buttons|generateButtons|((container|containerSelector)[,buttonsSelector])|buttonsSelector
   // eventType - an event which the buttons will listen to. Optional, the 'click' is default.
   // matchByCallback - boolean, if set true, then the switchCmpCallback() will be used to find a tab matching the selected button. Otherwise, the tabs will be mapped to the buttons in order (index).
   // switchCmpCallback - a user-defined callback, that will be assigned to aponymous public property, 
   //Attributed params of main container:
   // DATASET-TABS - equivalent of the tabsSelector.
   // DATASET-BUTTONS - equivalent of the buttonsSelector.
   // DATASET-BUTTONS-CONTAINER - equivalent of the generateButtons.containerSelector.
   //Attributed params of tabs:
   // DATASET-CAPTION - Arbitary string that will be used as tab button text by default tab button generator. (Only if buttons are automatically generated.)
   //Properties:
   // switchCmpCallback - callback used to test if the tab match the selected button. The stock one checks if the tab's classList contains a value of the button's DATA-TAB attribute.
   //Event handlers:
   // onSwitch() - called when tab was switched. Will not fire if the tab is already current or if an error had occurred.
   // onFail(val_) - called when switch fails.
   
   constructor(params_)
   {
      //Get main tabbox container if need to select tabs or buttons:
      let container=null;
      if (!(params_.buttons||params_.tabs))
         container=params_.container??document.querySelector(params_.containerSelector);
      
      //Split and map params for the inherited constructor and the child TabsController:
      let tabsParams={
                        tabs:params_.tabs,                                                   //1st, look for already selected tabs.
                        container:container,
                        tabsSelector:params_.tabsSelector??container.dataset?.tabs??'.tab',  //2nd, take the selector from params, or container's dataset or set the default.
                        switchCmpCallback:params_.switchCmpCallback,
                        selClassName:params_.selClassName,
                     };
      let btnsParams={
                        tabs:params_.buttons,                                                         //1st, look for already selected buttons.
                        container:container,
                        tabsSelector:params_.buttonsSelector??container.dataset?.buttons??'.tab_btn', //2nd, take the selector from params, or container's dataset or set the default.
                        selClassName:params_.selClassName,
                     };
      
      //Construct inherited:
      super(tabsParams);   //This class will directly control the tabs of the tabbox.
      
      //Set the properties from params:
      this._matchByCallback=params_.matchByCallback??this._matchByCallback;
      
      //Generate tab-buttons:
      if ((!params_.buttons)&&(params_.generateButtons||container.dataset.buttonsContainer))
      {
         let btnsContainer=params_.generateButtons.container??container?.querySelector(params_.generateButtons.containerSelector??container.dataset?.buttonsContainer??'.tab_btns');   //1st, look for already selected buttons' container,  
         let button_generator=params_.generateButtons.callback??((tab_)=>{return buildNodes({tagName:'div',className:'tab_btn',textContent:tab_.dataset?.caption});}); //Take a user-deinned generator function or define the default one that will use tab's DATASET-CAPTION attribute.
         
         if (btnsContainer)
            for (let tab of this._tabsCtrl.tabs)
            {
               let btn=callback(tab);
               if (btn instanceof Node)
               {
                  btnsContainer.appendChild(btn);
                  btnsParams.tabs.push(btn);
               }
            }
      }
      
      //Create controller for the static or generated tab-buttons:
      this._tabBtnsCtrl=new TabsController(btnsParams);  //While the buttons will be delegated to another TabsController instance.
      
      //Assign event listeners:
      for (let button of this._tabBtnsCtrl.tabs)
         button.addEventListener(params_.eventType??'click',(e_)=>{this.switchToBtn(button); return cancelEvent(e_);});
   }
   
   //public props
   get currBtn(){return this._tabBtnsCtrl.currTab;}  //The currently selected button.
   
   switchCmpCallback=(class_,tab_)=>{return tab_.classList.contains(class_)};
   
   //private props
   _tabBtnsCtrl=null;      //The TabsController instance which will control the tab butons.
   _matchByCallback=false; //By default, simply map buttons and tabs by the order.
   
   //public methods
   switchToBtn(btn_)
   {
      //Switch to the given tab. If the tab_ actually isn't this controller's tab, then nothing will happen.
      
      let oldCurrBtnIndex=this._tabBtnsCtrl.currIndex;   //Memorize old current indexes.
      let oldCurrIndex=this._currIndex;                  //
      
      this._tabBtnsCtrl.switchToTab(btn_);               //1st, switch the buttons.
      
      if (this._matchByCallback)                         //2nd,
         this.switchTo(this._tabBtnsCtrl.currTab);       // switch to the tab matched to the button by callback
      else                                               // or
         this.currIndex=this._tabBtnsCtrl._currIndex;    // sync tabs with buttons by indexes.
      
      if (this.currIndex==oldCurrIndex)                  //3rd, at the tab or tab index mismatch,
         this._tabBtnsCtrl._currIndex=oldCurrBtnIndex;   // rollback the buttons state to show that switching has failed.
   }
}

function initTabBoxes(selector_,TabBoxClass_,defaultParams_)
{
   //Default global tabboxes initializer.
   
   let containers=document.querySelectorAll(selector_??'.tabbox');
   for (let container of containers)
      if (!container.tabbox)
         container.tabbox=new (TabBoxClass_??TabBox)({...defaultParams_,container:container});
   
   return containers;
}

//------- Slider -------//
class SlideShow extends TabBox
{
   //SlideShow is a kinda tabbox with additional prev/next buttons, timer and the optional large scale viewport.
   // It may be used in a bunch of the different ways from the simple slideshow to the image slider or even the async loader of some detailed info.
   // - the "slides" is an alias of the "tabs";
   // - the tab-buttons are optional because of prev/next buttons and timer
   //HTML Layout:
   // <DIV CLASS="slideshow" DATA-CYCLED="true" DATA-INTERVAL="1500">
   //    <DIV CLASS="viewport"></DIV><!--optional-->
   //    <DIV CLASS="slides"><!--optional-->
   //       <DIV CLASS="slide">Some content...</DIV>
   //       <DIV CLASS="slide">Some content...</DIV>
   //       ...
   //    </DIV><!--optional-->
   //    <DIV CLASS="button prev"></DIV>
   //    <DIV CLASS="button next"></DIV>
   // </DIV>
   //Parameters:
   // slides - an alias for the tabs. 
   //	slidesSelector - an alias for the tabsSelector.
   // viewport - optional container to display the current slide in a large scale. If neither "container" nor the "viewportSelector" is set, then 
   // viewportSelector - css-selector to get the viewport. Optional.
   // viewportRenderer - a user-defined callback, that will be assigned to aponymous public property.
   // interval - slideshow timer interval in ms. If interval>0 then timer will be started after initialization. If interval=0 then timer will be stoped/not started.
   //Properties:
   // isCycled - boolean, if true then the prev/next methods (used by prev/next buttons and the timer) will not stops at the ends.
   // interval - slideshow timer interval in ms. Setting of this property to 0 will immediately stops the timer. Also method resume() will has no effect until the interval is set >0.
   // viewportRenderer - callback that reneders the viewport. It take two arguments: viewport_ and slide_. which are the referrences to the viewport and the current slide correspondently. Thus it can make whatever is needed with the viewport using any data from the slide_. 
   //    The stock renderer just copies an innerHTML from the slide_ to the viewport_.
   
   constructor(params_)
   {
      //Map params named in the "slider" context:
      let params={...params_};
      if (!params.container)
         params.container=document.querySelector(params.containerSelector);
      if (params.slides)
      {
         params.tabs=params.slides;
         delete params.slides;
      }
      if (params.slidesSelector)
      {
         params.tabsSelector=params.slidesSelector;
         delete params.slidesSelector;
      }
      if (!params.tabsSelector&&params.container)
         params.tabsSelector='.slide';
      
      //Construct inherited:
      super(params);
      
      //Set the properties from params:
      this.isCycled=toBool(params.isCycled??params.container?.dataset?.cycled??this.isCycled);
      this._interval=parseInt(params.interval??params.container?.dataset?.interval??this._interval);
      this.viewportRenderer=params.viewportRenderer??this.viewportRenderer;
      
      //Get the new elements:
      this._buttons.prev=params.prevBtn??(params.prevBtnSelector ? (params.container??document).querySelectorAll(params.prevBtnSelector) : params.container?.querySelectorAll(params.container.dataset?.prevBtnSelector??'.button.prev'));
      this._buttons.next=params.nextBtn??(params.nextBtnSelector ? (params.container??document).querySelectorAll(params.nextBtnSelector) : params.container?.querySelectorAll(params.container.dataset?.nextBtnSelector??'.button.next'));
      this._viewport=params.viewport??(params.viewportSelector ? (params.container??document).querySelector(params.viewportSelector) : params.container?.querySelector(params.container.dataset?.viewportSelector??'.viewport'));
      
      //Assign enent listeners to the new controls:
      for (let btnPrev of this._buttons.prev)
         btnPrev.addEventListener('click',(e_)=>{this.prev(); this.resume(); return cancelEvent(e_);});
      
      for (let btnNext of this._buttons.next)
         btnNext.addEventListener('click',(e_)=>{this.next(); this.resume(); return cancelEvent(e_);});
      
      //Start slideshow timer (if the interval>0):
      this.resume();
   }
   
   //public props
   get interval(){return this._interval;}
   set interval(val_)
   {
      if (!isNaN(val_))
      {
         this._interval=parseInt(val_);
         if (this._interval<=0)
            this.pause();
      }
   }
   
   isCycled=false;
   viewportRenderer=(viewport_,tab_)=>{viewport_.innerHTML=tab_.innerHTML;};
   get slides(){return this.tabs;}        //An alias of the tabs.
   get currSlide(){return this.currTab;}  //An alias of the currTab.
   get isAtStart(){return this._currIndex<=0;}                    //If the current tab is the first one.
   get isAtEnd(){return this._currIndex>=(this._tabs.length-1);}  //If the current tab is the last one.
   
   //private props
   _intervalID=null;
   _interval=0;
   _buttons={prev:null,next:null};
   _viewport=null;
   
   //public methods
   next()
   {
      //Switch to the next slide.
      
      if (this.currIndex<this.length-1)
         this.currIndex++;
      else if (this.isCycled)
         this.currIndex=0;
   }
   
   prev()
   {
      //Switch to the prev slide.
      
      if (this.currIndex>0)
         this.currIndex--;
      else if (this.isCycled)
         this.currIndex=this.length-1;
   }
   
   resume()
   {
      //[Re]start the slideshow timer (only if the interval>0).
      //NOTE: This method named "resume" because it doesn't affect the currIndex, which might be implied for "reset" or "restart".
      //NOTE: This method doesnt preserves a time passed from the last tick to the stop and this is the feature.
      
      if (this._interval>0)
      {
         this.stop();
         this._intervalID=setInterval((e_)=>{if (this._interval>0) this.next(); else this.prev();},Math.abs(this._interval));
      }
   }
   
   stop()
   {
      //Stop the slideshow timer.
      
      if (this._intervalID)
      {
         clearInterval(this._intervalID);
         this._intervalID=null;
      }
   }
   
   //private methods
   _onSwitch()
   {
      //Repaint the large viewport:
      if (this._viewport)
         this.viewportRenderer(this._viewport,this.currTab);
      
      //Repaint the prev/next buttons:
      let isPrevDisabled=(this.isAtStart&&!this.isCycled)||(this._tabs.length<=1);
      let isNextDisabled=(this.isAtEnd&&!this.isCycled)||(this._tabs.length<=1);
      
      if (this._buttons)
      {
         for (let btnPrev of this._buttons.prev)
            this._setBtnState(btnPrev,isPrevDisabled,this.isAtStart);
         
         for (let btnNext of this._buttons.next)
            this._setBtnState(btnNext,isNextDisabled,this.isAtEnd);
      }
      //Call the event handler.
      this.onSwitch?.(this);
   }
   
   _setBtnState(btn_,isDisabled_,isRested_)
   {
      btn_.classList.toggle('disabled',isDisabled_);
      btn_.classList.toggle('rested',isRested_);
   }
}

function initSlideShows(selector_,SlideShowClass_,defaultParams_)
{
   var containers=document.body.querySelectorAll(selector_??'.slideshow');
   for (var container of containers)
      container.slideShow=new (SlideShowClass_??SlideShow)({...defaultParams_,container:container});
   
   return containers;
}

//------- Spoilers -------//
function Spoiler(node_)
{
   //private properties
   this.node=null;
   this.buttons=[];
   
   //public methods
   this.toggle=function(state_)
   {
      if (this.node)
         this.node.classList.toggle('unfolded'/*,state_*/);
   }
   
   //initialization
   this.init=function(node_)
   {
      this.node=node_;
      if (this.node)
      {
         //Find this spoiler's buttons, i.e. nodes having 'button' class and are direct cildren of this.node or it's descendants that not belongs to content node.
         this.buttons=[];
         for (var i=0;i<this.node.children.length;i++)
         {
            if (this.node.children[i].classList.contains('button'))
               this.buttons.push(this.node.children[i]);
            else
               if (!this.node.children[i].classList.contains('content'))
               {
                  var deepBtns=this.node.children[i].getElementsByClassName('button');
                  for (var k=0;k<deepBtns.length;k++)
                     this.buttons.push(deepBtns[k]);
               }
         }
         var sender=this;
         for (var i=0;i<this.buttons.length;i++)
            this.buttons[i].addEventListener('click',function(e_){sender.toggle(); return cancelEvent(e_);});
      }
   }
   this.init(node_);
}

function initSpoilers(selector_)
{
   var spoilerNodes=document.body.querySelectorAll(selector_??'.spoiler');
   if (spoilerNodes)
      for (var i=0;i<spoilerNodes.length;i++)
         spoilerNodes[i].controller=new Spoiler(spoilerNodes[i]);
}

//------- Range bar -------//
class RangeBar
{
   //TODO: Legacy code, revision required.
   constructor(node_,params_)
   {
      if (node_)
      {
         //private props
         this.__commitedVals=null;   //Temporary copy of values used to recalc original positions of indirectly moved sliders.
         this.__isVolatile=false;    //True while dragging of sliders.
         
         //protected props
         this._node=node_;
         this._trackAreaNode=(this._node.dataset.trackAreaSelector ? document.querySelector(this._node.dataset.trackAreaSelector) : null)||this._node.parentNode||this._node; //The node that will receive mouse and touch movement events (It's better to use more wide area than trackbar itself to get more smooth behaviour)
         this._inputs=(this._node.dataset.inputsSelector ? document.querySelectorAll(this._node.dataset.inputsSelector) : []);
         this._indicators=(this._node.dataset.indicatorssSelector ? document.querySelectorAll(this._node.dataset.indicatorssSelector) : []);
         this._axis=(((params_&&params_.axis)||this._node.dataset.axis||'').toLowerCase()=='y' ? 'y' : 'x');
         this._reversed=(params_&&params_.reversed)||toBool(this._node.dataset.reversed);
         this._precision=(params_&&params_.precision)||parseInt(this._node.dataset.precision)||0;
         this._min=(params_&&params_.min)||this._parseNum(this._node.dataset.min)||0;
         this._max=(params_&&params_.max)||this._parseNum(this._node.dataset.max)||255;
         this._values=null;
         this._defaultVals=null;    //Initial values for case of the form reset.
         this._grabbedIndx=-1;      //Index of grabbed value/slider.
         
         //Init range bar node
         var sender=this;
         this._node.parent=this;
         this._node.addEventListener('mousedown',function(e_){return sender._grabByMouse(e_);});
         document.body.addEventListener('mouseup',function(e_){return sender._releaseByMouse(e_);});     //Detect releasing of mouse button anywhere
         this._trackAreaNode.addEventListener('mousemove',function(e_){return sender._trackMouse(e_);});
         this._node.addEventListener('touchstart',function(e_){return sender._grabByTouch(e_);});
         document.body.addEventListener('touchend',function(e_){return sender._releaseByTouch(e_);});    //Detect releasing of touch anywhere
         document.body.addEventListener('touchcancel',function(e_){return sender._releaseByTouch(e_);});
         this._trackAreaNode.addEventListener('touchmove',function(e_){return sender._trackTouch(e_);});
         
         //Init associated inputs
         for (var input of this._inputs)
            input.addEventListener('input',function(e_){var indexMatch=/\[([0-9])\]$/.exec(this.name); sender.setValueAt(parseInt((indexMatch&&indexMatch[1])||this.dataset.rangeValIndex)||0,this.value);});
         
         //Obtain initial values
         if (params_&&params_.values)
            this._setValues(values);
         if (this._node.dataset.val)
            this._setValues(this._node.dataset.val.split(','));
         else if (this._inputs.length>0)
         {
            var values=[];
            for (var input of this._inputs)
               values.push(input.value); 
            this._setValues(values);   //Correctly set values.
         }
         else
            this._values=[this._min];
         
         //Copy initial values to defaults
         this._defaultVals=this._values.slice();
         
         this._updateInputs();   //Update inputs anyway in case of the forced changes of the values.
         this._repaint();
      }
   }
   
   //props methods
   get _isVolatile(){return this.__isVolatile;}
   set _isVolatile(newVal_)
   {
      if ((!this.__isVolatile)&&newVal_)
         this.__commitedVals=this._values.slice();
      else if (this.__isVolatile&&(!newVal_))
         this.__commitedVals=null;
      
      this.__isVolatile=newVal_;
   }
   
   //protected methods
   _parseNum(val_)
   {
      //Parse type-specific numeric value
      
      return (this._precision==0 ? parseInt(val_) : parseFloat(val_).toFixed(this._precision)); //NOTE: NaN.toFixed() will not throw an error.
   }
   
   _getRelValAt(indx_)
   {
      //Returns relative meaning of the value by index
      
      var res=null;
      
      if (typeof indx_=='undefined')
         indx_=0;
      
      if ((indx_>=0)&&(indx_<this._values.length))
      {
         res=this.absToRel(this._values[indx_]);
         if (this._reversed)
            res=1-res;
      }
      
      return res;
   }
   _getRelVals()
   {
      //Returns relative meanings of all values
      
      var res_arr=[];
      
      for (var i=0;i<this._values.length;i++)
         res_arr.push(this._getRelValAt(i));
      
      return res_arr;
   }
   
   _setValueAt(indx_,newVal_)
   {
      //Set a single value without repaint
      //NOTE: Don't mess with the public setValueAt()
      
      var res=null;
      
      newVal_=this._parseNum(newVal_);  //Convert value into the current format
      if (!(isNaN(indx_)||isNaN(newVal_)))
      {
         if (this._isVolatile)                           //While dragging a value, another values may be affected indirectly (stacked to the dragging one).
            this._values=this.__commitedVals.slice();    //Therefore they are has to be restored at each movement until the dragged value is released.
         
         if ((indx_>=0)&&(indx_<this._values.length))
         {
            //Limit new value to range bounds
            this._values[indx_]=Math.max(this._min,newVal_);
            this._values[indx_]=Math.min(this._values[indx_],this._max);
            
            //Stack previous values if they are greater
            for (var i=indx_-1;i>=0;i--)
               if (this._values[i]>this._values[indx_])
                  this._values[i]=this._values[indx_];
               
            //Stack next values if they are lesser
            for (var i=indx_+1;i<this._values.length;i++)
               if (this._values[i]<this._values[indx_])
                  this._values[i]=this._values[indx_];
            
            res=this._values[indx_];
         }
         else
            console.warn('RangeBar._setValueAt: Unable to set value: index out of range.');
      }
      else
         console.warn('RangeBar._setValueAt: Unable to set value: '+(isNaN(indx_) ? 'index is NaN' : '')+(isNaN(newVal_) ? 'value is NaN' : '')+'');
      
      return res;
   }
   
   _correctValues(values_)
   {
      //Limit values to the range boundaries and also arrange them by ascending.
      
      var min=this._min;                  //Limit 0th value bottom to the range min.
      for (var i=0;i<values_.length;i++)
      {
         values_[i]=this._parseNum(values_[i]); //Convert value into the current format
         
         if (isNaN(values_[i]))
            values_[i]=min;               //Stack the NaNs to the previous valid value.
         else if (values_[i]<min)
            values_[i]=min;               //Limit all the next values bottom bo the previous one.
         else if (values_[i]>this._max)
            values_[i]=this._max;         //And limit any value top to the range max.
         
         min=values_[i];
      }
      
      return values_;
   }
   
   _setValues(newVals_)
   {
      //Set all the values without repaint.
      
      if (newVals_ instanceof Array)
         this._values=this._correctValues(newVals_);
      else
         console.error('RangeBar._setValues: Argument is not an array.');
      
      return this._values;
   }
   
   _repaint()  //overridable
   {
      //Repaint _node and _indicators according to actual values.
      
      var positions=[];
      
      for (var i=0;i<this._values.length;i++)
         positions.push((this._getRelValAt(i)*100)+'%');
      
      //Repaint range bar node background
      this._node.style['backgroundPosition'+this._axis.toUpperCase()]=positions.join(',');
      
      //Repaint _indicators
      var cnt=Math.min(this._indicators.length,this._values.length);
      for (var i=0;i<cnt;i++)
      {
         this._indicators[i].textContent=this._values[i];
         if (toBool(this._indicators[i].dataset.movable))
            this._indicators[i].style[this._axis=='x' ? 'left' : 'top']=positions[i];
      }
   }
   
   _updateInputs()
   {
      //Send current values to associated inputs.
      
      for (var i=0;i<this._inputs.length;i++)
         this._inputs[i].value=this._values[i];
   }
   
   _grabByMouse(e_)
   {
      //Pick a value by mouse down and prepare to change it by dragging.
      
      this._isVolatile=true;
      
      var pos=cursorToRelative(e_,this._node);
      this._grabbedIndx=this.getNearestIndex(pos);
      this._setValueAt(this._grabbedIndx,this.posToVal(pos));
      
      this._repaint();
      this._updateInputs();
      this.onInput&&this.onInput(e_,this._grabbedIndx);
      
      return cancelEvent(e_);
   }
   _releaseByMouse(e_)
   {
      //Stop dragging of value by mouse
      
      this._isVolatile=false;
   }
   _trackMouse(e_)
   {
      //Drag value by mouse
      
      if (this._isVolatile)
      {
         //console.log(e_);
         var pos=cursorToRelative(e_,this._node);
         this._setValueAt(this._grabbedIndx,this.posToVal(pos));
         
         this._repaint();
         this._updateInputs();
         this.onInput&&this.onInput(e_,this._grabbedIndx);
      
         return cancelEvent(e_);
      }
   }
   _grabByTouch(e_)
   {
      //Pick a value by touch and prepare to change it by dragging.
      
      this._isVolatile=true;
      
      var pos_arr=touchesToRelative(e_,this._node);
      this._grabbedIndx=this.getNearestIndex(pos_arr[0]);
      this._setValueAt(this._grabbedIndx,this.posToVal(pos_arr[0]));
      
      this._repaint();
      this._updateInputs();
      this.onInput&&this.onInput(e_,this._grabbedIndx);
      
      return cancelEvent(e_);
   }
   _releaseByTouch(e_)
   {
      //Stop dragging of value by touch
      
      if (e_.type=='touchcancel')
         this._values=this.__commitedVals;
      this._isVolatile=false;
   }
   _trackTouch(e_)
   {
      //Drag value by touch
      
      if (this._isVolatile)
      {
         var pos_arr=touchesToRelative(e_,this._node);
         this._setValueAt(this._grabbedIndx,this.posToVal(pos_arr[0]));
         
         this._repaint();
         this._updateInputs();
         this.onInput&&this.onInput(e_,this._grabbedIndx);
         
         return cancelEvent(e_);
      }
   }
   
   //public props
   get values()
   {
      return this._values.slice();  //Isolate protected prop.
   }
   set values(newVals_)
   {
      this._setValues(newVals_.slice());
      
      this._repaint();
      this._updateInputs();
      this.onChange&&this.onChange();
   }
   
   get defaults()
   {
      return this._defaultVals.slice();  //Isolate protected prop.
   }
   set defaults(newVals_)
   {
      this._defaultVals=this._correctValues(newVals_.slice());
   }
   
   get min(){return this._min;}
   set min(newVal_)
   {
      this._min=newVal_;
      if (this._min<this._max)
      {
         this._values=this._correctValues(this._values);
         this._defaultVals=this._correctValues(this._defaultVals);
         if (this.__commitedVals)
            this.__commitedVals=this._correctValues(this.__commitedVals);
         
         this._repaint();
         this._updateInputs();
         this.onChange&&this.onChange();
      }
   }
   
   get max(){return this._max;}
   set max(newVal_)
   {
      this._max=newVal_;
      if (this._min<this._max)
      {
         this._values=this._correctValues(this._values);
         this._defaultVals=this._correctValues(this._defaultVals);
         if (this.__commitedVals)
            this.__commitedVals=this._correctValues(this.__commitedVals);
         
         this._repaint();
         this._updateInputs();
         this.onChange&&this.onChange();
      }
   }
   
   //public methods
   absToRel(val_)
   {
      return (val_-this._min)/(this._max-this._min);
   }
   relToAbs(val_)
   {
      return (val_*(this._max-this._min)+this._min).toFixed(this._precision);
   }
   
   setValueAt(indx_,newVal_)
   {
      //Set a single value with repaint.
      
      var res=this._setValueAt(indx_,newVal_);
      
      if (res!==null)
      {
         this._repaint();
         this.onChange&&this.onChange(res,indx_);
      }
      
      return res;
   }
   
   getValueAt(indx_)
   {
      //Returns certain value by index (0th by default).
      
      var res=null;
      
      indx_??=0;
      
      if ((indx_>=0)&&(indx_<this._values.length))
         res=this._values[indx_];
      
      return res;
   }
   
   posToVal(pos_)
   {
      //Convert given {x:val,y:val} position in pixels (by default) or percents position to the value in range bar scale.
      
      var unit=mUnit(pos_[this._axis]);
      var nodeSize=(this._axis=='y' ? this._node.offsetHeight : this._node.offsetWidth);
      return this.relToAbs(unit=='%' ? parseFloat(pos_[this._axis]) : parseInt(pos_[this._axis])/nodeSize);
   }
   
   getNearestIndex(pos_)
   {
      //Returns index of the value nearest to the given {x:val,y:val} position in pixels (by default) or percents.
      var res=0;
      
      //Convert position to the value in the range scale
      var val=this.posToVal(pos_);
      
      //Find the closest value amongst _values[]
      var minDist=Math.abs(this._values[0]-val);
      for (var i=1;i<this._values.length;i++)
      {
         var dist=Math.abs(this._values[i]-val);
         if (dist<minDist)
         {
            minDist=dist;
            res=i;
         }
      }
      
      return res;
   }
   
   reset()
   {
      this._setValues(this._defaultVals.slice());
      this._updateInputs();
      this._repaint();
      this.onChange&&this.onChange(res,indx_);
   }
}

function initRangeBars(selector_,params_)
{
   var res=[];
   
   var nodes=document.querySelectorAll(selector_);
   for (var node of nodes)
      res.push(new RangeBar(node,params_));
      
   return res;
}

//------- Input fields List -------//
class InputFieldsList
{
   //This class allows to collect input fields (except buttons) from container_ to access them by keys and manipulate.
   //Parameters:
   // selector - CSS-selector to find input fields. Optional. NOTE: The default selector doesn't takes into account a nested containers. If you need so, write a custom selector that will do.
   // regExp - RegExp to match a key parts of input's name: a row and a key.
   // matchIndexes - Indexes of the name key parts in regExp matches. Format: {row:<index>,key:<index>}.
   // replacement - A string for replaceing of the input's name key parts.
   // NOTE: All of regExp, matchIndexes and replacement are optional, but pay attention to keep'em in sync.
   //Usage:
   //Default parameters are disigned for inputs named like 'prefix[0][col_name]' or 'prefix[0][col_name][sub_prop]' or 'prefix[][col_name]'. In this example regExp matches will be ['[0][col_name]','0','col_name'], so matchIndexes.row=1, matchIndexes.key==1 and replacement string is conform 0th match.
   // someClass
   // {
   //    constructor(node_,row_,value_)
   //    {
   //       this._inpList=new InputFieldsList(node_);       //Instantiate with default params (will collect all inputs into the node_).
   //       this._inpList.inputs['col_name'].value=value_;  //Access input by its key.
   //       this._inpList.rowIndex=row_;                    //Set row index for all inputs.
   //    }
   // }
   
   constructor(container_,params_)
   {
      //Set backreference to parent object (if needed):
      this._parent=params_?.parent??null;
      this._container=container_;
      
      //Init params:
      this._regExp=params_?.regExp??this._regExp;
      this._matchIndexes=params_?.matchIndexes??this._matchIndexes;
      this._replacement=params_?.replacement??this._replacement;
      
      //Find inputs:
      let foundInputs=container_.querySelectorAll(params_?.selector??'input:not([type=button]):not([type=submit]):not([type=image]),select,textarea'); //Find all inputs except buttons.
      for (let input of foundInputs)
      {
         let matches=this._regExp.exec(input.name);                              //Get the input's key from its name
         let key=matches?.[this._matchIndexes.key]??undefined;                   //
         if (key!==undefined)                                                    // and if key is ok,
         {
            if (input.type=='radio')
            {
               this.inputs[key]??=(params_?.decorator??decorateInputFieldVal)(new (params_?.RadioGroupClass??RadioGroup)(),params_?.valueProp);  //Create new radio group if not exists.
               this.inputs[key].add(input);                                      //Add radio input to its group. NOTE: Make sure that all radios with the same keys has exactly equal names, because the RadioGroup.add() will reject all radios with the name different from the first one added.
            }   
            else
               this.inputs[key]=(params_?.decorator??decorateInputFieldVal)(input,params_?.valueProp); // decorate the input field and store it to associative array.
         }
         else
            console.warn('InputFieldsList: input\'s name doesn\'t match regExp',input,this._regExp);
      }
   }
   
   //public props
   inputs={};
   
   get rowIndex()
   {
      //Get first input and exam its row index:
      let res=null;
      for (let key in this.inputs)
      {
         let matches=this._regExp.exec(this.inputs[key].name);
         res=matches?.[this._matchIndexes.row]??''; //If row index isn't set (input is named like "prefix[][col_name]")
         res=(res!='' ? parseInt(res) : null);      // then return null. Else don't forget to convert a numeric string to int.
         break;
      }
      
      return res;
   }
   set rowIndex(newVal_)
   {
      //Replace row index for all inputs:
      let replacement=this._replacement.replace('$'+this._matchIndexes.row,newVal_); //Insert a new value into replacement string, e.g. '[$1][$2]' --> '[8][$1]'.
      for (let key in this.inputs)
         this.inputs[key].name=this.inputs[key].name.replace(this._regExp,replacement);
   }
   
   //private props
   _parent=null;
   _container=null;
   _regExp=/^([a-z0-9_]+)\[([0-9]*)\]\[([a-z0-9_]+)\]/i;
   _matchIndexes={prefix:1,row:2,key:3};
   _replacement='$1[$2][$3]';
}

//------- Coupled Inputs -------//
class InputsCoupler
{
   //This class allows to couple inputs to make changes of master input be reflected on slave inputs.
   // The InputsCoupler instance attaches itself to its own input by means of property "coupler", whch allows couplers to interact with each other by setting/getting their properties.
   // Thus control over the inputs can be implemented in setters/getters of InputsCoupler's derived classes. However, in trivial cases when is needed just to set a value of the slave input, it can has no coupler attached.
   
   constructor(masterInp_,relations_,container_)
   {
      //Arguments:
      // masterInp_ - master (own) input, which changes controls the slave inputs.
      // relations_ - string or array of relations definitions. Format: 'slave_inp_selector?own_prop=slave_prop,...' or [{inp:'input.selector',own_prop:'prop_name',slave_prop:'prop_name'},...] or [{inp:input_itself,own_prop:'prop_name',slave_prop:'prop_name'},...].
      // container_ - DOM node, where nearby coupled inputs located. This allows to make different isolated groups of coupled inputs. Optional, by default, slave inputs are searched in entire document. Has no effect if slave inputs defined directly.
      
      if (masterInp_)
      {
         this._input=masterInp_;
         this._input.coupler=this;  //Reference for the couplers of the coupled inputs.
         this._input.addEventListener('change',(e_)=>{this.sync();});
         
         container_??=(this._input.dataset.containerSelector ? this._input.closest(this._input.dataset.containerSelector)??document : document);   //Different groups of a similar inputs (e.g. if many data rows are edited atonce) must be localized within separate containers to avoid interference.
         
         relations_??=this._input.dataset.relations;  //Get relations definitions from the argument or the input's dataset.
         if (relations_)                              //Coupler can have no relations if it is only slave.
         {
            if (typeof relations_ == 'string')        //Relations can be defined as comma-separated string or as array.
               relations_=relations_?.split(',');     //
            
            for (let rel of relations_)
            {
               //Parse relation from string (if it's defined this way):
               if (typeof rel == 'string')
               {
                  let matches=/^([^?=]+)\?([^?=]+)=([^?=]+)$/i.exec(rel);  //Format: slave_inp_selector?own_prop=slave_prop.
                  rel={
                         inp:matches[1],           //Slave input selector.
                         own_prop:matches[2],      //Name of the own property.
                         slave_prop:matches[3],    //Name of the slave input property.
                      }
               }
               //Next, get the slave input:
               if (typeof rel.inp == 'string')                 //Relation input can be defined directly or by CSS-selector.
               {
                  let selector=rel.inp;
                  rel.inp=container_.querySelector(selector);   // In las case, find this input in the container.
                  if (!rel.inp)
                     console.warn('InputsCoupler failed to get slave input .',this,container_,selector);
               }
               
               //Finally, check relation and collect it:
               if (rel.inp&&rel.own_prop&&rel.slave_prop)
                  this._relations.push(rel);
            }
         }
      }
   }
   
   //public props
   get value()
   {
      //Default getter for the inputs relation.
      return this._input.value;
   }
   set value(newVal_)
   {
      //Default setter for the inputs relation.
      this._input.value=newVal_;
      this.onValueSync?.();
   }
   //NOTE: define your own getters/setters in derived classes for all the variety of relations you need.
   
   //private props
   _input=null;
   _relations=[];
   
   //public methods
   sync()
   {
      //Updates slave inputs when master input is changed.
      
      for (let rel of this._relations)
         if (rel.inp.coupler)
            rel.inp.coupler[rel.slave_prop]=this[rel.own_prop];  //Sync slave coupler property "slave_prop" with the own property "own_prop".
         else if (rel.slave_prop=='value')
            rel.inp.value=this[rel.own_prop];  //This fallback allows to avoid creating a slave couplers for trivial rels.
         else
            console.warn('InputsCoupler failed to sync slave input: it has no coupler and is not related by value.',this,rel);
   }
}

function initCoupledInputs(containers_,couplers_)
{
   //Arguments:
   // containers_ - array of DOM nodes or string CSS-selector. Optional.
   // couplers_ - object with pairs 'input.selector':InputsCoupler.
   //Usage:
   // initCoupledInputs('.container',{'input.coupled':InputsCoupler,'select.somewhat.coupled':SomewhatSelectCoupler}); 
   // or 
   // initCoupledInputs(document.querySelectorAll('.somewat'),{'input.coupled':InputsCoupler,...});
   
   //Get containers by CSS selector:
   if (typeof containers_ == 'string')
      containers_=document.querySelectorAll(containers_);
   else if (!containers_)
      containers_[document];  //By default, search inputs within entire document.
   
   //Assign couplers to inputs:
   let initialSyncList=[];
   for (let container of containers_)  //NOTE: Container is a local space which separates groups of the similar master and slave selects.
      for (let inputsSelector in couplers_)
      {
         let inputs=container.querySelectorAll(inputsSelector);
         for (let input of inputs)
         {
            let coupler=new couplers_[inputsSelector](input,null,container);
            if (toBool(input.dataset.syncOnInit))
               initialSyncList.push(coupler);
         }
      }
   
   //When all couplers created, make initial sync:
   for (let coupler of initialSyncList)
      coupler.sync();
}

//------- Modal dialogs functions -------//
function buildNodes(struct_,collection_)
{
   //Creates a branch of the DOM-tree using a structure declaration struct_.
   //Arguments:
   // struct_ - a mixed value which defines what a node to create.
   //          1) struct_ is an object - in this case the tag Node will be created. The object properties will be transfered to the node as described below:
   //             tagName - is only required property necessary to create a node itself. It should be a valid tag name.
   //             _collectAs - string, a key to add the node into collection_.
   //             childNodes - an array of child struct_s. It allows to create a nodes hieracy.
   //             style - object, associative array of css attributes, which will be copied to the node.style.
   //             dataset - object, associative array of attributes,  which will be copied to the node.dataset.
   //             Any other attributes will be copied to the node directly.
   //          2) strict_ is a string - the TextNode will be created from its value.
   //          3) struct_ is a Node instance - such a node will be directly attached to the branch as it is. NOTE: Make sure that you will not append the same node into the different branches this way. 
   //             This feature may be useful if you need to create a branch with the some nodes provided by another class, method or something else.
   // collection_ - object, associative array for the node pointers. After creation of a DOM branch, it can be needed to access some nodes directly.
   //             To do this you need to make 2 steps: 1st - set the keys using the _collectAs property to the strict_ of the nodes you want, 2-nd - make an [empty] object-type variable and pass it as argument here. The results will be into it.
   
   var res;
   if (struct_ instanceof Array)
   {
      res=document.createDocumentFragment();
      for (let structItem of struct_)
         res.appendChild(buildNodes(structItem));
   }
   else if ((typeof struct_ == 'object')&&struct_.tagName)
   {
      //create element
      res=document.createElement(struct_.tagName);
      
      //init element
      if (res)
      {
         //Collect created node:
         if (struct_._collectAs)
         {
            if (collection_)
               collection_[struct_._collectAs]=res;
         }
         
         //Setup node:
         for (let prop in struct_)
            switch (prop)
            {
               case 'tagName':
               case '_collectAs':{break;}
               case 'style':
               case 'dataset':
               {
                  for (var st in struct_[prop])
                      res[prop][st]=struct_[prop][st];
                  break;
               }
               case 'childNodes':
               {
                  let child;
                  for (let childStruct of struct_.childNodes)
                      if (child=(childStruct instanceof Node ? childStruct : buildNodes(childStruct,collection_)))
                         res.appendChild(child);
                  break;
               }
               default: res[prop]=struct_[prop];
            }
      }
   }
   else if (typeof struct_ == 'string')
   {
      res=document.createTextNode(struct_);
   }

   //return it
   return res;
}

function popupOpen(struct_,parentNode_,collection_)
{
   //Make popup and assigns to parent_ (or to document.body by default).
   var res=null;
   
   popupsClose();   //close previously opened popups.
   
   if (struct_)
   {
      res=buildNodes(struct_,collection_);                  //Create new popup's DOM structure
      if (res)
      {
         (parentNode_??document.body)?.appendChild(res);    //If DOM structure was built successfully, attach it to parent
         res.classList.add('opened');
      }
   }
   
   return res;
}

function popupsClose()
{
   //Closes all popups (generrally - one), placed into parent_.
   let res=null;
   
   let oldPopups=document.body.querySelectorAll('.popup');
   if (oldPopups)
      for (let i=0;i<oldPopups.length;i++)
      {
         oldPopups[i].classList.remove('opened');
         if (!oldPopups[i].classList.contains('static'))
         {
            //Get fading duration:
            let maxTrDur=getTransitionDuration(oldPopups[i]);
            //Remove popup:
            if (maxTrDur>0)
               window.setTimeout(function(){document.body.removeChild(oldPopups[i]);},maxTrDur);
            else
               document.body.removeChild(oldPopups[i]);
         }
      }
   
   return res;
}

//common popups structures//
function iframePopupStruct(link_,caption_)
{
   caption_??='';
   
   var res={
              tagName:'div',
              className:'popup',
              childNodes:[
                            {
                               tagName:'div',
                               className:'window',
                               childNodes:[
                                             {
                                                tagName:'div',
                                                className:'title',
                                                childNodes:[
                                                              {tagName:'span',innerHTML:caption_},
                                                              {tagName:'div',className:'button close',onclick:function(){popupsClose()}},
                                                           ]
                                             },
                                             {
                                                tagName:'iframe',
                                                className:'container',
                                                src:link_
                                             }
                                          ]
                            }
                         ],
              onclick:function(){popupsClose()},
              onwheel:function(e_){return cancelEvent(e_);},
              onscroll:function(e_){return cancelEvent(e_);}
           };
   
   return res;
}

function imagePopupStruct(link_,caption_) //makes structure of window for displaying of enlarged image
{
   caption_??='';
   
   var res={
              tagName:'div',
              className:'popup',
              childNodes:[
                            {
                               tagName:'div',
                               className:'window',
                               childNodes:[
                                             {
                                                tagName:'div',
                                                className:'title',
                                                childNodes:[
                                                              {tagName:'span',innerHTML:caption_},
                                                              {tagName:'div',className:'button close',onclick:function(){popupsClose()}},
                                                           ]
                                             },
                                             {
                                                tagName:'div',
                                                className:'container image',
                                                childNodes:[
                                                               {
                                                                  tagName:'img',
                                                                  src:link_
                                                               }
                                                           ]
                                             }
                                          ]
                            }
                         ],
              onclick:function(){popupsClose()},
           };
   
   return res;
}

function dialogPopupStruct(link_,caption_,ok_btn_value_,ok_action_,cancel_btn_value_,cancel_action_)  //makes dialog window with "ok" and "cancel" buttons
{
   //TODO: Add the _collectAs attribute to active elements.
   var res={
              tagName:'div',
              className:'popup',
              childNodes:[
                            {
                               tagName:'div',
                               className:'window',
                               childNodes:[
                                             {
                                                tagName:'div',
                                                className:'title',
                                                childNodes:[
                                                              {tagName:'span',innerHTML:caption_},
                                                              {tagName:'div',className:'button close',onclick:function(){popupsClose()}},
                                                           ]
                                             },
                                             {
                                                tagName:'iframe',
                                                className:'container',
                                                src:link_
                                             },
                                             {
                                                tagName:'div',
                                                className:'panel',
                                                childNodes:[
                                                              {
                                                                 tagName:'input',
                                                                 type:'button',
                                                                 name:'cancel',
                                                                 value:cancel_btn_value_||'Cancel',
                                                                 className:'no',
                                                                 onclick:function(){popupsClose()}
                                                              },
                                                              {
                                                                 tagName:'input',
                                                                 type:'button',
                                                                 name:'ok',
                                                                 className:'ok',
                                                                 value:ok_btn_value_||'OK',
                                                                 onclick:ok_action_
                                                              }
                                                           ]
                                             }
                                          ]
                            }
                         ],
              onclick:function(){popupsClose()},
              popup_top_box:true //special property, which marks top box in popup DOM tree
           };
   
   return res;
}

//------- Dynamic DOM controller -------//
class DynamicListItem
{
   //Interface for classes that controls behavior of the DOM nodes into DynamicList container.
   
   constructor(parent_,params_)
   {
      //Abstract.
      //Arguments:
      // parent_ - parent instance of DynamicList, which allows to build a trees.
      // params_ - object, initialization parameters.
      
      this._parent=parent_;
      
      //Initialize list item's DOM node:
      //NOTE: params_.node may be set by DynamicList in semidynamic mode which is triggered on if the DynamicList founds a statically created item nodes.
      this._node=params_.node??buildNodes(params_.nodeStruct,this._insidesCollection); //Attach to statically created DOM node or build a new one dynamically.
   }
   
   //public properties
   get node()
   {
      //Readonly. This property is required by DynamicList to access the list item's node.
      return this._node;
   }
   
   get data()
   {
      //Abstract. This getter may has no implementation if there is no need to return the data to the parent. E.g. if the item just displays something.
      console.warn('Using of abstract getter DynamicListItem.data');
   }
   set data(data_)
   {
      //Abstract. Implementation should apply this new data_ to the instance.
      console.warn('Using of abstract setter DynamicListItem.data');
   }
   
   //private properties
   _parent=null;
   _node=null;
   _insidesCollection={}; //This property is dedicated for dynamic this._node creation. See this._setupNode() and function buildNodes() for details.
}

class DynamicFormItem extends DynamicListItem
{
   //This class implements a form-specific features.
   // Use this class with the class DynamicForm.
   
   constructor(parent_,params_)
   {
      super(parent_,params_);
      
      let inputFieldsListClass=params_.inputFieldsListClass??InputFieldsList;
      this._inpFieldsList=new inputFieldsListClass(this._node,params_?.inputFieldsListParams??null); //Get all form inputs within this item. NOTE: Pay attention that the inputsListClass may also grab input fields from the nested items.
   }
   
   //public props
   get rowIndex()
   {
      //Get data row ordinal index. See InputFieldsList.rowIndex.
      return this._inpFieldsList.rowIndex;
   }
   set rowIndex(newVal_)
   {
      //Set data row ordinal index. See InputFieldsList.rowIndex.
      this._inpFieldsList.rowIndex=newVal_;
   }
   
   //private props
   _inpFieldsList=null; //Instance of InputFieldsList.
}

class DynamicList extends DynamicListItem
{
   //Manager of the dynamic lists.
   // Its works with statically and dynamically initialized lists and trees.
   //Constructor arguments:
   // parent_ - parent instance of DynamicList, which allows to build a trees.
   // params_ - object, initialization parameters.
   //Parameters:
   // First, see DynamicListItem parameters.
   // params_.itemClass - JS Class of the list items. Has to implement the DynamicListItem. Mandatory.
   // params_.itemClassParams - object, initialization parameters for the itemClass. Optional.
   // params_.listNode - Container node for the items' nodes. Optional, may be altered with params_.listNodeSelector or this._node. See this._setupNode() at "Get the list items container node".
   // params_.listNodeSelector - CSS-selector to get the list node from this.node.
   //Semidynamic mode parameters: 
   // params_.protoClassName - the special css class that marks a dedicated item node should be used as item's node prototype. Such node will be extracted from the list node and the protoClassName will be removed from its classList. Conditionally optional. See this._setupNode() at "Semidynamic mode initialization".
   // params_.excludeBefore - number of the prefix _listNode children that aren't a list items. It may be e.g. row[s] with table header that mightn't be placed outside the node_.
   // params_.excludeAfter - number of the postfix _listNode children.
   //       NOTE: non-element nodes (like text nodes and comments) aren't counted at all. Thus meaningful text nodes mightn't be placed inside the node_, but on the other hand whitespaces will makes no harm to the list operationing.
   // params_.idProp - the default name of the item's data property which serves as unique identifier. Optional.
   
   constructor(parent_,params_)
   {
      super(parent_,params_);
      
      this._itemClass=params_.itemClass;
      this._itemClassParams=params_.itemClassParams??null;
      this._idProp=params_.idProp??'id';
      this._minLength=params_.minLength??this._minLength;
      
      //Get the list items container node:
      if (params_.listNode)                                    //Directly defined in params.
         this._listNode=params_.listNode;
      else if (this._insidesCollection['listNode'])            //Get from inner elements collection, defined at dynamic _node creation. (See DynamicFormItem._setupNode().)
         this._listNode=this._insidesCollection['listNode'];
      else if (params_.listNodeSelector)                       //Get from this._node by CSS-selector.
         this._listNode=this._node.querySelector(params_.listNodeSelector);
      else                                                     //In a trivial cases, this._node and this._listNode is the same node. (E.g. in simple standalone lists).
         this._listNode=this._node;
      
      //Init list:
      // If the list is statically created on the backend, this._listNode can contain item nodes needs to be initialized with a DynamicListItem class.
      // Also list may contain a non-item extra nodes.
      
      //Exclude elements that aren't a list items (e.g. table head row):
      var first=params_.excludeBefore??0;
      var last=this._listNode.childElementCount-1-(params_.excludeAfter??0);
      if (last<(this._listNode.childElementCount-1))
         this._appendixStart=this._listNode.children[last+1];  //A new list item nodes will be inserted before the first extra node (or to the list end).
      
      //Detect if the list is semidynamic:
      this._isSemidynamic=(first<=last);   //If this._listNode has initial (statically created) item nodes, it considered as semidynamic.
      
      //Semidynamic mode initialization:
      //NOTE: In the semidynamic mode all new list items will be created by clonning the prototype node. So do not use item classes which relies on dynamic node build and DynamicListItem._insidesCollection.
      if (this._isSemidynamic)
      {
         //Get a item's node prototype:
         let protoClassName=params_.protoClassName??'proto';
         if (this._listNode.children[first].classList.contains(protoClassName))        //Check if the first node in the list is a dedicated prototype node. NOTE: If the list [can] initially has no payload item nodes the dedicated prototype node is required (except params_.protoNodeStruct is defined).
         {                                                                             //If so, 
            this._itemNodePrototype=this._listNode.children[first];                    //
            this._listNode.removeChild(this._itemNodePrototype);                       // remove it from list
            last--;                                                                    //
            this._itemNodePrototype.classList.remove(protoClassName);                  // and prepare for clonning.
         }                                                                             //
         else                                                                          //If  not so,
            this._itemNodePrototype=this._listNode.children[first].cloneNode(true);    // clone a common list item node.
      
         //Init statically created item nodes:
         //NOTE: used _itemClass should support semidynamic initialization.
         for (var i=first;i<=last;i++)
            this._items.push(new this._itemClass(this,{...this._itemClassParams,node:this._listNode.children[i]})); //Create new DynamicListItem instance for the statically created item node.
      }
   }
   
   //private properties
    _items=[];                 //Array of the items, represented by Controller instances.
    _minLength=0;              //Minimum number of items.
    _listNode=null;            //Container node for the items' nodes.
    _appendixStart=null;       //First extra node in this._node after the actual items. All new item nodes will be inserted before it (or to the end of list if it's null).
    _isSemidynamic=false;      //If the semidynamic mode detected. Needed mostly for diagnostical purposes.
    _itemNodePrototype=null;   //Prototype node for creating a new items. Set only if this._isSemidynamic is true.
    _itemClass=null;           //JS Class of the list items. Has to implement the DynamicListItem.
    _itemClassParams=null;     //Parameters for the _itemClass constructor.
   
   //public props
   get minLength(){return this._minLength;}
   set minLength(newVal_)
   {
      this._minLength=Math.max(0,newVal_);   //NOTE: Currently min length affects only remove() method, but don't cause automatical adding o fa new items if the current length is lesser than the minimum.
   }
   
   get isSemidynamic() {return this._isSemidynamic;} //Needed mostly for diagnostical purposes.
   
   get data()
   {
      //Collect all item's data into array.
      
      let res=[];
      
      for (let item of this._items)
         res.push(item.data);
      
      return res;
   }
   set data(data_)
   {
      //Replace whole list with the new data.
      
      this.clear();
      for (let itemData of data_)
         this.add(itemData);
   }
   
   get length(){return this._items.length;}
   
   //public methods
   add(mixed_)
   {
      //Appends a new list item or item data.
      
      let newItem=null;
      
      if (mixed_ instanceof DynamicListItem)
         newItem=mixed_;
      else
      {
         //Treat mixed_ as item data:
         if (this._isSemidynamic)
         {
            let itemNode=this._itemNodePrototype.cloneNode(true);
            newItem=new this._itemClass(this,{...this._itemClassParams,node:itemNode});
         }
         else
            newItem=new this._itemClass(this,this._itemClassParams);
         
         if (mixed_!=null)
            newItem.data=mixed_;
      }
      
      //Append a new item to list and allocate its node into container:
      if (newItem)
      {
         this._items.push(newItem);
         this._listNode.insertBefore(newItem.node,this._appendixStart);  //NOTE: If there are no extra (non list item) elements in the list container, i.e. _appendixStart is null, then insertBefore() will insert a new item to the end, as needed.
      }
      
      return newItem;
   }
   
   replaceBy(itemData_,prop_)
   {
      //Update an existing item with id equal to itemData_.id or create a new one.
      
      prop_??=this._idProp;
      
      let found=false;
      for (let item of this._items)
         if (item.data[prop_]==itemData_[prop_])
         {
            item.data=itemData_;
            found=true;
            break;
         }
      if (!found)
         this.add(itemData_);
   }
   
   remove(mixed_)
   {
      //Remove a single item by index or pointer.
      //It's a basic remove method also sutable for the cases when items has no IDs.
      
      if (this._items.length>this._minLength)
      {
         let index=(mixed_ instanceof DynamicListItem ? this._itemIndex(mixed_) : mixed_)
         let removed=this._items.splice(index,1)[0];
         if (removed)
            this._listNode.removeChild(removed.node);
      }
   }
   
   removeBy(val_,prop_,single_)
   {
      //Removes an item[s] by value of its/their data property. 
      //NOTE: Allows to remove multiple items.
      
      prop_??=this._idProp;
      
      for (let i in this._items)
         if (this._items[i].data[prop_]==val_)
         {
            this.remove(i);
            if (single_)
               break;
         }
   }
   
   clear()
   {
      //Remove all items from the list.
      
      for (var item of this._items)
         this._listNode.removeChild(item.node);
      this._items=[];
   }
   
   //private methods
   _itemIndex(item_)
   {
      //Returns item index by pointer.
      
      var index=null;
      
      for (let i in this._items)
         if (this._items[i]==item_)
         {
            index=i;
            break;
         }
      
      return index;
   }
}

class DynamicForm extends DynamicList
{
   //This class designed to handle forms based on DynamicList's principle.
   // It maintains indexing of form inputs into its items in order. This required for inputs named like "prefix[row_index][col_name]", because they can't be left without explicit indexing like simple "field_name[]'.
   //NOTE: Neither frontend, nor backednd are MUST NOT rely on the data rows indexes even it's not planned to remove items. For example may be a cases when inputs can be indexed not from 0.

   add(mixed_)
   {
      super.add(mixed_);
      this._reindexItems();   //It's posible just to get row index of previous item and increment, but full reindex is more reliable because it's the same for both add() and remove() methods.
   }
   
   remove(mixed_)
   {
      super.remove(mixed_);
      this._reindexItems();
   }
   
   _reindexItems()
   {
      for (let i in this._items)
         this._items[i].rowIndex=i;
   }
}

//------- Async lists loader -------//
class AsyncList extends DynamicList
{
   //Implements an asyncronous loading of list items from server.
   //TODO: This class needs testing since it extends new class DynamicList.
   
   constructor(parent_,params_)
   {
      super(parent_,params_);
      
      //protected props
      this._btnNext=params_.btnNext||document.querySelector(params_.btnNextSelector||this._listNode.dataset.btnNextSelector);                      //Next page button.
      this._maxCapacity =parseInt(params_.maxCapacity||this._listNode.dataset.maxCapacity||(this._btnNext&&this._btnNext.dataset.maxCapacity)-1);  //Maximum list capacity. If <0 - unlimited, else the exceeding portion of the first list items will be deleted before the new one will be allocated.
      this._pageKey     =params_.pageKey||this._listNode.dataset.pageKey||(this._btnNext&&this._btnNext.dataset.pageKey)||'page';                  //What key in URL params the page number has? If key is -1, then page 
      this._pageRegExp  =RegExp('([?&])'+this._pageKey+'=([0-9]+)(&|$)');                                                                          //RegExp to match page parameter into URL.
      this._pagesTotal  =parseInt(params_.pagesTotal||this._listNode.dataset.pagesTotal||(this._btnNext&&this._btnNext.dataset.pagesTotal)||0);    //Total amount of pages available.
      this._currPage    =parseInt(params_.page||this._listNode.dataset.page||this._getCurrPageFromUrl()||Math.min(1,this._pagesTotal));            //Last page currently loaded.
      this._loadByScroll=toBool(params_.loadByScroll||this._listNode.dataset.loadByScroll||false);                                                 //Whether load next page when the list was scrolled to its end or not.
      this._urlBase     =this._getBaseUrl();                                                                                                       //URL prefab, looks like '/some/path/?page='.
      this._ansKey      =params_.ansKey||this._listNode.dataset.ansKey||(this._btnNext&&this._btnNext.dataset.ansKey);                             //The key of data in the server answer.
      
      //Init
      var sender=this;
      if (this._btnNext)
      {
         this._btnNext.addEventListener('click',function(e_){sender.loadNextPage(); return cancelEvent(e_);});
         this._btnNext.classList.toggle('disabled',this._currPage>=this._pagesTotal);
      }
      //TODO: Implement scroll handling
   }
   
   //public
   get currPage(){return this._currPage;}
   get pagesTotal(){return this._pagesTotal;}
   
   loadNextPage()
   {
      var sender=this;
      if (this._currPage<this._pagesTotal)
         reqServer(this._urlBase+(this._currPage+1),null,function(ans_){sender._onServerAns(ans_);},function(xhr_){sender._onServerFail(xhr_);},'GET');
   }
   
   //protected
   _onServerAns(ans_)   //overridable
   {
      console.log(ans_);
      var answer=(typeof this._ansKey!='undefined' ? ans_[this._ansKey] : ans_);
      if (answer&&answer.data)
      {
         //Truncate list if exceedes maximum capacity
         if (this._maxCapacity>=0)
            while (this._items.length>this._maxCapacity)
               this.remove(0);
         
         //Append new items
         for (var row of answer.data)
            this.add(row);
         
         this._currPage=answer.page;
         this._pagesTotal=answer.pages_total;
         
         //Repaint button
         this._btnNext.classList.toggle('disabled',this._currPage>=this._pagesTotal);
      }
      else
         console.error('AsyncList fails to load next page: server answer does not contains expected data'+(typeof this._ansKey!='undefined' ? ' at key "'+this._ansKey+'"' : '')+'.',ans_);
   }
   
   _onServerFail(xhr_)  //overridable
   {
      console.error('AsyncList fails to load next page.',xhr_);
   }
   
   _getCurrPageFromUrl()
   {
      var res=0;
      
      var matches=this._pageRegExp.exec(document.location.search);
      if (matches)
         res=parseInt(matches[2]);
      
      return res;
   }
   
   _getBaseUrl()
   {
      var res=document.location.pathname;
      
      var search=document.location.search.replace(this._pageRegExp,'$1');  //Replace page=XX& from URL params.
      res+=search+(search ? '&' : '?')+this._pageKey+'=';                  //Append the rest of URL params to the URL path and the "page" param without a value.
      
      return res;
   }
}

//------- Horizontal scrolling patch -------//
function windowHorizontalScrollHandler(e_)
{
   if (e_&&e_.target&&(!e_.target.tagName.match(/input|select|option|textarea/i)))
      {
         var delta={X:0,Y:0};
         var cursor_offset=cursorToAbsolute(e_);
         var cursor_bottom=getClientHeight()-e_.clientY;
         var ort=mouseWheelOrt(e_);
         
         if (cursor_bottom<30)
            delta.X=-ort*32;
         else
             delta.Y=-ort*32;
         
         window.scrollBy(delta.X,delta.Y);

         e_.preventDefault&&e_.preventDefault();
         return false;
      }
   else
       return true;
}

function elementHorizontalScrollHandler(e_)
{
   if (e_&&e_.target&&((e_.target==this)||((e_.target.parentNode==this)&&e_.target.tagName.match(/option/i))||(!e_.target.tagName.match(/input|select|option/i))))
      {
         var delta={X:0,Y:0};
         var cursor_offset=cursorToAbsolute(e_);
         var cursor_bottom=getTop(this)+this.offsetHeight-cursor_offset.Y;
         var ort=mouseWheelOrt(e_);
         
         if (cursor_bottom<30)
            delta.X=-ort*32;
         else
             delta.Y=-ort*32;
         
         e_.target.scrollLeft+=(delta.X);
         e_.target.scrollTop+=(delta.Y);
         
         e_.preventDefault&&e_.preventDefault();
         e_.stopPropagation&&e_.stopPropagation();
         return false;
      }
   else
       return true;
}

//--------------------- Events handling ---------------------//
function cancelEvent(e_)
{
   //A shorthand to completely cancel a DOM event
   
   e_.preventDefault();
   e_.stopPropagation();
   return false;
}

function mouseWheelOrt(e_)
{
   //Returns scrolling direction of mouse wheel
   //TODO: Legacy code, check the modern 'wheel' event, verify optional chaining.
   
   var ort=e_.deltaY??e_.wheelDelta??-e_.detail??0;
   return (ort!=0) ? ort/Math.abs(ort) : 0; //ort of whell delta
}

//--------------------- XHR ----------------------//
function reqServer(url_,data_,success_callback_,fail_callback_,method_,enctype_,responseType_)
{
   //Send a data to server using AJAX.
   //Arguments:
   // url_ - URI/URL where request to be send. If null, then current document location will be used (excluding the GET params).
   // data_ - data to be send. Accepted values: string (must be correctly URL-encoded), URLSearchParams instance, FormData instance, or Object/array with structured data.
   // success_callback_ - a callback function for the case if request will be successfully sent.
   // fail_callback_ - a callback function for the case if request will not be sent.
   // method_ - string, http request method.
   // enctype_ - string, type of data encoding. NOTE: if 'multipart/form-data', the data_ must be an instance of FormData.
   // responseType_ - string, variants: ''|'text' - text in a DOMString object; 'json' - JS object, parsed from JSON data; 'document' - HTML or XML document; 'blob' - Blob object with binary data; 'arraybuffer' - ArrayBuffer containing binary data.
   
   //Init parameters:
   url_=url_??'/'+document.location.pathname;
   method_=(method_??'POST').toUpperCase();
   if (method_=='GET')
      enctype_='application/x-www-form-urlencoded';
   enctype_=(enctype_??'application/x-www-form-urlencoded').toLowerCase();
   responseType_=responseType_??'json';
   success_callback_=success_callback_??function(ans_,xhr_){console.log('XHR succeded. Response:',ans_,' Full HXR:',xhr_);};
   fail_callback_=fail_callback_??function(xhr_){console.log('XHR failed:',xhr_);};
   
   //Prepare data to sending:
   let query='';
   if (enctype_=='multipart/form-data')
   {
      if (data_ instanceof FormData)   //Use standard class FormData to let the xhr to deal with multipart encoding by itself.
         query=data_;
      else
         console.warn('reqServer() supports only a FormData instances as the data_ argument when enctype_ is "multipart/form-data".');
   }
   else
   {
      //Encode as application/x-www-form-urlencoded:
      if (typeof data_ == 'string')                      //Already URL-encoded data.
         query=data_;
      else if (data_ instanceof URLSearchParams)         //URLSearchParams instance.
         query=data_.toString();
      else if (data_ instanceof FormData)                //FormData instance.
         query=(new URLSearchParams(data_)).toString();
      else                                               //Object/array with structured data.
         query=serializeUrlQuery(data_);
   }
   
   //Toss the data for the GET request:
   if (method_=='GET')
   {
      url_+='?'+query;
      query=null;
   }
   
   var xhr=new XMLHttpRequest();
   xhr.addEventListener('load',function(e_){if(xhr.readyState === 4){if (xhr.status === 200) success_callback_(xhr.response,xhr); else fail_callback_(xhr);}});
   xhr.open(method_,url_);
   xhr.setRequestHeader('X-Requested-With','JSONHttpRequest');
   if (enctype_!='multipart/form-data')
      xhr.setRequestHeader('Content-Type',enctype_);
   xhr.responseType=responseType_;
   xhr.send(query);
}

function ajaxSendForm(form_,success_callback_,fail_callback_)
{
   //Send form data to server.
   //This is a wrapper of reqServer made for more usability.
   
   let reqData=new FormData(form_);
   reqServer(form_.getAttribute('action'),reqData,success_callback_,fail_callback_,form_.method,form_.encoding);
}

//--------------------- Cookies ---------------------//
function getCookie(name_)
{
   var reg=new RegExp('(?:^|; +)'+name_+'=([^;]*)(?:;|$)','i');
   var matches=reg.exec(document.cookie);
   
   return (matches ? matches[1] : null);
}

function setCookie(name_,val_,expires_,path_)
{
   //Set/remove cookie.
   //If val_=='' or expires_ ==-1 - coookie with name name_ will be removed.
   
   path_??='/';
   
   var exp_date=new Date;
   exp_date.setDate(exp_date.getDate() + ((val_==undefined)||(val_=='') ? -1 : expires_??31));  //Unset cookie if value is undefined, null or ''.
   
   document.cookie=name_+'='+val_+(path_!='' ? '; path='+path_ : '')+'; expires='+exp_date.toUTCString();
}
//--------------------- Misc ---------------------//
function functionExists(func_)
{
   return (typeof func_=='string' ? typeof window[func_]=='function' : func_ instanceof Function);
}

function arraySearch(val_,array_,callback_)
{
   //Analog of the array_search() in PHP.
   //TODO: Obsolete. Reason: can be easily replaced by Array.find() and Array.indexOf().
   //      It's better to write a function which can find a "best match"
   
   console.warn('function arraySearch() is obsolete. Replace it with Array.find() or Array.indexOf().');
   var res=null;
   
   if (callback_ instanceof Function)
   {
      //Perform search using callback_ function
      for (var i=0;i<array_.length;i++)
         if (callback_(val_,array_[i]))
         {
            res=i;
            break;
         }
   }
   else
   {
      //Perform simple search
      for (var i=0;i<array_.length;i++)
         if (val_===array_[i])
         {
            res=i;
            break;
         }
   }
   
   return res;
}

function setElementRecursively(object_,keySequence_,value_)
{
   //[Re]places $value_ into multidimensional $array_, using a sequence of keys from the argument $key_sequence_. Makes missing dimensions.
   //Analog of the set_element_recursively() from utils.php.
   //NOTE: Unlike its php's analog, it returns the resulting array/object. Also the input argument object_ can be initially undefined.
   
   let currKey=keySequence_[0];
   
   if (currKey!==undefined)
   {
      //Prepare an object/array that will accept an element with the currKey.
      let isArrayKey=(currKey=='')||(!isNaN(currKey));
      if ((object_===undefined)||(object_===null))       //If object/array doesn't exists yet at all
         object_=(isArrayKey ? [] : {});                 // then init it depending on the type of current key.
      else if ((object_ instanceof Array)&&!isArrayKey)  //But if that what we already have is an array, whereas the current key is alphanumeric, 
      {                                                  // then we'll have to convert it to the object to avoid unattended loss of data, 
         let tmpObj={};                                  // which has a place when attempting to assign alphanumeric key to JS array.
         for (let i in object_)                          // NOTE: It may be possible to avoid of arrays at all, but we need to deal with implicit incremental keys in the requests.
            tmpObj[i]=object_[i];
         object_=tmpObj;
      }
      
      //Assign a value:
      if ((currKey=='')&&(object_ instanceof Array))  //If the currKey is implicitly incremental array key, then set it explicitly to the array's end. NOTE: this always will append a new element to the array's end, including if the indexes are inconsistent.
         currKey=object_.length;                      //WARNING: if the object_ isn't an array, then all elements with '' keys will be overwritten, but that's normal. This can happen if '' is mixed with alphanumeric keys.
      
      object_[currKey]=setElementRecursively(object_[currKey],keySequence_.slice(1),value_); //Recursively call self for: the object_[currKey] (whether it exist or not), the rest of initially passed keySequence_ and the value_ that we just transit until recursion reachs the end of keySequence_.
   }
   else
      object_=value_;   //End of recursion.
   
   return object_;
}

function getElementRecursively(object_,keySequence_)
{
   //Complementary function to the setElementRecursively().
   
   let element;
   
   let currKey=keySequence_[0];
   if (currKey!==undefined)
   {
      if (object_!==undefined)
         if (object_!==null)
            element=getElementRecursively(object_[currKey],keySequence_.slice(1));
         else
            element=undefined;   //NULL has no elements.
   }
   else
      element=object_;
      
   return element;
}

function HTMLSpecialChars(val_)
{
   //Analog of htmlspecialchars() in PHP.
   
   var map={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'};
   return val_.replace(/[&<>"]/g,function(ch_){return map[ch_];});
}

function HTMLSpecialCharsDecode(val_)
{
   //Analog of htmlspecialchars_decode() in PHP.
   
   var map={'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"'};
   return val_.replace(/&(amp|lt|gt|quot);/g,function(ch_){return map[ch_];});
}

function serializeUrlQuery(query_data_,parent_)
{
   //Serializes a structured data into URL-query.
   //NOTE: There is a standard JS class URLSearchParams(), but it catn't replace this function because it unable to work with multidimensional data.
   
   var res_arr=[];
   
   for (var key in query_data_)
   {
      full_key=(parent_!==undefined ? parent_+'['+encodeURIComponent(key)+']' : encodeURIComponent(key));
      res_arr.push(typeof query_data_[key]=='object' ? serializeUrlQuery(query_data_[key],full_key) : full_key+'='+encodeURIComponent(query_data_[key]));
   }
   
   return res_arr.join('&');
}

function toBool(val_)
{
   //Returns true if val_ may be understood as some variation of boolean true. Analog of to_bool() in /core/utils.php
   
   return (typeof val_=='boolean') ? val_ : /^(1|\+|on|ok|true|positive|y|yes|да)$/i.test(val_);   //All, what isn't True - false.
}

function isAnyBool(val_)
{
   //Detects can the val_ be considered a some kind of boolean. Analog of is_any_bool() in /core/utils.php.
   
   return (typeof val_=='boolean')||/^(1|\+|on|ok|true|y|yes|да|0|-|off|not ok|false|negative|n|no|нет)$/i.test(val_);
}

function parseCompleteFloat(val_)
{
   //Unlike standard parseFloat() this function returns NaN if number input was incomplete, i.e. a decimal point was left without any digits after.
   // Its useful for the "input" event listeners with correcting feedback: doing something like {var val=parseFloat(input.value); if(!isNaN(val)) input.value=val;} will makes the user unable to enter a decimal point.
   //TODO: Seems this func is better to appear in the scientific.js.
   
   res=NaN;
   
   if (typeof val_ =='number')
      res=val_;
   else if ((val_.charAt(val_.length-1)!='.')&&(val_.charAt(val_.length-1)!=','))
      res=parseFloat(val_);
   
   return res;
}

function mUnit(size_)
{
   //Returns measurement unit from the single linear dimension value in CSS format.
   //NOTE: Tolerant to leading and trailing spaces.
   //TODO: To avoid the ambiguation with class PhisicalQuantity from scientific.js, seems better to rename this func to cssUnit.
   
   var matches=/^\s*-?\d*\.?\d*(em|%|px|vw|vh)\s*$/i.exec(size_);
   return matches ? matches[1].toLowerCase() : '';
}

function toPixels(size_,context_)
{
   //TODO: This func may be transformed to something like PhisicalQuantity from scientific.js
   var res=null;
   
   var val=parseFloat(size_);
   var unit=mUnit(size_);
   switch (unit)
   {
      case 'em':
      {
         //Optionally requires context_.subj
         var subj=((context_!==undefined)&&context_.subj) ? context_.subj : document.body;
         
         var fontSize=parseFloat(window.getComputedStyle(subj).fontSize);
         if (!isNaN(fontSize))
            res=fontSize*val;
         
         break;
      }
      case '%':
      {
         //Requires context_.subj and context_.axis
         
         if ((context_!==undefined)&&context_.subj)
         {
            var pNode=context_.subj.parentNode;
            if (pNode)
            {
               var pStyle=window.getComputedStyle(pNode);
               var pSize=NaN;
               switch (pStyle.position)
               {
                  case 'fixed':
                  {
                     pSize=context_.axis.toLowerCase()=='y'? window.innerHeight : window.innerWidth;
                     break;
                  }
                  case 'absolute':
                  {
                     pSize=context_.axis.toLowerCase()=='y'? pNode.clientHeight : pNode.clientWidth;
                     break;
                  }
                  default:
                  {
                     pSize=context_.axis.toLowerCase()=='y'? pNode.clientHeight-parseFloat(pStyle.paddingTop)-parseFloat(pStyle.paddingBottom) : pNode.clientWidth-parseFloat(pStyle.paddingLeft)-parseFloat(pStyle.paddingRight);
                  }
               }
               if (!isNaN(pSize))
                  res=val/100*pSize;
            }
         }
         break;
      }
      case 'vw':
      {
         res=val/100*window.innerWidth;
         break;
      }
      case 'vh':
      {
         res=val/100*window.innerHeight;
         break;
      }
      default:
      {
         res=val;
      }
   }
   
   return res;
}

function getTransitionDuration(element_,durIndex_)
{
   //Returns indexed or maximum of the element_'s transition durations. It may be useful if e.g. some DOM manipulations are to be made after some css-defined fadings ends.
   
   let targetDur=0;
   
   durIndex_??=-1;
   
   let style=window.getComputedStyle(element_);
   let trDurations=style.transitionDuration?.split(',');
   if (durIndex_>=0)
      targetDur=(trDurations.length>durIndex_ ? parseFloat(trDurations[durIndex_])*(/\d+ms/.test(trDurations[durIndex_]) ? 1 : 1000) : targetDur); //Get the exact duration by ordinal number.
   else
      for (let trDur of trDurations)
         targetDur=Math.max(targetDur,parseFloat(trDur)*(/\d+ms/.test(trDur) ? 1 : 1000));  //Knowing not what duration is actually a target one, just rely on a maximum value.
   
   return targetDur;
}

function formatDate(format_,date_)
{
   //Analog for PHP's date()
   
   if (date_===undefined||!(date_ instanceof Date))
      date_=new Date();
   if (format_===undefined)
      format_='Y-m-d H:i:s';
   
   //TODO: format support is incomplete
   var res=format_;
   
   res=res.replace('Y',date_.getFullYear());
   res=res.replace('m',(date_.getMonth()+1).toString().padStart(2,'0'));
   res=res.replace('d',date_.getDate().toString().padStart(2,'0'));
   res=res.replace('H',date_.getHours().toString().padStart(2,'0'));
   res=res.replace('i',date_.getMinutes().toString().padStart(2,'0'));
   res=res.replace('s',date_.getSeconds().toString().padStart(2,'0'));
   
   return res;
}

function parsePhones(phonesStr_,glue_)
{
   //The buildNodes()-ready phone numbers parser.
   
   let res=[];
   
   glue_??=',';
   let phones=phonesStr_?.split(glue_)
   for (let phone of phones)
   {
      res.push({tagName:'a',
                href:'tel:'+phone.trim().replace(/^8/,'+7').replace(/доб(авочный)?|ext(ension|ended)?/i,',').replace(/[^0-9+,.]/,''),
                textContent:phone.trim()});
   }
   
   return res;
}

function clone(obj_)
{
   //Clone make a deep clone of the object or array.
   //NOTE: Use the spread syntax if the cloning shouldn't be deep.
   //TODO: Revision required: Rewrite using the spread syntax recursively.
   
   var res=null;
   
   if (obj_ instanceof Array)
   {
      res=[];
      for (var i=0;i<obj_.length;i++)
         res.push(clone(obj_[i]));
   }
   else if (typeof obj_=='object')
   {
      res={};
      for (var k in obj_)
         res[k]=clone(obj_[k]);
   }
   else
      res=obj_;
   
   return res;
}

function cloneOverriden(default_,actual_,strict_)
{
   //Recursively clone default_, overriding it with actual_.
   //NOTE: this function is similar to the the php's array_merge(default_,actual_) used for the associative arrays.
   //TODO: Revision required: Rewrite using the spread syntax recursively.
   
   let res=null;
   
   if (typeof actual_=='undefined')
      res=clone(default_);
   else if (default_ instanceof Array)
   {
      if ((actual_ instanceof Array)||(!strict_))
         res=clone(actual_);
      else
      {
         console.warn('cloneOverriden: incompartible types array and '+(typeof actual_),default_,actual_);
         res=clone(default_);
      }
   }
   else if (typeof default_=='object')
   {
      if (typeof actual_=='object')
      {
         res={};
         for (let k in default_)
            res[k]=cloneOverriden(default_[k],actual_[k],strict_);
      }
      else
      {
         if (!strict_)
            res=clone(actual_);
         else
         {
            console.warn('cloneOverriden: incompartible types object and '+(typeof actual_),default_,actual_);
            res=clone(default_);
         }
      }
   }
   else
      res=actual_;
   
   return res;
}

function extend(Child_,Parent_)
{
   //WARNING: this function is obsolete and deprecated.
   console.error('Function extend() is obsolete and deprecated and now removed. Replace objects that using it with classes.');
}

function include(src_,once_)
{
   //Attches JS file to the html document.
   //WARNING: deprecated. Since ECMAScript (ES6) use import('./my_script.js'); instead.
   console.warn('Function include(src_,once_) is deprecated and removed. Use import() istead.');   
}