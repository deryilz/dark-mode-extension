let checkbox = document.getElementById("checkbox");
let checkboxArea = document.getElementById("checkbox-area");
let domainName = document.getElementById("domain-name");

async function getCurrentHostname() {
    let activeTabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (activeTabs.length === 0) return null;

    let url = new URL(activeTabs[0].url);
    if (!url.protocol.startsWith("http")) return null;

    return url.hostname;
}

function getEnabled(hostname) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ id: "get-status", hostname }, (response) => {
            resolve(response.enabled);
        });
    });
}

function onCheckboxClick(hostname) {
    let status = checkbox.checked;
    chrome.runtime.sendMessage({ id: "set-status", hostname, status });
}

async function init() {
    let hostname = await getCurrentHostname();
    if (hostname === null) {
        checkboxArea.style.display = "none";
        return;
    }

    checkbox.checked = await getEnabled(hostname);
    checkbox.focus();

    domainName.textContent = hostname;
    checkbox.addEventListener("click", () => onCheckboxClick(hostname));
}

init();
