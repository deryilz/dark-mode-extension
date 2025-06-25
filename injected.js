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

chrome.runtime.sendMessage({ id: "get-status", hostname: location.hostname }, (response) => {
    if (document.body) {
        applyStatus(response.enabled)
        return
    }

    document.addEventListener("DOMContentLoaded", () => {
        if (!document.body) {
            // shouldn't happen
            console.warn("No body, quitting...")
            return
        }

        applyStatus(response.enabled)
    })
})

chrome.runtime.onMessage.addListener((req) => {
    if (req.id === "update-style" && req.hostname === location.hostname) {
        applyStatus(req.status)
    }
})
