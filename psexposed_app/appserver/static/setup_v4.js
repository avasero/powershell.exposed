require([
    "splunkjs/mvc",
    "splunkjs/mvc/utils",
    "splunkjs/mvc/simplexml/ready!"
], function(mvc, utils) {

    var service = mvc.createService();
    var BASE_URL = "https://api.powershell.exposed";

    // ── Helpers ──────────────────────────────────────────────

    function getUsername() {
        return Splunk.util.getConfigValue("USERNAME") || "admin";
    }

    function getRealm(suffix) {
        return "psexposed_" + (suffix || "") + "_" + getUsername();
    }

    function showMsg(elId, text, isError) {
        var el = document.getElementById(elId);
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

    // Find a storage/passwords entry by realm
    function findEntry(realm, callback) {
        service.request(
            "/servicesNS/nobody/psexposed_app/storage/passwords",
            "GET", null, { count: 0 }, null, null,
            function(err, response) {
                if (err || !response || !response.data) { callback(null); return; }
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

    // Save or update a storage/passwords entry
    function saveEntry(realm, configJson, callback) {
        findEntry(realm, function(entry) {
            if (entry) {
                var entryUrl = entry.links.edit || entry.id;
                if (entryUrl.indexOf("http") === 0) {
                    var parts = entryUrl.split("/servicesNS/");
                    if (parts.length > 1) entryUrl = "/servicesNS/" + parts[1];
                }
                service.request(entryUrl, "POST", null, null,
                    { password: configJson },
                    { "Content-Type": "application/x-www-form-urlencoded" },
                    callback
                );
            } else {
                service.request(
                    "/servicesNS/nobody/psexposed_app/storage/passwords",
                    "POST", null, null,
                    { name: getUsername() + "_" + realm, password: configJson, realm: realm },
                    { "Content-Type": "application/x-www-form-urlencoded" },
                    callback
                );
            }
        });
    }

    // Load a storage/passwords entry and parse JSON
    function loadEntry(realm, callback) {
        findEntry(realm, function(entry) {
            if (!entry) { callback(null); return; }
            try {
                var config = JSON.parse(entry.content.clear_password);
                callback(config);
            } catch (e) {
                callback(null);
            }
        });
    }

    // ── Tabs ─────────────────────────────────────────────────

    function initTabs() {
        var tabs = document.querySelectorAll(".pse-tab");
        for (var i = 0; i < tabs.length; i++) {
            tabs[i].addEventListener("click", function() {
                var target = this.getAttribute("data-tab");
                // Deactivate all
                var allTabs = document.querySelectorAll(".pse-tab");
                var allPanels = document.querySelectorAll(".pse-panel");
                for (var j = 0; j < allTabs.length; j++) {
                    allTabs[j].className = "pse-tab";
                    allPanels[j].className = "pse-panel";
                }
                // Activate clicked
                this.className = "pse-tab pse-tab-active";
                var panel = document.getElementById("panel-" + target);
                if (panel) panel.className = "pse-panel pse-panel-active";
            });
        }
    }

    // ── API Key Tab ──────────────────────────────────────────

    function loadApiKeyConfig() {
        var realm = getRealm("apikey");
        loadEntry(realm, function(config) {
            var sc = document.getElementById("status-container");
            if (!sc) return;
            if (config && config.api_key) {
                var key = config.api_key;
                var masked = key.length > 12 ? key.substring(0, 8) + "****" + key.substring(key.length - 4) : "****";
                sc.innerHTML = '<span style="display:inline-block;padding:6px 12px;border-radius:4px;font-size:13px;background:#e6f7e6;color:#2d7d2d;border:1px solid #b8e6b8;">Configured \u2014 current key: <code>' + masked + '</code></span>';
            } else {
                sc.innerHTML = '<span style="display:inline-block;padding:6px 12px;border-radius:4px;font-size:13px;background:#fff3e0;color:#b36b00;border:1px solid #ffe0b2;">Not configured</span>';
            }
        });
    }

    function saveApiKey() {
        var apiKeyEl = document.getElementById("api_key");
        if (!apiKeyEl) return;
        var apiKey = apiKeyEl.value.trim();
        if (!apiKey) { showMsg("message-apikey", "Please enter your API key.", true); return; }

        var btn = document.getElementById("save-btn");
        if (btn) { btn.disabled = true; btn.textContent = "Saving..."; }

        var configJson = JSON.stringify({ base_url: BASE_URL, api_key: apiKey });
        saveEntry(getRealm("apikey"), configJson, function(err) {
            if (btn) { btn.disabled = false; btn.textContent = "Save API Key"; }
            if (err) {
                showMsg("message-apikey", "Failed to save: " + (err.error || err.message || "unknown error"), true);
            } else {
                showMsg("message-apikey", "API key saved successfully!", false);
                apiKeyEl.value = "";
                loadApiKeyConfig();
            }
        });
    }

    // ── Proxy Tab ────────────────────────────────────────────

    function loadProxyConfig() {
        var realm = getRealm("proxy");
        loadEntry(realm, function(config) {
            if (!config) return;
            var cb = document.getElementById("proxy_enabled");
            if (cb && config.proxy_enabled) { cb.checked = true; toggleProxy(); }
            var authCb = document.getElementById("proxy_auth_enabled");
            if (authCb && config.proxy_auth_enabled) { authCb.checked = true; toggleProxyAuth(); }

            if (config.proxy_protocol) setVal("proxy_protocol", config.proxy_protocol);
            if (config.proxy_host) setVal("proxy_host", config.proxy_host);
            if (config.proxy_port) setVal("proxy_port", config.proxy_port);
            if (config.proxy_username) setVal("proxy_username", config.proxy_username);
            // Don't pre-fill password for security
        });
    }

    function setVal(id, val) {
        var el = document.getElementById(id);
        if (el) el.value = val;
    }

    function getVal(id) {
        var el = document.getElementById(id);
        return el ? el.value.trim() : "";
    }

    function toggleProxy() {
        var cb = document.getElementById("proxy_enabled");
        var fields = document.getElementById("proxy-fields");
        if (cb && fields) {
            fields.style.opacity = cb.checked ? "1" : "0.5";
            fields.style.pointerEvents = cb.checked ? "auto" : "none";
        }
    }

    function toggleProxyAuth() {
        var cb = document.getElementById("proxy_auth_enabled");
        var fields = document.getElementById("proxy-auth-fields");
        if (cb && fields) {
            fields.style.opacity = cb.checked ? "1" : "0.5";
            fields.style.pointerEvents = cb.checked ? "auto" : "none";
        }
    }

    function saveProxy() {
        var btn = document.getElementById("save-proxy-btn");
        if (btn) { btn.disabled = true; btn.textContent = "Saving..."; }

        var proxyEnabled = document.getElementById("proxy_enabled");
        var proxyAuthEnabled = document.getElementById("proxy_auth_enabled");

        var config = {
            proxy_enabled: proxyEnabled ? proxyEnabled.checked : false,
            proxy_protocol: getVal("proxy_protocol") || "http",
            proxy_host: getVal("proxy_host"),
            proxy_port: getVal("proxy_port"),
            proxy_auth_enabled: proxyAuthEnabled ? proxyAuthEnabled.checked : false,
            proxy_username: getVal("proxy_username"),
            proxy_password: getVal("proxy_password")
        };

        saveEntry(getRealm("proxy"), JSON.stringify(config), function(err) {
            if (btn) { btn.disabled = false; btn.textContent = "Save Proxy Settings"; }
            if (err) {
                showMsg("message-proxy", "Failed to save: " + (err.error || err.message || "unknown error"), true);
            } else {
                showMsg("message-proxy", "Proxy settings saved successfully!", false);
            }
        });
    }

    // ── Health Check Tab ─────────────────────────────────────

    function runHealthCheck() {
        var btn = document.getElementById("health-btn");
        var result = document.getElementById("health-result");
        if (btn) { btn.disabled = true; btn.textContent = "Checking..."; }
        if (result) result.innerHTML = '<div class="pse-health-checking">Connecting to API...</div>';

        // Load API key config first
        loadEntry(getRealm("apikey"), function(apiConfig) {
            if (!apiConfig || !apiConfig.api_key) {
                if (result) result.innerHTML = '<div class="pse-health-fail"><strong>Error:</strong> No API key configured. Go to the API Key tab first.</div>';
                if (btn) { btn.disabled = false; btn.textContent = "Run Health Check"; }
                return;
            }

            // Use a Splunk search to test connectivity (runs server-side, respects proxy)
            var searchQuery = '| makeresults | eval ps_command="echo test" | psexposed field=ps_command | table ps_risk_level ps_error';

            var searchParams = {
                search: searchQuery,
                earliest_time: "-1m",
                latest_time: "now",
                output_mode: "json",
                exec_mode: "oneshot"
            };

            service.request(
                "/servicesNS/-/psexposed_app/search/jobs",
                "POST", null, null, searchParams,
                { "Content-Type": "application/x-www-form-urlencoded" },
                function(err, response) {
                    if (btn) { btn.disabled = false; btn.textContent = "Run Health Check"; }

                    if (err) {
                        if (result) result.innerHTML = '<div class="pse-health-fail"><strong>Failed:</strong> Could not run health check search. Error: ' + (err.error || err.message || "unknown") + '</div>';
                        return;
                    }

                    try {
                        var data = response.data;
                        var results = data.results || [];
                        if (results.length > 0) {
                            var row = results[0];
                            if (row.ps_error) {
                                result.innerHTML = '<div class="pse-health-fail"><strong>API Error:</strong> ' + row.ps_error + '</div>';
                            } else if (row.ps_risk_level) {
                                result.innerHTML = '<div class="pse-health-ok"><strong>Success!</strong> API is reachable and responding. Risk level returned: <code>' + row.ps_risk_level + '</code></div>';
                            } else {
                                result.innerHTML = '<div class="pse-health-ok"><strong>Success!</strong> API is reachable and responding.</div>';
                            }
                        } else {
                            result.innerHTML = '<div class="pse-health-fail"><strong>No results returned.</strong> The search command may have failed.</div>';
                        }
                    } catch (e) {
                        if (result) result.innerHTML = '<div class="pse-health-fail"><strong>Error parsing response:</strong> ' + e.message + '</div>';
                    }
                }
            );
        });
    }

    // ── Init ─────────────────────────────────────────────────

    var wait = setInterval(function() {
        var btn = document.getElementById("save-btn");
        if (!btn) return;
        clearInterval(wait);

        // Tabs
        initTabs();

        // API Key tab
        btn.addEventListener("click", function(e) { e.preventDefault(); saveApiKey(); });
        var toggle = document.getElementById("toggle-visibility");
        if (toggle) {
            toggle.addEventListener("click", function() {
                var inp = document.getElementById("api_key");
                if (inp) inp.type = inp.type === "password" ? "text" : "password";
            });
        }
        loadApiKeyConfig();

        // Proxy tab
        var proxyCb = document.getElementById("proxy_enabled");
        if (proxyCb) proxyCb.addEventListener("change", toggleProxy);
        var proxyAuthCb = document.getElementById("proxy_auth_enabled");
        if (proxyAuthCb) proxyAuthCb.addEventListener("change", toggleProxyAuth);
        var saveProxyBtn = document.getElementById("save-proxy-btn");
        if (saveProxyBtn) saveProxyBtn.addEventListener("click", function(e) { e.preventDefault(); saveProxy(); });
        loadProxyConfig();

        // Health Check tab
        var healthBtn = document.getElementById("health-btn");
        if (healthBtn) healthBtn.addEventListener("click", function(e) { e.preventDefault(); runHealthCheck(); });

    }, 200);

});
