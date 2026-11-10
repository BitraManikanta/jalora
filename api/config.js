import { STATES, CATEGORIES } from './_lib.js';
export default (req, res) => res.json({ url: process.env.SUPABASE_URL, anonKey: process.env.SUPABASE_ANON_KEY, states: STATES, categories: CATEGORIES });
