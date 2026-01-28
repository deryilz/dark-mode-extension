const STORAGE_KEY = "enabledHostnames";

// "off" | "dark" | "total"

async function migrateStorage() {
    let storage = await chrome.storage.local.get(STORAGE_KEY);
    let hostnames = storage[STORAGE_KEY];
    if (!hostnames) return;

    for (let key of Object.keys(hostnames)) {
        if (hostnames[key] === true) {
            hostnames[key] = "dark";
        }
    }

    await chrome.storage.local.set({ [STORAGE_KEY]: hostnames });
}

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "update") migrateStorage();
});

async function injectIntoEverything() {
    console.log("Just installed, so injecting into all tabs.");

    let tabs = await chrome.tabs.query({ url: "*://*/*" });
    for (const tab of tabs) {
        let target = { tabId: tab.id, allFrames: true };

        chrome.scripting.executeScript({
            files: ["./injected.js"],
            injectImmediately: true,
            target,
        });

        chrome.scripting.insertCSS({
            files: ["./injected.css"],
            target,
        });
    }
}

chrome.runtime.onInstalled.addListener(injectIntoEverything);

async function getStatus(hostname) {
    let storage = await chrome.storage.local.get(STORAGE_KEY);
    let hostnames = storage[STORAGE_KEY] ?? {};
    Object.setPrototypeOf(hostnames, null);

    return hostnames[hostname] ?? "off";
}

async function setStatus(hostname, status) {
    let storage = await chrome.storage.local.get(STORAGE_KEY);
    let hostnames = storage[STORAGE_KEY] ?? {};
    Object.setPrototypeOf(hostnames, null);

    if (status === "off") {
        delete hostnames[hostname];
    } else {
        hostnames[hostname] = status;
    }

    await chrome.storage.local.set({ [STORAGE_KEY]: hostnames });
}

async function notifyTabs(hostname, status) {
    let tabs = await chrome.tabs.query({ url: "*://*/*", });
    for (let tab of tabs) {
        try {
            chrome.tabs.sendMessage(tab.id, {
                id: "update-style",
                status,
                hostname,
            });
        } catch (_) { }
    }
}

chrome.commands.onCommand.addListener((command, tab) => {
    if (!tab) return;

    let mode;

    if (command === "set-dark") {
        mode = "dark";
    } else if (command === "set-total") {
        mode = "total";
    } else {
        return;
    }

    let hostname = new URL(tab.url).hostname;
    if (!hostname) return;

    getStatus(hostname).then((oldStatus) => {
        let status = oldStatus === "off" ? mode : "off";
        setStatus(hostname, status);
        notifyTabs(hostname, status);
    });
});

chrome.runtime.onMessage.addListener((req, _, res) => {
    if (req.id === "get-status") {
        getStatus(req.hostname).then((status) => res({ status }));
        return true;
    }

    if (req.id === "set-status") {
        setStatus(req.hostname, req.status);
        notifyTabs(req.hostname, req.status);
    }
});
