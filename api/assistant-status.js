// Public capability check: reveals no credentials or account details.
export default function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).json({error:'Método no permitido'});
  const ai=Boolean(process.env.OPENAI_API_KEY);
  const capture=Boolean(process.env.CLIENTES_SCRIPT_URL&&process.env.CLIENTES_SCRIPT_SECRET);
  return res.status(200).json({ok:true,available:ai&&capture});
}
