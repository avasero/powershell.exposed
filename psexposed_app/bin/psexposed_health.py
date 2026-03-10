#!/usr/bin/env python3
"""
REST handler for PSExposed health check.
Makes a server-side request to the API and returns the result,
avoiding browser CORS restrictions.
"""

import json
import os
import sys

lib_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib")
if lib_path not in sys.path:
    sys.path.insert(0, lib_path)

import splunk.admin as admin
import splunk.rest as rest
import requests


DEFAULT_BASE_URL = "https://api.powershell.exposed"


class PsExposedHealthHandler(admin.MConfigHandler):

    def setup(self):
        pass

    def handleList(self, confInfo):
        username = self.userName
        realm = f"psexposed_apikey_{username}"
        base_url = DEFAULT_BASE_URL
        api_key = None

        try:
            response, content = rest.simpleRequest(
                "/servicesNS/nobody/psexposed_app/storage/passwords",
                sessionKey=self.getSessionKey(),
                getargs={"output_mode": "json", "count": "0"},
                method="GET",
            )
            entries = json.loads(content).get("entry", [])
            for entry in entries:
                if entry.get("content", {}).get("realm") == realm:
                    config = json.loads(entry["content"]["clear_password"])
                    api_key = config.get("api_key")
                    base_url = config.get("base_url", DEFAULT_BASE_URL)
                    break
        except Exception as e:
            confInfo["health"]["status"] = "error"
            confInfo["health"]["message"] = f"Failed to load API key: {str(e)}"
            return

        if not api_key:
            confInfo["health"]["status"] = "error"
            confInfo["health"]["message"] = "No API key configured."
            return

        # Load proxy config
        proxies = None
        try:
            proxy_realm = f"psexposed_proxy_{username}"
            response, content = rest.simpleRequest(
                "/servicesNS/nobody/psexposed_app/storage/passwords",
                sessionKey=self.getSessionKey(),
                getargs={"output_mode": "json", "count": "0"},
                method="GET",
            )
            entries = json.loads(content).get("entry", [])
            for entry in entries:
                if entry.get("content", {}).get("realm") == proxy_realm:
                    proxy_config = json.loads(entry["content"]["clear_password"])
                    if proxy_config.get("proxy_enabled") and proxy_config.get("proxy_host"):
                        protocol = proxy_config.get("proxy_protocol", "http")
                        host = proxy_config.get("proxy_host")
                        port = proxy_config.get("proxy_port", "")
                        proxy_url = f"{protocol}://"
                        if proxy_config.get("proxy_auth_enabled") and proxy_config.get("proxy_username"):
                            proxy_url += f"{proxy_config['proxy_username']}:{proxy_config.get('proxy_password', '')}@"
                        proxy_url += host
                        if port:
                            proxy_url += f":{port}"
                        proxies = {"http": proxy_url, "https": proxy_url}
                    break
        except Exception:
            pass

        # Call the API
        try:
            url = base_url.rstrip("/") + "/evaluate"
            resp = requests.post(
                url,
                json={"command": "echo test", "search_type": "API"},
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                timeout=15,
                proxies=proxies,
            )

            if resp.status_code in (401, 403):
                confInfo["health"]["status"] = "error"
                confInfo["health"]["message"] = "Authentication Failed: Invalid API key."
                return

            if resp.status_code == 429:
                confInfo["health"]["status"] = "error"
                confInfo["health"]["message"] = "Rate Limited: Too many requests. Try again later."
                return

            if not resp.ok:
                confInfo["health"]["status"] = "error"
                confInfo["health"]["message"] = f"API HTTP error: {resp.status_code}"
                return

            data = resp.json()
            if not data.get("success"):
                error = data.get("error", {})
                msg = error.get("message", "Unknown API error") if isinstance(error, dict) else str(error)
                confInfo["health"]["status"] = "error"
                confInfo["health"]["message"] = msg
            else:
                confInfo["health"]["status"] = "ok"
                confInfo["health"]["message"] = "API is reachable and responding correctly."

        except requests.exceptions.Timeout:
            confInfo["health"]["status"] = "error"
            confInfo["health"]["message"] = "Connection timed out."
        except requests.exceptions.ConnectionError:
            confInfo["health"]["status"] = "error"
            confInfo["health"]["message"] = "Cannot connect to the API. Check your network and proxy settings."
        except Exception as e:
            confInfo["health"]["status"] = "error"
            confInfo["health"]["message"] = f"Unexpected error: {str(e)}"


admin.init(PsExposedHealthHandler, admin.CONTEXT_APP_AND_USER)
