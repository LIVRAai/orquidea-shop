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
  }
  refreshTheme();
  setInterval(refreshTheme,60*60*1000);
})();
