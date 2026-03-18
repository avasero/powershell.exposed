require([
    "splunkjs/mvc",
    "splunkjs/mvc/utils",
    "splunkjs/mvc/simplexml/ready!"
], function(mvc, utils) {

    var service = mvc.createService();
    var BASE_URL = "https://api.powershell.exposed";

    function getUsername() {
        return Splunk.util.getConfigValue("USERNAME") || "admin";
    }

    function getRealm() {
        return "psexposed__" + getUsername();
    }

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

    function findExistingEntry(callback) {
        var realm = getRealm();
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
            if (!sc) return;

            if (entry) {
                try {
                    var config = JSON.parse(entry.content.clear_password);
                    if (config.api_key) {
                        var key = config.api_key;
                        var masked = key.length > 12 ? key.substring(0, 8) + "****" + key.substring(key.length - 4) : "****";
                        sc.innerHTML = '<span style="display:inline-block;padding:6px 12px;border-radius:4px;font-size:13px;background:#e6f7e6;color:#2d7d2d;border:1px solid #b8e6b8;">Configured — current key: <code>' + masked + '</code></span>';
                        return;
                    }
                } catch (e) {}
            }
            sc.innerHTML = '<span style="display:inline-block;padding:6px 12px;border-radius:4px;font-size:13px;background:#fff3e0;color:#b36b00;border:1px solid #ffe0b2;">Not configured</span>';
        });
    }

    function saveConfig() {
        var apiKeyEl = document.getElementById("api_key");
        if (!apiKeyEl) return;

        var apiKey = apiKeyEl.value.trim();
        if (!apiKey) {
            showMessage("Please enter your API key.", true);
            return;
        }

        var btn = document.getElementById("save-btn");
        if (btn) { btn.disabled = true; btn.textContent = "Saving..."; }

        var configJson = JSON.stringify({ base_url: BASE_URL, api_key: apiKey });

        findExistingEntry(function(entry) {
            if (entry) {
                // Update existing entry
                var entryUrl = entry.links.edit || entry.id;
                if (entryUrl.indexOf("http") === 0) {
                    var parts = entryUrl.split("/servicesNS/");
                    if (parts.length > 1) entryUrl = "/servicesNS/" + parts[1];
                }
                service.request(entryUrl, "POST", null, null,
                    { password: configJson },
                    { "Content-Type": "application/x-www-form-urlencoded" },
                    function(err) {
                        done(err, apiKeyEl, btn);
                    }
                );
            } else {
                // Create new entry
                service.request(
                    "/servicesNS/nobody/psexposed_app/storage/passwords",
                    "POST", null, null,
                    { name: getUsername(), password: configJson, realm: getRealm() },
                    { "Content-Type": "application/x-www-form-urlencoded" },
                    function(err) {
                        done(err, apiKeyEl, btn);
                    }
                );
            }
        });
    }

    function done(err, apiKeyEl, btn) {
        if (btn) { btn.disabled = false; btn.textContent = "Save"; }
        if (err) {
            showMessage("Failed to save: " + (err.error || err.message || "unknown error"), true);
            console.error("PSExposed save error:", err);
        } else {
            showMessage("API key saved successfully!", false);
            if (apiKeyEl) apiKeyEl.value = "";
            loadConfig();
        }
    }

    // Wait for DOM, then bind
    var wait = setInterval(function() {
        var btn = document.getElementById("save-btn");
        var toggle = document.getElementById("toggle-visibility");
        if (btn) {
            clearInterval(wait);
            btn.addEventListener("click", function(e) { e.preventDefault(); saveConfig(); });
            if (toggle) {
                toggle.addEventListener("click", function() {
                    var inp = document.getElementById("api_key");
                    if (inp) inp.type = inp.type === "password" ? "text" : "password";
                });
            }
            loadConfig();
        }
    }, 200);

});
