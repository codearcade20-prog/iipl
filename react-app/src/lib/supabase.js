
import { createClient } from '@supabase/supabase-js';

// User provided credentials
const supabaseUrl = 'https://ujaycpygrgfqlgwfprrc.supabase.co';
// WARNING: The key below was pasted partially ('...') by the user. 
// Please replace 'YOUR_FULL_ANON_KEY_HERE' with the actual full key from your Supabase Dashboard -> Settings -> API.
const supabaseKey = 'sb_publishable_Ji-tHybQnkMScM2kUqZMdQ_TfUSVSoX';

export const supabase = createClient(supabaseUrl, supabaseKey);
