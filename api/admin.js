import { sb, admin, audit, sendComplaint } from './_lib.js';
const STAT = ['submitted', 'email_pending', 'email_accepted', 'email_failed', 'acknowledged', 'under_review', 'resolved', 'closed'];
export default async function handler(req, res) {
  const u = await admin(req); if (!u) return res.status(401).json({ error: 'Admins only' });
  if (req.method === 'GET') {
    const w = req.query.what, q = String(req.query.q || '').trim();
    if (w === 'complaints') { let s = sb.from('complaints').select('id,reference,category,state,district,locality,description,email,status,email_status,email_error,created_at,authorities(name)').order('created_at', { ascending: false }).limit(100);
      if (req.query.status) s = s.eq('status', req.query.status); if (q) s = s.or(`reference.ilike.%${q.replace(/[,()]/g, '')}%,district.ilike.%${q.replace(/[,()]/g, '')}%`); return res.json((await s).data); }
    if (w === 'authorities') return res.json((await sb.from('authorities').select('*').order('state')).data);
    if (w === 'audit') return res.json((await sb.from('audit_log').select('*').order('at', { ascending: false }).limit(100)).data);
    return res.status(400).end();
  }
  const b = req.body || {};
  if (b.action === 'status' && STAT.includes(b.status)) {
    await sb.from('complaints').update({ status: b.status }).eq('id', b.id);
    await sb.from('status_history').insert({ complaint_id: b.id, status: b.status, public_note: b.publicNote || null, internal_note: b.internalNote || null, actor: u.email });
    await audit(u.email, 'status', { id: b.id, status: b.status }); return res.json({ ok: true });
  }
  if (b.action === 'retry') { // same record, no duplicate
    const { data: c } = await sb.from('complaints').select('*, authorities(*)').eq('id', b.id).single();
    const r = await sendComplaint(c, c.authorities); await audit(u.email, 'email_retry', { id: b.id, result: r }); return res.json({ result: r });
  }
  if (b.action === 'authority') {
    const a = b.authority || {}; if (!a.name || !a.state || !a.source_url) return res.status(400).json({ error: 'Name, state and official source URL are required.' });
    const row = { name: a.name, level: a.level || null, state: a.state, district: a.district || null, categories: a.categories?.length ? a.categories : null, contact_email: a.contact_email || null, portal_url: a.portal_url || null, source_url: a.source_url, verified_on: a.verified_on || null, active: a.active !== false };
    const r = a.id ? await sb.from('authorities').update(row).eq('id', a.id) : await sb.from('authorities').insert(row);
    await audit(u.email, 'authority_upsert', { name: a.name }); return r.error ? res.status(400).json({ error: r.error.message }) : res.json({ ok: true });
  }
  res.status(400).json({ error: 'Unknown action' });
}
