// This listens for a click on the extension icon
chrome.action.onClicked.addListener((tab) => {
    // When clicked, it injects the content script into the current tab
    chrome.scripting.executeScript({
        target: {tabId: tab.id},
        files: ['contentScript.js']
    });
});
