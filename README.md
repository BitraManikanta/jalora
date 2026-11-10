# Jalora additions: Our Team + Report Pollution

Adds new pages to your EXISTING Jalora site. It does not change `index.html`.

## 1. Add to your project
Copy everything in this folder into the ROOT of your Jalora project (next to `index.html`). If you already have `package.json`, merge the two dependencies. Then add these links to your existing menu in `index.html`:
`<a href="/team.html">Our Team</a> <a href="/report.html">Report pollution</a>`

## 2. Supabase (free; database + private files + admin login)
1. Create a project at supabase.com.
2. SQL Editor > paste `supabase/schema.sql` > Run.
3. Authentication > Users > Add user (your email + a strong password).
4. In SQL Editor run, using that user's ID (Users page): `insert into admin_users(user_id,email) values ('USER-ID','your@email');`
5. Project Settings > API: copy URL, anon key, service_role key.

## 3. Email (Resend)
Create a Resend account, verify a sending domain, create an API key. `MAIL_FROM` must use that verified domain.

## 4. Vercel
Project > Settings > Environment Variables: add every name in `.env.example` with real values. Redeploy. NEVER commit real keys.

## 5. Use it
- `/admin.html` > sign in > Team files: upload each member's photo and PDF.
- Authorities tab: add contacts ONLY from official government pages, with the source URL and verification date. Without a verified authority with an email, no complaint is emailed (it is saved and the user is told).
- Test: submit a report on /report.html using an authority whose email is your own test address.

## Districts
`data/districts.json` is empty, so district is typed by hand. To get dropdown suggestions fill it as `{"State name":["District",...]}` from the official Local Government Directory (lgdirectory.gov.in) and refresh it when districts change.

## Not included yet
Evidence photo upload, per-email rate limits, CAPTCHA (add Cloudflare Turnstile), locality datasets, map pin, automatic data deletion, authority acknowledgement integration. Rate limiting here is basic and in-memory.
## Not tested
This code was written without being run against your Supabase/Resend/Vercel. Test every step above before sharing the link.
