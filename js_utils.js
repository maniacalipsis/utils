/*==================================*/
/* The Pattern Engine Version 3     */
/* Copyright: FSG a.k.a ManiaC      */
/* Contact: imroot@maniacalipsis.ru */
/* License: GNU GPL v3              */
/*----------------------------------*/
/* Main JS utils useful for both    */
/* user and admin sides             */
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

/*---------------------------------------------------*/
/* Define site-specific scrpits into different files */
/*---------------------------------------------------*/

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
function onWrappedInputFocusChange(e_)
{
   //Reflects a focusing of an input which is styled by a wrapping tag.
   // Common targets for this function are customized checkboxes, radio buttons and selects.
   
   e_.target.parentNode.classList.toggle('focused',document.activeElement==this);
}

function checkboxRepaint()
{
   //Reflects changes of the customized checkbox state. See initCheckboxes() for details.
   
   this.parentNode.classList.toggle('checked',this.checked);
   this.parentNode.classList.toggle('focused',document.activeElement==this);
}

function initCheckboxes(container_)
{
   //Initializes all customized checkboxes into the given container_ or entire document.
   //Usage: 
   // Wrap each checkbox with some tag and write some css to make it looks like a checkbox you want. The css for this tag should has rules for "checked" and "focused" classes to properly reflect the checkbox state.
   // Also the checkbox should be wrapped by a label with css-class "checkbox" to be found with this initializer.
   // Thus simpliest layout may be so: <LABEL><INPUT TYPE="checkbox"> some text</LABEL>
   //  or if the label text can be huge: <LABEL><SPAN><INPUT TYPE="checkbox"></SPAN> some long multiline text</LABEL>
   // If you need to control such checkbox by script, you may use checkbox.repaint() method, that assigned by this initializer.
   
   var checkboxes=(container_??document).querySelectorAll('label.checkbox input[type=checkbox]');
   for (var checkbox of checkboxes)
   {
      checkbox.repaint=checkboxRepaint;  //Add a function to repaint checkbox by scripts.
      checkbox.addEventListener('click',checkboxRepaint);
      checkbox.addEventListener('focus',onWrappedInputFocusChange);
      checkbox.addEventListener('blur' ,onWrappedInputFocusChange);
      
      checkbox.repaint(); //Reflect initial state.
   }
}

function radioRepaint(repaint_single_)
{
   //Reflects changes of the customized radio button[s] state. See initRadios() for details.
   
   if (repaint_single_)
      this.parentNode.classList.toggle('checked',this.checked);   //Use while batch initialization.
   else
   {
      var coupled_radios=document.querySelectorAll('input[type=radio][name=\''+this.name+'\']');   //Select all radios with the same name as they are coupled together
      for (var radio of coupled_radios)                                                            // but only the currently checked one receives a certain event.
         radio.parentNode.classList.toggle('checked',radio.checked);
   }
   
   this.parentNode.classList.toggle('focused',document.activeElement==this);
}

