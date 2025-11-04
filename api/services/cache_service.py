"""
Cache Service for PowerShell Analysis Results
Implements the caching workflow to avoid redundant analyses
"""
import json
import zlib
from typing import Optional, Dict, Any, Tuple
from services.session_manager import get_supabase_client


def generate_phash(command: str) -> int:
    """
    Generate a CRC32 hash for the PowerShell command
    
    Args:
        command (str): The PowerShell command to hash
        
    Returns:
        int: CRC32 hash value as integer
    """
    # Normalize the command by stripping whitespace to ensure consistent hashing
    normalized_command = command.strip()
    b = normalized_command.encode('utf-8')
    v = zlib.crc32(b) & 0xffffffff
    return v


async def check_cache(phash: int) -> Optional[Dict[str, Any]]:
    """
    ⚡ LIGHTNING FAST cache check
    Optimized for minimum latency
    """
    try:
        supabase = get_supabase_client()
        
        response = supabase.table('cache_results') \
            .select('phash, created_at, results_blob') \
            .eq('phash', phash) \
            .limit(1) \
            .execute()
        
        if response.data and len(response.data) > 0:
            return {
                "phash": response.data[0].get("phash"),
                "created_at": response.data[0].get("created_at"),
                "results_blob": response.data[0].get("results_blob")
            }
        
        return None
        
    except Exception as error:
        
        return None


async def save_to_cache(phash: int, indicators_matched: Any, results_blob: Dict[str, Any]) -> bool:
    """
    Save analysis results to cache with a limit of 5 entries
    When adding the 6th entry, removes the oldest one
    
    Args:
        phash (int): The CRC32 hash of the command
        indicators_matched: JSON data of matched indicators
        results_blob (Dict): Complete analysis results
        
    Returns:
        bool: True if saved successfully, False otherwise
    """
    try:
        supabase = get_supabase_client()
        
        # 🗂️ STEP 1: Check current cache size
        count_response = supabase.table('cache_results') \
            .select('phash', count='exact') \
            .execute()
        
        current_count = count_response.count if count_response.count else 0
       
        
        # 🗑️ STEP 2: If we have 5+ entries, remove the oldest ones to keep only 4
        if current_count >= 5:
            
            # Get oldest entries to remove (keep only the 4 most recent)
            oldest_entries = supabase.table('cache_results') \
                .select('phash, created_at') \
                .order('created_at', desc=False) \
                .limit(current_count - 4) \
                .execute()
            
            if oldest_entries.data:
                phashes_to_delete = [entry['phash'] for entry in oldest_entries.data]
                
                # Delete oldest entries
                for old_phash in phashes_to_delete:
                    delete_response = supabase.table('cache_results') \
                        .delete() \
                        .eq('phash', old_phash) \
                        .execute()
                    
                   
        
        # 💾 STEP 3: Add the new cache entry
        cache_data = {
            "phash": phash,
            "indicators_matched": indicators_matched,
            "results_blob": results_blob
        }
        
        # Use upsert to handle potential duplicates
        response = supabase.table('cache_results') \
            .upsert(cache_data) \
            .execute()
        
        if response.data:
            # Get updated count
            new_count_response = supabase.table('cache_results') \
                .select('phash', count='exact') \
                .execute()
            new_count = new_count_response.count if new_count_response.count else 0
            
            return True
        else:
            return False
            
    except Exception as error:
        return False


def should_cache_result(analysis_result: Dict[str, Any]) -> bool:
    """
    Determine if analysis result should be cached
    Only cache results that have indicator matches AND no premium indicators
    Premium indicators should never be cached
    
    Args:
        analysis_result (Dict): The analysis result
        
    Returns:
        bool: True if should be cached, False otherwise
    """
    # Check if there are any detected signatures/indicators
    detected_signatures = analysis_result.get("detected_signatures", [])
    
    if len(detected_signatures) == 0:
        return False
    
    # Check if any detected signature is a premium indicator
    for sig in detected_signatures:
        # If any signature has is_premium_indicator flag set to True, do not cache
        if sig.get("is_premium_indicator", False):
            print(f"🚫 Not caching result - premium indicator detected: {sig.get('name')}")
            return False
    
    # Only cache if there are indicators and none of them are premium
    return True


