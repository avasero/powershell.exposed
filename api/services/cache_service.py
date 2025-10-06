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
    
    Args:
        phash (int): The CRC32 hash of the command
        
    Returns:
        Optional[Dict]: Cached results if found, None otherwise
    """
    try:
        # ⚡ OPTIMIZED QUERY: Select only essential fields for speed
        supabase = get_supabase_client()
        
        # Use minimal select to reduce data transfer
        response = supabase.table('cache_results') \
            .select('phash, created_at, results_blob') \
            .eq('phash', phash) \
            .limit(1) \
            .execute()
        
        if response.data and len(response.data) > 0:
            cache_entry = response.data[0]
            print(f"⚡ [CACHE] INSTANT HIT for phash {phash}")
            return {
                "phash": cache_entry.get("phash"),
                "created_at": cache_entry.get("created_at"),
                "results_blob": cache_entry.get("results_blob")
            }
        
        print(f"❌ [CACHE] Miss for phash {phash}")
        return None
        
    except Exception as error:
        print(f"❌ [CACHE] Error checking cache: {error}")
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
        print(f"📊 Current cache entries: {current_count}")
        
        # 🗑️ STEP 2: If we have 5+ entries, remove the oldest ones to keep only 4
        if current_count >= 5:
            print(f"🧹 Cache limit reached ({current_count} entries). Removing oldest entries...")
            
            # Get oldest entries to remove (keep only the 4 most recent)
            oldest_entries = supabase.table('cache_results') \
                .select('phash, created_at') \
                .order('created_at', desc=False) \
                .limit(current_count - 4) \
                .execute()
            
            if oldest_entries.data:
                phashes_to_delete = [entry['phash'] for entry in oldest_entries.data]
                print(f"🗑️  Removing {len(phashes_to_delete)} oldest entries: {phashes_to_delete}")
                
                # Delete oldest entries
                for old_phash in phashes_to_delete:
                    delete_response = supabase.table('cache_results') \
                        .delete() \
                        .eq('phash', old_phash) \
                        .execute()
                    
                    if delete_response.data:
                        print(f"✅ Removed old cache entry: {old_phash}")
                    else:
                        print(f"⚠️  Failed to remove old cache entry: {old_phash}")
        
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
            
            print(f"✅ Analysis cached with phash: {phash} (Cache size: {new_count}/5)")
            return True
        else:
            print(f"❌ Failed to cache analysis for phash: {phash}")
            return False
            
    except Exception as error:
        print(f"❌ Error saving to cache: {error}")
        return False


def should_cache_result(analysis_result: Dict[str, Any]) -> bool:
    """
    Determine if analysis result should be cached
    Only cache results that have indicator matches
    
    Args:
        analysis_result (Dict): The analysis result
        
    Returns:
        bool: True if should be cached, False otherwise
    """
    # Check if there are any detected signatures/indicators
    detected_signatures = analysis_result.get("detected_signatures", [])
    return len(detected_signatures) > 0


def create_cache_compatible_result(analysis_result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create a cache-compatible version of analysis results
    
    Args:
        analysis_result (Dict): Original analysis result
        
    Returns:
        Dict: Cache-compatible result structure
    """
    return {
        "is_malicious": analysis_result.get("is_malicious", False),
        "total_score": analysis_result.get("total_score", 0.0),  # Keep the same field name for consistency
        "risk_score": analysis_result.get("total_score", 0.0),   # Also store as risk_score for response compatibility
        "severity": analysis_result.get("severity", "very_low"),
        "detected_signatures": analysis_result.get("detected_signatures", []),
        "signatures_detected": analysis_result.get("detected_signatures", []),  # Alias for response compatibility
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
        
        if response.data:
            print(f"🗑️ Cleared cache entry for phash: {phash}")
            return True
        else:
            print(f"⚠️ No cache entry found for phash: {phash}")
            return False
            
    except Exception as error:
        print(f"❌ Error clearing cache for phash {phash}: {error}")
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
        
        print(f"🗑️ Cleared all cache entries")
        return True
        
    except Exception as error:
        print(f"❌ Error clearing all cache: {error}")
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
        print(f"❌ Error getting cache status: {error}")
        return {
            "total_entries": 0,
            "max_entries": 5,
            "entries": [],
            "is_full": False,
            "next_will_remove_oldest": False,
            "error": str(error)
        }