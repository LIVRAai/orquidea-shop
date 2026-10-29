/* Asesora Orquidea — lightweight storefront UI; no API keys in browser. */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const root=$('orqAssistant');
  if(!root)return;
  // Do not expose an unfinished checkout experience to public visitors.
  // A preview query parameter permits a visual inspection without credentials.
  root.hidden=true;
  const visualPreview=new URLSearchParams(window.location.search).get('previewAsesora')==='1';
  if(visualPreview)root.hidden=false;
  fetch('/api/assistant-status',{cache:'no-store'}).then(r=>r.ok?r.json():null)
    .then(s=>{if(s?.available)root.hidden=false;})
    .catch(()=>{});
  const panel=$('orqAssistantPanel'),launch=$('orqAssistantLaunch');
  const messages=$('orqAssistantMessages'),input=$('orqAssistantInput');
  const send=$('orqAssistantSend'),form=$('orqAssistantForm');
  const lead=$('orqLeadForm'),guest=$('orqGuestCheckout');
  let history=[],busy=false,leadName='';
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
  function openChat(){
    panel.hidden=false;launch.setAttribute('aria-expanded','true');
    input.focus({preventScroll:true});
  }
  function closeChat(){panel.hidden=true;launch.setAttribute('aria-expanded','false');}
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
    busy=true;send.disabled=true;input.disabled=true;
    textMessage(value,'user');input.value='';
    const loading=textMessage('Estoy revisando nuestra colección…');
    try{
      const response=await fetch('/api/assistant',{method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({message:value,history:history.slice(-8)})});
      const body=await response.json().catch(()=>({}));
      loading.remove();
      if(!response.ok){textMessage(body.error||'No pude responder por el momento.');return;}
      textMessage(body.reply);
      showProducts(body.recommendations);
      history.push({role:'user',content:value},{role:'assistant',content:safeText(body.reply)});
      history=history.slice(-12);
      if(body.ready_to_checkout){
        if(hasCart())showLead();
        else textMessage('Cuando tengas tu favorito, pulsa “Elegir talla y agregar” para preparar tu pedido.');
      }
    }catch(e){
      loading.remove();textMessage('No tengo conexión en este momento. Puedes continuar por WhatsApp.');
    }finally{
      busy=false;send.disabled=false;input.disabled=false;
      scroll();
    }
  }
  form.addEventListener('submit',e=>{e.preventDefault();ask(input.value);});
  function showLead(){
    if(!hasCart()){textMessage('Primero elige el producto y la talla para continuar.');return;}
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
    if(url)window.location.assign(url);
    else textMessage('Primero agrega un producto al carrito.');
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