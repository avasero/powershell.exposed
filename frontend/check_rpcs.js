const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

async function checkRpcs() {
    try {
        const envPath = path.join(__dirname, '.env.local');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
        const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

        const supabaseUrl = urlMatch[1].trim().replace(/['"]/g, '');
        const supabaseKey = keyMatch[1].trim().replace(/['"]/g, '');

        const supabase = createClient(supabaseUrl, supabaseKey);

        console.log('Checking for RPCs...');

        // Call the check_login_rate_limit RPC incorrectly to see if it responds (it should error but exist)
        // Or better, try to list functions via SQL if possible? 
        // Usually we can't run arbitrary SQL from client unless RPC allowed.
        // So we will try to call them and see the error.

        const { data: data1, error: error1 } = await supabase.rpc('check_login_rate_limit', {
            p_email: 'test@example.com',
            p_attempt_type: 'login',
            p_window_minutes: 3
        });

        if (error1) {
            console.log('check_login_rate_limit attempt result:', error1.message);
            if (error1.code === 'PGRST202') // function not found
                console.log('-> Function check_login_rate_limit DOES NOT exist.');
            else console.log('-> Function check_login_rate_limit exists (or different error).');
        } else {
            console.log('-> Function check_login_rate_limit exists and works.');
        }

        const { data: data2, error: error2 } = await supabase.rpc('record_login_attempt', {
            p_email: 'test@example.com',
            p_attempt_type: 'login',
            p_ip_address: '127.0.0.1',
            p_user_agent: 'Node script'
        });

        if (error2) {
            console.log('record_login_attempt attempt result:', error2.message);
            if (error2.code === 'PGRST202')
                console.log('-> Function record_login_attempt DOES NOT exist.');
            else console.log('-> Function record_login_attempt exists (or different error).');
        } else {
            console.log('-> Function record_login_attempt exists and works.');
        }

    } catch (err) {
        console.error('❌ Unexpected error:', err);
    }
}

checkRpcs();
