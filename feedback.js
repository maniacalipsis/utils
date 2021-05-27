function initFeedbackForms(selector_)
{
   for (let form of document.forms)
      form.addEventListener('submit',ajaxFormOnSubmit);   
}

function printAjaxResponse(form_,ans_)
{
   console.log(form_,ans_);
   let resBox=form_.querySelector('.result');
   if (resBox)
   {
      resBox.classList.toggle('error',!ans_.res);
      resBox.classList.toggle('success',ans_.res);
      resBox.innerHTML=(ans_.errors?.length ? '<P>'+ans_.errors?.join('</P>\n<P>')??(!ans_.res ? 'Похоже, что-то пошло не так.' : '')+'</P>\n'+'<P>' : '')+
                       (ans_.success?.length ? '<P>'+ans_.success?.join('</P>\n<P>')??(ans_.res ? 'Запрос выполнен успешно' : '')+'</P>\n'+'<P>' : '');
   }
   else
      alert(ans_.errors?.join('\n')+'\n\n'+ans_.success?.join('\n'));
}

function ajaxFormOnSubmit(e_)
{
   let data=[];
   for (let input of this.elements)
      if (input.type=='checkbox')
         data[input.name]=input.checked;
      else
         data[input.name]=input.value;
   
   
   reqServerPost(
                   this.attributes.action.value,
                   data,
                   this.dataset.onSuccess??((ans_)=>{printAjaxResponse(this,ans_);}),
                   (xhr_)=>{console.warn(xhr_); printAjaxResponse(this,{res:false,errors:['<P>Отправка данных не удалась. Проверьте подключение к Сети и попробуйте снова.</P>']});}
                );
   
   return cancelEvent(e_);
}
