import { sb, admin, audit } from './_lib.js';
const RULES = { photo: { ext: ['jpg', 'jpeg', 'png', 'webp'], mime: ['image/jpeg', 'image/png', 'image/webp'], max: 5e6 }, pdf: { ext: ['pdf'], mime: ['application/pdf'], max: 10e6 } };
const url = async p => p ? (await sb.storage.from('team').createSignedUrl(p, 3600)).data?.signedUrl : null;
export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { data } = await sb.from('team_members').select('*').order('sort');
    return res.json(await Promise.all((data || []).map(async m => ({ id: m.id, name: m.name, roll_no: m.roll_no, label: m.label, photo: await url(m.photo_path), pdf: await url(m.pdf_path), pdf_name: m.pdf_name }))));
  }
  const u = await admin(req); if (!u) return res.status(401).json({ error: 'Admins only' });
  const { action, id, kind, name = '', type, size, path } = req.body || {}; const r = RULES[kind];
  if (!r || !id) return res.status(400).json({ error: 'Bad request' });
  const { data: m } = await sb.from('team_members').select('*').eq('id', id).single(); if (!m) return res.status(404).json({ error: 'No such member' });
  const col = kind === 'photo' ? 'photo' : 'pdf';
  if (action === 'sign') {
    const ext = name.split('.').pop().toLowerCase();
    if (!r.ext.includes(ext) || !r.mime.includes(type) || !(size > 0 && size <= r.max)) return res.status(400).json({ error: `Invalid file. Allowed: ${r.ext.join(', ')}, max ${r.max / 1e6} MB` });
    const p = `${id}/${kind}-${Date.now()}.${ext}`; const { data, error } = await sb.storage.from('team').createSignedUploadUrl(p);
    return error ? res.status(500).json({ error: error.message }) : res.json({ url: data.signedUrl, path: p });
  }
  if (action === 'commit') {
    if (!String(path).startsWith(`${id}/${kind}-`)) return res.status(400).json({ error: 'Bad path' });
    const old = m[col + '_path']; await sb.from('team_members').update({ [col + '_path']: path, [col + '_name']: name, updated_at: new Date() }).eq('id', id);
    if (old) await sb.storage.from('team').remove([old]); await audit(u.email, 'team_' + kind + '_set', { id }); return res.json({ ok: true });
  }
  if (action === 'remove') {
    if (m[col + '_path']) await sb.storage.from('team').remove([m[col + '_path']]);
    await sb.from('team_members').update({ [col + '_path']: null, [col + '_name']: null }).eq('id', id); await audit(u.email, 'team_' + kind + '_removed', { id }); return res.json({ ok: true });
  }
  res.status(400).json({ error: 'Unknown action' });
}
