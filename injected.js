const DARK_CLASS = "derin-dark"
const DARK_TRANSPARENT_CLASS = "derin-dark-transparent"

let cachedStatus = false
let isFullScreen = false

document.addEventListener("fullscreenchange", () => {
    isFullScreen = Boolean(document.fullscreenElement)

    if (isFullScreen) {
        applyStatus(false, false)
    } else {
        applyStatus(cachedStatus)
    }
})

function applyStatus(enabled, cache = true) {
    if (cache) cachedStatus = enabled
    if (cache && isFullScreen) return

    let rootClasses = document.documentElement.classList

    if (enabled) {
        let color = getComputedStyle(document.body).backgroundColor
        if (["transparent", "rgba(0, 0, 0, 0)"].includes(color)) {
            rootClasses.add(DARK_TRANSPARENT_CLASS)
        }
        rootClasses.add(DARK_CLASS)
    } else {
        rootClasses.remove(DARK_CLASS)
        rootClasses.remove(DARK_TRANSPARENT_CLASS)
    }
}

function enforceCache() {
    let observer = new MutationObserver(mutations => {
        // during an extension update, two content scripts will be loaded on the same page at once
        // this disconnects the old one, so that no infinite loop will happen
        if (!chrome.runtime?.id) {
            observer.disconnect()
            return
        }

        for (let mutation of mutations) {
            if (mutation.attributeName === 'class'
                && mutation.target.classList.contains(DARK_CLASS) !== cachedStatus
                && !isFullScreen) {
                applyStatus(cachedStatus)
            }
        }
    });

    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
    });
}

enforceCache()

chrome.runtime.sendMessage({ id: "get-status", hostname: location.hostname }, (response) => {
    if (document.body) {
        applyStatus(response.enabled)
        return
    }

    let observer = new MutationObserver(() => {
        if (document.body) {
            applyStatus(response.enabled)
            observer.disconnect();
        }
    });

    observer.observe(document.documentElement, { childList: true });
})

chrome.runtime.onMessage.addListener((req) => {
    if (req.id === "update-style" && req.hostname === location.hostname) {
        applyStatus(req.status)
    }
})
