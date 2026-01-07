import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

def verify_trigger():
    # Load environment variables
    load_dotenv('.env.local')
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        print("❌ Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env.local")
        return

    supabase: Client = create_client(url, key)
    print("✅ Connected to Supabase")

    # 1. Setup test data
    test_indicator_name = "Test Cache Invalidation"
    test_phash = "test_phash_123"
    
    # Clean up existing test data
    supabase.table('powershell_signatures').delete().eq('name', test_indicator_name).execute()
    supabase.table('cache_results').delete().eq('phash', test_phash).execute()

    print("📊 Setting up test data...")
    
    # 2. Insert a test signature
    sig_response = supabase.table('powershell_signatures').insert({
        "name": test_indicator_name,
        "patterns": ["test_pattern"],
        "basescore": 5.0,
        "severity": "medium",
        "is_active": True,
        "file_path": "indicators/test.yaml"
    }).execute()
    
    if not sig_response.data:
        print("❌ Failed to insert test signature")
        return
    
    sig_id = sig_response.data[0]['id']
    print(f"✅ Inserted test signature: {test_indicator_name}")

    # 3. Insert a cache record that "matches" this indicator
    cache_response = supabase.table('cache_results').insert({
        "phash": test_phash,
        "indicators_matched": [{"name": test_indicator_name}],
        "results_blob": {"test": "data"}
    }).execute()

    if not cache_response.data:
        print("❌ Failed to insert test cache record")
        return
    print(f"✅ Inserted test cache record with phash: {test_phash}")

    # 4. Trigger invalidation (update the signature)
    print(f"🔄 Triggering invalidation by updating {test_indicator_name}...")
    supabase.table('powershell_signatures').update({
        "basescore": 6.0
    }).eq('id', sig_id).execute()

    # 5. Check if cache was cleared
    check_response = supabase.table('cache_results').select('phash').eq('phash', test_phash).execute()
    
    if len(check_response.data) == 0:
        print("🎉 SUCCESS: Cache record was automatically cleared by the trigger!")
    else:
        print("❌ FAILURE: Cache record still exists.")

    # Cleanup
    supabase.table('powershell_signatures').delete().eq('id', sig_id).execute()
    supabase.table('cache_results').delete().eq('phash', test_phash).execute()
    print("🧹 Cleaned up test data.")

if __name__ == "__main__":
    verify_trigger()
