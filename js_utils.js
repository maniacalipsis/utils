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

//--------------------- JS localization ---------------------//
class LC
{
   //Localized messages storage, global static class.
   
   //public methods
   static add(newLocales_)
   {
      //Appends/replaces an array of phrases to the dictionary.
      //Usage: LC.add({'Message A':'Localized message A','Message B':'Localized message B',...});
      
      LC.locales={...LC.locales,...newLocales_};
   }
   
   static get(str_)
   {
      //Get a simple phrase.
      
      return LC.locales[str_]??str_;
   }
   
   static format(str_,...args_)
   {
      //Get a phrase with a variable arguments.
      //Usage: LC.format('Message [[0]], message [[1]]','A','B');
      
      let str=LC.locales[str_]??str_;
      return str.replaceAll(/\[\[([0-9a-z_]+)\]\]/gi,(m0_,m1_)=>{return args_[m1_]??''});
   }
   
   //private props
   static locales={};
}

//--------------------- Events handling ---------------------//
const MOUSE_LEFT  =0b001;
const MOUSE_RIGHT =0b010;
const MOUSE_MIDDLE=0b100;

function cancelEvent(e_)
{
   //A shorthand to completely cancel a DOM event
   
   e_.preventDefault();
   e_.stopPropagation();
   return false;
}

class EventDispatcher
{
   //Helper class for implementing an EventTarget interface.
   //Usage:
   // SomeClass
   // {
   //    constrictor()
   //    {
   //       this._evtDispatcher=new EventDispatcher(this);
   //    }
   //
   //    _evtDispatcher=null;
   //
   //    addEventListener(type_,listener_,options_)
   //    {
   //       this._evtDispatcher.addEventListener(type_,listener_,options_);
   //    }
   //
   //    removeEventListener(type_,listener_,options_)
   //    {
   //       this._evtDispatcher.removeEventListener(type_,listener_,options_);
   //    }
   //
   //    dispatchEvent(event_)
   //    {
   //       this._evtDispatcher.dispatchEvent(event_);
   //    }
   // }

   constructor(owner_)
   {
      this._listeners=new Map();
   }

   //private props
   _listeners=null;   //Event handlers map.

   //public methods
   addEventListener(type_,listener_,options_)
   {
      if (!this._listeners.has(type_))
         this._listeners.set(type_,[]);

      let listenersQueue=this._listeners.get(type_);
      if (listenersQueue)
      {
         this.removeEventListener(type_,listener_,options_);
         listenersQueue.push({fn:listener_,opts:{...options_}});
      }
   }

   removeEventListener(type_,listener_,options_)
   {
      let listenersQueue=this._listeners.get(type_);
      if (listenersQueue)
         for (let i in listenersQueue)
            if ((listenersQueue[i].fn==listener_)&&
                (listenersQueue[i].opts.capture==listener_.capture)&&
                (listenersQueue[i].opts.once==listener_.once)&&
                (listenersQueue[i].opts.passive==listener_.passive)&&
                (listenersQueue[i].opts.signal==listener_.signal))
            {
               listenersQueue.splice(i,1);
               break;
            }
   }

   dispatchEvent(event_)
   {
      let listenersQueue=this._listeners.get(event_.type);
      if (listenersQueue)
      {
         //Call event listeners:
         let indexesToRemove=[];
         for (let [i,listener] of listenersQueue.entries())
         {
            let handlingContinues=(listener.fn(event_)??true)||listener.opts.passive;
            if (listener.opts.once)
               indexesToRemove.push(i);
            if (!handlingContinues)
               break;
         }

         //Remove oncely-calling listeners:
         let shift=0;
         for (let i of indexesToRemove)
         {
            listenersQueue.splice(i-shift,1);
            shift--;
         }
      }

      return true;
   }
}

class EventListenersMap extends Map
{
   //Helps to manage an event listeners, which should be priodically attached and detached.
   
   constrictor()
   {
      //NOTE: This class accepts no initial entries at construction.
   }
   
   //private props
   _autoinc=0;
   
   //public methods
   set(key_,node_,type_,func_,options_)
   {
      //Appends/replaces an event listener.
      //Arguments:
      // key_ - string, allows future access to the listener. Optional, if null|undefined then listener will be mapped to the some autoincremental index.
      // node_ - Node, where to attach listener.
      // type_ - string, event type, a 1st argument of the Node.addEventListener().
      // func_ - listener function, a 2nd argument of the Node.addEventListener().
      // options_ - listener options, a 3rd argument of the Node.addEventListener().
      
      key_??=this._autoinc++;
      
      this.detach(key_);   //To prevent a listeners leak, force detach previous listener, mapped to this key.
      let descr={node:node_,type:type_,func:func_,options:options_,attached:false};
      
      return super.set(key_,descr);
   }
   
   get(key_)
   {
      //Returns a copy of the listener entry.
      
      return {...super.get(key_)};  
   }
   
   delete(key_)
   {
      //Detaches a listener and removes it from this map.
      
      this.detach(key_);
      return super.delete(key_);
   }
   
   clear()
   {
      //Detaches and removes all the listeners.
      
      this.detach();
      super.clear();
   }
   
   attach(key_)
   {
      //Attach listener[s] in this map.
      
      if (key_!=undefined)
         this._attachListener(super.get(key_));
      else
         for (let descr of super.values())
            this._attachListener(descr);
   }
   
   detach(key_)
   {
      //Detaches listener[s] in this map.
      
      if (key_!=undefined)
         this._detachListener(super.get(key_));
      else
         for (let descr of super.values())
            this._detachListener(descr);
   }
   
   isAttached(key_)
   {
      //Finds, whether a listener[s] attached.
      
      let res=undefined;
      
      if (key_!=undefined)
         res=super.get(key_)?.attached;
      else
      {
         let attachedCnt=0;
         for (let descr of this)
            attachedCnt+=descr.attached;
         res=(attachedCnt==0 ? false : (attachedCnt==this.size ? true : undefined));
      }
      
      return res;
   }
   
   [Symbol.iterator]()
   {
      //This map isn't externally iterable.
      return null;
   }
   
   values()
   {
      //This map isn't externally iterable.
      return null;
   }
   
   entries()
   {
      //This map isn't externally iterable.
      return null;
   }
   
   //private methods
   _attachListener(descr_)
   {
      if (descr_&&(!descr_.attached))
      {
         descr_.node.addEventListener(descr_.type,descr_.func,descr_.options);
         descr_.attached=true;
      }
   }
   
   _detachListener(descr_)
   {
      if (descr_?.attached)
      {
         descr_.node.removeEventListener(descr_.type,descr_.func,descr_.options);
         descr_.attached=false;
      }
   }
}

function pointToRelative(point_,node_)
{
   //Converts a point_ coordinates to the node_ basis. Its helpful when unable to use layerX and layerY of mouse event or touch.
   //Arguments:
   // point_ - Event or Touch or anything else having clientX and clientY properties.
   // node_ - The node relative which the point_ coordinates need be found.
   
   let nodeRect=node_.getBoundingClientRect();
   return {x:point_.clientX-nodeRect.x,y:point_.clientY-nodeRect.y};
}

function touchListToRelative(touches_,node_)
{
   //Batch version of the pointToRelative().
   //Arguments:
   // touches_ - Any iterable object with Touch[es] or anything else having clientX and clientY properties.
   // node_ - The node relative which the coordinates need be found.
   
   let res=[];
   
   let nodeRect=node_.getBoundingClientRect();
   for (let touch of touches_)
      res.push({x:touch.clientX-nodeRect.x,y:touch.clientY-nodeRect.y});
   
   return res;
}

