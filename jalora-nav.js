// Adds "Our Team" and "Report pollution" to the existing Jalora menu. No other change to your site.
(function(){
  function add(){
    if(document.getElementById('jl-new'))return;
    var ref=document.querySelector('a[href="#pledge"]');
    var links=[['/team.html','Our Team'],['/report.html','Report pollution']];
    if(ref&&ref.parentNode){
      links.forEach(function(l){var a=document.createElement('a');a.href=l[0];a.textContent=l[1];a.className=ref.className;if(l[1]==='Our Team')a.id='jl-new';ref.parentNode.insertBefore(a,ref.nextSibling);ref=a;});
    }else{
      var d=document.createElement('div');d.id='jl-new';d.style.cssText='position:fixed;right:12px;bottom:12px;z-index:9999;display:flex;gap:8px;flex-wrap:wrap';
      links.forEach(function(l){var a=document.createElement('a');a.href=l[0];a.textContent=l[1];a.style.cssText='background:#38bdf8;color:#04212c;padding:10px 14px;border-radius:999px;font:600 14px system-ui;text-decoration:none;box-shadow:0 4px 14px #0004';d.appendChild(a);});
      document.body.appendChild(d);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',add);else add();
})();
