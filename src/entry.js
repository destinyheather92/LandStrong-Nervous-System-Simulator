import { initializeApp } from "./main.js";


// this checks if the DOM is still loading, and if so, it waits for the "DOMContentLoaded" event before initializing the app. If the DOM is already loaded, it initializes the app immediately. This ensures that all necessary elements are available in the DOM before the app tries to interact with them, preventing potential errors and ensuring a smooth user experience from the moment the page is ready.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}