function forceKbLayout(e_,dest_)
{
   //Converts characters entered to the target layout.
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

function numericInputScroll(e_)
{
   //Allows to change value of text input using a mouse wheel (for inputs, intended only for numeric values).
   //TODO: revision required. Also use e_.target.dataset.step prior to e_.target.step.
   //TODO: Think about rewriting as complex decorator.
   var ort=Math.sign(e_.deltaY);
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

function mixed_input_scroll(e_)
{
   //Allows to change numeric values of text input using mouse wheel, but not changes a NaN values.
   //TODO: revision required. Also use e_.target.dataset.step prior to e_.target.step.
   //TODO: Think about rewriting as complex decorator.
   var ort=Math.sign(e_.deltaY);
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

function numericInputRestrict(e_)
{
   //TODO: Think about rewriting as complex decorator.
   if ((!(/^([0-9.,-]|Tab|Backspace|Del|Enter|Escape|Arrow.*|Page.*|Home|End|Insert)$/i.test(e_.key)||e_.ctrlKey||e_.altKey))||((e_.key=='.'||e_.key==',')&&(/[,.]/.test(this.value))))
      return cancelEvent(e_);
}

function InitNumericInputs()
{
   var numInputs=document.querySelectorAll('input[type=number],input.number');
   for (var inp of numInputs)
      inp.addEventListener('keypress',numericInputRestrict);
}

function bindEvtInputToDeferredChange(inpField_,delay_)
{
   //Makes inputs (e.g. text, number, textarea) trigger 'change' event handler on 'input' event with some delay.
   
   inpField_.addEventListener('input' ,function(e_){this.changeTimeout??=setTimeout(()=>{this.dispatchEvent(new Event('change'));},delay_??300);});
   inpField_.addEventListener('change',function(e_){if (this.changeTimeout!==undefined) clearTimeout(this.changeTimeout); this.changeTimeout=undefined;});
}

class ShortcutsList
{
   //Class helps to detect specific input events and run associated actions.
   //Usage example:
   // class SomeClass
   // {
   //    constructor(params_)
   //    {
   //       this._shortcuts=new ShortcutsList({zoomIn :params_.zoomIn ??[{type:'wheel',val:-1},{type:'keypress',val:'='}],
   //                                          zoomOut:params_.zoomOut??[{type:'wheel',val:+1},{type:'keypress',val:'-'}]});
   //    }
   //    onInput(e_)
   //    {
   //       if (this._shortcuts.match(e_))
   //          this[this._shortcuts.action](e_,this._shortcuts.shortcut);
   //    }
   // }
   //NOTE: If class that using this ShortcutsList takes actions shortcuts from params, it have to care about restriction of methods can be called this way by itself. The easiest way to do so is to filter actions list in constructor.
   //
   //Actions list format:
   // {actionKey:[{<shortcut>},...],...}.
   //Shortcut format:
   // {
   //    type:<Event.type>,   //The Event.type property value to test.
   //    shift:<boolean>,     // \
   //    ctrl:<boolean>,      // | Keyboard modifier keys, required be pressed or released. Optional. If null/undefined, such modifier key will be ignored.
   //    alt:<boolean>,       // |
   //    meta:<boolean>       // /
   //    cmp:<Callable>,      //Custom function that will test the event against this shortcut. Optional. If not defined, one of this._shortcutCmp*() methods will be used, depending on the Enent.type value.
   // }
   
   constructor(actions_)
   {
      //Arguments:
      // actions_ - actions list. See class description above for details.
      
      this.list=actions_??this.list;
   }
   
   //public props
   list={};                               //Action shortcuts list.
   get action(){return this._action;};    //Matched action.
   get shortcut(){return this._shortcut;} //Matched shortcut. 
   get isEmpty(){for (let k in this.list) if ((this.list[k]?.length??0)>0) return false; return true;} //Helps to detect whether at least one shortcut is configured or not.
   
   //private props
   _action=null;     //Matched action.
   _shortcut=null;   //Matched shortcut. 
   _shortcutCmps={   //Map of the Event.type values and the own event comparison methods.
                    keypress  :ShortcutsList._shortcutCmpKey,
                    keydown   :ShortcutsList._shortcutCmpKey,
                    keyup     :ShortcutsList._shortcutCmpKey,
                    mouseenter:ShortcutsList._shortcutCmpMouse,
                    mouseexit :ShortcutsList._shortcutCmpMouse,
                    mousemove :ShortcutsList._shortcutCmpMouse,
                    click     :ShortcutsList._shortcutCmpMouse,
                    mousedown :ShortcutsList._shortcutCmpMouse,
                    mouseup   :ShortcutsList._shortcutCmpMouse,
                    wheel     :ShortcutsList._shortcutCmpWheel,
                    touchstart :ShortcutsList._shortcutCmpTouch,
                    touchend   :ShortcutsList._shortcutCmpTouch,
                    touchcancel:ShortcutsList._shortcutCmpTouch,
                    touchmove  :ShortcutsList._shortcutCmpTouch,
                 };
   
   //public methods
   match(e_)
   {
      //Tests the Event e_ against shortcuts in actions list.
      //Returns true if event matching any shortcut and puts matching action and shortcut into certain properties of self. Otherwise returns false and resets the action and shortcut to null.
      
      let res=false;
      
      this._action=null;
      this._shortcut=null;
      for (let action in this.list)
      {
         let shortcut=this.list[action].find((sh_)=>(sh_.cmp??this._shortcutCmps[e_.type])?.(e_,sh_));   //Test shortcuts using shortcut's custom cmp function or one of the own _shortcutCmp*() methods, mapped by _shortcutCmps.
         if (shortcut)
         {
            this._action=action;
            this._shortcut=shortcut;
            res=true;
            break;
         }
      }
      
      return res;
   }
   
   //private methods
   static _shortcutCmpKey(e_,sh_)
   {
      //Compares keyboard events against shortcut.
      return ((sh_.type ==undefined)||(e_.type==sh_.type))&&
             ((sh_.val==undefined)||(e_.key==sh_.val))&&
             ((sh_.shift==undefined)||(sh_.shift==e_.shiftKey))&&
             ((sh_.ctrl ==undefined)||(sh_.ctrl==e_.ctrlKey))&&
             ((sh_.alt  ==undefined)||(sh_.alt==e_.altKey))&&
             ((sh_.meta ==undefined)||(sh_.meta==e_.metaKey));
   }
   
   static _shortcutCmpMouse(e_,sh_)
   {
      //Compares mouse events against shortcut.
      return ((sh_.type ==undefined)||(e_.type==sh_.type))&&
             ((sh_.val==undefined)||(e_.buttons==sh_.val))&&
             ((sh_.shift==undefined)||(sh_.shift==e_.shiftKey))&&
             ((sh_.ctrl ==undefined)||(sh_.ctrl==e_.ctrlKey))&&
             ((sh_.alt  ==undefined)||(sh_.alt==e_.altKey))&&
             ((sh_.meta ==undefined)||(sh_.meta==e_.metaKey));
   }
   
   static _shortcutCmpWheel(e_,sh_)
   {
      //Compares mousewheel events against shortcut.
      return ((sh_.type ==undefined)||(e_.type==sh_.type))&&
             (((sh_.val??sh_.y)==undefined)||(Math.sign(e_.deltaY)==(sh_.val??sh.y)))&&   //val or y matches vertical scrolling.
             ((sh_.x==undefined)||(Math.sign(e_.deltaX)==sh_.x))&&                        //x matches horizontal scrolling.
             ((sh_.shift==undefined)||(sh_.shift==e_.shiftKey))&&
             ((sh_.ctrl ==undefined)||(sh_.ctrl==e_.ctrlKey))&&
             ((sh_.alt  ==undefined)||(sh_.alt==e_.altKey))&&
             ((sh_.meta ==undefined)||(sh_.meta==e_.metaKey));
   }
   
   static _shortcutCmpTouch(e_,sh_)
   {
      //Compares touch events with modifier keys.
      return ((sh_.type ==undefined)||(e_.type==sh_.type))&&
             ((sh_.shift==undefined)||(sh_.shift==e_.shiftKey))&&
             ((sh_.ctrl ==undefined)||(sh_.ctrl==e_.ctrlKey))&&
             ((sh_.alt  ==undefined)||(sh_.alt==e_.altKey))&&
             ((sh_.meta ==undefined)||(sh_.meta==e_.metaKey));
   }
}

//--------------------- Input elements extention ---------------------//
function decorateCheckbox(checkbox_)
{
   //Decorate checkbox checked and disabled setters to make checkbox repainted when it changed by code:
   {
      let descr=Object.getOwnPropertyDescriptor(checkbox_.__proto__,'checked');
      let orig_setter=descr.set;
      descr.set=function (newVal_){orig_setter.call(this,newVal_); this.closest('label')?.classList.toggle('checked',this.checked);};
      Object.defineProperty(checkbox_,'checked',descr);
      
      checkbox_.checked=checkbox_.checked; //Reflect initial state.
   }
   {
      let descr=Object.getOwnPropertyDescriptor(checkbox_.__proto__,'disabled');
      let orig_setter=descr.set;
      descr.set=function (newVal_){orig_setter.call(this,newVal_); this.closest('label')?.classList.toggle('disabled',this.disabled);};
      Object.defineProperty(checkbox_,'disabled',descr);
      
      checkbox_.disabled=checkbox_.disabled; //Reflect initial state.
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
      decorateCheckbox(checkbox);        //TODO: Find how to detect already decorated checkboxes.
}

function decorateRadio(radio_)
{
   //Decorates the radio button, making its status change reflected in its label classList.
   //NOTE: Unlike the checkbox, a single radio button isn't self-sufficient, because it not receive any event on uncheck when another radio with the same name is checked.
   //      Thus, after this decorator, the radios should be grouped into some kind of supervisor class, like the RadioGroup.
   
   //Decorate property checked:
   {
      let descr=Object.getOwnPropertyDescriptor(radio_.__proto__,'checked');
      let orig_setter=descr.set;
      descr.set=function (newVal_){orig_setter.call(this,newVal_); this.closest('label')?.classList.toggle('checked',this.checked);};
      Object.defineProperty(radio_,'checked',descr);
      
      radio_.checked=radio_.checked; //Reflect initial state.
   }
   //Decorate property checked:
   {
      let descr=Object.getOwnPropertyDescriptor(radio_.__proto__,'disabled');
      let orig_setter=descr.set;
      descr.set=function (newVal_){orig_setter.call(this,newVal_); this.closest('label')?.classList.toggle('disabled',this.disabled);};
      Object.defineProperty(radio_,'disabled',descr);
      
      radio_.disabled=radio_.disabled; //Reflect initial state.
   }
   
   //Also repaint on focus/blur:
   radio_.addEventListener('focus',function(e_){this.closest('label')?.classList.toggle('focused',document.activeElement==this);});
   radio_.addEventListener('blur' ,function(e_){this.closest('label')?.classList.toggle('focused',document.activeElement==this);});
   
   return radio_;
}

class RadioGroup extends Map
{
   //This class allows to work with the group of radios as with a single input fueld.
   //TODO: M.b. this class should consume radioRepaint() and initRadios().
   
   constructor(entries_)
   {
      super();
      this._evtDispatcher=new EventDispatcher(this);
      this._evtMap=new EventListenersMap();
      
      //NOTE: Don't forget that this.set() rejects the radios which names doesn't match the first one added.
      if (entries_)
         for (let [key,radio] of entries_)
            this.set(radio,key);
      
      this.addEventListener('change',(e_)=>{for (let radio of this.values()) radio.checked=radio.checked;});
   }
   
   //public props
   get type()
   {
      //Returns a synthetic type to make user don't mess this class with the radios themselves.
      
      return 'radiogroup';
   }
   
   get name()
   {
      //Return the radios name. (All radios in the group must have the same name.)
      
      return this.values().next().value?.name;
   }
   set name(newVal_)
   {
      //Renames all radios in the group.
      
      for (let radio of this.values())
         radio.name=newVal_;
      
      this.onRename?.();
   }
   
   get value()
   {
      //Returns a value of the currently selected radio.
      
      let res=null;
      for (let radio of this.values())
         if (radio.checked)
         {
            res=radio.value;
            break;
         }
      return res;
   }
   set value(newVal_)
   {
      //Selects a radio which has a given newVal_.
      //If there are no radios with newVal_, then all will be unselected and the value of the radiogroup will became null,
      
      for (let radio of this.values())
      {
         radio.checked=(radio.value==newVal_);
         radio.repaint?.();
      }
      
      this.onChange?.(this.value);
   }
   
   get disabled()
   {
      //Returns true if all the radios are disabled.
      
      let res=true;
      for (let radio of this.values())
         if (!radio.disabled)
         {
            res=false
            break;
         }
      return res;
   }
   set disabled(newVal_)
   {
      //Applies a disabled value to all of the radios in the group.
      
      for (let radio of this.values())
         radio.disabled=newVal_;
      
      this.on_set_disabled?.(this.disabled);
   }
   
   get required(){return this._required; /*TODO: this is a draft.*/}
   set required(newVal_){this._required=newVal_; /*TODO: this is a draft.*/}
   
   //private props
   _required=false;
   _evtDispatcher=null;
   _evtMap=null;
   
   //public methods
   add(radio_)
   {
      //Appends radio to the map, using its value as key.
      
      return this.set(radio_.value,radio_);
   }
   
   set(key_,radio_)
   {
      //Appends radio to the map with explicit key.
      //NOTE: As the radios in the group must have exactly equal names, this method rejects the radios which names doesn't match the first one added.
      
      if (((radio_ instanceof HTMLInputElement)&&(radio_.type=='radio'))&& //Type check, //TODO: test type check on <radio>
          ((this.size==0)||(radio_.name==this.name)))                      // same name check.
      {
         super.set(key_,radio_);
         this._evtMap.set(key_,radio_,'click',(e_)=>{this.dispatchEvent(new Event('change'));});
         this._evtMap.attach(key_);
      }
      
      return this;
   }
   
   remove(what_)
   {
      //Variative version of delete().
      //Arguments:
      // what_ - int|string|radio. Radio or its key to remove from map.
      
      return this.delete(what_ instanceof Object ? this.keyOf(what_) : what_);
   }
   
   delete(key_)
   {
      let res=false;
      
      if (this.has(key_))
      {
         this._evtMap.detach(key_);
         res=super.delete(key_);
      }
      
      return res;
   }
   
   keyOf(val_)
   {
      //Finds key of the given radio.
      
      let res=null;
      
      for (let [key,val] of this)
         if (val===val_)
         {
            res=key;
            break;
         }
      
      return res;
   }
   
   addEventListener(type_,listener_,options_)
   {
      this._evtDispatcher.addEventListener(type_,listener_,options_);
   }
   
   removeEventListener(type_,listener_,options_)
   {
      this._evtDispatcher.removeEventListener(type_,listener_,options_);
   }
   
   dispatchEvent(event_)
   {
      this._evtDispatcher.dispatchEvent(event_);
   }
}

function initRadios(params_)
{
   //Initializes all customized radio buttons into the given container_ or entire document.
   //Usage:
   // Refer description of the initCheckboxes() as it's the same in an essence.
   // The only difference in that the radios with the same name are coupled but the automatically unchecking radios doesn't receive any event and thus they should be handled from the checked one.
   //TODO: There is an unresolved conflict with the InputFieldsList().
   
   let groups=new Map();
   
   var radios=(params_?.container??document).querySelectorAll((params_?.containerSelector ? params_.containerSelector+' ' : '')+(params_?.selector??'.radio>input[type=radio]'));
   for (let radio of radios)
   {
      decorateRadio(radio);
      if (!groups.has(radio.name))
         groups.set(radio.name,new (params_?.radioGroupClass??RadioGroup)());
      groups.get(radio.name).add(radio);
   }
   
   return groups;
}

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
      
      var pos=pointToRelative(e_,this._node);
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
         var pos=pointToRelative(e_,this._node);
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

function decorateExistingProp(object_,propName_,getter_,setter_)
{
   //Decorates an existing property of an object.
   //Arguments:
   // object_   - property owner.
   // propName_ - name of property to be decorated. NOTE: If object_ has no the named property, function will fail.
   // getter_   - getter function. It receive value from original getter and return a decorated value. Optional.
   // setter_   - setter function, It receive assigning value and returns undecorated value for original getter. Optional.
   //Usage:
   // decorateExistingProp(document.querySelector('input[type=number]'),'value',function(origVal_){return parseFloat(origVal_);},function(newVal_){return (Math.round(newVal_*100)/100).toString();}); //This will turn value of the numeric input into a float type, rounded on assignment.
   
   let propOwner=object_;
   let descr=null;
   do
   {
      descr=Object.getOwnPropertyDescriptor(propOwner,propName_);
      propOwner=propOwner.__proto__;
   }
   while ((!descr)&&propOwner);
   
   let orig_getter=descr.get;
   let orig_setter=descr.set;
   if (getter_)
      descr.get=function (){return getter_.call(this,orig_getter.call(this));};
   if (setter_)
      descr.set=function (newVal_){orig_setter.call(this,setter_.call(this,newVal_));};
   Object.defineProperty(object_,propName_,descr);
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
         getter=function (){return ((this.value=='')||(this.value==null) ? null : ((this.step??1)==1 ? parseInt(this.value) : parseFloat(this.value)));};   //NOTE: If field value is empty, returns NULL.
         setter=function (newVal_){this.value=((newVal_==null)||(newVal_=='') ? '' : ((this.step??1)==1 ? parseInt(newVal_??0) : parseFloat(newVal_??0)));};
         inpField_.addEventListener('keypress',(e_)=>{if ((['0','1','2','3','4','5','6','7','8','9','e','-','+','.',','].indexOf(e_.key)<0)&&(!(e_.ctrlKey||e_.altKey))) {return cancelEvent(e_);}});
         break;
      }
      case 'checkbox':
      {
         getter=function (){return this.checked;};
         setter=function (newVal_){this.checked=toBool(newVal_??false);};
         break;
      }
      case 'file':
      {
         getter=function (){return this.files;};
         setter=function (newVal_){if (newVal_ instanceof FileList) this.files=newVal_;};
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
                   if (newVal_ instanceof Array)      //Main usage case: select options whoose values are represented in the array.
                      for (let opt of this.options)
                         opt.selected=(newVal_.indexOf(opt.value)>=0);  //NOTE: options' attribute "selected" may not change in browser's inspector.
                   else if (newVal_==null)            //Reset unification. NOTE: However getter will return an empty array anyway.
                      for (let opt of this.options)
                         opt.selected=false;
                   else
                   {
                      console.warn('A scalar value was assigned to the multiselect.valueAsMixed.');
                      console.trace(this,newVal_);
                   }
                };
         break;
      }
      case 'select-one':   //NOTE: There is no any difference beetween [de]selecting option of select-one field and assigning a value. (if options' attribute "selected" doesn't changes in browser's inspector, it don't anyway.)
      default:
      {
         getter=function (){return this.value;};
         setter=function (newVal_){this.value=newVal_;};
      }
   }
   
   Object.defineProperty(inpField_,propName_,{configurable:true,enumerable:true,get:getter,set:setter});
   
   return inpField_;
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

//--------------------- Input complexes ---------------------//
class InputFieldsList extends Map
{
   //This class allows to collect input fields (except buttons) from container_ to access them by keys and manipulate.
   
   constructor(container_,params_)
   {
      //Arguments:
      // parent_ - parent instance of DynamicForm. Optional.
      // params_ - object, initialization parameters.
      // Parameters:
      //    selector - CSS-selector to find input fields. Optional. NOTE: The default selector doesn't takes into account a nested containers. If you need so, write a custom selector that will do.
      //    regExp - RegExp to match a key parts of input's name: a row and a key.
      //    matchIndexes - Indexes of the name key parts in regExp matches. Format: {row:<index>,key:<index>}.
      //    replacement - A string for replaceing of the input's name key parts.
      //    namesWarning - boolean, whether to issue console warning when input field with a name that doesn't match the regExp is found. Optional, default false.
      //    NOTE: All of regExp, matchIndexes and replacement are optional, but pay attention to keep'em in sync.
      //Usage:
      //Default parameters are disigned for inputs named like 'prefix[0][col_name]' or 'prefix[0][col_name][sub_prop]' or 'prefix[][col_name]'.
      //In this example regExp matches will be ['[0][col_name]','0','col_name'], so matchIndexes.row=1, matchIndexes.key==1 and replacement string is conform 0th match.
      // someClass
      // {
      //    constructor(node_,row_,value_)
      //    {
      //       this._inpList=new InputFieldsList(node_);       //Instantiate with default params (will collect all inputs into the node_).
      //       this._inpList.inputs['col_name'].value=value_;  //Access input by its key.
      //       this._inpList.rowIndex=row_;                    //Set row index for all inputs.
      //    }
      // }
      
      super();
      
      //Set backreference to parent object (if needed):
      this._parent=params_?.parent??null;
      this._container=container_;
      
      //Init params:
      this._regExp=params_?.regExp??this._regExp;
      this._matchIndexes=params_?.matchIndexes??this._matchIndexes;
      this._replacement=params_?.replacement??this._replacement;
      
      //Find inputs:
      let foundInputs=container_.querySelectorAll(params_?.selector??'input,select,textarea');  //Find all inputs except buttons.
      for (let input of foundInputs)
      {
         let matches=this._regExp.exec(input.name);                              //Get the input's key from its name
         let key=matches?.[this._matchIndexes.key]??undefined;                   //
         if (key!==undefined)                                                    // and if key is ok,
         {
            if (input.type=='radio')
            {
               if (!this.has(key))
                  super.set(key,(params_?.decorator??decorateInputFieldVal)(new (params_?.radioGroupClass??RadioGroup)(),params_?.valueProp));  //Create new radio group if not exists.
               this.get(key).add(input);                                         //Add radio input to its group. NOTE: Make sure that all radios with the same keys has exactly equal names, because the RadioGroup.add() will reject all radios with the name different from the first one added.
            }
            else
               super.set(key,(params_?.decorator??decorateInputFieldVal)(input,params_?.valueProp)); // decorate the input field and store it to associative array.
         }
         else if (params_?.namesWarning)
         {
            console.warn('InputFieldsList: input\'s name doesn\'t match regExp');
            console.trace(input,this._regExp);
         }
      }
   }
   
   //public props
   get parent(){return this._parent;}
   
   get rowIndex()
   {
      //Get first input and exam its row index:
      let res=null;
      
      if (this._matchIndexes.row!=null)
         for (let inp of this.values())
         {
            let matches=this._regExp.exec(inp.name);
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
      for (let inp of this.values())
         inp.name=inp.name.replace(this._regExp,replacement);
   }
   
   //private props
   _parent=null;
   _container=null;
   _regExp=/^([a-z0-9_]+)\[([0-9]*)\]\[([a-z0-9_]+)\]/i;
   _matchIndexes={prefix:1,row:2,key:3};
   _replacement='$1[$2][$3]';
   
   //public methods
   set()
   {
      console.warn('InputFieldsList is currently readonly');
      console.trace();
   }
   
   clear()
   {
      console.warn('InputFieldsList is currently readonly');
      console.trace();
   }
   
   delete()
   {
      console.warn('InputFieldsList is currently readonly');
      console.trace();
   }

   
   //private methods
   _addInp_default(inp_)
   {
      //TODO
   }
   
   _addInp_radio(inp_)
   {
      //TODO
   }
}

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
      catch (err)
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

//--------------------- Dynamic DOM ---------------------//
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
         if (struct_._collectAs&&collection_)
         {
            if (struct_._collectAs instanceof Array)  //Add node deep into a structured collection.
            {
               let coll=collection_;
               for (let i=0;i<struct_._collectAs.length-1;i++)
                  coll=(coll[struct_._collectAs[i]]??={});
               coll[struct_._collectAs[struct_._collectAs.length-1]]=res;
            }
            else                                      //Add node to the top level of collection.
               collection_[struct_._collectAs]=res;
         }
         
         //Setup node:
         for (let prop in struct_)
            switch (prop)
            {
               case 'tagName':
               case '_collectAs':
               {
                   break;
               }
               case 'accept':
               case 'alt':
               case 'autocomplete':
               case 'capture':
               case 'form':
               case 'height':
               case 'href':
               case 'list':
               case 'label':              //select>option.
               case 'max':
               case 'maxlength':
               case 'min':
               case 'minlength':
               case 'name':
               case 'pattern':
               case 'placeholder':
               case 'size':
               case 'src':
               case 'step':
               case 'type':
               case 'width':
               {
                  res.setAttribute([prop],struct_[prop]);
                  break;
               }
               case 'allowfullscreen':    //iframe          \
               case 'autofocus':          //inputs          |
               case 'checked':            //checkbox,radio  |
               case 'disabled':           //                > boolean
               case 'multiple':           //                |
               case 'readonly':           //                |
               case 'required':           //                |
               case 'selected':           //select>option   /
               {
                  if (struct_[prop])
                     res.setAttribute([prop],true);
                  break;
               }
               case 'style':
               {
                  if (typeof struct_[prop] == 'string')  //The "instanceof String" operator has little use here.
                     res.setAttribute([prop],struct_[prop]);
                  else
                     for (var st in struct_[prop])
                        res[prop][st]=struct_[prop][st];
                  break;
               }
               case 'dataset':
               {
                  for (var key in struct_[prop])
                     res[prop][key]=struct_[prop][key];
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

function dialogOpen(struct_,parentNode_,collection_)
{
   //Make popup and assigns to parent_ (or to document.body by default).
   
   var res=null;
   
   if (struct_)
   {
      let collection_={};
      res=buildNodes(struct_,collection_);                  //Create new popup's DOM structure
      if (res)
      {
         collection_.btn_close.addEventListener('click',(e_)=>{res.close(); res.parentNode.removeChild(res); return cancelEvent(e_);});   //Close dialog by close button.
         collection_.title    .addEventListener('click',(e_)=>{e_.stopPropagation();});         //Prevent close when the dialog title
         collection_.container.addEventListener('click',(e_)=>{e_.stopPropagation();});         // or some content elemants is clicked.
         res.addEventListener('click',(e_)=>{res.close(); res.parentNode.removeChild(res);});   //Close dialog by click on the dialod element itself (this includes the area around).
         res.addEventListener('wheel',(e_)=>{e_.stopPropagation();});      //Prevent page scrolling
         res.addEventListener('scroll',(e_)=>{return cancelEvent(e_);});   // under the dialog shown.                         
         //NOTE: Dialog can be closed by Esc key as default browser behaviour.
         
         (parentNode_??document.body)?.appendChild(res);    //If DOM structure was built successfully, attach it to the parent.
         res.showModal();
      }
   }
   
   return res;
}

function dialogsClose()
{
   //Closes all dialogs (generrally - one).
   
   for (let dialog of document.querySelectorAll('dialog'))
   {
      dialog.close();
      dialog.parentNode.removeChild(dialog);
   }
}

//--- Common popup structures ---//
function baseDialogStruct(caption_,childNodes_,params_)
{
   var res={
              tagName:'dialog',
              className:'window '+(params_?.windowClassName??''),
              childNodes:[
                            {
                               tagName:'div',
                               className:'title',
                               childNodes:[
                                             {tagName:'span',className:'caption',innerHTML:caption_??''},
                                             {tagName:'div',className:'button close',_collectAs:'btn_close'},
                                          ],
                               _collectAs:'title',
                            },
                            {
                               tagName:'div',
                               className:'container',
                               childNodes:childNodes_,
                               _collectAs:'container',
                            }
                         ],
           };
   
   return res;
}

function imageDialogStruct(link_,caption_,params_) //makes structure of window for displaying of enlarged image
{
   var res={
              tagName:'dialog',
              className:'window'+(params_?.windowClassName??''),
              childNodes:[
                            {
                               tagName:'div',
                               className:'title',
                               childNodes:[
                                             {tagName:'span',className:'caption',innerHTML:caption_??''},
                                             {tagName:'div',className:'button close',onclick:function(){popupsClose()}},
                                          ]
                            },
                            {
                               tagName:'div',
                               className:'container image',
                               childNodes:[
                                              {
                                                 tagName:'img',
                                                 src:link_,
                                                 _collectAs:'image',
                                              }
                                          ],
                               _collectAs:'container',
                            }
                         ],
           };
   
   return res;
}

//--------------------- Dynamic loading ---------------------//
class DynamicListItem
{
   //Interface for classes that controls behavior of the DOM nodes into DynamicList container.
   
   constructor(parent_,params_)
   {
      //Abstract.
      //Arguments:
      // parent_ - parent instance of DynamicList, which allows to build a trees.
      // params_ - object, initialization parameters.
      // Parameters:
      //    node - Node, Main DOM node of the item. Optional, see params_.nodeStruct as alternative.
      //    nodeStruct - object, a declarative structure of the item node, used to create it dynamically. See function buildNodes() for details. Optional, used if params_.node isn't set.
      
      this._parent=parent_;
      
      //Initialize list item's DOM node:
      //NOTE: params_.node may be set by DynamicList in semidynamic mode which is triggered on if the DynamicList founds a statically created item nodes.
      this._node=params_.node??buildNodes(params_.nodeStruct,this._insidesCollection); //Attach to statically created DOM node or build a new one dynamically.
   }
   
   //public properties
   get parent(){return this._parent;}
   set parent(newVal_){console.warn('Attempt to assign value to DynamicListItem.parent that is readonly in default implementation.'); console.trace();}
   
   get node()
   {
      //Readonly. This property is required by DynamicList to access the list item's node.
      return this._node;
   }
   
   get data()
   {
      //Abstract. This getter may has no implementation if there is no need to return the data to the parent. E.g. if the item just displays something.
      console.warn('Using of abstract getter DynamicListItem.data');
      console.trace();
   }
   set data(data_)
   {
      //Abstract. Implementation should apply this new data_ to the instance.
      console.warn('Using of abstract setter DynamicListItem.data');
      console.trace();
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
      //Arguments:
      // parent_ - parent instance of DynamicForm. Optional.
      // params_ - object, initialization parameters.
      // Parameters:
      //    node, nodeStruct - inherited from DynamicListItem.
      //    inputFieldsListClass - Input fields controller class, descending from or compatible with InputFieldsList. Optional, default is InputFieldsList.
      //    inputFieldsListParams - See class InputFieldsList.constructor().
      
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
   
   get data()
   {
      let res={};
      for (let [key,inp] of this._inpFieldsList)
         res[key]=inp.valueAsMixed;
      return res;
   }
   set data(data_)
   {
      for (let [key,inp] of this._inpFieldsList)
         inp.valueAsMixed=data_[key]??inp.valueAsMixed;
   }
   
   //private props
   _inpFieldsList=null; //Instance of InputFieldsList.
}

class DynamicList extends DynamicListItem
{
   //Manager of the dynamic lists.
   // Its works with statically and dynamically initialized lists and trees.
   
   constructor(parent_,params_)
   {
      //Arguments:
      // parent_ - parent instance of DynamicList, which allows to build a trees.
      // params_ - object, initialization parameters.
      // Parameters:
      //    node, nodeStruct - inherited from DynamicListItem.
      //    itemClass - JS Class of the list items. Has to implement the DynamicListItem. Mandatory.
      //    itemClassParams - object, initialization parameters for the itemClass. Optional.
      //    listNode - Container node for the items' nodes. Optional, may be altered with params_.listNodeSelector or this._node. See this._setupNode() at "Get the list items container node".
      //    listNodeSelector - CSS-selector to get the list node from this.node.
      //    minLength - a minimal (undeletable) amount of items in the list. Note that DynamicList.constrictor() doesn't initially pads the list to the minLength. If such functionality is desired, implement it in descendants.
      // Semidynamic mode parameters: 
      //    protoClassName - the special css class that marks a dedicated item node should be used as item's node prototype. Such node will be extracted from the list node and the protoClassName will be removed from its classList. Conditionally optional. See this._setupNode() at "Semidynamic mode initialization".
      //    excludeBefore - number of the prefix _listNode children that aren't a list items. It may be e.g. row[s] with table header that mightn't be placed outside the node_.
      //    excludeAfter - number of the postfix _listNode children.
      //       NOTE: non-element nodes (like text nodes and comments) aren't counted at all. Thus meaningful text nodes mightn't be placed inside the node_, but on the other hand whitespaces will makes no harm to the list operationing.
      //    idProp - the default name of the item's data property which serves as unique identifier. Optional.
      
      super(parent_,params_);
      
      this._itemClass=params_.itemClass;
      this._itemClassParams=params_.itemClassParams??null;
      this._idProp=params_.idProp??this._idProp;
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
      
      //Exclude elements that aren't a list items (e.g. table head and foot rows):
      var first=params_.excludeBefore??0;
      var last=this._listNode.childElementCount-1-(params_.excludeAfter??0);
      if (last<(this._listNode.childElementCount-1))
         this._firstAppendixNode=this._listNode.children[last+1]; //A new list item nodes will be inserted before the first extra node (or to the list end).
      
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
      
         //Init statically created list node children:
         for (var i=first;i<=last;i++)
            this._items.push(this._createItem(this._listNode.children[i]));   //Create new DynamicListItem instance for the statically created list node child.
      }
   }
   
   //private properties
   _items=[];                 //Array of the items, represented by Controller instances.
   _minLength=0;              //Minimum number of items.
   _listNode=null;            //Container node for the items' nodes.
   _firstAppendixNode=null;       //First extra node in this._node after the actual items. All new item nodes will be inserted before it (or to the end of list if it's null).
   _isSemidynamic=false;      //If the semidynamic mode detected. Needed mostly for diagnostical purposes.
   _itemNodePrototype=null;   //Prototype node for creating a new items. Set only if this._isSemidynamic is true.
   _itemClass=null;           //JS Class of the list items. Has to implement the DynamicListItem.
   _itemClassParams=null;     //Parameters for the _itemClass constructor.
   _idProp='id';              //Name of the item's data property, which can be used to identify the item.
   
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
      
      let newItem=this._createItem(mixed_);
      if (newItem)
      {
         this._items.push(newItem);
         this._listNode.insertBefore(newItem.node,this._firstAppendixNode);  //NOTE: If there are no extra (non list item) elements in the list container, i.e. _firstAppendixNode is null, then insertBefore() will insert a new item to the end, as needed.
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
         let index=(mixed_ instanceof DynamicListItem ? this.indexOf(mixed_) : mixed_)
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
   
   splice(start_,deleteCount_,...mixeds_)
   {
      //Replaces portion of items.
      //Arguments:
      // start_ - start index
      // deleteCount_ - number of items to delete.
      // ...mixeds_ - data rows or instances of DynamicListItem to insert.
      
      //Create new items from mixed sources:
      let items=[];
      let newItem;
      for (let mixed of mixeds_)
         if (newItem=this._createItem(mixed))
            items.push(newItem);
      //Replace old items with a new ones:
      let removedItems=this._items.splice(start_,deleteCount_,...items);
      //Remove old item nodes from the DOM:
      for (let item of removedItems)
         this._listNode.removeChild(item.node);
      // and insert new ones' nodes:
      let insBeforeItem=this._listNode.childNodes[start_]??this._firstAppendixNode;
      for (newItem of items)
         this._listNode.insertBefore(newItem.node,insBeforeItem);
      
      return removedItems;
   }
   
   clear()
   {
      //Remove all items from the list.
      
      for (var item of this._items)
         this._listNode.removeChild(item.node);
      this._items=[];
   }
   
   indexOf(item_)
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
   
   //private methods
   _createItem(mixed_)
   {
      //Unifies creation of a list item from the argument of the union type.
      
      let res=null;
      
      if (mixed_ instanceof DynamicListItem)       //Use an item that was created outside of this list.
         res=this._prepareForeignItem(mixed_);
      else if (mixed_ instanceof Element)          //Create an item from the Element (typically, a child of this._listNode).
         res=new this._itemClass(this,{...this._itemClassParams,node:mixed_});
      else if (mixed_!=null)                       //Create an item, treating mixed_ as data.
      {
         if (this._itemNodePrototype)
            res=new this._itemClass(this,{...this._itemClassParams,node:this._itemNodePrototype.cloneNode(true)});
         else
            res=new this._itemClass(this,this._itemClassParams);
         
         res.data=mixed_;
      }
      
      return res;
   }
   
   _prepareForeignItem(item_)
   {
      //Prepares an item that was created outside to be added to this list.
      //NOTE: 
      
      item_.parent=this;
      
      return item_;
   }
}

class DynamicForm extends DynamicList
{
   //This class designed to handle forms based on DynamicList's principle.
   // It maintains indexing of form inputs into its items in order. This required for inputs named like "prefix[row_index][col_name]", because they can't be left without explicit indexing like simple "field_name[]'.
   //NOTE: Neither frontend, nor backednd are MUST NOT rely on the data rows indexes even it's not planned to remove items. For example may be a cases when inputs can be indexed not from 0.
   //Constructor arguments:
   // parent_ - parent instance of DynamicList, which allows to build trees. NOTE: Currently nesting of DynamicForm[s] isn't supported.
   // params_ - object, all the same arguments as DynamicList.
   
   add(mixed_)
   {
      let newItem=super.add(mixed_);
      this._reindexItems();   //It's posible just to get row index of previous item and increment, but full reindex is more reliable because it's the same for both add() and remove() methods.
      return newItem;
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

class AsyncList extends DynamicList
{
   //Implements an asyncronous loading of list items from server.
   //Events:
   // 'anserror' - checkAns() catches an error. CustomEvent.detail={list:<this list>,ans:<server answer>,err:<error>}.
   // 'load' - starts to load portion of data, which can be either new or previously unloaded page. CustomEvent.detail={list:<this list>,isNew:<true, if new page requested|false, if reload unloaded>}.
   // 'loaded' - fires after the 'load', when portion of data is loaded and items are added to the list. CustomEvent.detail={list:<this list>,rowsLoaded:<number of rows/items actually loaded>,isNew:<true, if new page requested|false, if reload unloaded>}.
   // 'reload' - starts to load first portion of data after the list has been cleared. CustomEvent.detail={list:<this list>}.
   // 'reloaded' - fires after the 'load', when the first portion of data was loaded and items added to the list. CustomEvent.detail={list:<this list>,rowsLoaded:<number of rows/items actually loaded>}.
   // 'loadedlast' - like the 'loaded', but fires once the pagesTotal was reached or was detected that there is no more data to load. CustomEvent.detail={list:<this list>,rowsLoaded:<number of rows/items actually loaded>}.

   constructor(parent_,params_)
   {
      super(parent_,params_);

      this._url        =params_?.url        ??this._url;
      this._rowsPerPage=params_?.rowsPerPage??this._rowsPerPage;
      this._reqOptions =params_?.reqOptions ??this._reqOptions;
      this._maxPages   =params_?.maxPages   ??this._maxPages;

      this._evtDispatcher=new EventDispatcher(this);
   }

   //public props
   get rowsPerPage    (){return this._rowsPerPage;}
   get firstPage      (){return this._firstPage;}
   get lastPage       (){return this._lastPage;}
   get highestPageNum (){return this._highestPageNum;}
   get pagesTotal     (){return this._pagesTotal;}
   get length         (){return this._items.length;}

   //private props
   _url=window.location.pathname;   //URL of the page to send request.
   _rowsPerPage=25;                 //Number of rows per page. NOTE: This value is required if this._maxPages is defined.
   _reqOptions=['GET'];             //The remaining three arguments of the function reqServer(url_,data_,method_,enctype_,responseType_).
   _maxPages=null;                  //Limit of the pages kept in list simultaneously. If NULL, there is no limit.
   _firstPage=0;                    //The page number of the start of currently loaded fragment.
   _lastPage=0;                     //The page number of the end of currently loaded fragment.
   _highestPageNum=0;               //Highest number of the page ever loaded since last clear().
   _pagesTotal=null;                //Total number of the pages available. Retrieved from server answer or autodeteted.
   _loadLocked=false;               //Prevents loading avalanche on frequently fired events.
   _evtDispatcher=null;             //EventDispatcher instance.

   //public methods
   loadPageNext()
   {
      //Loads data for the next page and appends items to the end of the list.

      if ((!this._loadLocked)&&((this._pagesTotal===null)||(this._lastPage<this._pagesTotal)))
      {
         this._loadLocked=true;
         reqServer(this._url,this.makeReqData(this._lastPage+1),...this._reqOptions).then((ans_)=>{if (this.checkAns(ans_)) this.appendFromAns(ans_); this._loadLocked=false;},(xhr_)=>{console.error(xhr_); this._loadLocked=false;});

         this.dispatchEvent(new CustomEvent('load',{detail:{list:this,isNew:this._lastPage==this._highestPageNum}}));
         if (this._highestPageNum==0)
            this.dispatchEvent(new CustomEvent('reload',{detail:{list:this}}));
      }
   }

   loadPageBack()
   {
      //Loads data for the page previously unloaded and appends items to the beginning of the list.

      if ((!this._loadLocked)&&(this._firstPage>1))
      {
         this._loadLocked=true;
         reqServer(this._url,this.makeReqData(this._firstPage-1),...this._reqOptions).then((ans_)=>{if (this.checkAns(ans_)) this.prependFromAns(ans_); this._loadLocked=false;},(xhr_)=>{console.error(xhr_); this._loadLocked=false;});

         this.dispatchEvent(new CustomEvent('load',{detail:{list:this,isNew:false}}));
      }
   }

   appendFromAns(ans_)
   {
      //Appends data page to the end.

      //Calc the loaded pages range:
      let prevLastPage=this._lastPage;
      let prevHighestPageNum=this._highestPageNum;
      this._lastPage=ans_.page??(this._lastPage+(ans_.data.length>0));  //If the ans contains no current page number, then compute it.
      if ((this._lastPage>0)&&(this._firstPage==0))
         this._firstPage=1;
      this._pagesTotal=ans_.pages_total??(this._lastPage==prevLastPage ? this._lastPage : null);   //If the ans contains no total number of pages, then compute it.
      this._highestPageNum=Math.max(this._highestPageNum,this._lastPage);

      //Unload pages from the start, if max number of pages exceeded:
      let pagesExceeded;
      if ((this._maxPages>0)&&((pagesExceeded=this._lastPage+1-this._firstPage-this._maxPages)>0))
      {
         this.splice(0,pagesExceeded*this._rowsPerPage);
         this._firstPage+=pagesExceeded;  //Shift the first page index on number of unloaded pages.
      }

      //Append curently loaded page:
      this.splice(this._items.length,0,...ans_.data);

      this.dispatchEvent(new CustomEvent('loaded',{detail:{list:this,rowsLoaded:ans_.data.length,isNew:(prevHighestPageNum<this._highestPageNum)}}));
      if ((prevHighestPageNum==0)&&(this._highestPageNum>=0))
         this.dispatchEvent(new CustomEvent('reloaded',{detail:{list:this,rowsLoaded:ans_.data.length}}));
      if ((this._pagesTotal!==null)&&(prevHighestPageNum<this._pagesTotal)&&(this._lastPage==this._pagesTotal))   //1st cond: _pagesTotal is defined; 2nd cond: the last page wasn't loaded before; 3rd cond: the last page is currently loaded.
         this.dispatchEvent(new CustomEvent('loadedlast',{detail:{list:this,rowsLoaded:ans_.data.length}}));
   }

   prependFromAns(ans_)
   {
      //Prepends previously unloaded data page to the beginning.

      //Calc the loaded pages range:
      this._firstPage=ans_.page??Math.max(1,this._firstPage-(ans_.data.length>0));  //If the ans contains no current page number, then compute it.

      //Unload pages from the start, if max number of pages exceeded:
      let pagesExceeded;
      if ((this._maxPages>0)&&((pagesExceeded=this._lastPage+1-this._firstPage-this._maxPages)>0))
      {
         this.splice(this._items.length-1-pagesExceeded*this._rowsPerPage,pagesExceeded*this._rowsPerPage);
         this._lastPage-=pagesExceeded;  //Unshift the last page index on number of unloaded pages.
      }

      //Append curently loaded page:
      this.splice(0,0,...ans_.data);
      console.log(this._firstPage,this._lastPage,this._lastPage+1-this._firstPage);

      this.dispatchEvent(new CustomEvent('loaded',{detail:{list:this,rowsLoaded:ans_.data.length,isNew:false}}));
   }

   makeReqData(page_)
   {
      //Overridable abstraction for making request data.

      return {rows_per_page:this._rowsPerPage,page:page_};
   }

   checkAns(ans_)
   {
      //Check if server answer is correct.
      let res=false;
      try
      {
         if (ans_.status!='ok')
            throw new Error(LC.get('Request failed'));
         if (!ans_.data)
            throw new Error(LC.get('Answer has no data.'));
         if (!(ans_.data instanceof Array))
            throw new Error(LC.get('Answer has incorrect format.'));

         res=true;
      }
      catch (err)
      {
         console.warn(err.message);
         console.trace(ans_);
         this.dispatchEvent(new CustomEvent('anserror',{detail:{ans:ans_,err:err}}));
      }
      return res;
   }

   clear()
   {
      //Clears list.

      super.clear();

      //Reset state:
      this._pagesTotal=null;
      this._firstPage=0;
      this._lastPage=0;
      this._highestPageNum=0;
   }

   addEventListener(type_,listener_,options_)
   {
      this._evtDispatcher.addEventListener(type_,listener_,options_);
   }

   removeEventListener(type_,listener_,options_)
   {
      this._evtDispatcher.removeEventListener(type_,listener_,options_);
   }

   dispatchEvent(event_)
   {
      this._evtDispatcher.dispatchEvent(event_);
   }
}

//--------------------- Interactive blocks ---------------------//
//------- Spoiler -------//
function Spoiler(node_)
{
   //TODO: Rewrite as a class.
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

      this._evtDispatcher=new EventDispatcher(this);

      //Construct:
      if (params_.tabs)                                                                                                             //At 1st, check if the tabs are given directly.
         this._tabs=Array.from(params_.tabs);
      else if (params_.container||params_.containerSelector)                                                                        //At 2nd: get container with the tabs into it.
      {
         let container=params_.container??(params_.containerSelector ? document.querySelector(params_.containerSelector) : null);   // If container isn't given directly, then try to find it by selector.
         this._tabs=Array.from(params_.tabsSelector ? container?.querySelectorAll(params_.tabsSelector) : container?.children);     // If the tabsSelector isn't set, then get all children of the container.
      }
      else
         this._tabs=Array.from(document.querySelectorAll(params_.tabsSelector));                                                    //At 3rd: try to find tabs by selector from the entire document.


      //Init:
      this.currIndex=this._tabs.findIndex((tab_)=>{return tab_.classList.contains(this._selClassName);});                           //Find the statically selected tab. (If there is not, the 1st tab will be selected, unless the out-of-range is allowed.)
   }

   //public props
   get tabs(){return [...this._tabs];}                //Returns a clonned array of the tabs. NOTE: this protects the original property from unsynced modifications, while the tabs, being the DOM nodes, themselves are naturally unprotactable from e.g. detaching/destroying.
   get length(){return this._tabs.length;}
   get currTab(){return this._tabs[this._currIndex]}  //The currently selected tab itself.

   get currIndex(){return this._currIndex;}           //Index of the currently selected tab.
   set currIndex(newVal_)
   {
      if (this._tabs.length==0)
         newVal_=null;
      else if (isNaN(newVal_))
         newVal_=(this.allowOutOfRange ? null : 0);
      else if (newVal_<0)
         newVal_=(this.allowOutOfRange ? null : 0);
      else if (newVal_>=this._tabs.length)
         newVal_=(this.allowOutOfRange ? null : this._tabs.length-1);

      if (newVal_!=this._currIndex)
      {
         let oldIndx=this._currIndex;
         this._currIndex=newVal_;
         this._tabs[oldIndx]?.classList.remove(this._selClassName);
         this._tabs[this._currIndex]?.classList.add(this._selClassName);

         this.dispatchEvent(new CustomEvent('switch',{detail:this._currIndex}));
         this.dispatchEvent(new FocusEvent('switchfromtab',{detail:oldIndx,relatedTarget:this._tabs[oldIndx]}));
         this.dispatchEvent(new FocusEvent('switchtotab'  ,{detail:this._currIndex,relatedTarget:this._tabs[this._currIndex]}));
      }
   }

   allowOutOfRange=false;  //Allows to set currIndex out of tab indexes range (which deselects all tabs). If false, the currIndex will be forced to the tab indexes range.
   switchCmpCallback=(somewhat_,tab_)=>{return tab_.classList.contains(somewhat_);};   //A default tabs matching function. See method switchTo() for details.

   //private props
   _tabs=[];               //Tab nodes array.
   _currIndex=null;        //Index of selected tab. Is null if no one tab selected.
   _selClassName='sel';    //Class will be assigned to selected switch and tab and removed from the other ones.
   _evtDispatcher=null;    //Events dispatcher.

   //public methods
   switchToTab(tab_)
   {
      //Switches to the given tab.

      this.currIndex=this._tabs.indexOf(tab_);
   }

   switchTo(somewhat_,callback_)
   {
      //Switch to the tab which matches the somewhat_ using a callback.
      //Arguments:
      // somewhat_ - a value, that one of the tabs should match.
      // callback_ - a function, that decides if a tab matches the somewhat_. Optional. If omitted the switchCmpCallback() will be used instead.

      callback_??=this.switchCmpCallback;

      this.currIndex=this._tabs.findIndex((tab_)=>callback_(somewhat_,tab_));
   }

   addEventListener(type_,listener_,options_)
   {
      this._evtDispatcher.addEventListener(type_,listener_,options_);
   }

   removeEventListener(type_,listener_,options_)
   {
      this._evtDispatcher.removeEventListener(type_,listener_,options_);
   }

   dispatchEvent(event_)
   {
      this._evtDispatcher.dispatchEvent(event_);
   }
}

class TabsSwitch extends TabsController
{
   //Controller of the switching buttons.

   constructor(params_)
   {
      super(params_);

      for (let button of this._tabs)
         button.addEventListener('click',(e_)=>{this.switchToTab(button); return cancelEvent(e_);});
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
                        tabsSelector:params_.tabsSelector??container?.dataset?.tabs??'.tab',  //2nd, take the selector from params, or container's dataset or set the default.
                        switchCmpCallback:params_.switchCmpCallback,
                        selClassName:params_.selClassName,
                     };
      let btnsParams={
                        tabs:params_.buttons,                                                         //1st, look for already selected buttons.
                        container:container,
                        tabsSelector:params_.buttonsSelector??container?.dataset?.buttons??'.tab_btn', //2nd, take the selector from params, or container's dataset or set the default.
                        selClassName:params_.selClassName,
                     };

      //Construct inherited:
      super(tabsParams);   //This class will directly control the tabs of the tabbox.

      //Set the properties from params:
      this._matchByCallback=params_.matchByCallback??this._matchByCallback;

      //Generate switching buttons for the tabs:
      if ((!params_.buttons)&&(params_.generateButtons||container?.dataset.buttonsContainer))
      {
         let btnsContainer=params_.generateButtons.container??container?.querySelector(params_.generateButtons.containerSelector??container.dataset?.buttonsContainer??'.tab_btns');   //1st, look for already selected buttons' container,
         let buttonGenerator=params_.generateButtons.callback??((tab_)=>{return buildNodes({tagName:'div',className:'tab_btn',textContent:tab_.dataset?.caption});}); //Take a user-deinned generator function or define the default one that will use tab's DATASET-CAPTION attribute.

         if (btnsContainer)
            for (let tab of this._tabsCtrl.tabs)
            {
               let btn=buttonGenerator(tab);
               if (btn instanceof Node)
               {
                  btnsContainer.appendChild(btn);
                  btnsParams.tabs.push(btn);
               }
            }
      }

      //Create controller for the static or generated tab-buttons:
      this._switch=new TabsSwitch(btnsParams);  //While the buttons will be delegated to another TabsController instance.
      this._switch.addEventListener('switchtotab',(e_)=>{if (this._matchByCallback) this.switchTo(e_.relatedTarget); else this.currIndex=e_.detail;});
   }

   //public props
   get currBtn(){return this._switch.currTab;}  //The currently selected button.

   switchCmpCallback=(class_,tab_)=>{return tab_.classList.contains(class_)};

   //private props
   _switch=null;           //The TabsSwitch instance which will control the tab butons.
   _matchByCallback=false; //By default, simply map buttons and tabs by the order.
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
      params.tabsSelector??='.slide';
      params.buttonsSelector??='.slide_btn';
      
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

//------- Scroller -------//
class Scroller
{
   //Animates a scroller.
   //Usage:
   // Typical HTML layout is:
   //    <DIV CLASS="scroller" DATA-SHORTCUTS="{left:[{type:'wheel',val:-1}],right:[{type:'wheel',val:1}],drag:[{type:'touchmove'},{type:'mousemove',val:5}]}" DATA-SPEED="100%" DATA-CYCLED="true">
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
   //       data-shortcuts - shortcuts parameters. See class ShortcutsList for details.
   //       data-speed - mixed. Speed is distance which content block covers per iteration. It may be defined in px, em, vw, vh or %. The % are counted from the current area width. For other units conversion details see the function toPixels().
   //       data-cycled - boolean. If true the scrolling will be infinite, if false it will stop when the content end reaches the same end of the area.
   //       data-interval - interval of autoscrolling iterations in msec.
   // The buttons are optional.
   
   constructor(params_)
   {
      //Get key elements:
      this._root=params_?.container??(params_?.containerSelector ? document.querySelector(params_.containerSelector) : null);
      if (this._root)
      {
         
         //Init params
         this.speed        =params_?.speed??this._root.dataset.speed??this.speed;
         this.cycled       =toBool(params_?.cycled??this._root.dataset.cycled??this.cycled);
         this._handle=params_?.handle??this._root.dataset.handle?.split(',')??this._handle;
         this.stopTreshold =parseInt(params_?.stopTreshold??this._root.dataset.stopTreshold??this.stopTreshold);
         this._interval    =parseInt(params_?.interval??this._root?.dataset?.interval??this._interval);
         
         this._mouseDragDescr.deadzone=parseInt(params_?.dragDeadzone??this._root.dataset.dragDeadzone??this._mouseDragDescr.deadzone);
         this._touchDragDescr.deadzone=parseInt(params_?.dragDeadzone??this._root.dataset.dragDeadzone??this._touchDragDescr.deadzone);
         
         //Init nodes:
         // root node
         this._root.classList.remove('inactive');   //class "inactive" may be used to alter scroller view/behavior while it isn't initialized.
         
         // scroling area,
         this._area=this._root.querySelector('.area');
         this._area.scroller=this;  //back referrence
         
         // buttons,
         var buttons=this._root.querySelectorAll('.button');
         for (var i=0;i<buttons.length;i++)
         {
            buttons[i].scroller=this;  //back referrence
            if (buttons[i].classList.contains('left'))
               this._buttons.left=buttons[i];
            else if (buttons[i].classList.contains('right'))
               this._buttons.right=buttons[i];
         }
         
         // content container that scrolls into scroling area.
         this._content=this._root.querySelector('.content');
         this.recalcContentSize();
                  
         //Attach event handlers:
         window.addEventListener('resize',(e_)=>{this.recalcContentSize();}); //For the case if content depends on window size.
         for (let img of this._content.querySelectorAll('img'))
            img.addEventListener('load',(e_)=>{this.recalcContentSize();});   //For the case of lazy/late image loading. (Some images may be loaded lately, so content size calculation right at DOMContentLoaded may give incorrect results.)
         
         if (this._buttons.left)
            this._buttons.left.addEventListener('click',function(e_){this.scroller.scroll(-1); return cancelEvent(e_);});
         if (this._buttons.right)
            this._buttons.right.addEventListener('click',function(e_){this.scroller.scroll(+1); return cancelEvent(e_);});
         
         this._shortcuts=new ShortcutsList({scrollLeft :this._root.dataset.shortcuts?.left ??params_?.shortcuts?.left ??[],
                                            scrollRight:this._root.dataset.shortcuts?.right??params_?.shortcuts?.right??[]});
         if (this._shortcuts.list.scrollLeft.find(sh_=>/^key/.test(sh_.type))||this._shortcuts.list.scrollRight.find(sh_=>/^key/.test(sh_.type)))  //Do not assign global listeners if not necessary.
         {
            window.addEventListener('keydown' ,(e_)=>{return this._onInput(e_);});
            window.addEventListener('keyup'   ,(e_)=>{return this._onInput(e_);});
            window.addEventListener('keypress',(e_)=>{return this._onInput(e_);});
         }
         let drag=this._root.dataset.shortcuts?.drag??params_?.shortcuts?.drag??[{type:'mousemove',val:MOUSE_LEFT},{type:'mousemove',val:MOUSE_MIDDLE},{type:'touchmove'}];
         if (this._shortcuts.list.mouseDrag=drag.filter(sh_=>sh_.type=='mousemove'))
         {
            this._shortcuts.list.mouseStart=this._shortcuts.list.mouseDrag.map(sh_=>({...sh_,type:'mousedown'})).concat(this._shortcuts.list.mouseDrag.map(sh_=>({...sh_,type:'mouseenter'}))); //Add complementary shortcuts.
            this._shortcuts.list.mouseEnd  =this._shortcuts.list.mouseDrag.map(sh_=>({type:'mouseup'})).concat(this._shortcuts.list.mouseDrag.map(sh_=>({type:'mouseleave'})));                 //
            this._area.addEventListener('mousedown' ,(e_)=>{return this._onInput(e_);});
            this._area.addEventListener('mouseenter',(e_)=>{return this._onInput(e_);});
            this._area.addEventListener('mouseup'   ,(e_)=>{return this._onInput(e_);});
            this._area.addEventListener('mouseleave',(e_)=>{return this._onInput(e_);});
            this._area.addEventListener('mousemove' ,(e_)=>{return this._onInput(e_);});
            this._area.addEventListener('dragstart' ,(e_)=>{return cancelEvent(e_);});    //Disable drag&drop of elements inside.
         }
         if (this._shortcuts.list.touchDrag=drag.filter(sh_=>sh_.type=='touchmove'))
         {
            this._shortcuts.list.touchStart=this._shortcuts.list.touchDrag.map(sh_=>({...sh_,type:'touchstart'})); //Add complementary shortcuts.
            this._shortcuts.list.touchEnd  =this._shortcuts.list.touchDrag.map(sh_=>({type:'touchend'}));          //
            this._area.addEventListener('touchstart',(e_)=>{return this._onInput(e_);});
            this._area.addEventListener('touchend'  ,(e_)=>{return this._onInput(e_);});
            this._area.addEventListener('touchmove' ,(e_)=>{return this._onInput(e_);});
         }
         
         //Start autoscrolling timer (if the interval>0):
         this.resume();
      }
   }
   
   //public props
   speed='33%';      //Scrolling speed (affects scrolling by cklicking on buttons and by mouse wheel scrolling).
   cycled=false;     //If true, when reaching the end/start, scrolling will continue from the opposite. If false scrolling will stop.
   stopTreshold=10;  //The end/start detection treshold.
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
   _shortcuts={};   //default handled events. Full list: 'click' - clicking on button nodes; 'wheel' - mouse wheel scrolling; 'touch' - dragging by touch input device; 'drag' - like touch, but by main mouse button; 'middlebtn' - like touch, but by the middle mouse button.
   _interval=0;
   _intervalID=null;
   _mouseDragDescr={start:null,recent:null,enabled:false,deadzone:10};
   _touchDragDescr={start:null,recent:null,enabled:false,deadzone:10};
   
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
      let contStyle=window.getComputedStyle(this._content);
      let oldPos=(from_start_ ? 0 : -parseFloat(contStyle.marginLeft));
      let maxPos=Math.max(0,parseFloat(contStyle.width)-this._area.clientWidth);
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
      let w=parseFloat(style.paddingLeft)+parseFloat(style.paddingRight)+(parseInt(style.columnGap)*(this._content.children.length-1));
      for (let child of this._content.children)
         w+=this._calcItemPlaceWidth(child);
      this._content.style.width=w+'px';
      
      this.updateButtons();
   }
   
   updateButtons()
   {
      let contStyle=window.getComputedStyle(this._content);
      
      if (this._buttons.left)
      {
         if (-parseFloat(contStyle.marginLeft)<=this.stopTreshold)
            this._buttons.left.classList.add('disabled');
         else
            this._buttons.left.classList.remove('disabled');
      }
      if (this._buttons.right)
      {
         if ((parseFloat(contStyle.width)+parseFloat(contStyle.marginLeft)-this._area.clientWidth)<=this.stopTreshold)
            this._buttons.right.classList.add('disabled');
         else
            this._buttons.right.classList.remove('disabled');
      }
   }
   
   scrollLeft(e_,sh_)
   {
      //Shortcut action.
      this.scroll(1);
   }
   
   scrollRight(e_,sh_)
   {
      //Shortcut action.
      this.scroll(-1);
   }
   
   mouseStart(e_,sh_)
   {
      //Shortcut action.
      this._mouseDragDescr.start =e_.clientX;
      this._mouseDragDescr.recent=e_.clientX;
   }
   
   mouseEnd(e_,sh_)
   {
      //Shortcut action.
      let evtConsumed=this._mouseDragDescr.enabled;
      
      this._mouseDragDescr.start =null;
      this._mouseDragDescr.recent=null;
      this._mouseDragDescr.enabled=false;
      
      return evtConsumed;
   }
   
   mouseDrag(e_,sh_)
   {
      //Shortcut action.
      let evtConsumed=false;
      
      if (this._mouseDragDescr.start!=null)
      {
         this._mouseDragDescr.enabled||=(Math.abs(e_.clientX-this._mouseDragDescr.start)>this._mouseDragDescr.deadzone);  //When mouse has moved from the start far than deadzone, the drag becomes enabled.
         
         if (this._mouseDragDescr.enabled)
         {
            this.scrollBy(-e_.clientX+this._mouseDragDescr.recent);
            evtConsumed=true;
         }
         
         this._mouseDragDescr.recent=e_.clientX;
      }
      
      return evtConsumed;
   }
   
   touchStart(e_,sh_)
   {
      //Shortcut action.
      this._touchDragDescr.start ??=e_.changedTouches[0];
      this._touchDragDescr.recent??=e_.changedTouches[0];
   }
   
   touchEnd(e_,sh_)
   {
      //Shortcut action.
      let evtConsumed=this._touchDragDescr.enabled;
      
      for (let touch of e_.changedTouches)
         if (this._touchDragDescr.start.identifier==touch.identifier)
         {
            this._touchDragDescr.start =null;
            this._touchDragDescr.recent=null;
            this._touchDragDescr.enabled=false;
         }
      
      return evtConsumed;
   }
   
   touchDrag(e_,sh_)
   {
      //Shortcut action.
      let evtConsumed=false;
      
      if (this._touchDragDescr.start!=null)
      {
         let updTouch=null;
         for (let touch of e_.changedTouches)
            if (this._touchDragDescr.start.identifier==touch.identifier)
            {
               updTouch=touch;
               break;
            }
         
         if (updTouch)
         {
            this._touchDragDescr.enabled||=(Math.abs(updTouch.clientX-this._touchDragDescr.start.clientX)>this._touchDragDescr.deadzone);
            evtConsumed=this._touchDragDescr.enabled;
            
            //Calc motion:
            this.scrollBy(-updTouch.clientX+this._touchDragDescr.recent.clientX);
            
            this._touchDragDescr.recent=updTouch;
         }
         else
         {
            evtConsumed=this._touchDragDescr.enabled;
            
            this._touchDragDescr.start =null;
            this._touchDragDescr.recent=null;
            this._touchDragDescr.enabled=false;
         }
      }
      
      return evtConsumed;
   }
   
   //private methods
   _onInput(e_)
   {
      if (this._shortcuts.match(e_))
         return this[this._shortcuts.action](e_,this._shortcuts.shortcut) ? cancelEvent(e_) : true;
   }
   
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

//--------------------- Utility ----------------------//
//------- XHR -------//
function reqServer(url_,data_,method_,enctype_,responseType_)
{
   //Send a data to server using AJAX.
   //Arguments:
   // url_ - URI/URL where request to be send. If null, then current document location will be used (excluding the GET params).
   // data_ - data to be send. Accepted values: string (must be correctly URL-encoded), URLSearchParams instance, FormData instance, or Object/array with structured data.
   // method_ - string, http request method.
   // enctype_ - string, type of data encoding. NOTE: if 'multipart/form-data', the data_ must be an instance of FormData.
   // responseType_ - string, variants: ''|'text' - text in a DOMString object; 'json' - JS object, parsed from JSON data; 'document' - HTML or XML document; 'blob' - Blob object with binary data; 'arraybuffer' - ArrayBuffer containing binary data.
   //Return value:
   // A promise.
   //    onResolve(xhr_response,xhr) - a callback function for the case if request will be successfully sent.
   //    onReject(xhr) - a callback function for the case if request will not be sent.
   
   return new Promise(function (onResolve,onReject)
                      {
                         //Init parameters:
                         url_??=document.location.pathname;
                         method_=(method_??'POST').toUpperCase();
                         if (method_=='GET')
                            enctype_='application/x-www-form-urlencoded';
                         enctype_=(enctype_??'application/x-www-form-urlencoded').toLowerCase();
                         responseType_=responseType_??'json';
                         onResolve=onResolve??function(ans_){console.log('XHR succeded. Response:',ans_);}; //TODO: These two fallbacks are seems not working.
                         onReject=onReject??function(xhr_){console.error('XHR failed:',xhr_);};             //
                         
                         //Prepare data to sending:
                         let query='';
                         if (enctype_=='multipart/form-data')
                         {
                            if (data_ instanceof FormData)   //Use standard class FormData to let the xhr to deal with multipart encoding by itself.
                               query=data_;
                            else
                            {
                               console.warn('reqServer() supports only a FormData instances as the data_ argument when enctype_ is "multipart/form-data".');
                               console.trace(data_);
                            }
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
                         
                         let xhr=new XMLHttpRequest();
                         xhr.addEventListener('load',function(e_){if(xhr.readyState === 4){if (xhr.status === 200) onResolve(xhr.response); else onReject(xhr);}});
                         xhr.open(method_,url_);
                         xhr.setRequestHeader('X-Requested-With','JSONHttpRequest');
                         if (enctype_!='multipart/form-data')              //If data containf a file, 
                            xhr.setRequestHeader('Content-Type',enctype_); // then browser will automatically generate proper Content-Type header with a "boundary" separator.
                         xhr.responseType=responseType_;
                         xhr.send(query);
                      });
}

function ajaxSendForm(form_)
{
   //Send form data to server.
   //This is a wrapper of reqServer() made for more usability.
   //Return value:
   // Promise from reqServer().
   
   let reqData=new FormData(form_);
   let action=form_.getAttribute('action');
   if (action=='')
       action=document.location.pathname;
   return reqServer(action,reqData,form_.method,form_.enctype);
}

//------- Cookie -------//
function getCookie(name_)
{
   var reg=new RegExp('(?:^|; +)'+name_+'=([^;]*)(?:;|$)','i');
   var matches=reg.exec(document.cookie);
   
   return (matches ? matches[1] : null);
}

function setCookie(name_,val_,expires_,path_)
{
   //Sets/removes cookie.
   //Arguments:
   // name_ - String, cookie name.
   // val_  - String-conversible|undefined|null, cookie value. If val_ is empty string or unset, cookie will be removed, regardless to the expires_.
   // expires_ - int|float|Date, expiration date. If type of int|float, it's a number of days from now (fraction values are supported, negative value unsets cookie immediately). If instance of Date, it will be set as given. Optional. Default: 31.
   // path_ - String, path of the page where cookie will be available. Optional. Default is '/'.
   
   let expDate=new Date();
   if ((val_==undefined)||(val_==''))     //Unset cookie if value is empty.
      expDate.setTime(0);                 // I.e. was expired at the beginning of the epoch.
   else if (expires_ instanceof Date)     //Support an absolute expiration Date.
      expDate=expires_;                   //
   else
      expDate.setTime(expDate.getTime+(expires_??31)*(24*3600*1000));   //Set relative expiration date in as a fraction of days from now.
   
   path_??='/';
   document.cookie=name_+'='+val_+(path_!='' ? '; path='+path_ : '')+'; expires='+expDate.toUTCString();
}

//------- Array and Object -------//
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

function structuredCloneAwared(object_)
{
   //Recursively clones a plain object|Array|Map, passing through a simple types, instances of custom classes and [potentially] not cloneable objects, including functions and DOM nodes.
   //NOTE: This method tested on plain objects, functions, DOM nodes, DocumentFragment and custom classes. However it may fail in some unpredicted cases.
   
   let res=object_;
   
   if (object_ instanceof Array)
   {
      res=[];
      for (let i in object_)
         res[i]=structuredCloneAwared(object_[i]);
   }
   else if (object_ instanceof Map)
   {
      res=new Map();
      for (let [key,val] of object_)
         res.set(key,structuredCloneAwared(val));
   }
   else if ((object_ instanceof Object)&&(object_.__proto__.__proto__===null))
   {
      res={};
      for (let [key,val] of Object.entries(object_))
         res[key]=structuredCloneAwared(val);
   }
   
   return res;
}

function cloneOverriden(default_,actual_,options_)
{
   //Recursively clones two objects, overriding the first one with the second.
   //Arguments:
   // default_ - Object|Map|simple type|undefined|null, a first object to be overriden.
   // actual_  - Object|Map|simple type|undefined|null, a second object which overrides/complements the first one.
   // options_ - object, options.
   // Options:
   //    strict - boolean, whether the default_ and the actual_ are required to be the same type. I.e. if default_ is an Object, the actual_ should be Object or null|undefined, but not Array or Map. Optional, default false.
   //    mergeArrays - boolean, whether to merge default_ and actual_ arrays or replace one with another. Merging acts like PHP's array_merge() with indexed arrays, i.e. concatenates default_ and actual_ (values will be deep-cloned, indexes aren't preserved).
   //    mergeArraysUnique - boolean, similar to mergeArrays, but excludes duplicate values, using a simple comparison (only duplicates of a simple types and referrences can be efficiently excluded), (values will be deep-cloned, indexes aren't preserved).
   //    mergeMaps - boolean, whether to merge default_ and actual_ maps or replace one with another. Merging acts like PHP's array_merge() with associative arrays.
   //NOTE: This method tested on plain objects, functions, DOM nodes, DocumentFragment and custom classes. However it may fail in some unpredicted cases.
   
   var res=null;
   
   if ((default_===undefined)||(default_===null))
      res=structuredCloneAwared(actual_);
   else if (default_ instanceof Array)
   {
      if (actual_ instanceof Array)
      {
         if (options_?.mergeArrays||options_?.intersectArrays)
         {
            res=[];
            //First, clone values of default_:
            for (let defaultVal of default_)
               res.push(structuredCloneAwared(defaultVal));
            //Next, merge (append)
            if (options_?.mergeArraysUnique)
               for (let actualVal of actual_)
                  res.push(structuredCloneAwared(actualVal));
            else
               for (let actualVal of actual_)
                  if (default_.indexOf(actualVal)>-1)
                     resres.push(actualVal);
         }
         else
            res=structuredCloneAwared(actual_); //Replace array.
      }
      else if ((actual_===undefined)||(actual_===null))
         res=structuredCloneAwared(default_);
      else if (!options_.strict)
         res=structuredCloneAwared(actual_);    //Replace default with actual, regardless their types.
      else
      {
         res=structuredCloneAwared(default_);
         console.warn(LC.get('cloneOverriden: incompartible types, default preserved.'));
         console.trace(default_,actual_);
      }
   }
   else if (default_ instanceof Map)
   {
      if (actual_ instanceof Map)
      {
         if (options_.mergeMaps)
         {
            //Merge maps:
            res=new Map();
            //Clone/override values of the default map:
            for (let [key,defaultVal] of default_.entries())
               res.set(key,cloneOverriden(defaultVal,actual_.get(key),options_));
            //Append values at keys, existing only in the actual map:
            for (let [key,actualVal] of actual_.entries())
               if (!default_.has(key)) //Skip values at the keys that was already cloned.
                  res.set(key,structuredCloneAwared(actualVal));
         }
         else
            res=structuredClone(actual_);       //Replace default with actual. NOTE: Map instance is cloneable.
      }
      else if ((actual_===undefined)||(actual_===null))
         res=structuredCloneAwared(default_);
      else if (!options_.strict)
         res=structuredCloneAwared(actual_);    //Replace default with actual, regardless their types.
      else
      {
         res=structuredCloneAwared(default_);
         console.warn(LC.get('cloneOverriden: incompartible types, default preserved.'));
         console.trace(default_,actual_);
      }
   }
   else if ((default_ instanceof Object)&&(default_.__proto__.__proto__===null)) //Detect a plain object by prototype chain.
   {
      if ((actual_ instanceof Object)&&(actual_.__proto__.__proto__===null))     //Detect a plain object by prototype chain.
      {
         //Merge plain objects:
         res={};
         //Clone/override props of the default:
         for (let [name,defaultVal] of Object.entries(default_))
            res[name]=cloneOverriden(defaultVal,actual_[name],options_);
         //Append props, existing only in the actual:
         for (let [name,actualVal] of Object.entries(actual_))
            if (!default_.hasOwnProperty(name)) //Skip props that was already cloned.
               res[name]=structuredCloneAwared(actualVal);
      }
      else if ((actual_===undefined)||(actual_===null))
         res=structuredCloneAwared(default_);
      else if (!options_.strict)
         res=structuredCloneAwared(actual_);    //Replace default with actual, regardless their types.
      else
      {
         res=structuredCloneAwared(default_);
         console.warn(LC.get('cloneOverriden: incompartible types, default preserved.'));
         console.trace(default_,actual_);
      }
   }
   else  //If simple type of not cloneable object.
      res=actual_??default_;
   
   return res;
}

//------- String -------//
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
      let full_key=(parent_!==undefined ? parent_+'['+encodeURIComponent(key)+']' : encodeURIComponent(key));
      res_arr.push(typeof query_data_[key]=='object' ? serializeUrlQuery(query_data_[key],full_key) : full_key+'='+encodeURIComponent(query_data_[key]));
   }
   
   return res_arr.join('&');
}

//------- Date/time -------//
function formatDate(format_,date_,params_)
{
   //Analog for PHP's date()
   //NOTE: format support is incomplete. Missing labels: SzWtLoXxyAaBghueIOPpTcrU.
   //TODO: also not implemented labels: DlMF.
   
   if (date_===undefined||!(date_ instanceof Date))
      date_=new Date();
   if (format_===undefined)
      format_='Y-m-d H:i:s';
   
   var res=format_;
   
   res=res.replaceAll(/(?<!\\)Y/g,date_.getFullYear());
   res=res.replaceAll(/(?<!\\)m/g,(date_.getMonth()+1).toString().padStart(2,'0'));
   res=res.replaceAll(/(?<!\\)d/g,date_.getDate().toString().padStart(2,'0'));
   res=res.replaceAll(/(?<!\\)H/g,date_.getHours().toString().padStart(2,'0'));
   res=res.replaceAll(/(?<!\\)i/g,date_.getMinutes().toString().padStart(2,'0'));
   res=res.replaceAll(/(?<!\\)s/g,date_.getSeconds().toString().padStart(2,'0'));
   res=res.replaceAll(/(?<!\\)j/g,date_.getDate().toString());
   res=res.replaceAll(/(?<!\\)N/g,date_.getDay().toString());
   res=res.replaceAll(/(?<!\\)w/g,(date_.getDay()-1).toString());
   res=res.replaceAll(/(?<!\\)n/g,(date_.getMonth()+1).toString());
   res=res.replaceAll(/(?<!\\)G/g,date_.getHours().toString());
   res=res.replaceAll(/(?<!\\)v/g,date_.getMilliseconds().toString());
   res=res.replaceAll(/(?<!\\)Z/g,date_.getTimezoneOffset().toString());
   //res=res.replaceAll(/(?<!\\)D/g,(params_?.shortWeekDays??['Mon','Tue','Wed','Thu','Fri','Sat','Sun'])[date_.getDay()-1]);
   //res=res.replaceAll(/(?<!\\)l/g,(params_?.fullWeekDays??['Monday','Tuesday','Wednesday','Thursday','Frighday','Saturday','Sunday'])[date_.getDay()-1]);
   //res=res.replaceAll(/(?<!\\)M/g,(params_?.shortMonths??['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[date_.getMonth()]);
   //res=res.replaceAll(/(?<!\\)F/g,(params_?.fullMonths??['January','February','March','April','May','June','July','August','September','October','November','December'])[date_.getMonth()]);
   res=res.replaceAll(/\\(.)/g,'$1');
   
   return res;
}

//------- Value/notation parsing -------//
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
   //TODO: Removal candidate: this function has narrow use in specific tasks, so it will be better moved to a separate dedicated lib and reimplemented as decorator.
   console.warn('function parseCompleteFloat() is removal candidate.');
   
   let res=NaN;
   
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
   //TODO: Removal candidate: this function has narrow use in specific tasks, so replace it with kinda class cssSize(str_){<...> val=0;unit='px'} of function parseCssSize(str_){<...> return {val:0,unit:'px'};}.
   
   var matches=/^\s*-?\d*\.?\d*(em|%|px|vw|vh)\s*$/i.exec(size_);
   return matches ? matches[1].toLowerCase() : '';
}

function toPixels(size_,context_)
{
   //TODO: Removal candidate: this function has narrow use in specific tasks, so think about move it to a separate dedicated lib. QUESTIONABLE.
   //TODO: This func may be transformed to something like PhisicalQuantity from scientific.js.
   
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
   //TODO: Removal candidate: rarely used, so think about move it to a separate dedicated lib.
   console.warn('function getTransitionDuration() is removal candidate.');
   
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

function parsePhones(phonesStr_,glue_)
{
   //The buildNodes()-ready phone numbers parser.
   //TODO: Use class LC for localization.
   
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

//--------------------- Misc ---------------------//
function getElementOffset(element_,fromElement_)
{
   //Calculates offset of one element from another.
   //TODO: Refactor this. Add default fromElement_ to /?body?/, mb rename fromElement_ to refElement_.
   //TODO: This function may be a removal candidate.
   
   var res={top:0,left:0};
   while (element_&&(element_!=fromElement_))
   {
      res.top+=element_.offsetTop;
      res.left+=element_.offsetLeft;
      
      element_=element_.offsetParent;
   }
   return res;
}

function functionExists(func_)
{
   return (typeof func_=='string' ? typeof window[func_]=='function' : func_ instanceof Function);
}