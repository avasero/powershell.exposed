#!/usr/bin/env python3
"""
REST handler for PSExposed app setup.

Manages per-user API key and base URL storage using Splunk's
storage/passwords endpoint for secure, encrypted credential storage.

Each user's config is stored with realm: psexposed__<username>
The password value is a JSON string: {"base_url": "...", "api_key": "..."}
"""

import json
import splunk.admin as admin
import splunk.rest as rest


class PsExposedSetupHandler(admin.MConfigHandler):
    """REST handler for saving/retrieving per-user psexposed config."""

    def setup(self):
        """Declare the parameters this handler accepts."""
        if self.requestedAction == admin.ACTION_EDIT:
            for arg in ["api_key", "base_url"]:
                self.supportedArgs.addOptArg(arg)

    def handleList(self, confInfo):
        """
        GET handler — retrieve existing config for the current user.
        Returns the base_url and a masked version of the api_key.
        """
        username = self.userName
        realm = f"psexposed__{username}"

        try:
            # Search storage/passwords for this user's entry
            response, content = rest.simpleRequest(
                "/servicesNS/nobody/psexposed_app/storage/passwords",
                sessionKey=self.getSessionKey(),
                getargs={"output_mode": "json", "search": f"realm={realm}"},
                method="GET",
            )

            entries = json.loads(content).get("entry", [])
            if entries:
                clear_password = entries[0]["content"]["clear_password"]
                config = json.loads(clear_password)
                confInfo["psexposed_setup"]["base_url"] = config.get(
                    "base_url", "https://powershell.exposed/api"
                )
                # Return masked API key for display
                api_key = config.get("api_key", "")
                if api_key:
                    confInfo["psexposed_setup"]["api_key_configured"] = "true"
                    confInfo["psexposed_setup"]["api_key_masked"] = (
                        api_key[:8] + "****" + api_key[-4:] if len(api_key) > 12 else "****"
                    )
                else:
                    confInfo["psexposed_setup"]["api_key_configured"] = "false"
            else:
                confInfo["psexposed_setup"]["base_url"] = "https://powershell.exposed/api"
                confInfo["psexposed_setup"]["api_key_configured"] = "false"

        except Exception as e:
            confInfo["psexposed_setup"]["error"] = str(e)

    def handleEdit(self, confInfo):
        """
        POST handler — save API key and base URL for the current user.
        Stores credentials in storage/passwords with realm psexposed__<username>.
        """
        username = self.userName
        realm = f"psexposed__{username}"

        api_key = self.callerArgs.data.get("api_key", [None])[0] or ""
        base_url = self.callerArgs.data.get("base_url", [None])[0] or "https://powershell.exposed/api"

        # The value stored as the "password" in storage/passwords
        config_json = json.dumps({"base_url": base_url, "api_key": api_key})

        session_key = self.getSessionKey()

        try:
            # Check if an entry already exists for this user
            response, content = rest.simpleRequest(
                "/servicesNS/nobody/psexposed_app/storage/passwords",
                sessionKey=session_key,
                getargs={"output_mode": "json", "search": f"realm={realm}"},
                method="GET",
            )

            entries = json.loads(content).get("entry", [])

            if entries:
                # Update existing entry
                entry_id = entries[0]["name"]
                rest.simpleRequest(
                    f"/servicesNS/nobody/psexposed_app/storage/passwords/{entry_id}",
                    sessionKey=session_key,
                    postargs={"password": config_json},
                    method="POST",
                )
            else:
                # Create new entry
                rest.simpleRequest(
                    "/servicesNS/nobody/psexposed_app/storage/passwords",
                    sessionKey=session_key,
                    postargs={
                        "name": username,
                        "password": config_json,
                        "realm": realm,
                    },
                    method="POST",
                )

            # Mark app as configured
            confInfo["psexposed_setup"]["status"] = "success"

        except Exception as e:
            confInfo["psexposed_setup"]["error"] = str(e)
            raise admin.AdminManagerException(
                admin.AdminManagerException.OPERATION_ERROR,
                f"Failed to save configuration: {str(e)}",
            )


admin.init(PsExposedSetupHandler, admin.CONTEXT_APP_AND_USER)
