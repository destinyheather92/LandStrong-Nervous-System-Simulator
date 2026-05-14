// This is the small shared memory for the current app session.
// Modules read and update it so the selected state, current screen, and breath status stay in sync.
export const appState = {
  currentSection: "hero",
  selectedEmotion: null,
  isBreathingActive: false,
  reflections: [],
};
