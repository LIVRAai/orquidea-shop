// Secure customer registration. Personal data is never forwarded to OpenAI.
const VERSION='2026-10-29-v1';
const hits=new Map();
function limited(ip){
  const key=String(ip||'unknown').slice(0,100),now=Date.now();
  if(hits.size>4000)for(const [k,v] of hits)if(now-v.at>3600000)hits.delete(k);
  const p=hits.get(key)||{n:0,at:now};
  if(now-p.at>3600000){p.n=0;p.at=now;}
  p.n++;hits.set(key,p);return p.n>15;
}
function sameOrigin(req){
  if(!req.headers.origin)return true;
  try{const u=new URL(req.headers.origin);return u.protocol==='https:'&&(u.hostname==='orquideas-shop.vercel.app'||u.hostname==='orquideas-shop-livra-ai-s-projects.vercel.app'||(/^orquideas-shop-[a-z0-9]+-livra-ai-s-projects\.vercel\.app$/.test(u.hostname)))}catch{return false}
}
function phoneNumber(value){
  const digits=String(value||'').replace(/\D/g,'');
  const local=digits.startsWith('57')&&digits.length===12?digits.slice(2):digits;
  return /^3\d{9}$/.test(local)?'57'+local:null;
}
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({error:'Método no permitido'});
  if(!sameOrigin(req))return res.status(403).json({error:'Origen no permitido'});
  if(limited(req.headers['x-forwarded-for']?.split(',')[0]||req.socket?.remoteAddress))return res.status(429).json({error:'Demasiados intentos. Intenta nuevamente más tarde.'});
  if(Number(req.headers['content-length']||0)>2500)return res.status(413).json({error:'Datos excesivos'});
  const name=String(req.body?.name||'').trim().replace(/\s+/g,' ').slice(0,85);
  const phone=phoneNumber(req.body?.phone);
  if(!/^[\p{L}\p{M} .'’-]{2,85}$/u.test(name)||!phone)
    return res.status(400).json({error:'Revisa el nombre y el número celular colombiano.'});
  if(req.body?.dataConsent!==true||req.body?.consentVersion!==VERSION)
    return res.status(400).json({error:'Debes autorizar el tratamiento de datos para registrar tu contacto.'});
  const marketingConsent=req.body?.marketingConsent===true;
  if(!process.env.CLIENTES_SCRIPT_URL||!process.env.CLIENTES_SCRIPT_SECRET)
    return res.status(503).json({error:'El registro de contactos aún no está habilitado. Puedes continuar la compra por WhatsApp.',code:'REGISTRATION_NOT_CONFIGURED'});
  try{
    const endpoint=new URL(process.env.CLIENTES_SCRIPT_URL);
    if(endpoint.protocol!=='https:'||endpoint.hostname!=='script.google.com'||!endpoint.pathname.endsWith('/exec'))
      throw new Error('Invalid Apps Script endpoint');
    const r=await fetch(endpoint.toString(),{
      method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify({secret:process.env.CLIENTES_SCRIPT_SECRET,name,phone,dataConsent:true,marketingConsent,consentVersion:VERSION}),
      redirect:'follow',signal:AbortSignal.timeout(18000)
    });
    const body=await r.json().catch(()=>null);
    if(!r.ok||body?.ok!==true)throw new Error('Apps Script did not confirm persistence');
    return res.status(200).json({ok:true,saved:true});
  }catch(e){
    console.error('Orquidea contact save failed:',e?.name||'error');
    return res.status(503).json({error:'No se pudo confirmar el registro. No asumiremos que se guardó; puedes continuar a WhatsApp.'});
  }
}
