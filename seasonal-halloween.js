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
  // Present the revised welcome once to returning visitors in this session.
  if(activeNow){
    try{
      const seasonalKey='orquideaHalloweenAutoplayWelcomeV2';
      if(sessionStorage.getItem(seasonalKey)!=='1'){
        sessionStorage.removeItem('orquideaWelcomeSeenV3');
        sessionStorage.setItem(seasonalKey,'1');
      }
    }catch(e){}
  }
  setInterval(refreshTheme,60*60*1000);

  // Attempt muted autoplay as soon as the welcome is visible.
  // Instagram's native embed may ignore autoplay; we cannot force playback
  // inside a third-party iframe. The direct Instagram link stays available.
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
    function loadReel(){
      if(!document.documentElement.classList.contains('theme-halloween'))return;
      if(loaded||welcome.hidden||welcome.classList.contains('is-closing'))return;
      const iframe=document.createElement('iframe');
      iframe.title='Reel de Halloween de Orquidea Shop en Instagram';
      iframe.src='https://www.instagram.com/reel/DesDDset5tw/embed/?autoplay=1&muted=1&playsinline=1';
      iframe.loading='eager';
      iframe.referrerPolicy='strict-origin-when-cross-origin';
      iframe.setAttribute('allow','autoplay; encrypted-media; picture-in-picture; fullscreen');
      iframe.setAttribute('allowfullscreen','');
      iframe.addEventListener('error',unloadReel,{once:true});
      frame.replaceChildren(iframe);
      loaded=true;
    }
    // The visitor may still manually start the video if Instagram blocks it.
    play.addEventListener('click',loadReel);
    function syncVisibility(){
      if(welcome.hidden||welcome.classList.contains('is-closing')){
        unloadReel();
      }else if(welcome.classList.contains('is-visible')){
        loadReel();
      }
    }
    const observer=new MutationObserver(syncVisibility);
    observer.observe(welcome,{attributes:true,attributeFilter:['class','hidden']});
    window.addEventListener('pagehide',unloadReel);
    syncVisibility();
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',initializeReel,{once:true});
  }else{
    initializeReel();
  }
})();
