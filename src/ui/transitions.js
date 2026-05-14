import { createParticles } from "./particles.js";

// This handles the three screen-like sections and keeps audio aligned with the active screen.
export function createSectionTransitioner({
  dom,
  appState,
  emotionalStates,
  stopActiveSoundscape,
}) {
  function hideCurrentSection() {
    if (appState.currentSection === "hero") dom.heroSection.classList.remove("active");
    if (appState.currentSection === "state") dom.stateSection.classList.remove("active");
    if (appState.currentSection === "regulation") {
      dom.regulationSection.classList.remove("active");
    }
  }

  function showTargetSection(targetSection) {
    if (targetSection === "hero") {
      dom.heroSection.classList.remove("hidden");
      dom.heroSection.classList.add("active");
      createParticles(dom.particlesHero, 30);
    }

    if (targetSection === "state") {
      dom.stateSection.classList.remove("hidden");
      dom.stateSection.classList.add("active");
      createParticles(dom.particlesState, 40);
    }

    if (targetSection === "regulation") {
      dom.regulationSection.classList.remove("hidden");
      dom.regulationSection.classList.add("active");
      const state = emotionalStates[appState.selectedEmotion];
      createParticles(dom.particlesRegulation, state.particles.count, state.particles.speed);
    }
  }

  function transitionToSection(targetSection) {
    window.scrollTo(0, 0);
    hideCurrentSection();

    setTimeout(() => {
      showTargetSection(targetSection);
    }, 100);

    appState.currentSection = targetSection;

    if (targetSection !== "regulation") {
      stopActiveSoundscape({
        fadeSeconds: 0.45,
        guidedMessage: "Guided voice will follow the selected state.",
      });
    }
  }

  return { transitionToSection };
}
