#!/usr/bin/env python3
"""
Custom Splunk streaming search command: psexposed

Sends PowerShell commands to the powershell.exposed API and enriches
events with analysis results (risk level, MITRE techniques, deobfuscated
output, AI summary, etc.).

Usage:
    | psexposed field=ps_command
    | psexposed field=ScriptBlockText rate_limit_delay=0.5
"""

import os
import re
import sys
import time

# Add the bin/lib directory to the path so splunklib, requests, and our
# client can be found by Splunk's embedded Python
lib_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib")
if lib_path not in sys.path:
    sys.path.insert(0, lib_path)

from splunklib.searchcommands import (
    dispatch,
    StreamingCommand,
    Configuration,
    Option,
    validators,
)

from psexposed_client import PsExposedClient

# Default API base URL
DEFAULT_BASE_URL = "https://api.powershell.exposed"


@Configuration()
class PsExposedCommand(StreamingCommand):
    """Analyze PowerShell commands via the powershell.exposed API."""

    field = Option(
        doc="Event field containing the PowerShell command to analyze.",
        require=False,
        default="ps_command",
    )

    rate_limit_delay = Option(
        doc="Seconds to wait between API requests (default: 0.2).",
        require=False,
        default=0.2,
        validate=validators.Float(minimum=0.0, maximum=10.0),
    )

    def _load_config(self, realm_suffix):
        """Load a JSON config from storage/passwords by realm suffix."""
        import json
        username = self._metadata.searchinfo.username
        realm = f"psexposed_{realm_suffix}_{username}"
        try:
            for credential in self.service.storage_passwords:
                if credential.realm == realm:
                    return json.loads(credential.clear_password)
        except Exception:
            pass
        # Also check legacy realm format (psexposed__<username>)
        if realm_suffix == "apikey":
            legacy_realm = f"psexposed__{username}"
            try:
                for credential in self.service.storage_passwords:
                    if credential.realm == legacy_realm:
                        return json.loads(credential.clear_password)
            except Exception:
                pass
        return None

    def _sanitize(self, command, sanitization_config):
        """Apply sanitization regex to remove sensitive patterns from command."""
        if not sanitization_config:
            return command
        if not sanitization_config.get("sanitization_enabled"):
            return command
        pattern = sanitization_config.get("sanitization_regex", "")
        if not pattern:
            return command
        try:
            return re.sub(pattern, "", command)
        except re.error:
            return command

    def stream(self, records):
        """Process each event, calling the API for analysis."""
        api_config = self._load_config("apikey")
        proxy_config = self._load_config("proxy")
        sanitization_config = self._load_config("sanitization")

        if not api_config or not api_config.get("api_key"):
            for record in records:
                record["ps_error"] = (
                    "No API key configured. Go to the PSExposed app setup "
                    "page to enter your API key."
                )
                yield record
            return

        base_url = api_config.get("base_url", DEFAULT_BASE_URL)
        api_key = api_config.get("api_key")

        client = PsExposedClient(
            base_url=base_url,
            api_key=api_key,
            timeout=30,
            proxy_config=proxy_config,
        )

        first_event = True
        for record in records:
            # Rate limiting (skip delay for the first event)
            if not first_event and self.rate_limit_delay > 0:
                time.sleep(float(self.rate_limit_delay))
            first_event = False

            # Get the PowerShell command from the specified field
            command = record.get(self.field, None)
            if not command or not str(command).strip():
                record["ps_error"] = f"Field '{self.field}' is empty or missing."
                yield record
                continue

            command = str(command).strip()

            # Apply sanitization before sending to API
            command = self._sanitize(command, sanitization_config)

            # Call the API (client handles caching internally)
            result = client.analyze(command)

            # Merge result fields into the event
            for key, value in result.items():
                record[key] = value

            yield record


dispatch(PsExposedCommand, sys.argv, sys.stdin, sys.stdout, __name__)
