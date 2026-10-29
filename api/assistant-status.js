// Client capabilities: never return credentials or private configuration values.
export default function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0');
  if(req.method!=='GET')return res.status(405).json({error:'Método no permitido'});
  const ai=Boolean(process.env.OPENAI_API_KEY);
  // Do not collect personal data until persistence and the privacy notice are ready.
  const registration=ai&&Boolean(process.env.CLIENTES_SCRIPT_URL&&process.env.CLIENTES_SCRIPT_SECRET)
    &&process.env.CUSTOMER_PRIVACY_APPROVED==='true';
  return res.status(200).json({
    ok:true,
    available:ai,
    registrationAvailable:registration
  });
}
