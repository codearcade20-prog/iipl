const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://epxcbynpdaweoczetpri.supabase.co';
const supabaseKey = 'sb_publishable_HSb-zN_FcrUzlrbSlxPu9g_zgq_qvxf';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('Checking schema for sub_vendor_checklists...');
    const { data, error } = await supabase
        .from('sub_vendor_checklists')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching data:', error.message);
    } else if (data && data.length > 0) {
        console.log('Columns found:', Object.keys(data[0]));
    } else {
        console.log('No data found to check columns.');
    }
}

checkSchema();
