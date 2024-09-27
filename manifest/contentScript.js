// Function to inject the prompt into the textarea and simulate form submission
function injectPromptAndSubmit() {
    const promptTextarea = document.querySelector('#prompt-textarea');

    if (promptTextarea) {
        // Inject the custom prompt into the textarea
        promptTextarea.innerHTML = "Please find the cheapest flights from South East Asia to Europe for dates 5-20 October 2024 for 1 adult, economy class.";
        console.log("Prompt injected into textarea.");

        // Use setInterval to wait for the submit button to become available
        const intervalId = setInterval(() => {
            const submitButton = document.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.click();  // Simulate form submission
                clearInterval(intervalId); // Stop checking after submission
                observer.disconnect(); // Disconnect MutationObserver after success
                console.log("Submit button clicked, form submitted.");
            } else {
                console.error("Submit button not found, retrying...");
            }
        }, 500); // Retry every 500ms until the button is found

        // Limit retries to prevent infinite looping
        setTimeout(() => {
            clearInterval(intervalId);
            console.error("Submit button was not found within time limit.");
        }, 5000); // Stop retrying after 5 seconds
    } else {
        console.error("Prompt textarea not found on the page, retrying...");
    }
}

// Set up a MutationObserver to watch for changes in the DOM
const observer = new MutationObserver((mutationsList, observer) => {
    for (let mutation of mutationsList) {
        if (mutation.type === 'childList') {
            injectPromptAndSubmit(); // Try injecting the prompt whenever new nodes are added
        }
    }
});

// Start observing the document for changes in the body (to detect when elements are added)
observer.observe(document.body, { childList: true, subtree: true });

// Fallback to ensure the page is fully loaded
window.addEventListener("load", function() {
    injectPromptAndSubmit(); // Run the function once when the page is fully loaded
});
