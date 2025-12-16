const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

async function testConnection() {
    try {
        const envPath = path.join(__dirname, '.env.local');
        if (!fs.existsSync(envPath)) {
            console.error('❌ .env.local file not found!');
            return;
        }

        const envContent = fs.readFileSync(envPath, 'utf8');
        const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
        const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

        if (!urlMatch || !keyMatch) {
            console.error('❌ Could not find Supabase URL or Key in .env.local');
            console.log('Content preview:', envContent.substring(0, 100));
            return;
        }

        const supabaseUrl = urlMatch[1].trim().replace(/['"]/g, '');
        const supabaseKey = keyMatch[1].trim().replace(/['"]/g, '');

        console.log('Found Supabase URL:', supabaseUrl);
        console.log('Found Supabase Key (first 10 chars):', supabaseKey.substring(0, 10));

        const supabase = createClient(supabaseUrl, supabaseKey);

        console.log('Attempting to connect to Supabase...');
        const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });

        if (error) {
            console.error('❌ Supabase connection failed:', error.message);
            console.error(error);
        } else {
            console.log('✅ Supabase connection successful!');
            console.log('Data:', data);
        }

    } catch (err) {
        console.error('❌ Unexpected error:', err);
    }
}

testConnection();
