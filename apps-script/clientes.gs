/**
 * Orquidea Shop — escritura de clientes en el mismo Google Sheets.
 * Despliega este archivo como proyecto Apps Script INDEPENDIENTE, Web App:
 * Ejecutar como: yo. Acceso: cualquiera (el endpoint verifica el secreto).
 * En Project Settings > Script properties: CLIENTES_WRITE_SECRET = secreto aleatorio fuerte.
 * NO copiar el secreto a este archivo ni al frontend.
 *
 * IMPORTANTE: Esta función solo acepta POST para clientes; no toca doGet del catálogo.
 */
const ORQ_SPREADSHEET_ID='13LePJYS6Wv8Wvsp7ZlrbSkCDLeCyuKzN0orgC4Ox8EU';
const ORQ_SHEET_NAME='Clientes';
const ORQ_CONSENT_VERSION='2026-10-29-v1';
function json_(payload){
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
function doPost(e){
  const expected=PropertiesService.getScriptProperties().getProperty('CLIENTES_WRITE_SECRET');
  if(!expected||expected.length<32)return json_({ok:false,error:'Not configured'});
  let request;
  try{request=JSON.parse((e&&e.postData&&e.postData.contents)||'{}');}
  catch(err){return json_({ok:false,error:'Invalid JSON'});}
  if(String(request.secret||'')!==expected)return json_({ok:false,error:'Unauthorized'});
  const name=String(request.name||'').trim().replace(/\s+/g,' ').slice(0,85);
  const phone=String(request.phone||'').trim();
  if(!/^[\p{L}\p{M} .'’-]{2,85}$/u.test(name)||!/^573\d{9}$/.test(phone)
    ||request.dataConsent!==true||request.consentVersion!==ORQ_CONSENT_VERSION){
    return json_({ok:false,error:'Invalid consent or contact'});
  }
  const marketing=request.marketingConsent===true?'Sí':'No';
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(15000))return json_({ok:false,error:'Busy'});
  try{
    const workbook=SpreadsheetApp.openById(ORQ_SPREADSHEET_ID);
    const sheet=workbook.getSheetByName(ORQ_SHEET_NAME);
    if(!sheet)return json_({ok:false,error:'Clients tab missing'});
    const now=Utilities.formatDate(new Date(),'America/Bogota','yyyy-MM-dd HH:mm:ss');
    const rowCount=sheet.getLastRow();
    let target=0;
    if(rowCount>1){
      const phones=sheet.getRange(2,3,rowCount-1,1).getDisplayValues();
      const index=phones.findIndex(row=>String(row[0]).replace(/\D/g,'')===phone);
      if(index>=0)target=index+2;
    }
    const writeRow=target||rowCount+1;
    const registeredAt=target?sheet.getRange(writeRow,1).getDisplayValue():now;
    sheet.getRange(writeRow,3).setNumberFormat('@');
    sheet.getRange(writeRow,1,1,7).setValues([[
      registeredAt,name,phone,'Sí',marketing,now,ORQ_CONSENT_VERSION
    ]]);
    return json_({ok:true});
  }catch(err){
    console.error('Fallo al guardar registro en Clientes');
    return json_({ok:false,error:'Write failed'});
  }finally{lock.releaseLock();}
}
