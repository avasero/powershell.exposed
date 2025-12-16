const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Mock browser APIs
const navigator = { userAgent: 'Node Simulation' };

async function simulateLogin() {
    try {
        const envPath = path.join(__dirname, '.env.local');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
        const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

        const supabaseUrl = urlMatch[1].trim().replace(/['"]/g, '');
        const supabaseKey = keyMatch[1].trim().replace(/['"]/g, '');
        const supabase = createClient(supabaseUrl, supabaseKey);

        const email = 'test_sim@example.com';

        console.log('--- Starting Login Simulation ---');

        // 1. Check Rate Limit
        console.log('1. Checking Rate Limit...');
        const { data: rateLimit, error: rlError } = await supabase.rpc('check_login_rate_limit', {
            p_email: email,
            p_attempt_type: 'login',
            p_window_minutes: 3
        });

        if (rlError) {
            console.log('Rate limit check error (Fail Open):', rlError.message);
        } else {
            console.log('Rate Limit Result:', rateLimit);
            if (!rateLimit.allowed) {
                console.log('❌ Rate limited!');
                return;
            }
        }

        // 2. Get IP (Mock)
        console.log('2. Getting IP...');
        const ipAddress = '127.0.0.1'; // Mock
        console.log('IP:', ipAddress);

        // 3. Sign In With Magic Link
        console.log('3. Sending Magic Link...');
        const { data: authData, error: authError } = await supabase.auth.signInWithOtp({
            email,
            options: {
                shouldCreateUser: true
            }
        });

        if (authError) {
            console.log('❌ Auth Error:', authError.message);
        } else {
            console.log('✅ Auth Success! check email for link.');
            console.log('Data:', authData);
        }

        // 4. Record Attempt
        console.log('4. Recording Attempt...');
        const { error: recError } = await supabase.rpc('record_login_attempt', {
            p_email: email,
            p_attempt_type: 'login',
            p_ip_address: ipAddress,
            p_user_agent: navigator.userAgent
        });

        if (recError) {
            console.log('❌ Record Attempt Error:', recError.message);
        } else {
            console.log('✅ Attempt Recorded.');
        }

        console.log('--- Simulation Complete ---');

    } catch (err) {
        console.error('❌ Unexpected error:', err);
    }
}

simulateLogin();
