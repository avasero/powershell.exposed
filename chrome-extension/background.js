// Background script for PowerShell.exposed Extension

const API_URL = "https://api.powershell.exposed/evaluate";
const WEB_URL = "https://powershell.exposed/evaluate"; // Or localhost: http://localhost:3000/evaluate

// Initialize Context Menus
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "pse_root",
        title: "Analyze with PowerShell.exposed",
        contexts: ["selection"]
    });

    chrome.contextMenus.create({
        id: "pse_open_web",
        parentId: "pse_root",
        title: "Open in Web App",
        contexts: ["selection"]
    });

    chrome.contextMenus.create({
        id: "pse_quick_analyze",
        parentId: "pse_root",
        title: "Quick Analyze (API)",
        contexts: ["selection"]
    });
});

// Handle Context Menu Clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "pse_open_web") {
        const text = info.selectionText;
        const url = `${WEB_URL}?command=${encodeURIComponent(text)}`;
        chrome.tabs.create({ url: url });
    } else if (info.menuItemId === "pse_quick_analyze") {
        handleQuickAnalyze(info.selectionText, tab.id);
    }
});

async function handleQuickAnalyze(text, tabId) {
    // Get API Key from storage
    chrome.storage.sync.get(["apiKey"], async (result) => {
        const apiKey = result.apiKey;

        if (!apiKey) {
            // Notify user to set API key
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: () => alert("Please set your PowerShell.exposed API Key in the extension settings first.")
            });
            return;
        }

        try {
            // Show loading state (optional, via message to content script)
            chrome.tabs.sendMessage(tabId, { type: "ANALYSIS_START" });

            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    command: text,
                    search_type: "EXTENSION"
                })
            });

            const data = await response.json();

            if (response.ok) {
                // Send result to content script
                chrome.tabs.sendMessage(tabId, {
                    type: "ANALYSIS_RESULT",
                    success: true,
                    data: data
                });
            } else {
                // Send error
                chrome.tabs.sendMessage(tabId, {
                    type: "ANALYSIS_RESULT",
                    success: false,
                    error: data.error || "Analysis failed"
                });
            }
        } catch (error) {
            chrome.tabs.sendMessage(tabId, {
                type: "ANALYSIS_RESULT",
                success: false,
                error: error.message
            });
        }
    });
}
