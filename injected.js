const DARK_CLASS = "derin-dark";
const DARK_TOTAL_CLASS = "derin-dark-total";
const DARK_TRANSPARENT_CLASS = "derin-dark-transparent";

let cachedStatus = "off";
let isFullScreen = false;

function onFullScreenChange() {
    isFullScreen = Boolean(document.fullscreenElement);

    if (isFullScreen) {
        applyStatus(false, false);
    } else {
        applyStatus(cachedStatus);
    }
}

document.addEventListener("fullscreenchange", onFullScreenChange);
window.addEventListener("resize", onFullScreenChange);

function applyStatus(status, cache = true) {
    if (cache) cachedStatus = status;
    if (cache && isFullScreen) return;

    if (document.contentType !== "text/html") return;

    let rootClasses = document.documentElement.classList;

    if (status === "off") {
        rootClasses.remove(DARK_CLASS);
        rootClasses.remove(DARK_TRANSPARENT_CLASS);
    } else {
        let color = getComputedStyle(document.body).backgroundColor;
        if (["transparent", "rgba(0, 0, 0, 0)"].includes(color)) {
            rootClasses.add(DARK_TRANSPARENT_CLASS);
        }
        rootClasses.add(DARK_CLASS);
        rootClasses.toggle(DARK_TOTAL_CLASS, status === "total");
    }
}

function enforceCache() {
    let observer = new MutationObserver(mutations => {
        // during an extension update, two content scripts will be loaded on the same page at once
        // this disconnects the old one, so that no infinite loop will happen
        if (!chrome.runtime?.id) {
            observer.disconnect();
            return;
        }

        for (let mutation of mutations) {
            let enabled = cachedStatus !== "off";
            if (
                mutation.attributeName === "class" &&
                mutation.target.classList.contains(DARK_CLASS) !== enabled &&
                !isFullScreen
            ) {
                applyStatus(cachedStatus);
            }
        }
    });

    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
    });
}

enforceCache();

chrome.runtime.sendMessage({ id: "get-status", hostname: location.hostname }, (response) => {
    // temporary fix for google.com
    if (
        location.hostname === "www.google.com" &&
        ["/", "/search"].includes(location.pathname) &&
        document.querySelector("meta[name=color-scheme]")?.content !== "dark light"
    ) {
        response.status = true;
    }

    if (document.body) {
        applyStatus(response.status);
        return;
    }

    let observer = new MutationObserver(() => {
        if (document.body) {
            applyStatus(response.status);
            observer.disconnect();
        }
    });

    observer.observe(document.documentElement, { childList: true });
})

chrome.runtime.onMessage.addListener((req) => {
    if (req.id === "update-style" && req.hostname === location.hostname) {
        applyStatus(req.status);
    }
})
