function applyStatus(enabled) {
    let rootElement = document.documentElement

    if (enabled) {
        rootElement.classList.add("derin-dark")

        let color = getComputedStyle(document.body).backgroundColor
        if (["transparent", "rgba(0, 0, 0, 0)"].includes(color)) {
            rootElement.classList.add("derin-dark-transparent")
        }
    } else {
        rootElement.classList.remove("derin-dark")
        rootElement.classList.remove("derin-dark-transparent")
    }
}

chrome.runtime.sendMessage({ id: "get-status", hostname: location.hostname }, (response) => {
    applyStatus(response.enabled)
})

chrome.runtime.onMessage.addListener((req) => {
    if (req.id === "update-style" && req.hostname === location.hostname) {
        applyStatus(req.status)
    }
})
