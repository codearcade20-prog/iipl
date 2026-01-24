
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://epxcbynpdaweoczetpri.supabase.co';
const SUPABASE_KEY = 'sb_publishable_HSb-zN_FcrUzlrbSlxPu9g_zgq_qvxf';

export const vendorSupabase = createClient(SUPABASE_URL, SUPABASE_KEY);
