/** Runs before React so a full reload shows the bar immediately. */
export const BOOT_PROGRESS_SCRIPT = `(function(){
  var id="rm-boot-bar";
  if(document.getElementById(id))return;
  var bar=document.createElement("div");
  bar.id=id;
  bar.setAttribute("role","progressbar");
  bar.setAttribute("aria-label","Loading");
  bar.style.cssText="position:fixed;top:0;left:0;height:3px;width:8%;z-index:100000;background:#00B207;box-shadow:0 0 10px #00B207,0 0 5px #00B207;pointer-events:none;transition:width .2s ease,opacity .2s ease";
  document.documentElement.appendChild(bar);
  var width=8;
  var timer=setInterval(function(){
    width=Math.min(width+Math.random()*10,90);
    bar.style.width=width+"%";
  },180);
  function finish(){
    clearInterval(timer);
    bar.style.width="100%";
    setTimeout(function(){
      bar.style.opacity="0";
      setTimeout(function(){bar.remove();},200);
    },160);
  }
  if(document.readyState==="complete"||document.readyState==="interactive") setTimeout(finish,280);
  else document.addEventListener("DOMContentLoaded",function(){setTimeout(finish,180);},{once:true});
})();`

