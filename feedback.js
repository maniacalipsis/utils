function initFeedbackForms(selector_)
{
   for (let form of document.forms)
      form.addEventListener('submit',form.dataset.onsubmit??ajaxFormOnSubmit);
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
   let data={};
   for (let input of this.elements)
      switch (input.type)
      {
         case 'checkbox': {data[input.name]=input.checked; break;}
         case 'button':
         case 'submit':
         case 'reset':    {break;}
         default:         {data[input.name]=input.value;}
      }
   
   let may_send=true;
   if (data.pwd&&this.dataset.spices)
   {
      let hash=hashSpicy(data.pwd,this.dataset.spices.split(','));
      if (hash!==null)
         data.pwd=hash;
      else
      {
         printAjaxResponse(this,{res:false,errors:['Не удаётся безопасно отправить пароль.']});
         may_send=false;
      }
   }  
   
   if (may_send)
      reqServer(
                  this.attributes.action.value,
                  data,
                  this.dataset.onSuccess??((ans_)=>{printAjaxResponse(this,ans_);}),
                  (xhr_)=>{console.warn(xhr_); printAjaxResponse(this,{res:false,errors:['Отправка данных не удалась. Проверьте подключение к Сети и попробуйте снова.']});}
               );
   
   return cancelEvent(e_);
}

function hashSpicy(s_,sp_)
{
   let res=null;
   
   if (s_!='')
   {
      if (typeof SHA256 !=='undefined')
      {
         for (i=0;i<2;i++)
            if ((i<1)||(sp[i]))
            {
               let len=Math.min(s_.length,s.length);
               let mix='';
               for (var i=0;i<len;i++)
                  mix+=p[i]+s_[i];
               mix+=(p.length>len) ? p.substring(len) : s_.substring(len);
               pwdInput.value=SHA256(mix);
            }
      }
   }
   else
      res='';
   
   return res;
}