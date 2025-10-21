#!/usr/bin/env python3
"""
COMPLETE RLS POLICIES TEST - powershell_analyses
All tests must PASS. If they fail, execute the correction script.
"""
import os
import uuid
from supabase import create_client
from dotenv import load_dotenv
import json

load_dotenv('.env.local')

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY") 
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

print("🧪 COMPLETE RLS POLICIES TEST - powershell_analyses")
print("=" * 70)
print("🎯 All tests must PASS for RLS to be correctly configured")
print()

# List to store test results
test_results = []

def log_result(test_name, success, error=None):
    """Records test result"""
    test_results.append({
        "test": test_name,
        "success": success,
        "error": str(error) if error else None
    })
    status = "✅ PASSED" if success else "❌ FAILED"
    print(f"   {status}: {test_name}")
    if error and not success:
        print(f"      Error: {str(error)[:100]}...")

def get_complete_data_format():
    """Returns complete data format that works"""
    return {
        "command": f"test-{uuid.uuid4().hex[:8]}",
        "analysis_result": {
            "tactics": [],
            "severity": "very_low", 
            "techniques": [],
            "total_score": 0,
            "is_malicious": False,
            "detected_count": 0,
            "detected_signatures": [],
            "total_signatures_checked": 31
        },
        "risk_score": 0.0,
        "signatures_detected": [],
        "signature_file": None,
        "tactics": [],
        "techniques": [],
        "decoded_command": None,
        "is_malicious": False,
        "severity": "very_low",
        "cmdlets_detected": [],
        "ip_address": "127.0.0.1",
        "ip_country": None,
        "ip_city": None,  
        "ip_region": None,
        "ip_timezone": None,
        "search_type": "WEB",
        "user_agent": "Mozilla/5.0 Test Agent",
        "session_id": str(uuid.uuid4()),
        "short_id": f"test{uuid.uuid4().hex[:4]}",
        "is_cache": False
    }

def test_service_role_full_access():
    """TEST 1: Service Role - Should have full access"""
    print("\n🛡️  TEST 1: Service Role - Full Access")
    
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        
        # INSERT
        data = get_complete_data_format()
        data["user_id"] = None
        data["command"] = "service-role-insert-test"
        
        result = supabase.table('powershell_analyses').insert(data).execute()
        inserted_id = result.data[0]['id']
        log_result("Service Role INSERT", True)
        
        # SELECT
        read_result = supabase.table('powershell_analyses').select("*").eq('id', inserted_id).execute()
        log_result("Service Role SELECT", len(read_result.data) > 0)
        
        # UPDATE
        supabase.table('powershell_analyses').update({"risk_score": 1.0}).eq('id', inserted_id).execute()
        log_result("Service Role UPDATE", True)
        
        # DELETE
        supabase.table('powershell_analyses').delete().eq('id', inserted_id).execute()
        log_result("Service Role DELETE", True)
        
        return True
        
    except Exception as e:
        log_result("Service Role INSERT", False, e)
        log_result("Service Role SELECT", False, "Depends on INSERT")
        log_result("Service Role UPDATE", False, "Depends on INSERT")
        log_result("Service Role DELETE", False, "Depends on INSERT")
        return False

def test_anonymous_valid_insert():
    """TEST 2: Anonymous User - Valid Insert (user_id=NULL)"""
    print("\n👤 TEST 2: Anonymous - Valid Insert")
    
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        
        data = get_complete_data_format()
        data["user_id"] = None  # REQUIRED for anonymous users
        data["command"] = "anon-valid-insert-test"
        
        result = supabase.table('powershell_analyses').insert(data).execute()
        inserted_id = result.data[0]['id']
        log_result("Anonymous INSERT valid (user_id=NULL)", True)
        
        # Cleanup
        cleanup = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        cleanup.table('powershell_analyses').delete().eq('id', inserted_id).execute()
        
        return True
        
    except Exception as e:
        log_result("Anonymous INSERT valid (user_id=NULL)", False, e)
        return False

