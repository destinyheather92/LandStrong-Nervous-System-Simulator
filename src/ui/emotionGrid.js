// This builds the selectable emotion cards from the shared state data.
export function generateEmotionGrid({ dom, emotionalStates, onSelectEmotion }) {
  dom.emotionGrid.innerHTML = "";

  Object.entries(emotionalStates).forEach(([key, state]) => {
    const card = document.createElement("div");
    card.className = "emotion-card";
    card.innerHTML = `
      <div class="emotion-icon">${state.icon}</div>
      <div class="emotion-name">${state.name}</div>
      <div class="emotion-description">${state.description}</div>
    `;

    card.addEventListener("click", (event) => onSelectEmotion(key, event));
    dom.emotionGrid.appendChild(card);
  });
}
