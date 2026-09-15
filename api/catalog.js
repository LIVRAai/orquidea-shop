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

  return rows
    .filter((row) => truthy(row.estado))
    .map((row) => ({
      nombre: String(row.nombre ?? '').trim(),
      descripcion: String(row.descripcion ?? '').trim(),
      tallas: String(row.tallas ?? '').trim(),
      precio: String(row.precio ?? '').trim(),
      categoria: String(row.categoria ?? 'Sin categoría').trim(),
      imagen_catalogo: String(
        row.imagen_catalogo ?? row.imagen ?? row.enlace_imagen ?? row.enlaceImagen ?? ''
      ).trim(),
      destacado: truthy(row.destacado),
      estado: true,
    }))
    .filter((row) => row.nombre && row.imagen_catalogo);
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
