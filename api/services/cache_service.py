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
    """
    
    normalized_for_hash = command.strip()
    
    b = normalized_for_hash.encode('utf-8')
    v = zlib.crc32(b) & 0xffffffff
    return v


async def check_cache(phash: int) -> Optional[Dict[str, Any]]:
    """
    cache check
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
        
       
        count_response = supabase.table('cache_results') \
            .select('phash', count='exact') \
            .execute()
        
        current_count = count_response.count if count_response.count else 0
       
        
        
        if current_count >= 5:
            
            
            oldest_entries = supabase.table('cache_results') \
                .select('phash, created_at') \
                .order('created_at', desc=False) \
                .limit(current_count - 4) \
                .execute()
            
            if oldest_entries.data:
                phashes_to_delete = [entry['phash'] for entry in oldest_entries.data]
                
               
                for old_phash in phashes_to_delete:
                    delete_response = supabase.table('cache_results') \
                        .delete() \
                        .eq('phash', old_phash) \
                        .execute()
                    
                   
        
       
        cache_data = {
            "phash": phash,
            "indicators_matched": indicators_matched,
            "results_blob": results_blob
        }
        
      
        response = supabase.table('cache_results') \
            .upsert(cache_data) \
            .execute()
        
        if response.data:
            
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
     
    detected_signatures = analysis_result.get("detected_signatures", [])
    
    if len(detected_signatures) == 0:
        return False
    
    
    for sig in detected_signatures:
        
        if sig.get("is_premium_indicator", False):
            print(f"[CACHE] Not caching result - premium indicator detected")
            return False
    
   
    return True


def create_cache_compatible_result(analysis_result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create a cache-compatible version of analysis results
    Ensures pattern appears only once per signature
    """
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
                    "match_number": md.get("match_number"),
                    "matched_in": md.get("matched_in")  
                }
                for md in sig.get("matches_details", [])
            ],
            "tactics": sig.get("tactics", []),
            "techniques": sig.get("techniques", []),
            "reference": sig.get("reference", []),
            "link": sig.get("link"),
            "is_premium_indicator": sig.get("is_premium_indicator", False),
            "found_in_deobfuscated": sig.get("found_in_deobfuscated", False),
            "indicator_type": sig.get("indicator_type", "community")
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
        "decoded_command": analysis_result.get("decoded_command"),
        "double_decoded_command": analysis_result.get("double_decoded_command"),
        "deobfuscated_command": analysis_result.get("deobfuscated_command"),  # ✅ ADICIONAR
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
            .execute()  
        
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


async def update_cached_signatures_with_current_db_values(results_blob: Dict[str, Any]) -> Dict[str, Any]:
    """
    Update cached signatures with current values from the database.
    This ensures max_match, base_score, and other editable fields are always current.
    
    Args:
        results_blob: The cached results blob containing signatures_detected
        
    Returns:
        Updated results_blob with current database values
    """
    try:
        supabase = get_supabase_client()
        
        # Get all active signatures from DB
        response = supabase.table('powershell_signatures') \
            .select('name, max_match, basescore, severity, description, tactics, techniques, reference, link, file_path, is_premium_indicator') \
            .eq('is_active', True) \
            .execute()
        
        if not response.data:
            return results_blob
        
        # Fetch public indicator names for indicator_type determination
        public_indicators_response = supabase.table('public_indicators').select('name').execute()
        public_indicator_names = {item['name'] for item in public_indicators_response.data} if public_indicators_response.data else set()
        
        # Create a lookup by name
        db_signatures = {sig['name']: sig for sig in response.data}
        
        # Update signatures_detected with current DB values
        signatures = results_blob.get("signatures_detected", [])
        for sig in signatures:
            sig_name = sig.get("name")
            if sig_name and sig_name in db_signatures:
                db_sig = db_signatures[sig_name]
                
                # Get current max_match from DB
                current_max_match = int(db_sig.get("max_match", 1))
                current_base_score = float(db_sig.get("basescore", 0))
                
                # Recalculate matches_found based on current max_match
                original_matches_found = sig.get("matches_found", 1)
                new_matches_found = min(original_matches_found, current_max_match)
                
                # Recalculate total_score
                new_total_score = current_base_score * new_matches_found
                
                # Update the signature with current DB values
                sig["max_match_allowed"] = current_max_match
                sig["base_score"] = current_base_score
                sig["matches_found"] = new_matches_found
                sig["total_score"] = new_total_score
                sig["severity"] = db_sig.get("severity", sig.get("severity"))
                sig["description"] = db_sig.get("description", sig.get("description"))
                sig["tactics"] = db_sig.get("tactics", sig.get("tactics", []))
                sig["techniques"] = db_sig.get("techniques", sig.get("techniques", []))
                sig["reference"] = db_sig.get("reference", sig.get("reference", []))
                sig["link"] = db_sig.get("link", sig.get("link"))
                sig["is_premium_indicator"] = db_sig.get("is_premium_indicator", sig.get("is_premium_indicator", False))
                
                # Update indicator_type based on public_indicators table
                indicator_type = "community" if sig_name in public_indicator_names else "private"
                sig["indicator_type"] = indicator_type
                
                # Update link for community indicators
                if indicator_type == "community":
                    file_path = db_sig.get("file_path", "")
                    if file_path:
                        filename = file_path.split("/")[-1]
                        sig["link"] = f"https://github.com/avasero/psexposed/blob/main/indicators/{filename}"
                    else:
                        sig["link"] = None
                else:
                    sig["link"] = None
                
                # Trim matches_details if needed
                if "matches_details" in sig and len(sig["matches_details"]) > new_matches_found:
                    sig["matches_details"] = sig["matches_details"][:new_matches_found]
        
        # Recalculate total risk_score
        total_score = sum(sig.get("total_score", 0) for sig in signatures)
        results_blob["risk_score"] = total_score
        results_blob["total_score"] = total_score
        
        # Recalculate severity based on new total_score
        if total_score >= 30:
            results_blob["severity"] = "critical"
        elif total_score >= 20:
            results_blob["severity"] = "high"
        elif total_score >= 10:
            results_blob["severity"] = "medium"
        elif total_score >= 5:
            results_blob["severity"] = "low"
        else:
            results_blob["severity"] = "very_low"
        
        return results_blob
        
    except Exception as error:
        print(f"[CACHE] Error updating cached signatures: {error}")
        return results_blob