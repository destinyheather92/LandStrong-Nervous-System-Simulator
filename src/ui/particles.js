// This creates the floating background particles used on each app screen.
export function createParticles(container, count, preferredSpeed = null) {
  if (!container) return;

  container.innerHTML = "";

  for (let i = 0; i < count; i++) {
    const particle = document.createElement("div");
    const xPos = Math.random() * 100;
    const yPos = Math.random() * 100;
    const speed =
      preferredSpeed ||
      ["slow", "medium", "fast"][Math.floor(Math.random() * 3)];
    const delay = Math.random() * 5;
    const duration = speed === "slow" ? 30 : speed === "fast" ? 10 : 20;

    particle.className = "particle";
    particle.classList.add(speed);
    particle.style.left = `${xPos}%`;
    particle.style.top = `${yPos}%`;
    particle.style.animation = `drift ${duration}s linear ${delay}s infinite`;

    container.appendChild(particle);
  }
}

// This refreshes particles when a theme or section changes.
export function refreshParticlesForCurrentSection({ dom, appState, emotionalStates }) {
  if (appState.currentSection === "hero") {
    createParticles(dom.particlesHero, 30);
    return;
  }

  if (appState.currentSection === "state") {
    createParticles(dom.particlesState, 40);
    return;
  }

  if (appState.currentSection === "regulation" && appState.selectedEmotion) {
    const state = emotionalStates[appState.selectedEmotion];
    createParticles(dom.particlesRegulation, state.particles.count, state.particles.speed);
  }
}

// This lazily prepares particles when sections enter the viewport.
export function setupParticleObserver({ dom, appState, emotionalStates }) {
  if (!("IntersectionObserver" in window)) return null;

  const observedSections = [
    { section: dom.stateSection, container: dom.particlesState },
    { section: dom.regulationSection, container: dom.particlesRegulation },
  ].filter(({ section, container }) => section && container);

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !entry.target.dataset.particlesLoaded) {
          const match = observedSections.find(
            ({ section }) => section === entry.target,
          );
          const container = match ? match.container : null;

          if (container) {
            const state = emotionalStates[appState.selectedEmotion];
            createParticles(
              container,
              state ? state.particles.count : 30,
              state ? state.particles.speed : null,
            );
            entry.target.dataset.particlesLoaded = true;
          }
        }
      });
    },
    { threshold: 0.1 },
  );

  observedSections.forEach(({ section }) => {
    sectionObserver.observe(section);
  });

  return sectionObserver;
}