function initRadios(container_)
{
   //Initializes all customized radio buttons into the given container_ or entire document.
   //Usage:
   // Refer description of the initCheckboxes() as it's the same in an essence.
   // The only difference in that the radios with the same name are coupled but the automatically unchecking radios doesn't receive any event and thus they should be handled from the checked one.
   
   var radios=(container_??document).querySelectorAll('.radio>input[type=radio]');
   for (var radio of radios)
   {
      radio.repaint=radioRepaint;
      radio.addEventListener('click',radioRepaint);
      radio.addEventListener('focus',onWrappedInputFocusChange);  //Unlike a click,change and input, 
      radio.addEventListener('blur' ,onWrappedInputFocusChange);  // the focus and blur events are delivering as normal.
      
      radio.repaint(true); //Reflect initial state. (Set repaint_single_ argument ony while an initialization.)
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
            var new_val=Number(e_.target.value)+(ort*inc);
            new_val.toPrecision(3);
            
            if (max!==undefined)   //bound new value to limits
               if (new_val>max)
                  new_val=max;
            if (new_val<min)
               new_val=min;
            
            e_.target.value=new_val;         //assign new value
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
   var res=val_;
   
   if (val_==val1_)
      res=val2_;
   else
      res=val1_;
   
   return res;
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
   //TODO: replace with "toggle"
   var input__=document.forms[form_name_][input_name_];
   var reg=new RegExp('^'+val1_+'$',(case_sensitive_ ? 'i' : ''));
   if (input__.value&&reg.test(input__.value))
      input__.value=val2_;
   else
       input__.value=val1_;
}

function forceKbLayout(e_,dest_)  //convert entering characters to target layout
{
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

//------- Cookie-based sorting controls -------//
function initSortingButtons(buttons_)
{
   if (buttons_)
   {
      for  (var i=0;i<buttons_.length;i++)
      {
         var reg=new RegExp('(^|; +)'+buttons_[i].dataset.cookie+'=([^,;]+,)*'+buttons_[i].dataset.key+'-'+buttons_[i].dataset.order+'(,[^,;]+)*(;|$)','i');
         if (reg.test(document.cookie))
            buttons_[i].classList.add('sel');
         
         buttons_[i].addEventListener("click",set_sort_order);
      }
   }
}

function set_sort_order(e_)
{
   //Get cookie value
   var thisOrder=this.dataset.key+'-'+this.dataset.order;
   
   var reg=new RegExp('(?:^|; +)'+this.dataset.cookie+'=([^;]*)(?:;|$)','i');
   var matches=reg.exec(document.cookie);
   var cookie=matches ? matches[1] : '';
   
   if (cookie&&e_.ctrlKey)
   {
      //Replace/remove same sorting key in list if Ctrl key pressed
      var sorts=cookie.split(',');
      console.log(sorts);
      var replace=true;
      reg=new RegExp('^'+this.dataset.key+'-(asc|desc)?$');
      for (var i=0;i<sorts.length;i++)
         if (reg.test(sorts[i]))
         {
            replace=(sorts[i]!=thisOrder);
            sorts.splice(i,1);
            i--;
         }
      
      if (replace)
         sorts.push(thisOrder);
      
      cookie=sorts.join(',');
   }
   else
      cookie=thisOrder; //Otherwise replace whole cookie value
   
   var exp_date=new Date;
   exp_date.setDate(exp_date.getDate() + (cookie!='' ? 31 : -1));
   document.cookie=this.dataset.cookie+'='+cookie+'; expires='+exp_date.toUTCString()+';'+(this.dataset.path ? 'path='+this.dataset.path : '');
   
   window.location.reload();
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
   //       data-speed - mixed. Speed is distance which content block covers per iteration. It may be defined in px, em, vw, vh or %. The % are counted from the current area width. For other units conversion details see the function toPixels(). Negative values inverts scrolling direction.
   //       data-cycled - boolean. If true the scrolling will be infinite, if false it will stop when the content end reaches the same end of the area.
   //       data-interval - Interval of automatic scrolling iterations in seconds. Default - 0 (turned-off).
   //       data-threshold - Threshold in pixels for detection whether the content box is scrolled to the begining or to the end of the area.
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
         this.threshold=parseInt(params_?.threshold??this._root.dataset.threshold??this.threshold);
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
         let recalcSizeDelay=parseInt(params_?.recalcSizeDelay??this._root.dataset.recalcSizeDelay??0);  //Fix for the case when sizes of the images into the slider content doesn't obtains at DOMContentLoaded, that leads to incorrect calculation of the slider content width, which makes the slider not scroling.
         if (recalcSizeDelay>0)                                                                          // If this issue occures, set the param recalcSizeDelay or attribute DATA-RECALC-SIZE-DELAY to value about 1000ms.
            setTimeout(()=>{this.recalcContentSize();},recalcSizeDelay);                                 // - Calculate content size with additional delay after the DOMContentLoaded.
         else                                                                                            //
            this.recalcContentSize();                                                                    // - Calculate content size at DOMContentLoaded.
                  
         //Attach event handlers
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
   threshold=10;    //corner positions detection threshold
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
      //[Re]start the slideshow timer (only if the interval>0).
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
      //Stop the slideshow timer.
      
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
         if (-parseFloat(conStyle.marginLeft)<=this.threshold)
            this._buttons.left.classList.add('disabled');
         else
            this._buttons.left.classList.remove('disabled');
      }
      if (this._buttons.right)
      {
         if ((parseFloat(conStyle.width)+parseFloat(conStyle.marginLeft)-this._area.clientWidth)<=this.threshold)
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
      
      let callback=callback_??this.switchCmpCallback;
      this.currIndex=arraySearch(somewhat_,this._tabs,callback);
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
         button.addEventListener(params_.eventType??'click',(e_)=>{this.switchToBtn(e_.target); return cancelEvent(e_);});
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
         btnPrev.addEventListener('click',(e_)=>{this.prev(); this.resume();});
      
      for (let btnNext of this._buttons.next)
         btnNext.addEventListener('click',(e_)=>{this.next(); this.resume();});
      
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
   set _isVolatile(new_val_)
   {
      if ((!this.__isVolatile)&&new_val_)
         this.__commitedVals=this._values.slice();
      else if (this.__isVolatile&&(!new_val_))
         this.__commitedVals=null;
      
      this.__isVolatile=new_val_;
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
   
   _setValueAt(indx_,new_val_)
   {
      //Set a single value without repaint
      //NOTE: Don't mess with the public setValueAt()
      
      var res=null;
      
      new_val_=this._parseNum(new_val_);  //Convert value into the current format
      if (!(isNaN(indx_)||isNaN(new_val_)))
      {
         if (this._isVolatile)                           //While dragging a value, another values may be affected indirectly (stacked to the dragging one).
            this._values=this.__commitedVals.slice();    //Therefore they are has to be restored at each movement until the dragged value is released.
         
         if ((indx_>=0)&&(indx_<this._values.length))
         {
            //Limit new value to range bounds
            this._values[indx_]=Math.max(this._min,new_val_);
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
         console.warn('RangeBar._setValueAt: Unable to set value: '+(isNaN(indx_) ? 'index is NaN' : '')+(isNaN(new_val_) ? 'value is NaN' : '')+'');
      
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
   
   _setValues(new_vals_)
   {
      //Set all the values without repaint.
      
      if (new_vals_ instanceof Array)
         this._values=this._correctValues(new_vals_);
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
   set values(new_vals_)
   {
      this._setValues(new_vals_.slice());
      
      this._repaint();
      this._updateInputs();
      this.onChange&&this.onChange();
   }
   
   get defaults()
   {
      return this._defaultVals.slice();  //Isolate protected prop.
   }
   set defaults(new_vals_)
   {
      this._defaultVals=this._correctValues(new_vals_.slice());
   }
   
   get min(){return this._min;}
   set min(new_val_)
   {
      this._min=new_val_;
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
   set max(new_val_)
   {
      this._max=new_val_;
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
   
   setValueAt(indx_,new_val_)
   {
      //Set a single value with repaint.
      
      var res=this._setValueAt(indx_,new_val_);
      
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
      
      indx_??(indx_=0);
      
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

//------- Coupled Selects -------//
function coupleSelects(naster_,slave_,filterCallback_,reverseCallback_)
{
   //Makes an options availability in the slave_ select dependendent on which options are selected in a master_ select.
   //Arguments:
   // master_ - primary select input. When user selects a master_'s option[s], the slave_'s options are being filtered depending on this selection.
   // slave_ - select input with dependent options. It also may has backward influence on the master_'s selection, if the reverseCallback_ is defined.
   // filterCallback_(masterSelection_,slaveOption_) - a callback which is called in a cycle for the each slave_'s option and have to compare it against the array of the selected master_'s options. It result of comparison it should enable/disable or show/hide a slave_'s option.
   // reverseCallback_(slaveSelection_,masterOption_) - a callback which is simmetrical to the filterCallback_ except it's called ONLY when slave_ option receives a user input event.
   
   
   master_.addEventListener('change',function(e_){coupledSelectsFilter(master_,slave_,filterCallback_);});
   coupledSelectsFilter(master_,slave_,filterCallback_);
   
   if (reverseCallback_)
      slave_.addEventListener('input',function(e_){coupledSelectsFilter(slave_,master_,reverseCallback_);});
}

function coupledSelectsFilter(master_,slave_,callback_)
{
   //This is a helper function for the coupleSelects(). It performs a cycle over selects options.
   let sel=[];
   for (let mOpt of master_.options)
      if (mOpt.selected)
         sel.push(opt);
   
   for (let sOpt of slave_.options)
      callback_(sel,sOpt);
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
         res.appendChild(buildNodes(structItem,collection_));
   }
   else if ((typeof struct_ == 'object')&&struct_.tagName)
   {
      //create element
      res=document.createElement(struct_.tagName);
      
      //init element
      if (res)
      {
         //Collect created node:
         if (struct_._collectAs&&collection_)
            collection_[struct_._collectAs]=res;
         
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

function popupOpen(struct_)
{
   //Make popup and assigns to parent_ (or to document.body by default).
   var res=null;
   
   popupsClose();   //close previously opened popups.
   
   if (struct_)
   {
      res=buildNodes(struct_);  //create new popup's DOM structure
      if (res)
      {
         document.body.appendChild(res);   //if DOM structure was built successfully, attach it to parent
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
   caption_??(caption_='');
   
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
   caption_??(caption_='');
   
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

function parsePhones(phonesStr_,glue_)
{
   //buildNodes()-ready phone numbers parser.
   
   let res=[];
   
   glue_=glue_??',';
   let phones=phonesStr_?.split(glue_)
   for (let phone of phones)
   {
      res.push({tagName:'a',
                href:'tel:'+phone.trim().replace(/^8/,'+7').replace(/доб(авочный)?|ext(ension|ended)?/i,',').replace(/[^0-9+,.]/,''),
                textContent:phone.trim()});
   }
   
   return res;
}

//------- Dynamic DOM controller -------//
class SemiDynamicListItem
{
   //Interface for classes that controls behavior of the DOM nodes into SemiDynamicList container.
   
   constructor(node_,params_,parent_,data_)
   {
      //Abstract.
      //Arguments:
      // node_ - item DOM node that should taken under control of the descendant of this class. Mandatory.
      // params_ - any parameters that an implementation of this interface may need. Optional.
      // parent_ - parent SemiDynamicList instance. Optional. NOTE: as SemiDynamicList implements SemiDynamicListItem it allows to create a tree structure of such lists.
      // data_ - mixed, initial data. Typically an object or an array. Optional.
      
      this._node=node_;
      this._parent=parent_;
   }
   
   //public properties
   get node()
   {
      //Readonly. This property is required by SemiDynamicList to access the list item's node.
      return this._node;
   }
   
   get data()
   {
      //Abstract. This getter may has no implementation if there is no need to return the data to the parent. E.g. if the item just displays something.
   }
   set data(data_)
   {
      //Abstract. Implementation should apply this new data_ to the instance.
   }
   
   //private properties
   _node=null;
   _parent=null;
}

class SemiDynamicList extends SemiDynamicListItem
{
   //Manager of the dynamic DOM lists. It can work with lists having initial content, statically created at the server side.
   // Typical applications are: dynamic loading of the additional list items as pagination alternative, dynamic [re]loading or managing of the list items, managing of the t-graphs like a menus.
   //Constructor arguments:
   // node_ - the parentNode of the list items. (It's required to be a direct parent of the item nodes.)
   // params_ - object, initialization parameters:
   //    itemNodePrototype - HTMLElement that will serve as prototype for creating of the new list items.
   //       It may be selected from outside of this list's node or created dynamically. Also it may be a predefined pointer to the proto node in this list, but this is hacky, unnecessary and discouraged.
   //       This option is very useful if this class is used to manage a trees (e.g. menus).
   //    protoClassName - the special class to mark the special item node, that will be an items prototype. This parameter will be used if the itemNodePrototype isn't set.
   //       NOTE: The item node, having the protoClassName shouldn't expose any data because it will be removed from the list while initialization.
   //       NOTE: If there are neither itemNodePrototype nor special proto node in the list, then normal list item will be cloned in their stead. But if there will be no normal items too, then it'll be a critical error.
   //       NOTE: Special proto node must be found after the prefix nodes and before the suffix ones (see params excludeBefore and excludeAfter).
   //    excludeBefore - number of the prefix _listNode children that aren't a list items. It may be e.g. row[s] with table header that mightn't be placed outside the listNode_.
   //    excludeAfter - number of the postfix _listNode children.
   //       NOTE: non-element nodes (like text nodes and comments) aren't counted at all. Thus meaningful text nodes mightn't be placed inside the listNode_, but on the other hand whitespaces will makes no harm to the list operationing.
   //    Controller - class (not an instance) that implements SemiDynamicListItem interface.
   //       At the list initialization this class will be instantiated for the each child of the listNode_ except those which has a protoClassName or an excludingClassName in the classList.
   //       While creating of a new item, Controller instantiated for the clone of the prototype node and then method update() is called with an actual data.
   //       NOTE: As the SemiDynamicList extends SemiDynamicListItem, it may be used to build a hierarchical lists.
   //    idProp - the default name of the item data's property which serves as unique identifier. Optional.
   // parent_ - reserved for compatibility for the case if Controller inherits from SemiDynamicList.
   // data_ - array of data for the list items.
   constructor(node_,params_,parent_,data_)
   {
      try
      {
         super(node_,params_,parent_,data_);
         
         //Init params:
         this._Controller=params_.Controller;
         this._controllerParams=params_.controllerParams;
         this._idProp=params_.idProp??'id';
         
         //Get the list node:
         this._listNode=params_.listNode??(params_.listNodeSelector ? this._node.querySelector(params_.listNodeSelector) : this._node);
         
         //Exclude elements that aren't elements of the list (e.g. table head row):
         var start=params_.excludeBefore??0;
         var end=this._listNode.childElementCount-(params_.excludeAfter??0);
         if (end<this._listNode.childElementCount)
            this._appendixStart=this._listNode.children[end];
         
         //Get the node that serve as prototype for cloning of a new items:
         let protoClassName=params_.protoClassName??'proto';
         this._itemNodePrototype=params_.itemNodePrototype??this._listNode.querySelector(':scope>.'+protoClassName)??this._listNode.children[start]?.cloneNode(true);  //Get item node proto: 1)from params_, 2)directly from the list (a special proto node), 3)by cloning of the normal list item.
         if ((this._itemNodePrototype.parentNode==this._listNode)&&this._itemNodePrototype.classList.contains(protoClassName))   //If this._itemNodePrototype is a special proto node in THIS list,
         {                                                                                                                       //
            this._listNode.removeChild(this._itemNodePrototype);                                                                 // then remove it from the DOM, as there is no need to keep it there,
            end--;                                                                                                               // and shift the index of the last list item (the proto node is required to be found after the prefix nodes and before the suffix ones).
         }
         this._itemNodePrototype.classList.remove(protoClassName);   //Remove protoClassName. NOTE: If this._itemNodePrototype doesn't belong to this list, it WILL NOT be removed from the DOM and may become visible.
                                                                     //                             This case is better to be handled externally: this is not the area of responsibility of this class to know anything about potential shared usage of the item node proto if it comes from params_.itemNodePrototype.
         
         //Init statically created item nodes
         for (var i=start;i<end;i++)
            this._items.push(new this._Controller(this._listNode.children[i],this._controllerParams,this)); //Create new controller instance for the statically created node.
      
         //Update list with initial data:
         if (data_)
            this.data=data_;
      }
      catch (ex)
      {
         console.error(ex,this,node_,params_,parent_,data_);
      }
   }
   
   //public props
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
      //Update whole list with the new array of data.
      
      //First, update existing list items with entirely new data:
      var i=0;
      var end=Math.min(this._items.length,data_.length);
      while (i<end)
      {
         this._items[i].data=data_[i];
         i++;
      }
      
      //If data_ is longer than the list, then append a new items:
      while (i<data_.length)
      {
         this.add(data_[i]);
         i++;
      }
      
      //if data_ is shorter than the list, then remove extra items:
      while (this._items.length>data_.length)
         this.remove(i);
   }
   
   get length(){return this._items.length;}
   
   //private properties
   _listNode=null;           //Parent node of all the item nodes
   _itemNodePrototype=null;  //Prototype node itself.
   _appendixStart=null;      //First extra node in this._listNode after the actual items. All new item nodes will be inserted before it (or to the end of list if it's null).
   _Controller=null;         //Class of the item.
   _controllerParams=null;   //Parameters for the Controller constructor
   _items=[];                //Array of the items, represented by Controller instances.
   
   //public methods
   add(itemData_)
   {
      //Append a new list item with the itemData_.
      
      let item=null;
      
      //Create a new item node by cloning a prototype and a new item controller (symply "item") for it:
      let itemNode=this._itemNodePrototype.cloneNode(true);
      item=new this._Controller(itemNode,this._controllerParams,this,itemData_);
      
      //Append a new item to list and allocate its node into container:
      this._items.push(item);
      if (this._appendixStart)
         this._listNode.insertBefore(itemNode,this._appendixStart);  //This avail to use empty blocks after the actual items for layout alignment.
      else
         this._listNode.appendChild(itemNode);
      
      return item;
   }
   
   replaceBy(itemData_,prop_)
   {
      //Update an existing item with id equal to itemData_.id or create a new one.
      
      prop_??(prop_=this._idProp);
      
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
   
   remove(what_)
   {
      //Remove a single item by index or pointer.
      //It's a basic remove method also sutable for the cases when items has no IDs.
      
      let index=(what_ instanceof SemiDynamicListItem ? this._itemIndex(what_) : what_)
      let removed=this._items.splice(index,1)[0];
      if (removed)
         this._listNode.removeChild(removed.node);
   }
   
   removeBy(val_,prop_,single_)
   {
      //Removes an item[s] by value of its/their data property. 
      //NOTE: Allows to remove multiple items.
      
      prop_??(prop_=this._idProp);
      
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
   
   flush()
   {
      console.warn('SemiDynamicList.flush() is deprecated alias of the clear().')
      this.clear();
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

//------- Async lists loader -------//
class AsyncList extends SemiDynamicList
{
   constructor(listNode_,params_,parent_)
   {
      super(listNode_,params_,parent_);
      
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
         reqServerGet(this._urlBase+(this._currPage+1),function(ans_){sender._onServerAns(ans_);},function(xhr_){sender._onServerFail(xhr_);});
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
   //This function just groups all actions, needed to completely cancel a DOM event
   
   e_.preventDefault&&e_.preventDefault();
   e_.stopPropagation&&e_.stopPropagation();
   return false;
}

function mouseWheelOrt(e_)
{
   //Returns scrolling direction of mouse wheel
   
   var ort=0;
   if (e_.deltaY)
      ort=e_.deltaY;
   else if (e_.wheelDelta)
      ort=e_.wheelDelta;
   else if (e_.detail)
      ort=-e_.detail;
   
   return (ort!=0) ? ort/Math.abs(ort) : 0; //ort of whell delta
}

//--------------------- XHR ----------------------//
function reqServerGet(request_,success_callback_,fail_callback_)
{
   //Send request to server using GET
   //TODO: OBSOLETE, DEPRECATED.
   
   reqServer(request_,null,success_callback_,fail_callback_,'GET');
   console.log('Function reqServerGet() is obsolete and deprecated. Use reqServer instead.');
   
   //Old Code:
   //var xhr=new XMLHttpRequest();
   //xhr.addEventListener('load',function(e_){if(xhr.readyState === 4){if (xhr.status === 200)success_callback_(xhr.response); else fail_callback_(xhr);}});
   //xhr.open('GET',request_);
   //xhr.setRequestHeader('X-Requested-With','JSONHttpRequest');
   //xhr.responseType='json';
   //xhr.send();
}
function reqServerPost(url_,data_,success_callback_,fail_callback_)
{
   //Send data to server using POST
   //TODO: OBSOLETE, DEPRECATED.
   reqServer(url_,data_,success_callback_,fail_callback_);
   console.log('Function reqServerPost() is obsolete and deprecated. Use reqServer instead.');
   
   //Old Code:
   //var body=serializeUrlQuery(data_);
   //
   //var xhr=new XMLHttpRequest();
   //xhr.addEventListener('load',function(e_){if(xhr.readyState === 4){if (xhr.status === 200)success_callback_(xhr.response); else fail_callback_(xhr);}});
   //xhr.open('POST',url_);
   //xhr.setRequestHeader('X-Requested-With','JSONHttpRequest');
   //xhr.setRequestHeader('Content-Type','application/x-www-form-urlencoded');
   //xhr.responseType='json';
   //xhr.send(body);
}

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
   
   expires_??(expires_=31);
   path_??(path_='/');
   
   var exp_date=new Date;
   exp_date.setDate(exp_date.getDate() + (val_!='' ? expires_ : -1));
   
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
   
   res=NaN;
   
   if (typeof val_ =='number')
      res=val_;
   else if ((val_.charAt(val_.length-1)!='.')&&(val_.charAt(val_.length-1)!=','))
      res=parseFloat(val_);
   
   return res;
}

function mUnit(size_)
{
   //Returns measuring unit from the single linear dimension value in CSS format.
   //NOTE: Tolerant to leading and trailing spaces.
   
   var matches=/^\s*-?\d*\.?\d*(em|%|px|vw|vh)\s*$/i.exec(size_);
   return matches ? matches[1].toLowerCase() : '';
}

function toPixels(size_,context_)
{
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
   
   durIndex_=durIndex_??-1;
   
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

function clone(obj_)
{
   //Clone make a deep clone of the object or array.
   //NOTE: Use the spread syntax if the cloning shouldn't be deep.
   
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
   console.log('Function extend() is obsolete and deprecated. Replace objects that using it with classes.');
   //This function makes correct inheritance relations between Parent_ constructor function and Child_ constructor function.
   //Example of use:
   //function ParentClass(){/*properties and methods*/}     //declare parent constructor
   //func ChildClass(){/*extended properties and methods*/} //declare child constructor
   //extend(ChildClass,ParentClass);                        //make ParentClass a parent of ChildClass
   //var child=new ChildClass();                            //create ChildClass instance
   //(child instanceof ChildClass)==true;                   //-inheritance chain correctly works for multiply nesting
   //(child instanceof ParentClass)==true;                  //-nested properties are not sharing between different instances of child class
   
   Child_.prototype = new Parent_();
   Child_.constructor.prototype = Child_;
   Child_.super/*class*/ = Parent_.prototype;
}

function include(src_,once_)
{
   //Attches JS file to the html document.
   //WARNING: deprecated. Since ECMAScript (ES6) use import('./my_script.js'); instead.
   
   var isDuplicate=false;
   if (once_)
      isDuplicate=(document.querySelector('script[src="'+src_+'"]')!==null);
   
   if (!isDuplicate)
   {
      var scriptNode=document.createElement('script');
      scriptNode.src=src_;
      document.head.appendChild(scriptNode);
   }
   
   return !isDuplicate;
}