let container = document.getElementById("container");
let mode = document.getElementById("mode");
let domainName = document.getElementById("domain-name");

async function getCurrentHostname() {
    let activeTabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (activeTabs.length === 0) return null;

    let url = new URL(activeTabs[0].url);
    if (!url.protocol.startsWith("http")) return null;

    return url.hostname;
}

function getStatus(hostname) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ id: "get-status", hostname }, (response) => {
            resolve(response.status);
        });
    });
}

async function init() {
    let hostname = await getCurrentHostname();
    if (hostname === null) {
        container.style.display = "none";
        return;
    }

    mode.value = await getStatus(hostname);
    domainName.textContent = hostname;

    mode.addEventListener("change", () => {
        let status = mode.value;
        chrome.runtime.sendMessage({ id: "set-status", hostname, status });
    });
}

init();
