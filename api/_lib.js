import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
export const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
export const STATES = ["Andaman and Nicobar Islands","Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chandigarh","Chhattisgarh","Dadra and Nagar Haveli and Daman and Diu","Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jammu and Kashmir","Jharkhand","Karnataka","Kerala","Ladakh","Lakshadweep","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Puducherry","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal"];
export const CATEGORIES = ["Garbage or plastic dumped in water","Sewage entering a water body","Dirty or stagnant drainage water","Industrial discharge / suspected chemical discharge","Dead fish or unusual visible changes in water","Overflowing drains or wastewater","Contaminated public water source / visible pollution","Other"];
const hits = new Map();
export function limited(req, key, max, ms) { // best-effort; add Upstash/Turnstile for stronger protection
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x'; const k = key + ip, now = Date.now();
  const a = (hits.get(k) || []).filter(t => now - t < ms); a.push(now); hits.set(k, a); return a.length > max;
}
export async function admin(req) {
  const t = (req.headers.authorization || '').replace('Bearer ', ''); if (!t) return null;
  const { data } = await sb.auth.getUser(t); const u = data?.user; if (!u) return null;
  const { data: a } = await sb.from('admin_users').select('user_id').eq('user_id', u.id).maybeSingle(); return a ? u : null;
}
export const audit = (actor, action, detail) => sb.from('audit_log').insert({ actor, action, detail });
export async function candidates(state, district, category) {
  const { data } = await sb.from('authorities').select('id,name,level,state,district,categories,contact_email,portal_url')
    .eq('state', state).eq('active', true).not('verified_on', 'is', null);
  return (data || []).filter(a => (!a.district || a.district === district) && (!a.categories?.length || a.categories.includes(category)))
    .sort((x, y) => (y.district ? 1 : 0) - (x.district ? 1 : 0));
}
export async function sendComplaint(c, a) {
  if (!a?.contact_email) { await sb.from('complaints').update({ email_status: 'no_route' }).eq('id', c.id); return 'no_route'; }
  try {
    const r = await new Resend(process.env.RESEND_API_KEY).emails.send({ from: process.env.MAIL_FROM, to: a.contact_email,
      subject: `Water pollution report ${c.reference}: ${c.category} - ${c.locality}, ${c.district}`,
      text: `Reference: ${c.reference}\nCategory: ${c.category}\nLocation: ${c.locality}, ${c.district}, ${c.state}${c.pin ? ' - ' + c.pin : ''}\nLandmark: ${c.landmark || '-'}\nObserved: ${c.observed_at || 'not stated'}\n\nWhat the reporter observed:\n${c.description}\n\nThis is a citizen report received through Jalora, a student community project. It is not an official government form and has not been laboratory-verified.\nReply-to (reporter consented to share): ${c.email || 'not provided'}` , replyTo: c.consent_share && c.email ? c.email : undefined });
    if (r.error) throw new Error(r.error.message);
    await sb.from('complaints').update({ email_status: 'accepted', email_message_id: r.data.id, email_error: null, status: 'email_accepted' }).eq('id', c.id);
    await sb.from('status_history').insert({ complaint_id: c.id, status: 'email_accepted', public_note: 'Email accepted by the mail provider. This does not confirm that an officer has read it.', actor: 'system' });
    return 'accepted';
  } catch (e) {
    await sb.from('complaints').update({ email_status: 'failed', email_error: String(e.message).slice(0, 300), status: 'email_failed' }).eq('id', c.id);
    await sb.from('status_history').insert({ complaint_id: c.id, status: 'email_failed', public_note: 'Your report is saved, but the email could not be sent yet.', actor: 'system' });
    return 'failed';
  }
}
