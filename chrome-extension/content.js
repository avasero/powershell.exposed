// Content script for powerphell.exposed Extension

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "ANALYSIS_START") {
    showLoading();
  } else if (message.type === "ANALYSIS_RESULT") {
    hideLoading();
    if (message.success) {
      showResult(message.data);
    } else {
      showError(message.error);
    }
  }
});

let modal = null;

function createModal() {
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'pse-analysis-modal';
  modal.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 350px;
    background-color: #0a0a0a;
    color: #e0e0e0;
    border: 1px solid #333;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    z-index: 999999;
    font-family: 'Segoe UI', sans-serif;
    padding: 0;
    overflow: hidden;
  `;

  document.body.appendChild(modal);
  return modal;
}

function showLoading() {
  const m = createModal();
  m.innerHTML = `
    <div style="padding: 20px; text-align: center;">
      <div style="color: #1CC76D; font-weight: bold; margin-bottom: 10px;">powershell.exposed</div>
      <div>Analyzing...</div>
    </div>
  `;
}

function hideLoading() {
  if (modal) {
    modal.remove();
    modal = null;
  }
}

function showResult(data) {
  const m = createModal();
  const analysis = data.analysis;
  const isMalicious = analysis.risk_score >= 7 || analysis.severity === 'high' || analysis.severity === 'critical';
  const color = isMalicious ? '#ff4444' : '#1CC76D';

  m.innerHTML = `
    <div style="padding: 15px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center;">
      <span style="font-weight: bold; color: #1CC76D;">Analysis Result</span>
      <button id="pse-close-btn" style="background: none; border: none; color: #888; cursor: pointer; font-size: 16px;">&times;</button>
    </div>
    <div style="padding: 15px;">
      <div style="margin-bottom: 10px;">
        <span style="color: #888; font-size: 12px;">Risk Score</span>
        <div style="font-size: 24px; font-weight: bold; color: ${color};">${analysis.risk_score} / 10</div>
      </div>
      <div style="margin-bottom: 10px;">
        <span style="color: #888; font-size: 12px;">Severity</span>
        <div style="text-transform: capitalize;">${analysis.severity}</div>
      </div>
      ${analysis.signatures_detected.length > 0 ? `
        <div style="margin-top: 10px;">
          <span style="color: #888; font-size: 12px;">Detections</span>
          <ul style="margin: 5px 0 0 0; padding-left: 20px; font-size: 13px;">
            ${analysis.signatures_detected.slice(0, 3).map(sig => `<li>${sig.name}</li>`).join('')}
            ${analysis.signatures_detected.length > 3 ? `<li>+ ${analysis.signatures_detected.length - 3} more</li>` : ''}
          </ul>
        </div>
      ` : '<div style="margin-top: 10px; color: #888; font-size: 13px;">No threats detected.</div>'}
      
      <div style="margin-top: 15px; text-align: center;">
        <a href="https://powershell.exposed/analysis/${data.analysis_id}" target="_blank" style="color: #1CC76D; text-decoration: none; font-size: 13px;">View Full Report &rarr;</a>
      </div>
    </div>
  `;

  document.getElementById('pse-close-btn').onclick = () => {
    m.remove();
    modal = null;
  };
}

function showError(error) {
  const m = createModal();
  m.innerHTML = `
    <div style="padding: 15px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center;">
      <span style="font-weight: bold; color: #ff4444;">Error</span>
      <button id="pse-close-btn" style="background: none; border: none; color: #888; cursor: pointer; font-size: 16px;">&times;</button>
    </div>
    <div style="padding: 15px;">
      <div style="color: #e0e0e0; font-size: 13px;">${error}</div>
    </div>
  `;

  document.getElementById('pse-close-btn').onclick = () => {
    m.remove();
    modal = null;
  };
}
