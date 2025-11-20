"""
Módulo de rate limiting
"""
import time
from collections import defaultdict
from config.settings import (
    RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW,
    GLOBAL_RATE_LIMIT_REQUESTS, GLOBAL_RATE_LIMIT_WINDOW
)

# Rate Limit Constants
FREE_REQUEST_LIMIT = 10
FREE_DECODE_LIMIT = 5
LIMIT_WINDOW = 3600  # 1 hour

# Storage
request_counts = defaultdict(list)
decode_counts = defaultdict(list)
global_request_timestamps = []

def cleanup_expired_data():
    """Remove expired rate limiting data"""
    current_time = time.time()
    
    # Cleanup request counts
    for session_id in list(request_counts.keys()):
        request_counts[session_id] = [req_time for req_time in request_counts[session_id] 
                                     if current_time - req_time < LIMIT_WINDOW]
        if not request_counts[session_id]:
            del request_counts[session_id]
            
    # Cleanup decode counts
    for user_id in list(decode_counts.keys()):
        decode_counts[user_id] = [req_time for req_time in decode_counts[user_id] 
                                 if current_time - req_time < LIMIT_WINDOW]
        if not decode_counts[user_id]:
            del decode_counts[user_id]
    
    global global_request_timestamps
    global_request_timestamps = [req_time for req_time in global_request_timestamps 
                                if current_time - req_time < GLOBAL_RATE_LIMIT_WINDOW]


def check_global_rate_limit() -> dict:
    """Checks if the global rate limit has been exceeded"""
    current_time = time.time()
    
    cleanup_expired_data()
    
    global_request_count = len(global_request_timestamps)
    
    reset_time = None
    seconds_until_reset = None
    
    if global_request_timestamps and global_request_count >= GLOBAL_RATE_LIMIT_REQUESTS:
        oldest_request = min(global_request_timestamps)
        reset_time = oldest_request + GLOBAL_RATE_LIMIT_WINDOW
        seconds_until_reset = max(0, int(reset_time - current_time))
        print(f"🌍 Rate limit global atingido: {global_request_count}/{GLOBAL_RATE_LIMIT_REQUESTS}")
        print(f"🌍 Reset em: {seconds_until_reset} segundos")
    
    return {
        "within_limit": global_request_count < GLOBAL_RATE_LIMIT_REQUESTS,
        "current_count": global_request_count,
        "limit": GLOBAL_RATE_LIMIT_REQUESTS,
        "window_seconds": GLOBAL_RATE_LIMIT_WINDOW,
        "reset_time": reset_time,
        "seconds_until_reset": seconds_until_reset
    }


def add_global_request():
    """Adds a new request to the global counter"""
    current_time = time.time()
    global_request_timestamps.append(current_time)


def check_rate_limit(session_id: str, plan_name: str = "free") -> dict:
    """
    Checks if the session is within the rate limit based on plan
    
    Args:
        session_id: Session ID to check
        plan_name: User's plan name (free, premium, enterprise)
    """
    current_time = time.time()
    
    cleanup_expired_data()
    
    # Premium and Enterprise have unlimited requests
    if plan_name in ["premium", "enterprise"]:
        return {
            "within_limit": True,
            "current_count": 0,
            "limit": float('inf'),
            "window_seconds": LIMIT_WINDOW,
            "reset_time": None,
            "seconds_until_reset": None
        }
    
    if not session_id:
        # Fallback for no session ID (shouldn't happen in normal flow)
        limit = FREE_REQUEST_LIMIT
    else:
        limit = FREE_REQUEST_LIMIT
    
    current_requests = [req_time for req_time in request_counts[session_id] 
                       if current_time - req_time < LIMIT_WINDOW]
    
    request_count = len(current_requests)
    
    reset_time = None
    seconds_until_reset = None
    
    if current_requests and request_count >= limit:
        oldest_request = min(current_requests)
        reset_time = oldest_request + LIMIT_WINDOW
        seconds_until_reset = max(0, int(reset_time - current_time))
    
    return {
        "within_limit": request_count < limit,
        "current_count": request_count,
        "limit": limit,
        "window_seconds": LIMIT_WINDOW,
        "reset_time": reset_time,
        "seconds_until_reset": seconds_until_reset
    }


def add_request_to_rate_limit(session_id: str):
    """Adds a new request to the counter"""
    if not session_id:
        return
    
    current_time = time.time()
    request_counts[session_id].append(current_time)


def check_decode_limit(user_id: str, plan_name: str = "free") -> dict:
    """
    Checks if the user is within the decode limit
    
    Args:
        user_id: User ID to check
        plan_name: User's plan name
    """
    current_time = time.time()
    cleanup_expired_data()
    
    # Premium and Enterprise have unlimited decodes
    if plan_name in ["premium", "enterprise"]:
        return {
            "within_limit": True,
            "current_count": 0,
            "limit": float('inf')
        }
        
    # Anonymous users (no user_id) are treated as free
    target_id = user_id if user_id else "anonymous"
    
    current_decodes = [req_time for req_time in decode_counts[target_id] 
                      if current_time - req_time < LIMIT_WINDOW]
    
    decode_count = len(current_decodes)
    
    return {
        "within_limit": decode_count < FREE_DECODE_LIMIT,
        "current_count": decode_count,
        "limit": FREE_DECODE_LIMIT,
        "remaining": max(0, FREE_DECODE_LIMIT - decode_count)
    }


def increment_decode_usage(user_id: str):
    """Increments the decode usage counter"""
    target_id = user_id if user_id else "anonymous"
    current_time = time.time()
    decode_counts[target_id].append(current_time)


def reset_rate_limit(session_id: str):
    """Resets the rate limit counter for a session"""
    if session_id and session_id in request_counts:
        del request_counts[session_id]



