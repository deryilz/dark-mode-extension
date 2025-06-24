const STORAGE_KEY = "enabledHostnames"

async function getEnabled(hostname) {
    let storage = await chrome.storage.local.get(STORAGE_KEY)
    let hostnames = storage[STORAGE_KEY] ?? {}
    Object.setPrototypeOf(hostnames, null)

    return Boolean(hostnames[hostname])
}

async function setEnabled(hostname, status) {
    let storage = await chrome.storage.local.get(STORAGE_KEY)
    let hostnames = storage[STORAGE_KEY] ?? {}
    Object.setPrototypeOf(hostnames, null)

    if (status) {
        hostnames[hostname] = status
    } else {
        delete hostnames[hostname]
    }

    chrome.storage.local.set({ [STORAGE_KEY]: hostnames })
}

async function notifyTabs(hostname, status) {
    let tabs = await chrome.tabs.query({ url: "*://*/*", });
    for (let tab of tabs) {
        try {
            chrome.tabs.sendMessage(tab.id, {
                id: "update-style",
                status,
                hostname,
            })
        } catch (_) { }
    }
}

async function injectIntoEverything() {
    console.log("Just installed, so injecting into all tabs.")

    let tabs = await chrome.tabs.query({ url: "*://*/*" })
    for (const tab of tabs) {
        let target = { tabId: tab.id, allFrames: true }

        chrome.scripting.executeScript({
            files: ["./injected.js"],
            injectImmediately: true,
            target,
        })

        chrome.scripting.insertCSS({
            files: ["./injected.css"],
            target,
        })
    }
}

chrome.commands.onCommand.addListener((command, tab) => {
    if (command === "toggle-site") {
        if (!tab) return

        let hostname = new URL(tab.url).hostname
        getEnabled(hostname).then((enabled) => {
            setEnabled(hostname, !enabled)
            notifyTabs(hostname, !enabled)
        })
    }
})

chrome.runtime.onMessage.addListener((req, sender, res) => {
    console.warn("Message received:", { req, sender })

    if (req.id === "get-status") {
        getEnabled(req.hostname).then((enabled) => res({ enabled }))
        return true
    }

    if (req.id === "set-status") {
        setEnabled(req.hostname, req.status)
        notifyTabs(req.hostname, req.status)
    }
})

chrome.runtime.onInstalled.addListener(injectIntoEverything)
