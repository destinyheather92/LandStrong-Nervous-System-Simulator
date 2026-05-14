import { escapeHtml } from "../utils/html.js";

// This fills the grounding and reminder areas for the selected emotional state.
export function createRegulationContent({ dom }) {
  let currentPromptIndex = 0;

  function setupGroundingTechniques(state) {
    dom.groundingContent.innerHTML = "";

    state.groundingTechniques.forEach((technique) => {
      const item = document.createElement("div");
      item.className = "grounding-item";
      item.innerHTML = `
        <div class="grounding-item-title">${escapeHtml(technique.title)}</div>
        <div class="grounding-item-text">${escapeHtml(technique.text)}</div>
      `;
      dom.groundingContent.appendChild(item);
    });
  }

  function displayPrompt(state) {
    const prompt = state.prompts[currentPromptIndex];

    dom.promptText.style.opacity = "0";
    setTimeout(() => {
      dom.promptText.textContent = prompt;
      dom.promptText.style.opacity = "1";
    }, 200);
  }

  function setupPrompts(state) {
    currentPromptIndex = Math.floor(Math.random() * state.prompts.length);
    displayPrompt(state);

    dom.nextPromptButton.onclick = () => {
      currentPromptIndex = (currentPromptIndex + 1) % state.prompts.length;
      displayPrompt(state);
    };
  }

  return { setupGroundingTechniques, setupPrompts };
}
