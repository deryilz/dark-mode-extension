const DARK_CLASS = "derin-dark";
const DARK_TOTAL_CLASS = "derin-dark-total";
const DARK_TRANSPARENT_CLASS = "derin-dark-transparent";

let cachedStatus = "off";
let isFullScreen = false;

function onFullScreenChange() {
    isFullScreen = Boolean(document.fullscreenElement);

    if (isFullScreen) {
        let status = cachedStatus === "total" ? "dark" : "off";
        applyStatus(status, false);
    } else {
        applyStatus(cachedStatus);
    }
}

document.addEventListener("fullscreenchange", onFullScreenChange);
window.addEventListener("resize", onFullScreenChange);

function applyStatus(status, cache = true) {
    if (cache) cachedStatus = status;
    if (cache && isFullScreen) return onFullScreenChange();

    if (document.contentType !== "text/html" && !document.contentType.startsWith("image/")) return;

    let rootClasses = document.documentElement.classList;

    if (status === "off") {
        rootClasses.remove(DARK_CLASS);
        rootClasses.remove(DARK_TRANSPARENT_CLASS);
    } else {
        let transparent = true;
        for (let element of [document.documentElement, document.body]) {
            let style = getComputedStyle(element);
            let color = style.backgroundColor;
            let image = style.backgroundImage;
            if (
                !["transparent", "rgba(0, 0, 0, 0)", "rgb(255, 255, 255)"].includes(color) ||
                image && image !== "none"
            ) {
                transparent = false;
            }
        }

        rootClasses.add(DARK_CLASS);
        rootClasses.toggle(DARK_TOTAL_CLASS, status === "total");
        rootClasses.toggle(DARK_TRANSPARENT_CLASS, transparent);
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
        response.status = "dark";
    }

    if (document.body) {
        applyStatus(response.status);
    } else {
        let bodyObserver = new MutationObserver(() => {
            if (document.body) {
                applyStatus(response.status);
                bodyObserver.disconnect();
            }
        });
        bodyObserver.observe(document.documentElement, { childList: true });
    }

    if (document.readyState !== "complete") {
        window.addEventListener("DOMContentLoaded", () => applyStatus(cachedStatus));
        window.addEventListener("load", () => applyStatus(cachedStatus));
    }

    let resizeObserver = new ResizeObserver(() => {
        applyStatus(cachedStatus);
    });
    resizeObserver.observe(document.documentElement);

    let styleObserver = new MutationObserver((mutations) => {
        if (!chrome.runtime?.id) {
            styleObserver.disconnect();
            return;
        }

        let update = false;
        for (let mutation of mutations) {
            for (let node of mutation.addedNodes) {
                if (node.nodeName === "STYLE" || node.nodeName === "LINK") {
                    update = true;
                }
            }
        }

        if (update) {
            applyStatus(cachedStatus);
        }
    });

    styleObserver.observe(document.head || document.documentElement, {
        childList: true,
        subtree: true
    });
});

chrome.runtime.onMessage.addListener((req) => {
    if (req.id === "update-style" && req.hostname === location.hostname) {
        applyStatus(req.status);
    }
});