def create_cache_compatible_result(analysis_result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create a cache-compatible version of analysis results
    Ensures pattern appears only once per signature
    """
    # Clean detected_signatures to remove pattern duplication
    cleaned_signatures = []
    for sig in analysis_result.get("detected_signatures", []):
        cleaned_sig = {
            "name": sig.get("name"),
            "description": sig.get("description"),
            "severity": sig.get("severity"),
            "base_score": sig.get("base_score"),
            "matches_found": sig.get("matches_found"),
            "total_score": sig.get("total_score"),
            "max_match_allowed": sig.get("max_match_allowed"),
            "pattern": sig.get("pattern"),
            "matches_details": [
                {
                    "matched_text": md.get("matched_text"),
                    "position": md.get("position"),
                    "match_number": md.get("match_number")
                }
                for md in sig.get("matches_details", [])
            ],
            "tactics": sig.get("tactics", []),
            "techniques": sig.get("techniques", []),
            "reference": sig.get("reference", []),
            "link": sig.get("link")
        }
        cleaned_signatures.append(cleaned_sig)
    
    return {
        "total_score": analysis_result.get("total_score", 0.0),
        "risk_score": analysis_result.get("total_score", 0.0),
        "severity": analysis_result.get("severity", "very_low"),
        "detected_signatures": cleaned_signatures,
        "signatures_detected": cleaned_signatures,
        "tactics": analysis_result.get("tactics", []),
        "techniques": analysis_result.get("techniques", []),
        "total_signatures_checked": analysis_result.get("total_signatures_checked", 0),
        "detected_count": analysis_result.get("detected_count", 0),
        "cached": True
    }


def extract_indicators_matched(analysis_result: Dict[str, Any]) -> Any:
    """
    Extract indicators that were matched for caching
    
    Args:
        analysis_result (Dict): Analysis result
        
    Returns:
        JSON-compatible data of matched indicators
    """
    detected_signatures = analysis_result.get("detected_signatures", [])
    
    # Create a simplified version for indicators_matched column
    indicators = []
    for sig in detected_signatures:
        indicators.append({
            "name": sig.get("name"),
            "score": sig.get("total_score"),
            "severity": sig.get("severity"),
            "tactics": sig.get("tactics", []),
            "techniques": sig.get("techniques", [])
        })
    
    return indicators


async def clear_cache_by_phash(phash: int) -> bool:
    """
    Clear a specific cache entry by phash
    
    Args:
        phash (int): The phash to remove from cache
        
    Returns:
        bool: True if successfully cleared, False otherwise
    """
    try:
        supabase = get_supabase_client()
        
        response = supabase.table('cache_results') \
            .delete() \
            .eq('phash', phash) \
            .execute()
        
        
            
    except Exception as error:
        return False


async def clear_all_cache() -> bool:
    """
    Clear all cache entries (use with caution!)
    
    Returns:
        bool: True if successfully cleared, False otherwise
    """
    try:
        supabase = get_supabase_client()
        
        response = supabase.table('cache_results') \
            .delete() \
            .neq('phash', 0) \
            .execute()  # Delete all entries where phash != 0 (which is all entries)
        
        return True
        
    except Exception as error:
        return False


async def get_cache_status() -> Dict[str, Any]:
    """
    Get current cache status and information
    
    Returns:
        Dict: Cache status information
    """
    try:
        supabase = get_supabase_client()
        
        # Get all cache entries ordered by creation date
        response = supabase.table('cache_results') \
            .select('phash, created_at, indicators_matched') \
            .order('created_at', desc=True) \
            .execute()
        
        if response.data:
            entries = response.data
            return {
                "total_entries": len(entries),
                "max_entries": 5,
                "entries": [
                    {
                        "phash": entry["phash"],
                        "created_at": entry["created_at"],
                        "indicators_count": len(entry.get("indicators_matched", []))
                    }
                    for entry in entries
                ],
                "is_full": len(entries) >= 5,
                "next_will_remove_oldest": len(entries) >= 5
            }
        else:
            return {
                "total_entries": 0,
                "max_entries": 5,
                "entries": [],
                "is_full": False,
                "next_will_remove_oldest": False
            }
            
    except Exception as error:
        return {
            "total_entries": 0,
            "max_entries": 5,
            "entries": [],
            "is_full": False,
            "next_will_remove_oldest": False,
            "error": str(error)
        }