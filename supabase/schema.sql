-- Run once in Supabase > SQL Editor
create extension if not exists pgcrypto;
create table team_members(id uuid primary key default gen_random_uuid(), sort int, name text not null, roll_no text not null unique, label text default 'CSP Team Member',
 photo_path text, photo_name text, pdf_path text, pdf_name text, updated_at timestamptz default now());
insert into team_members(sort,name,roll_no) values (1,'Bitra Manikanta','24JNA30017'),(2,'Vardhan','24JNA30031'),(3,'Gowtham Krishna','24JNA30056'),(4,'Rahul','24JNA30054');
create table authorities(id uuid primary key default gen_random_uuid(), name text not null, level text, state text not null, district text,
 categories text[], contact_email text, portal_url text, source_url text not null, verified_on date, active boolean default true);
create table complaints(id uuid primary key default gen_random_uuid(), reference text unique not null, track_token text unique not null,
 category text not null, state text not null, district text not null, locality text not null, landmark text, pin text, observed_at text, description text not null,
 name text, email text, consent_share boolean not null, consent_updates boolean default false,
 authority_id uuid references authorities(id), status text not null default 'submitted', email_status text not null default 'pending',
 email_message_id text, email_error text, created_at timestamptz default now());
create table status_history(id bigserial primary key, complaint_id uuid references complaints(id) on delete cascade, status text, public_note text, internal_note text, actor text, at timestamptz default now());
create table admin_users(user_id uuid primary key, email text);
create table audit_log(id bigserial primary key, actor text, action text, detail jsonb, at timestamptz default now());
alter table team_members enable row level security; alter table authorities enable row level security; alter table complaints enable row level security;
alter table status_history enable row level security; alter table admin_users enable row level security; alter table audit_log enable row level security;
-- no policies: only the server (service role) can read/write these tables.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('team','team',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf']);
