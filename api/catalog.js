const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyy3xtsPrUmFBIsiD4k4lCS8Y2keMjERdKVoI-gV1rAmDgqxs6rEKN8CESlmwLxKs7x/exec';

const truthy = (value) => {
  if (value === true) return true;
  const normalized = String(value ?? '').trim().toLowerCase();
  return ['si', 'sí', 'true', '1', 'yes', 'activa', 'activo', 'active'].includes(normalized);
};

const normalizeRows = (payload) => {
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.products)
      ? payload.products
      : Array.isArray(payload?.data)
        ? payload.data
        : [];

  const pick = (row, ...keys) => {
    for (const key of keys) {
      if (row?.[key] !== undefined && row?.[key] !== null && String(row[key]).trim() !== '') {
        return row[key];
      }
    }
    return '';
  };

  return rows
    .filter((row) => truthy(pick(row, 'estado', 'Estado', 'ESTADO')))
    .map((row) => ({
      nombre: String(pick(row, 'nombre', 'Nombre')).trim(),
      descripcion: String(pick(row, 'descripcion', 'Descripción', 'Descripcion')).trim(),
      tallas: String(pick(row, 'tallas', 'Tallas')).trim(),
      precio: String(pick(row, 'precio', 'Precio')).trim(),
      categoria: String(pick(row, 'categoria', 'Categoria', 'Categoría') || 'Sin categoría').trim(),
      imagen_catalogo: String(
        pick(row, 'imagen_catalogo', 'imagenCatalogo', 'Imagen Catalogo', 'Imagen Catálogo')
      ).trim(),
      enlace_imagen: String(
        pick(row, 'enlace_imagen', 'enlaceImagen', 'Enlace Imagen', 'imagen', 'Imagen')
      ).trim(),
      destacado: truthy(pick(row, 'destacado', 'Destacado')),
      portada: truthy(pick(row, 'portada', 'Portada')),
      estado: true,
    }))
    .filter((row) => row.nombre && (row.imagen_catalogo || row.enlace_imagen));
};

async function fetchSheet() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      redirect: 'follow',
      cache: 'no-store',
      signal: controller.signal,
      headers: { accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Apps Script respondió ${response.status}`);
    return normalizeRows(await response.json());
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req, res) {
  try {
    const products = await fetchSheet();
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({
      ok: true,
      source: 'google-sheets',
      products,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({
      ok: false,
      error: 'No fue posible actualizar el catálogo desde Google Sheets.',
      detail: String(error),
    });
  }
}
