/* Asesora Orquidea — lightweight storefront UI; no API keys in browser. */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const root=$('orqAssistant');
  if(!root)return;
  // Render only when the server has an OpenAI credential.
  // Customer capture is independent and requires secure Google Sheets writing.
  root.hidden=true;
  let registrationAvailable=false;
  const visualPreview=new URLSearchParams(window.location.search).get('previewAsesora')==='1';
  if(visualPreview)root.hidden=false;
  fetch('/api/assistant-status',{cache:'no-store'}).then(r=>r.ok?r.json():null)
    .then(capabilities=>{
      if(capabilities?.available)root.hidden=false;
      registrationAvailable=capabilities?.registrationAvailable===true;
    }).catch(()=>{});
  const panel=$('orqAssistantPanel'),launch=$('orqAssistantLaunch');
  const messages=$('orqAssistantMessages'),input=$('orqAssistantInput');
  const send=$('orqAssistantSend'),form=$('orqAssistantForm');
  const lead=$('orqLeadForm'),guest=$('orqGuestCheckout');
  let history=[],busy=false,leadName='';
  let suggestedProducts=[],userTurns=0,assistantHealthy=true,checkoutPromptActive=false;
  let followUpTimer=null,followUpStep=0,totalFollowUps=0;
  const FIRST_FOLLOW_UP_MS=40000;
  const SECOND_FOLLOW_UP_MS=80000;
  const MAX_FOLLOW_UPS_PER_VISIT=4;
  const safeText=x=>String(x||'').trim().slice(0,700);
  const currency=n=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(n);
  const getCart=()=>typeof cart!=='undefined'&&Array.isArray(cart)?cart:[];
  const hasCart=()=>getCart().length>0;
  const scroll=()=>{messages.scrollTop=messages.scrollHeight;};
  function textMessage(text,who='bot'){
    const bubble=document.createElement('div');
    bubble.className='orq-chat-bubble '+(who==='user'?'from-user':'from-bot');
    bubble.textContent=safeText(text);messages.appendChild(bubble);scroll();
    return bubble;
  }
  // Give the shopper time to respond. Never message from a closed chat,
  // another browser tab, while typing, or while completing the consent form.
  // Follow-ups are local, avoiding extra OpenAI calls during inactivity.
  function stopFollowUp(){
    if(followUpTimer!==null)clearTimeout(followUpTimer);
    followUpTimer=null;
  }
  function canFollowUp(){
    return !root.hidden&&!panel.hidden&&document.visibilityState==='visible'
      &&!busy&&lead.hidden&&!checkoutPromptActive&&!input.value.trim()&&assistantHealthy
      &&followUpStep<2&&totalFollowUps<MAX_FOLLOW_UPS_PER_VISIT;
  }
  function followUpText(){
    const items=getCart();
    if(items.length){
      const count=items.reduce((n,item)=>n+Number(item.qty||1),0);
      return followUpStep===0
        ?'¡Qué buena elección! 💜 Ya tienes '+count+' '+(count===1?'prenda':'prendas')+' en tu carrito. ¿Te gustaría que preparemos el pedido para confirmar disponibilidad y pago por WhatsApp?'
        :'Si estás lista, dime «quiero comprar» y te ayudo con el último paso. Podemos confirmar las existencias y el envío antes de pagar. ✨';
    }
    if(suggestedProducts.length){
      const name=String(suggestedProducts[0].nombre||'esta prenda').slice(0,65);
      return followUpStep===0
        ?'¿Qué te pareció '+name+'? 💜 Puedo ayudarte a elegir la talla o buscar una alternativa que vaya más contigo.'
        :'Si alguna opción te gustó, puedes tocar «Elegir talla y agregar». ¿Quieres que armemos tu pedido? ✨';
    }
    if(userTurns>0){
      return followUpStep===0
        ?'¿Te gustaría que te muestre opciones según tu estilo o tu presupuesto? 🌸 Así elegimos algo que realmente te encante.'
        :'También podemos empezar por una ocasión especial. ¿Es para salir, para el día a día o para regalar?';
    }
    return followUpStep===0
      ?'¿Te ayudo a encontrar algo lindo? 💜 Cuéntame qué estilo te gusta y te muestro opciones de la colección.'
      :'Si tienes un presupuesto en mente, dímelo y buscamos prendas que se ajusten a él. ✨';
  }
  function scheduleFollowUp(delay=FIRST_FOLLOW_UP_MS){
    stopFollowUp();
    if(!canFollowUp())return;
    followUpTimer=setTimeout(()=>{
      followUpTimer=null;
      if(!canFollowUp())return;
      const message=followUpText();
      textMessage(message);
      history.push({role:'assistant',content:message});
      history=history.slice(-12);
      followUpStep++;totalFollowUps++;
      if(followUpStep<2)scheduleFollowUp(SECOND_FOLLOW_UP_MS);
    },delay);
  }
  function restartFollowUp(){
    stopFollowUp();
    followUpStep=0;
    scheduleFollowUp();
  }
  function openChat(){
    panel.hidden=false;root.classList.add('is-open');
    launch.setAttribute('aria-expanded','true');
    input.focus({preventScroll:true});
    restartFollowUp();
  }
  function closeChat(){
    stopFollowUp();
    panel.hidden=true;root.classList.remove('is-open');
    launch.setAttribute('aria-expanded','false');
    launch.focus({preventScroll:true});
  }
  launch.addEventListener('click',()=>panel.hidden?openChat():closeChat());
  $('orqAssistantClose').addEventListener('click',closeChat);
  function createProductCard(p){
    const card=document.createElement('div');card.className='orq-chat-product';
    const photo=document.createElement('img');
    photo.loading='lazy';photo.alt=p.nombre||'Producto de Orquidea Shop';
    // Reuse the existing storefront's safe Google Drive image fallback.
    photo.src=typeof img==='function'?img(p.imagen,400):'';
    const info=document.createElement('div');info.className='orq-chat-product-info';
    const name=document.createElement('strong');name.textContent=p.nombre||'Producto';
    const price=document.createElement('span');price.textContent=p.precio||'Precio por confirmar';
    const size=document.createElement('small');size.textContent=p.tallas?'Tallas: '+p.tallas:'Consulta talla';
    const button=document.createElement('button');button.type='button';button.textContent='Elegir talla y agregar';
    button.addEventListener('click',()=>{
      closeChat();
      if(typeof openModal==='function')openModal({n:p.nombre,d:p.descripcion,s:p.tallas,p:p.precio,c:p.categoria,img:p.imagen});
      else document.getElementById('catalogo')?.scrollIntoView({behavior:'smooth'});
    });
    info.append(name,price,size,button);card.append(photo,info);return card;
  }
  function showProducts(products){
    if(!Array.isArray(products)||!products.length)return;
    const wrap=document.createElement('div');wrap.className='orq-chat-products';
    products.slice(0,3).forEach(p=>wrap.appendChild(createProductCard(p)));
    messages.appendChild(wrap);scroll();
  }
  async function ask(text){
    const value=safeText(text);if(!value||busy)return;
    stopFollowUp();
    followUpStep=0;
    userTurns++;
    busy=true;send.disabled=true;input.disabled=true;
    textMessage(value,'user');input.value='';
    const loading=textMessage('Estoy revisando nuestra colección…');
    try{
      const response=await fetch('/api/assistant',{method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({message:value,history:history.slice(-8)})});
      const body=await response.json().catch(()=>({}));
      loading.remove();
      if(!response.ok){
        assistantHealthy=false;
        textMessage(body.error||'No pude responder por el momento.');
        return;
      }
      textMessage(body.reply);
      suggestedProducts=Array.isArray(body.recommendations)?body.recommendations:[];
      assistantHealthy=true;
      showProducts(body.recommendations);
      history.push({role:'user',content:value},{role:'assistant',content:safeText(body.reply)});
      history=history.slice(-12);
      if(body.ready_to_checkout){
        if(hasCart())showLead();
        else textMessage('Cuando tengas tu favorito, pulsa “Elegir talla y agregar” para preparar tu pedido.');
      }
    }catch(e){
      assistantHealthy=false;
      loading.remove();textMessage('No tengo conexión en este momento. Puedes continuar por WhatsApp.');
    }finally{
      busy=false;send.disabled=false;input.disabled=false;
      scroll();
      scheduleFollowUp();
    }
  }
  form.addEventListener('submit',e=>{e.preventDefault();ask(input.value);});
  input.addEventListener('input',()=>{
    stopFollowUp();
    if(!input.value.trim())restartFollowUp();
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible')restartFollowUp();
    else stopFollowUp();
  });
  window.addEventListener('pagehide',stopFollowUp);
  function showLead(){
    if(!hasCart()){
      textMessage('Primero elige el producto y la talla para continuar.');
      return;
    }
    stopFollowUp();
    if(!registrationAvailable){
      // Do not ask for personal data when Google Sheets storage is unavailable.
      if(checkoutPromptActive)return;
      checkoutPromptActive=true;
      textMessage('¡Ya podemos continuar! 💜 Preparé tu selección para que confirmes disponibilidad, envío y pago con Orquídea Shop por WhatsApp.');
      const row=document.createElement('div');
      row.className='orq-chat-checkout-inline';
      const button=document.createElement('button');
      button.type='button';
      button.className='orq-chat-checkout-action';
      button.textContent='Continuar pedido por WhatsApp ↗';
      button.addEventListener('click',redirectCheckout);
      row.appendChild(button);
      messages.appendChild(row);
      scroll();
      return;
    }
    checkoutPromptActive=true;
    lead.hidden=false;
    $('orqLeadName').focus({preventScroll:true});
    lead.scrollIntoView({block:'nearest',behavior:'smooth'});
  }
  function checkoutURL(){
    const items=getCart();
    if(!items.length)return null;
    const total=items.reduce((n,x)=>n+x.qty*x.price,0);
    const lines=items.map((x,i)=>(i+1)+'. '+x.n+' | Talla: '+x.size+' | Cantidad: '+x.qty+' | '+currency(x.qty*x.price)).join('\n');
    const name=leadName?'Soy '+leadName+'.\n\n':'';
    const text='Hola Orquidea Shop 👋\n\n'+name+'Quiero finalizar este pedido que preparé con la asesora virtual:\n\n'+lines+'\n\nSubtotal: '+currency(total)+'\n\n¿Me confirman existencias, valor del envío y medios de pago?';
    return 'https://wa.me/573171774950?text='+encodeURIComponent(text);
  }
  function redirectCheckout(){
    const url=checkoutURL();
    if(!url){textMessage('Primero agrega un producto al carrito.');return;}
    const tab=window.open(url,'_blank','noopener,noreferrer');
    if(!tab)window.location.assign(url);
  }
  guest.addEventListener('click',()=>{leadName='';redirectCheckout();});
  lead.addEventListener('submit',async e=>{
    e.preventDefault();
    const name=$('orqLeadName').value.trim(),phone=$('orqLeadPhone').value.trim();
    const consent=$('orqLeadConsent').checked,marketing=$('orqLeadMarketing').checked;
    const notice=$('orqLeadNotice');
    if(!name||!phone||!consent){notice.textContent='Completa tu nombre, celular y autorización de datos.';return;}
    const button=$('orqLeadSave');button.disabled=true;notice.textContent='Guardando tu autorización…';
    try{
      const r=await fetch('/api/clientes',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({name,phone,dataConsent:consent,marketingConsent:marketing,consentVersion:'2026-10-29-v1'})});
      const body=await r.json().catch(()=>({}));
      if(!r.ok||!body.saved){notice.textContent=body.error||'No se confirmó el registro. Puedes continuar sin registrarte.';return;}
      leadName=name;notice.textContent='Registro confirmado. Abriendo WhatsApp…';
      redirectCheckout();
    }catch(e){notice.textContent='No se pudo guardar el registro. Puedes continuar sin registrarte.';}
    finally{button.disabled=false;}
  });
  textMessage('¡Hola! 🌸 Soy la asesora virtual de Orquídea Shop. ¿Buscas algo para una ocasión especial, un estilo o un presupuesto? Te ayudo a elegir y, cuando estés lista, pasamos el pedido a WhatsApp.');
})();