# Orquidea Shop

Fuente de verdad del frontend de Orquidea Shop.

## Estructura

- `index.html`: estructura de la tienda.
- `style.css`: estilos y responsive.
- `app.js`: catálogo, destacados, modal, carrito, WhatsApp y popup.
- `api/catalog.js`: puente Vercel → Apps Script → Google Sheets.

## Flujo de trabajo

1. Trabajar y validar cambios localmente.
2. Agrupar cambios relacionados.
3. Crear **una preview** en Vercel.
4. Validar la preview.
5. Promover esa misma preview a producción.
6. Si algo falla, hacer rollback a la última producción estable.

Los cambios de catálogo en Google Sheets (precio, nombre, talla, estado, destacado, descripción, imagen) **no requieren deployment**.

## Producción

https://orquideas-shop.vercel.app

## Google Sheets

La web consume el catálogo mediante Apps Script a través de `/api/catalog`.

## Regla de despliegues

No crear un deployment para probar cada ajuste pequeño. Primero validar localmente; después una preview por versión y promoverla cuando esté certificada.

## Ramas

- `main`: versión estable y certificada.
- `feature/welcome-animation`: trabajo aislado para recuperar la animación premium del popup de bienvenida.
