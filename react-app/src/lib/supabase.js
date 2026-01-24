
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://epxcbynpdaweoczetpri.supabase.co';
const supabaseKey = 'sb_publishable_HSb-zN_FcrUzlrbSlxPu9g_zgq_qvxf';

export const supabase = createClient(supabaseUrl, supabaseKey);
