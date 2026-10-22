/* Orquidea Shop — temporary Halloween 2026 skin.
   Runs before CSS to prevent a theme flash; uses Colombia's calendar date.
   Automatically returns to the original look from 1 November 2026. */
(function(){
  'use strict';
  function dateInColombia(){
    const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'});
    const parts=Object.fromEntries(formatter.formatToParts(new Date()).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
    return parts;
  }
  function refreshTheme(){
    const {year,month,day}=dateInColombia();
    const active=year===2026&&month===10&&day>=22&&day<=31;
    document.documentElement.classList.toggle('theme-halloween',active);
    return active;
  }
  const activeNow=refreshTheme();
  // Show the updated seasonal welcome once even for visitors who saw
  // the earlier, non-video popup in their currently open browser tab.
  if(activeNow){
    try{
      const seasonalKey='orquideaHalloweenReelPreparedV1';
      if(sessionStorage.getItem(seasonalKey)!=='1'){
        sessionStorage.removeItem('orquideaWelcomeSeenV3');
        sessionStorage.setItem(seasonalKey,'1');
      }
    }catch(e){}
  }
  setInterval(refreshTheme,60*60*1000);

  // Load Instagram only on deliberate interaction. No external player
  // requests are sent from the popup before this click.
  function initializeReel(){
    const play=document.getElementById('halloweenReelPlay');
    const frame=document.getElementById('halloweenReelFrame');
    const poster=document.getElementById('halloweenReelPoster');
    const welcome=document.getElementById('welcomeOverlay');
    if(!play||!frame||!poster||!welcome)return;
    let loaded=false;
    function unloadReel(){
      if(!loaded)return;
      frame.replaceChildren(poster);
      loaded=false;
    }
    play.addEventListener('click',()=>{
      if(!document.documentElement.classList.contains('theme-halloween'))return;
      if(loaded)return;
      const iframe=document.createElement('iframe');
      iframe.title='Reel de Halloween de Orquidea Shop en Instagram';
      iframe.src='https://www.instagram.com/reel/DesDDset5tw/embed/';
      iframe.loading='eager';
      iframe.referrerPolicy='strict-origin-when-cross-origin';
      iframe.setAttribute('allow','autoplay; encrypted-media; picture-in-picture; fullscreen');
      iframe.setAttribute('allowfullscreen','');
      frame.replaceChildren(iframe);
      loaded=true;
    });
    const observer=new MutationObserver(()=>{
      if(welcome.hidden||welcome.classList.contains('is-closing'))unloadReel();
    });
    observer.observe(welcome,{attributes:true,attributeFilter:['class','hidden']});
    window.addEventListener('pagehide',unloadReel);
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',initializeReel,{once:true});
  }else{
    initializeReel();
  }
})();
