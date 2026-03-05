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
import sys
import time

# Add the bin/lib directory to the path so we can import our client
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "lib"))

from splunklib.searchcommands import (
    dispatch,
    StreamingCommand,
    Configuration,
    Option,
    validators,
)

from psexposed_client import PsExposedClient

# Default API base URL
DEFAULT_BASE_URL = "https://powershell.exposed/api"


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

    def _get_credentials(self):
        """
        Retrieve the current user's API key and base URL from
        Splunk's storage/passwords endpoint.

        Returns:
            tuple: (base_url, api_key) or (None, None) if not configured.
        """
        # Get the current Splunk user running this search
        username = self._metadata.searchinfo.username

        # Realm pattern: psexposed__<username>
        realm = f"psexposed__{username}"

        # Query storage/passwords for this user's credentials
        service = self.service
        try:
            for credential in service.storage_passwords:
                if credential.realm == realm:
                    # The password field holds our JSON config
                    import json
                    config = json.loads(credential.clear_password)
                    base_url = config.get("base_url", DEFAULT_BASE_URL)
                    api_key = config.get("api_key", "")
                    return base_url, api_key
        except Exception:
            pass

        return None, None

    def stream(self, records):
        """Process each event, calling the API for analysis."""
        base_url, api_key = self._get_credentials()

        if not api_key:
            # No API key configured — add error to every event
            for record in records:
                record["ps_error"] = (
                    "No API key configured. Go to the PSExposed app setup "
                    "page to enter your API key."
                )
                yield record
            return

        client = PsExposedClient(
            base_url=base_url,
            api_key=api_key,
            timeout=30,
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

            # Call the API (client handles caching internally)
            result = client.analyze(command)

            # Merge result fields into the event
            for key, value in result.items():
                record[key] = value

            yield record


dispatch(PsExposedCommand, sys.argv, sys.stdin, sys.stdout, __name__)
