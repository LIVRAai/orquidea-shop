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
  const panel=$('orqAssistantPanel'),launch=$('orqAssistantLaunch'),expand=$('orqAssistantExpand');
  const messages=$('orqAssistantMessages'),input=$('orqAssistantInput');
  const send=$('orqAssistantSend'),form=$('orqAssistantForm');
  const lead=$('orqLeadForm'),guest=$('orqGuestCheckout');
  let history=[],busy=false,leadName='';
  let suggestedProducts=[],userTurns=0,assistantHealthy=true,checkoutPromptActive=false;
  let followUpTimer=null,followUpStep=0,totalFollowUps=0,noReplyNudgeSent=false;
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
      &&followUpStep<2&&totalFollowUps<MAX_FOLLOW_UPS_PER_VISIT
      &&(userTurns>0||!noReplyNudgeSent);
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
    return '¿Buscas algo para ti o para regalar? 💜 Te muestro opciones según tu estilo y presupuesto.';
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
      // Only one gentle nudge before the shopper has interacted.
      // After a real message, up to two contextual follow-ups are allowed.
      if(userTurns===0)noReplyNudgeSent=true;
      if(userTurns>0&&followUpStep<2)scheduleFollowUp(SECOND_FOLLOW_UP_MS);
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
    panel.hidden=true;root.classList.remove('is-open','is-expanded');
    expand.setAttribute('aria-pressed','false');
    expand.setAttribute('aria-label','Ampliar chat');
    expand.title='Ampliar chat';
    launch.setAttribute('aria-expanded','false');
    launch.focus({preventScroll:true});
  }
  expand.addEventListener('click',()=>{
    const expanded=root.classList.toggle('is-expanded');
    expand.setAttribute('aria-pressed',String(expanded));
    expand.setAttribute('aria-label',expanded?'Reducir chat':'Ampliar chat');
    expand.title=expanded?'Reducir chat':'Ampliar chat';
    scroll();
  });
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
  function showCombo(combo){
    if(!combo||!Array.isArray(combo.products)||combo.products.length<2)return;
    const products=combo.products.slice(0,3);
    const card=document.createElement('article');card.className='orq-combo';
    const kicker=document.createElement('span');kicker.className='orq-combo-kicker';
    kicker.textContent='✦ Selección de tu asesora';
    const title=document.createElement('h3');title.textContent=combo.title||'Un combo pensado para ti';
    const reason=document.createElement('p');reason.className='orq-combo-reason';
    reason.textContent=combo.reason||'Dos estilos para acompañarte en momentos diferentes.';
    const list=document.createElement('div');list.className='orq-combo-list';
    const choices=[];
    products.forEach(p=>{
      const item=document.createElement('div');item.className='orq-combo-item';
      const photo=document.createElement('img');
      photo.loading='lazy';photo.alt=p.nombre||'Producto de Orquídea Shop';
      photo.src=typeof img==='function'?img(p.imagen,320):'';
      const detail=document.createElement('div');detail.className='orq-combo-info';
      const name=document.createElement('strong');name.textContent=p.nombre||'Producto';
      const price=document.createElement('span');price.textContent=p.precio||'Precio por confirmar';
      const sizes=String(p.tallas||'').split(',').map(v=>v.trim()).filter(Boolean);
      const select=document.createElement('select');select.className='orq-combo-size';
      select.setAttribute('aria-label','Talla para '+p.nombre);
      if(sizes.length){
        const placeholder=document.createElement('option');placeholder.value='';
        placeholder.textContent='Selecciona tu talla';placeholder.disabled=true;placeholder.selected=true;
        select.appendChild(placeholder);
        sizes.forEach(size=>{
          const option=document.createElement('option');option.value=size;option.textContent='Talla '+size;
          select.appendChild(option);
        });
      }else{
        const option=document.createElement('option');option.value='Por confirmar';
        option.textContent='Talla por confirmar';
        select.appendChild(option);
        select.value='Por confirmar';
      }
      detail.append(name,price,select);item.append(photo,detail);list.appendChild(item);
      choices.push({product:p,select});
    });
    const totalRow=document.createElement('div');totalRow.className='orq-combo-total';
    const label=document.createElement('span');label.textContent='Total de los productos';
    const value=document.createElement('strong');
    value.textContent=currency(Number(combo.total)||products.reduce((a,p)=>a+Number(String(p.precio||'').replace(/\\D/g,'')),0));
    totalRow.append(label,value);
    const note=document.createElement('p');note.className='orq-combo-note';
    note.textContent=combo.pricingNote||'Sin descuento de combo. Existencias y envío por confirmar.';
    const warning=document.createElement('p');warning.className='orq-combo-warning';
    warning.setAttribute('role','status');
    const add=document.createElement('button');add.type='button';
    add.className='orq-combo-add';add.textContent='Agregar selección al carrito';
    add.addEventListener('click',()=>{
      if(typeof cart==='undefined'||!Array.isArray(cart)
        ||typeof saveCart!=='function'||typeof openCart!=='function'){
        warning.textContent='No se pudo abrir el carrito. Puedes elegir cada prenda por separado.';
        return;
      }
      if(choices.some(c=>!c.select.value)){
        warning.textContent='Selecciona la talla de cada prenda para continuar.';
        return;
      }
      const planned=choices.map(({product,select})=>{
        const price=Number(String(product.precio||'').replace(/[^0-9]/g,''));
        return {product,size:select.value,price};
      });
      if(planned.some(x=>!Number.isSafeInteger(x.price)||x.price<=0)){
        warning.textContent='Hay un precio por confirmar. Consulta con la tienda antes de continuar.';
        return;
      }
      // Mutate the existing storefront cart only after all choices are valid.
      for(const {product,size,price} of planned){
        const key=product.nombre+'__'+size;
        const existing=cart.find(x=>x.key===key);
        if(existing)existing.qty+=1;
        else cart.push({key,n:product.nombre,size,qty:1,price,img:product.imagen});
      }
      saveCart();
      closeChat();
      openCart();
    });
    card.append(kicker,title,reason,list,totalRow,note,warning,add);
    messages.appendChild(card);scroll();
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
        body:JSON.stringify({
          message:value,history:history.slice(-8),
          cart:getCart().slice(0,10).map(item=>({nombre:item.n,talla:item.size,cantidad:item.qty}))
        })});
      const body=await response.json().catch(()=>({}));
      loading.remove();
      if(!response.ok){
        assistantHealthy=false;
        textMessage(body.error||'No pude responder por el momento.');
        return;
      }
      textMessage(body.reply);
      assistantHealthy=true;
      const combo=body.combo&&Array.isArray(body.combo.products)?body.combo:null;
      suggestedProducts=combo?combo.products:
        (Array.isArray(body.recommendations)?body.recommendations:[]);
      if(combo)showCombo(combo);
      showProducts(body.recommendations);
      const comboContext=combo?' Combo mostrado: '+combo.products.map(p=>p.nombre).join(' + ')+
        '. Total '+currency(combo.total)+'. Motivo: '+combo.reason:'';
      history.push({role:'user',content:value},
        {role:'assistant',content:safeText(body.reply+comboContext)});
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
    // Explicit click only; on mobile this opens the existing WhatsApp channel.
    window.location.assign(url);
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
  textMessage('¡Hola! 🌸 Soy tu asesora de Orquídea Shop. ¿Qué te gustaría encontrar hoy? Te ayudo a elegir algo que vaya contigo.');
})();