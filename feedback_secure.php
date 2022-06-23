<??>

<SCRIPT SRC="<?=CORE_ASSETS_DIR_URL?>/hash.js"></SCRIPT>
  <SCRIPT>
     function login_on_submit()
     {
        var login_input=document.forms.login.elements.admin_login;
        var pwd_input=document.forms.login.elements.pwd;
        var err_box=document.getElementById('error');
        if (login_input&&pwd_input&&login_input.value!=''&&pwd_input.value!='')
        {
           if (typeof SHA256 !=='undefined')
           {
              var login=login_input.value;
              var pwd=pwd_input.value;
              var s='<?=$_SESSION["SALT"]?>';
              var p='<?=$_SESSION["PEPPER"]?>';
              var len=Math.min(pwd.length,s.length);
              var mix='';
              for (var i=0;i<len;i++)
                 mix+=s[i]+pwd[i];
              mix+=(s.length>len) ? s.substring(len) : pwd.substring(len);
              pwd_input.value=SHA256(mix);
              var len=Math.min(login.length,p.length);
              var mix='';
              for (var i=0;i<len;i++)
                 mix+=p[i]+login[i];
              mix+=(p.length>len) ? p.substring(len) : login.substring(len);
              login_input.value=SHA256(mix);
           }
           else
           {
              err_box.innerHTML='<?=$LOCALE["Unable_to_send_password"]?>';
              return false;
           }
        }
        else
        {
           err_box.innerHTML='<?=$LOCALE["No_login_or_password"]?>';
           return false;
        };
     }
  </SCRIPT>