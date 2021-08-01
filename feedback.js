function initFeedbackForms(selector_)
{
   for (let form of document.forms)
      form.addEventListener('submit',window[form.dataset.onsubmit]??ajaxFormOnSubmit);
}

function printAjaxResponse(form_,ans_)
{
   let resBox=form_.querySelector('.result');
   if (resBox)
   {
      resBox.classList.toggle('error',!ans_.res);
      resBox.classList.toggle('success',ans_.res);
      resBox.innerHTML=(ans_.errors?.length ? '<P>'+ans_.errors?.join('</P>\n<P>')+'</P>\n' : (!ans_.res ? '<P>Похоже, что-то пошло не так.</P>' : ''))+
                       (ans_.success?.length ? '<P>'+ans_.success?.join('</P>\n<P>')+'</P>\n' : (ans_.res ? '<P>Запрос выполнен успешно</P>' : ''));
   }
   else
      alert(ans_.errors?.join('\n')+'\n\n'+ans_.success?.join('\n'));
}

function ajaxFormOnSubmit(e_)
{
   //TODO: the way how to callbacks, defined in form dataset, are called and also how they receives the form ptr seems ugly.
   reqServer(
               this.attributes.action.value,
               new FormData(this),
               ((ans_,xhr_)=>{if (this.dataset.onsuccess) window[this.dataset.onsuccess](ans_,xhr_,this/*form ptr*/); else printAjaxResponse(this,ans_);}),
               ((xhr_)=>{if (this.dataset.onerror) window[this.dataset.onerror](xhr_,this/*form ptr*/); else {console.warn(xhr_); printAjaxResponse(this,{res:false,errors:['Отправка данных не удалась. Возможно нет подключения к Сети или ошибка на сервере.']});}}),
               this.method,
               this.enctype,
            );
   
   return cancelEvent(e_);
}

// function hashSpicy(s_,sp_)
// {
//    let res=null;
//    
//    if (s_!='')
//    {
//       if (typeof SHA256 !=='undefined')
//       {
//          for (i=0;i<2;i++)
//             if ((i<1)||(sp[i]))
//             {
//                let len=Math.min(s_.length,s.length);
//                let mix='';
//                for (var i=0;i<len;i++)
//                   mix+=p[i]+s_[i];
//                mix+=(p.length>len) ? p.substring(len) : s_.substring(len);
//                pwdInput.value=SHA256(mix);
//             }
//       }
//    }
//    else
//       res='';
//    
//    return res;
// }