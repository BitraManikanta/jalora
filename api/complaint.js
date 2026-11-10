import { randomBytes } from 'crypto';
import { sb, STATES, CATEGORIES, limited, candidates, sendComplaint } from './_lib.js';
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u0008\u000B-\u001F<>]/g, '').trim().slice(0, n);
export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { token, state, district, category } = req.query;
    if (token) {
      const { data: c } = await sb.from('complaints').select('id,reference,status,email_status,category,locality,district,state,created_at').eq('track_token', String(token)).maybeSingle();
      if (!c) return res.status(404).json({ error: 'Not found' });
      const { data: h } = await sb.from('status_history').select('status,public_note,at').eq('complaint_id', c.id).order('at'); delete c.id;
      return res.json({ ...c, history: h });
    }
    return res.json((await candidates(state, district, category)).map(a => ({ id: a.id, name: a.name, level: a.level, hasEmail: !!a.contact_email, portal_url: a.portal_url })));
  }
  if (req.method !== 'POST') return res.status(405).end();
  if (limited(req, 'c', 5, 3600e3)) return res.status(429).json({ error: 'Too many reports from this connection. Please try later.' });
  const b = req.body || {}; if (b.website) return res.json({ reference: 'JAL-OK', status: 'submitted', emailStatus: 'pending' }); // honeypot
  const f = { category: clean(b.category, 100), state: clean(b.state, 60), district: clean(b.district, 80), locality: clean(b.locality, 120), landmark: clean(b.landmark, 150),
    pin: clean(b.pin, 6), observed_at: clean(b.observedAt, 40), description: clean(b.description, 2000), name: clean(b.name, 100), email: clean(b.email, 120).toLowerCase() };
  const err = [];
  if (!CATEGORIES.includes(f.category)) err.push('Choose a category.');
  if (!STATES.includes(f.state)) err.push('Choose a State/UT.');
  if (!f.district || !f.locality) err.push('District and locality are required.');
  if (f.pin && !/^[1-9][0-9]{5}$/.test(f.pin)) err.push('PIN code must be 6 digits.');
  if (f.description.length < 30) err.push('Please describe what you saw in at least 30 characters.');
  if (f.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) err.push('Email looks invalid.');
  if (!b.consentShare) err.push('Consent to share your report with the authority is required.');
  if (err.length) return res.status(400).json({ errors: err });
  const list = await candidates(f.state, f.district, f.category);
  const a = list.find(x => x.id === b.authorityId && x.contact_email) || list.find(x => x.contact_email) || null; // only verified directory entries
  const { data: c, error } = await sb.from('complaints').insert({ ...f, email: f.email || null, name: f.name || null, reference: 'JAL-' + randomBytes(4).toString('hex').toUpperCase(),
    track_token: randomBytes(24).toString('hex'), consent_share: true, consent_updates: !!b.consentUpdates, authority_id: a?.id || null }).select().single();
  if (error) return res.status(500).json({ error: 'Could not save your report.' });
  await sb.from('status_history').insert({ complaint_id: c.id, status: 'submitted', public_note: 'Report saved on Jalora.', actor: 'system' });
  const emailStatus = await sendComplaint(c, a);
  return res.json({ reference: c.reference, token: c.track_token, emailStatus, authority: a?.name || null, portal: emailStatus === 'no_route' ? list.find(x => x.portal_url)?.portal_url || null : null });
}
