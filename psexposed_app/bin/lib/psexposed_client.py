"""
Reusable API client for powershell.exposed.
Handles communication with the /evaluate endpoint and maps response fields
to Splunk-friendly field names.
"""

import requests
import hashlib
import json

# TODO: ADAPT — Update this mapping if the API response schema changes.
# Keys are dot-notation paths into the API JSON response.
# Values are the Splunk field names that will be added to events.
FIELD_MAPPING = {
    "analysis.severity": "ps_risk_level",
    "analysis.risk_score": "ps_risk_score",
    "analysis.techniques": "ps_techniques",
    "analysis.tactics": "ps_tactics",
    "analysis.deobfuscated_command": "ps_deobfuscated",
    "analysis.decoded_command": "ps_decoded",
    "ai_overview": "ps_summary",
    "analysis_id": "ps_analysis_id",
}

# Signature names are extracted separately since they're nested in an array
SIGNATURE_FIELD = "ps_signatures"


class PsExposedClient:
    """Client for the powershell.exposed analysis API."""

    def __init__(self, base_url, api_key, timeout=30):
        """
        Args:
            base_url: API base URL (e.g. "https://powershell.exposed/api")
            api_key:  User's API key (pse_... format)
            timeout:  Request timeout in seconds
        """
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.timeout = timeout
        self._cache = {}

    def _cache_key(self, command):
        """SHA-256 hash of the command for cache lookups."""
        return hashlib.sha256(command.encode("utf-8")).hexdigest()

    def _resolve_dotpath(self, data, path):
        """Resolve a dot-notation path like 'analysis.severity' from a dict."""
        keys = path.split(".")
        value = data
        for key in keys:
            if isinstance(value, dict):
                value = value.get(key)
            else:
                return None
        return value

    def analyze(self, command):
        """
        Send a PowerShell command to the API for analysis.

        Args:
            command: The PowerShell command string to analyze.

        Returns:
            dict with Splunk field names (ps_*) as keys, or a dict with
            'ps_error' if something went wrong.
        """
        # Check cache first
        cache_key = self._cache_key(command)
        if cache_key in self._cache:
            return self._cache[cache_key]

        # TODO: ADAPT — Confirm endpoint path and request body schema
        url = f"{self.base_url}/evaluate"
        headers = {
            "Authorization": f"Bearer {self.api_key}",  # TODO: ADAPT — Auth method
            "Content-Type": "application/json",
        }
        payload = {
            "command": command,
            "search_type": "API",  # Marks this as an API-originated request
        }

        try:
            resp = requests.post(
                url, json=payload, headers=headers, timeout=self.timeout
            )

            if resp.status_code == 429:
                error_data = resp.json()
                rate_info = error_data.get("rate_limit_info", {})
                reset = rate_info.get("seconds_until_reset", "unknown")
                return {"ps_error": f"Rate limited. Resets in {reset}s."}

            resp.raise_for_status()
            data = resp.json()

        except requests.exceptions.Timeout:
            return {"ps_error": "API request timed out"}
        except requests.exceptions.ConnectionError:
            return {"ps_error": "Cannot connect to psexposed API"}
        except requests.exceptions.HTTPError as e:
            return {"ps_error": f"API HTTP error: {e.response.status_code}"}
        except (ValueError, json.JSONDecodeError):
            return {"ps_error": "Invalid JSON response from API"}
        except Exception as e:
            return {"ps_error": f"Unexpected error: {str(e)}"}

        if not data.get("success"):
            error = data.get("error", {})
            msg = error.get("message", "Unknown API error") if isinstance(error, dict) else str(error)
            return {"ps_error": msg}

        # Map API response fields to Splunk fields
        result = {}
        for api_path, splunk_field in FIELD_MAPPING.items():
            value = self._resolve_dotpath(data, api_path)
            if value is not None:
                # Join lists into comma-separated strings for Splunk
                if isinstance(value, list):
                    value = ", ".join(str(v) for v in value)
                result[splunk_field] = str(value)

        # Extract signature names from the signatures array
        analysis = data.get("analysis", {})
        signatures = analysis.get("signatures", [])
        if signatures:
            sig_names = [s.get("name", "") for s in signatures if s.get("name")]
            result[SIGNATURE_FIELD] = ", ".join(sig_names)

        # Cache the result
        self._cache[cache_key] = result
        return result
