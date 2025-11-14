"""
Módulo de rate limiting
"""
import time
from collections import defaultdict
from config.settings import (
    RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW,
    GLOBAL_RATE_LIMIT_REQUESTS, GLOBAL_RATE_LIMIT_WINDOW
)

request_counts = defaultdict(list)  
global_request_timestamps = []  

def cleanup_expired_data():
    """Remove expired rate limiting data"""
    current_time = time.time()
    
    for session_id in list(request_counts.keys()):
        request_counts[session_id] = [req_time for req_time in request_counts[session_id] 
                                     if current_time - req_time < RATE_LIMIT_WINDOW]
        if not request_counts[session_id]:
            del request_counts[session_id]
    
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


def check_rate_limit(session_id: str) -> dict:
    """Checks if the session is within the rate limit"""
    current_time = time.time()
    
    cleanup_expired_data()
    
    if not session_id:
        return {
            "within_limit": True,
            "current_count": 0,
            "limit": RATE_LIMIT_REQUESTS,
            "window_seconds": RATE_LIMIT_WINDOW,
    
            "reset_time": None,
            "seconds_until_reset": None
        }
    
    current_requests = [req_time for req_time in request_counts[session_id] 
                       if current_time - req_time < RATE_LIMIT_WINDOW]
    
    request_count = len(current_requests)
    
    reset_time = None
    seconds_until_reset = None
    
    if current_requests and request_count >= RATE_LIMIT_REQUESTS:
        oldest_request = min(current_requests)
        reset_time = oldest_request + RATE_LIMIT_WINDOW
        seconds_until_reset = max(0, int(reset_time - current_time))
    
    return {
        "within_limit": request_count < RATE_LIMIT_REQUESTS,
        "current_count": request_count,
        "limit": RATE_LIMIT_REQUESTS,  
        "window_seconds": RATE_LIMIT_WINDOW,  
        "reset_time": reset_time,
        "seconds_until_reset": seconds_until_reset
    }


def add_request_to_rate_limit(session_id: str):
    """Adds a new request to the counter"""
    if not session_id:
        return
    
    current_time = time.time()
    request_counts[session_id].append(current_time)


def reset_rate_limit(session_id: str):
    """Resets the rate limit counter for a session"""
    if session_id and session_id in request_counts:
        del request_counts[session_id]