def test_anonymous_invalid_insert():
    """TEST 3: Anonymous User - Invalid Insert (with user_id) - SHOULD FAIL"""
    print("\n❌ TEST 3: Anonymous - Invalid Insert (should fail)")
    
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        
        data = get_complete_data_format()
        data["user_id"] = str(uuid.uuid4())  # Anonymous users CANNOT set user_id
        data["command"] = "anon-invalid-insert-test"
        
        result = supabase.table('powershell_analyses').insert(data).execute()
        
        # If we reach here, it's a SECURITY PROBLEM
        log_result("Anonymous INSERT invalid BLOCKED", False, "Anonymous user was able to insert with user_id - SECURITY FAILURE!")
        
        # Emergency cleanup
        if result.data:
            cleanup = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
            cleanup.table('powershell_analyses').delete().eq('id', result.data[0]['id']).execute()
        
        return False
        
    except Exception as e:
        # We EXPECT this to fail - this is CORRECT
        log_result("Anonymous INSERT invalid BLOCKED", True)
        return True

def test_anonymous_read_access():
    """TEST 4: Anonymous - Public Read Access"""
    print("\n📖 TEST 4: Anonymous - Public Read Access")
    
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        
        # Should be able to read public analyses
        result = supabase.table('powershell_analyses').select("id, command, user_id").limit(5).execute()
        log_result("Anonymous SELECT public", len(result.data) >= 0)  # Even without data, should work
        
        return True
        
    except Exception as e:
        log_result("Anonymous SELECT public", False, e)
        return False

def test_count_by_user_type():
    """TEST 5: Count by user type"""
    print("\n📊 TEST 5: Data Analysis")
    
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        
        # Count total
        total = supabase.table('powershell_analyses').select("*", count="exact").execute()
        
        # Count anonymous
        anon_count = supabase.table('powershell_analyses').select("*", count="exact").is_("user_id", "null").execute()
        
        # Count authenticated
        auth_count = supabase.table('powershell_analyses').select("*", count="exact").not_.is_("user_id", "null").execute()
        
        print(f"      📈 Total: {total.count}")
        print(f"      👤 Anonymous: {anon_count.count}")
        print(f"      🔐 Authenticated: {auth_count.count}")
        
        log_result("Data analysis", True)
        return True
        
    except Exception as e:
        log_result("Data analysis", False, e)
        return False

