
import { createClient } from '@supabase/supabase-js';
// Use a proxy URL to bypass office firewalls that block *.supabase.co
// This matches the rewrite in vercel.json and the proxy in vite.config.js
const supabaseUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/supabase-api`
    : 'https://epxcbynpdaweoczetpri.supabase.co';

const supabaseKey = 'sb_publishable_HSb-zN_FcrUzlrbSlxPu9g_zgq_qvxf';

export const supabase = createClient(supabaseUrl, supabaseKey);
