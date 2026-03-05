require([
    "splunkjs/mvc",
    "splunkjs/mvc/utils",
    "splunkjs/mvc/simplexml/ready!"
], function(mvc, utils) {

    var service = mvc.createService();

    function showMessage(text, isError) {
        var el = document.getElementById("message");
        if (!el) return;
        el.textContent = text;
        el.style.display = "block";
        el.style.background = isError ? "#fde8e8" : "#e6f7e6";
        el.style.color = isError ? "#c62828" : "#2d7d2d";
        el.style.border = "1px solid " + (isError ? "#f5c6c6" : "#b8e6b8");
        if (!isError) {
            setTimeout(function() { el.style.display = "none"; }, 5000);
        }
    }

    function getUsername() {
        return Splunk.util.getConfigValue("USERNAME") || "admin";
    }

    function getRealm() {
        return "psexposed__" + getUsername();
    }

    // Find existing password entry for this user
    function findExistingEntry(callback) {
        var realm = getRealm();
        // Do NOT pass output_mode — Splunk SDK adds it automatically
        service.request(
            "/servicesNS/nobody/psexposed_app/storage/passwords",
            "GET",
            null,
            { count: 0 },
            null,
            null,
            function(err, response) {
                if (err || !response || !response.data) {
                    callback(null);
                    return;
                }
                var entries = response.data.entry || [];
                for (var i = 0; i < entries.length; i++) {
                    if (entries[i].content && entries[i].content.realm === realm) {
                        callback(entries[i]);
                        return;
                    }
                }
                callback(null);
            }
        );
    }

    function loadConfig() {
        findExistingEntry(function(entry) {
            var sc = document.getElementById("status-container");
            if (!entry) {
                if (sc) sc.innerHTML = '<span style="display:inline-block;padding:4px 10px;border-radius:12px;font-size:12px;font-weight:600;background:#fff3e0;color:#b36b00;">Not Configured</span>';
                return;
            }

            try {
                var config = JSON.parse(entry.content.clear_password);
                if (config.base_url) {
                    document.getElementById("base_url").value = config.base_url;
                }
                if (config.api_key) {
                    var key = config.api_key;
                    var masked = key.length > 12 ? key.substring(0, 8) + "****" + key.substring(key.length - 4) : "****";
                    var ckd = document.getElementById("current-key-display");
                    if (ckd) ckd.textContent = "Current key: " + masked;
                    if (sc) sc.innerHTML = '<span style="display:inline-block;padding:4px 10px;border-radius:12px;font-size:12px;font-weight:600;background:#e6f7e6;color:#2d7d2d;">Configured</span>';
                }
            } catch (e) {
                console.error("PSExposed: error parsing config", e);
            }
        });
    }

    function updateExistingEntry(entry, configJson, btn, apiKeyEl) {
        // POST to the entry's own URL to update the password
        var entryUrl = entry.links.edit || entry.id;
        // Make the URL relative if it's absolute
        if (entryUrl.indexOf("https://") === 0 || entryUrl.indexOf("http://") === 0) {
            var parts = entryUrl.split("/servicesNS/");
            if (parts.length > 1) {
                entryUrl = "/servicesNS/" + parts[1];
            }
        }

        service.request(
            entryUrl,
            "POST",
            null,
            null,
            { password: configJson },
            { "Content-Type": "application/x-www-form-urlencoded" },
            function(err) {
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = "Save Configuration";
                }
                if (err) {
                    showMessage("Failed to update: " + (err.error || err.message || JSON.stringify(err.data)), true);
                    console.error("PSExposed update error:", err);
                } else {
                    showMessage("Configuration updated successfully!", false);
                    if (apiKeyEl) apiKeyEl.value = "";
                    loadConfig();
                }
            }
        );
    }

    function createNewEntry(configJson, btn, apiKeyEl) {
        var username = getUsername();
        var realm = getRealm();

        service.request(
            "/servicesNS/nobody/psexposed_app/storage/passwords",
            "POST",
            null,
            null,
            { name: username, password: configJson, realm: realm },
            { "Content-Type": "application/x-www-form-urlencoded" },
            function(err) {
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = "Save Configuration";
                }
                if (err) {
                    showMessage("Failed to save: " + (err.error || err.message || JSON.stringify(err.data)), true);
                    console.error("PSExposed save error:", err);
                } else {
                    showMessage("Configuration saved successfully!", false);
                    if (apiKeyEl) apiKeyEl.value = "";
                    loadConfig();
                }
            }
        );
    }

    function saveConfig() {
        var apiKeyEl = document.getElementById("api_key");
        var baseUrlEl = document.getElementById("base_url");
        if (!apiKeyEl || !baseUrlEl) return;

        var apiKey = apiKeyEl.value.trim();
        var baseUrl = baseUrlEl.value.trim();

        if (!apiKey) {
            showMessage("Please enter your API key.", true);
            return;
        }

        var btn = document.getElementById("save-btn");
        if (btn) {
            btn.disabled = true;
            btn.textContent = "Saving...";
        }

        var configJson = JSON.stringify({ base_url: baseUrl, api_key: apiKey });

        // Check if entry exists — update it, otherwise create new
        findExistingEntry(function(entry) {
            if (entry) {
                updateExistingEntry(entry, configJson, btn, apiKeyEl);
            } else {
                createNewEntry(configJson, btn, apiKeyEl);
            }
        });
    }

    // Bind button click
    var waitForBtn = setInterval(function() {
        var btn = document.getElementById("save-btn");
        if (btn) {
            clearInterval(waitForBtn);
            btn.addEventListener("click", function(e) {
                e.preventDefault();
                saveConfig();
            });
            loadConfig();
        }
    }, 200);

});
