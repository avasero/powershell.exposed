
from datetime import datetime, timedelta, timezone

def test_time_logic():
    # Simulate the logic in plan_service.py
    
    # 1. Setup times
    now_utc = datetime.now(timezone.utc)
    print(f"Now UTC: {now_utc}")
    
    # Simulate window start (naive as in code)
    window_start_naive = datetime.utcnow() - timedelta(hours=1)
    print(f"Window Start (Naive): {window_start_naive}")
    print(f"Window Start ISO: {window_start_naive.isoformat()}")
    
    # Simulate a record created 5 minutes ago (so it's fresh)
    # In DB it would be stored as UTC string
    record_created_at_dt = now_utc - timedelta(minutes=5)
    record_created_at_str = record_created_at_dt.isoformat().replace('+00:00', 'Z')
    print(f"Record Created At (DB format): {record_created_at_str}")
    
    # 2. Logic from can_user_decode_commands
    
    # oldest_created_at = records_result.data[0]['created_at']
    oldest_created_at = record_created_at_str
    
    # oldest_time = datetime.fromisoformat(oldest_created_at.replace('Z', '+00:00'))
    oldest_time = datetime.fromisoformat(oldest_created_at.replace('Z', '+00:00'))
    print(f"Oldest Time (Parsed): {oldest_time}")
    
    # reset_time = oldest_time + timedelta(hours=1)
    reset_time = oldest_time + timedelta(hours=1)
    print(f"Reset Time: {reset_time}")
    
    # current_time = datetime.now(reset_time.tzinfo)
    current_time = datetime.now(reset_time.tzinfo)
    print(f"Current Time (Aware): {current_time}")
    
    # seconds_until_reset = max(0, int((reset_time - current_time).total_seconds()))
    seconds_until_reset = max(0, int((reset_time - current_time).total_seconds()))
    print(f"Seconds Until Reset: {seconds_until_reset}")
    print(f"Minutes Until Reset: {seconds_until_reset / 60}")
    
    # Case 2: Record created 55 minutes ago (should reset in 5 mins)
    record_created_at_dt_old = now_utc - timedelta(minutes=55)
    record_created_at_str_old = record_created_at_dt_old.isoformat().replace('+00:00', 'Z')
    
    oldest_time_old = datetime.fromisoformat(record_created_at_str_old.replace('Z', '+00:00'))
    reset_time_old = oldest_time_old + timedelta(hours=1)
    current_time_old = datetime.now(reset_time_old.tzinfo)
    seconds_until_reset_old = max(0, int((reset_time_old - current_time_old).total_seconds()))
    
    print(f"\n--- Old Record (55 mins ago) ---")
    print(f"Seconds Until Reset: {seconds_until_reset_old}")
    print(f"Minutes Until Reset: {seconds_until_reset_old / 60}")

if __name__ == "__main__":
    test_time_logic()
