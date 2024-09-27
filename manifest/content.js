const observer = new MutationObserver(function(mutationsList, observer) {
    const promptTextarea = document.querySelector('#prompt-textarea');
    if (promptTextarea) {
        promptTextarea.innerHTML = "<p>Find the cheapest Return flights from South East Asia to Europe. Date range 5 - 20 October. Find cheapest cities for departure and destination for 1 adult economy class</p>";
        
        const event = new Event('input', {
            bubbles: true,
            cancelable: true,
        });
        promptTextarea.dispatchEvent(event);

        console.log("Prompt injected successfully.");
        observer.disconnect(); // Stop observing once the element is found and modified
    }
});

// Start observing the body for changes
observer.observe(document.body, { childList: true, subtree: true });
