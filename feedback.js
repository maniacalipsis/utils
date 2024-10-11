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
   ajaxSendForm(e_.target)
      .then((ans_,xhr_)=>{if (this.dataset.onsuccess) window[this.dataset.onsuccess](ans_,xhr_,this/*form ptr*/); else printAjaxResponse(this,ans_);})
      .catch((xhr_)=>{if (this.dataset.onerror) window[this.dataset.onerror](xhr_,this/*form ptr*/); else {console.warn(xhr_); printAjaxResponse(this,{res:false,errors:['Отправка данных не удалась. Возможно нет подключения к Сети или ошибка на сервере.']});}});
   
   return cancelEvent(e_);
}