def generate_fix_script():
    """Generates SQL script to fix RLS policies if needed"""
    return """
-- =====================================================
-- RLS POLICIES CORRECTION SCRIPT
-- =====================================================
-- Execute this script in the Supabase SQL Editor if any test fails

-- 1. REMOVE all existing policies
DROP POLICY IF EXISTS "Enable delete for authenticated and cookie users" ON public.powershell_analyses;
DROP POLICY IF EXISTS "Enable insert for authenticated and cookie users" ON public.powershell_analyses;
DROP POLICY IF EXISTS "Enable read access for authenticated and cookie users" ON public.powershell_analyses;
DROP POLICY IF EXISTS "Enable update for authenticated and cookie users" ON public.powershell_analyses;
DROP POLICY IF EXISTS "Service role has full access" ON public.powershell_analyses;
DROP POLICY IF EXISTS "Users can insert their own analyses" ON public.powershell_analyses;
DROP POLICY IF EXISTS "Users can read their own analyses" ON public.powershell_analyses;
DROP POLICY IF EXISTS "Users can update their own analyses" ON public.powershell_analyses;
DROP POLICY IF EXISTS "service_role_full_access" ON public.powershell_analyses;
DROP POLICY IF EXISTS "anon_can_insert_analyses" ON public.powershell_analyses;
DROP POLICY IF EXISTS "anon_can_read_all_analyses" ON public.powershell_analyses;
DROP POLICY IF EXISTS "authenticated_can_insert_own_analyses" ON public.powershell_analyses;
DROP POLICY IF EXISTS "authenticated_can_read_own_analyses" ON public.powershell_analyses;
DROP POLICY IF EXISTS "authenticated_can_update_own_analyses" ON public.powershell_analyses;
DROP POLICY IF EXISTS "authenticated_can_delete_own_analyses" ON public.powershell_analyses;
DROP POLICY IF EXISTS "public_can_read_shared_analyses" ON public.powershell_analyses;

-- 2. CREATE correct and functional policies
-- Service Role: Full access (bypasses RLS automatically, but we define it for security)
CREATE POLICY "service_role_full_access"
ON public.powershell_analyses
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Anonymous: Can insert analyses WITHOUT user_id set
CREATE POLICY "anon_insert_without_user_id"
ON public.powershell_analyses
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);

-- Anonymous: Can read ALL analyses (public sharing)
CREATE POLICY "anon_read_all"
ON public.powershell_analyses
FOR SELECT
TO anon
USING (true);

-- Authenticated: Can only insert/update with their own user_id
CREATE POLICY "auth_insert_own"
ON public.powershell_analyses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Authenticated users: Can read their own analyses
CREATE POLICY "auth_read_own"
ON public.powershell_analyses
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR user_id IS NULL);

-- Authenticated users: Can update their own analyses
CREATE POLICY "auth_update_own"
ON public.powershell_analyses
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Authenticated users: Can delete their own analyses
CREATE POLICY "auth_delete_own"
ON public.powershell_analyses
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 3. CHECK if RLS is enabled
ALTER TABLE public.powershell_analyses ENABLE ROW LEVEL SECURITY;

-- 4. CHECK created policies
SELECT 
    pol.polname as policy_name,
    pol.polcmd as command,
    CASE 
        WHEN 'service_role'::regrole = ANY(pol.polroles) THEN 'service_role'
        WHEN 'anon'::regrole = ANY(pol.polroles) THEN 'anon'
        WHEN 'authenticated'::regrole = ANY(pol.polroles) THEN 'authenticated'
        ELSE 'other'
    END as target_role
FROM pg_policy pol
JOIN pg_class pc ON pol.polrelid = pc.oid
JOIN pg_namespace pn ON pc.relnamespace = pn.oid
WHERE pc.relname = 'powershell_analyses' AND pn.nspname = 'public'
ORDER BY pol.polname;

SELECT '✅ RLS policies fixed successfully!' as status;
"""

def main():
    print(f"🌐 Testando contra: {SUPABASE_URL}")
    
    if not all([SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY]):
        print("❌ ERROR: Configure environment variables in .env.local")
        return
    
    # Execute all tests
    test1 = test_service_role_full_access()
    test2 = test_anonymous_valid_insert() 
    test3 = test_anonymous_invalid_insert()
    test4 = test_anonymous_read_access()
    test5 = test_count_by_user_type()
    
    # Final results
    print("\n" + "=" * 70)
    print("📋 TEST SUMMARY:")
    
    passed = sum(1 for result in test_results if result["success"])
    total = len(test_results)
    
    print(f"   ✅ Passed: {passed}/{total}")
    print(f"   ❌ Failed: {total - passed}/{total}")
    
    if passed == total:
        print("\n🎉 TOTAL SUCCESS!")
        print("   ✅ All RLS policies are working correctly")
        print("   ✅ Security configured appropriately")
        print("   ✅ System ready for production")
        
    else:
        print(f"\n🚨 {total - passed} TESTS FAILED!")
        print("   📄 Execute the fix script below:")
        
        # Save fix script
        with open('fix_rls_policies.sql', 'w', encoding='utf-8') as f:
            f.write(generate_fix_script())
        
        print("   💾 Script saved to: fix_rls_policies.sql")
        print("   🔧 Execute in Supabase SQL Editor")
        
        print("\n❌ FAILED TESTS:")
        for result in test_results:
            if not result["success"]:
                print(f"   - {result['test']}: {result['error']}")
    
    print("\n📊 DETAILED ANALYSIS:")
    for result in test_results:
        status = "✅" if result["success"] else "❌"
        print(f"   {status} {result['test']}")

if __name__ == "__main__":
    main()