# Orquidea Shop — Activación de Asesora IA

Implementación: chatbot comercial, recomendaciones desde el catálogo público de /api/catalog,
tarjetas para seleccionar talla y agregar al carrito existente, derivación a WhatsApp
y captura voluntaria de nombre, celular y consentimiento en la pestaña "Clientes".

## Estado inicial

El código se puede desplegar, pero por seguridad el botón del chat estará OCULTO
hasta que estén configuradas las integraciones de OpenAI y Apps Script.
Para inspeccionar el diseño sin activar nada: abre la tienda agregando
?previewAsesora=1 a su URL. En ese modo los endpoints responderán que faltan credenciales.

No colocar secretos en index.html, en JavaScript del navegador, en GitHub,
en mensajes de chat ni en la hoja de cálculo.

## 1. Google Sheets — preparado

Archivo: Orquideas Shop (se usa el ID del mismo inventario).
Pestaña: Clientes. Columnas A:G:
Fecha de registro | Nombre | Celular | Autorización de datos |
Autorización comercial | Fecha de autorización | Versión del consentimiento

El inventario actual no se modifica. Dado que el archivo se comparte con
otras personas editoras, esas personas podrían ver también la pestaña Clientes.
Revisar permisos de acceso del archivo antes de recopilar datos reales.

## 2. Configurar el guardado con Apps Script

1. En https://script.google.com/ crea un proyecto independiente de Apps Script.
   Usa una cuenta Google con permisos de edición del archivo Orquideas Shop.
2. Sustituye el archivo Code.gs por el contenido de apps-script/clientes.gs.
3. En Configuración del proyecto > Propiedades de secuencia de comandos,
   crea la propiedad CLIENTES_WRITE_SECRET con un secreto aleatorio de al menos
   32 caracteres (por ejemplo, generado en tu Mac con: openssl rand -hex 32).
4. Implementar > Nueva implementación > Tipo "Aplicación web".
   Ejecutar como "Yo", acceso "Cualquiera". El script exige un secreto por POST.
5. Copiar la URL de /exec de esta implementación. El script NO altera el GET
   público de catálogo ya desplegado ni crea una hoja adicional.
6. Verificar permisos y titular/responsable legal de los datos.

## 3. Configurar Vercel

Proyecto: orquideas-shop. En Settings > Environment Variables,
crear como secretos (para Production y Preview):

OPENAI_API_KEY = la clave OpenAI (configúrala allí, nunca en el chat).
CLIENTES_SCRIPT_URL = URL del nuevo Apps Script terminada en /exec.
CLIENTES_SCRIPT_SECRET = el mismo valor de CLIENTES_WRITE_SECRET de Apps Script.
OPENAI_MODEL = gpt-6-luna (opcional, verificable según acceso de tu cuenta OpenAI).

Asegúrate de que la cuenta OpenAI API tenga facturación y permisos para el modelo.
Haz un Redeploy en Vercel después de guardar variables.
No uses el mismo secreto de OpenAI para CLIENTES_SCRIPT_SECRET.

## 4. Validar antes de comunicar el lanzamiento

- Abre /api/assistant-status. Debe informar available:true solo cuando los
  tres secretos relevantes estén presentes (no garantiza credenciales correctas).
- Abre la tienda; verifica que aparece "Asesora con IA".
- Solicita una prenda por ocasión, talla y presupuesto; verifica que devuelve
  exclusivamente productos existentes en Google Sheets.
- Selecciona una tarjeta, elige talla y agrégala al carrito existente.
- Usa "Ya elegí" y confirma que puedes continuar SIN registro a WhatsApp.
- En modo de prueba, con un número bajo tu control y consentimiento informado,
  registra un contacto con autorización necesaria y comercial opcional.
- Verifica que llega a la hoja Clientes sin repetirse en un segundo registro;
  revisa qué sucede cuando revocas el consentimiento comercial.
- Comprueba que el número y nombre no aparecen en historial de conversación
  enviado a OpenAI.
- Revisa que la política de privacidad identifique a la persona o entidad
  legal responsable del negocio antes de aceptar clientes reales.
- Revisa en móviles y navegadores la apertura/cierre del chat,
  popup de Halloween, carrito y WhatsApp.

## Seguridad y restricciones

- /api/assistant consume el catálogo existente, sin escribir inventario.
- El número celular se envía solo a /api/clientes, no a OpenAI.
- /api/clientes valida permisos, consentimiento, formato, versión, evita
  registro a través del navegador directo a Google y no asume guardado si falla.
- Apps Script exige token fuerte y evita duplicados por celular (actualización).
- Los límites de petición en memoria del backend son una mitigación básica
  en servidores sin estado, no un rate limiter distribuido ni WAF: configura
  reglas antiabuso en Vercel antes de tráfico alto.
- La IA no gestiona pagos ni comprueba stock por talla: siempre coordina
  disponibilidad final y pagos en el WhatsApp ya existente.
- No se guarda el historial del chat en Google Sheets.
- No recolectar datos sensibles en la conversación. Si se escriben datos de
  contacto en mensajes libres, el backend intenta redactarlos antes de OpenAI;
  revisa mecanismos adicionales según necesidad.
