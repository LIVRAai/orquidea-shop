const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyy3xtsPrUmFBIsiD4k4lCS8Y2keMjERdKVoI-gV1rAmDgqxs6rEKN8CESlmwLxKs7x/exec';

export default async function handler(req, res) {
  try {
    const response = await fetch(APPS_SCRIPT_URL, { redirect: 'follow', cache: 'no-store' });
    const payload = await response.json();
    const rows = Array.isArray(payload) ? payload
      : Array.isArray(payload?.products) ? payload.products
      : Array.isArray(payload?.data) ? payload.data : [];
    return res.status(200).json({
      ok: true,
      payloadType: Array.isArray(payload) ? 'array' : typeof payload,
      count: rows.length,
      firstKeys: rows[0] ? Object.keys(rows[0]) : [],
      lastRows: rows.slice(-5),
    });
  } catch (error) {
    return res.status(500).json({ ok:false, error:String(error) });
  }
}