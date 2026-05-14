/* ============================================================
   LandStrong: Nervous System Simulator - Browser Bundle

   This file is generated from the modular files in src/.
   It uses a normal script tag so index.html can be opened directly
   without a local static server.
   ============================================================ */

(() => {
  "use strict";

// ============================================================
// src/appState.js
// ============================================================
// This is the small shared memory for the current app session.
// Modules read and update it so the selected state, current screen, and breath status stay in sync.
const appState = {
  currentSection: "hero",
  selectedEmotion: null,
  isBreathingActive: false,
  reflections: [],
};


// ============================================================
// src/domElements.js
// ============================================================
const byId = (id) => document.getElementById(id);
const query = (selector) => document.querySelector(selector);

// All DOM lookups live here so feature modules can focus on behavior.
const dom = {
  documentElement: document.documentElement,
  body: document.body,
  app: byId("app"),
  heroSection: byId("heroSection"),
  stateSection: byId("stateSection"),
  regulationSection: byId("regulationSection"),
  beginButton: byId("beginButton"),
  emotionGrid: byId("emotionGrid"),
  backButton: byId("backButton"),
  resetButton: byId("resetButton"),
  currentStateDisplay: byId("currentState"),
  breathingOrb: byId("breathingOrb"),
  startBreathingButton: byId("startBreathingButton"),
  breathingText: byId("breathingText"),
  breathingCount: byId("breathingCount"),
  breathingPattern: byId("breathingPattern"),
  breathingNote: byId("breathingNote"),
  promptText: byId("promptText"),
  nextPromptButton: byId("nextPromptButton"),
  groundingContent: byId("groundingContent"),
  journalInput: byId("journalInput"),
  saveReflectionButton: byId("saveReflectionButton"),
  reflectionsList: byId("reflectionsList"),
  charCount: byId("charCount"),
  themeToggleButton: byId("themeToggleButton"),
  soundEnabledToggle: byId("soundEnabledToggle"),
  natureSoundToggle: byId("natureSoundToggle"),
  meditationSoundToggle: byId("meditationSoundToggle"),
  guidedMeditationToggle: byId("guidedMeditationToggle"),
  natureSoundSelect: byId("natureSoundSelect"),
  masterVolumeInput: byId("masterVolumeInput"),
  natureVolumeInput: byId("natureVolumeInput"),
  meditationVolumeInput: byId("meditationVolumeInput"),
  guidedMeditationButton: byId("guidedMeditationButton"),
  guidedMeditationText: byId("guidedMeditationText"),
  soundStatus: byId("soundStatus"),
  affirmationText: byId("affirmationText"),
  affirmationMeta: byId("affirmationMeta"),
  newAffirmationButton: byId("newAffirmationButton"),
  routineContent: byId("routineContent"),
  refreshRoutineButton: byId("refreshRoutineButton"),
  stateCountStat: byId("stateCountStat"),
  breathingCountStat: byId("breathingCountStat"),
  journalCountStat: byId("journalCountStat"),
  visitCountStat: byId("visitCountStat"),
  dominantStateStat: byId("dominantStateStat"),
  emotionTimeline: byId("emotionTimeline"),
  fontScaleInput: byId("fontScaleInput"),
  particlesHero: byId("particlesHero"),
  particlesState: byId("particlesState"),
  particlesRegulation: byId("particlesRegulation"),
  customCursor: query(".custom-cursor"),
  cursorFollower: query(".cursor-follower"),
  getAllBodyElements: () => document.body.querySelectorAll("*"),
  getButtons: () => document.querySelectorAll("button"),
  getEmotionCards: () => document.querySelectorAll(".emotion-card"),
};


// ============================================================
// src/storageUtils.js
// ============================================================
const storageKeys = {
  preferences: "landstrongPreferences",
  activity: "landstrongActivity",
  lastAffirmation: "landstrongLastAffirmation",
  reflections: "landstrongReflections",
};

const defaultPreferences = {
  theme: "dark",
  fontScale: 100,
  soundEnabled: false,
  natureEnabled: false,
  meditationEnabled: true,
  guidedMeditationEnabled: false,
  natureType: "rain",
  masterVolume: 35,
  natureVolume: 35,
  meditationVolume: 25,
};

const defaultActivity = {
  emotionHistory: [],
  breathingSessions: [],
  appVisits: [],
};

// This reads saved browser data safely so a bad stored value cannot crash the app.
function readStorage(key, fallback) {
  try {
    const storedValue = localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : fallback;
  } catch (error) {
    console.log("Storage read failed:", error);
    return fallback;
  }
}

// This writes saved browser data safely and quietly handles storage limits.
function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.log("Storage write failed:", error);
  }
}

// Preferences are merged with defaults so older saved settings still work after updates.
function loadPreferences() {
  return {
    ...defaultPreferences,
    ...readStorage(storageKeys.preferences, {}),
  };
}

// Activity arrays are checked before use because localStorage can be edited or corrupted.
function loadActivity() {
  const storedActivity = readStorage(storageKeys.activity, {});

  return {
    emotionHistory: Array.isArray(storedActivity.emotionHistory)
      ? storedActivity.emotionHistory
      : [],
    breathingSessions: Array.isArray(storedActivity.breathingSessions)
      ? storedActivity.breathingSessions
      : [],
    appVisits: Array.isArray(storedActivity.appVisits)
      ? storedActivity.appVisits
      : [],
  };
}


// ============================================================
// src/utils/html.js
// ============================================================
// This keeps saved journal text from becoming executable HTML when it is shown again.
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}


// ============================================================
// src/utils/dates.js
// ============================================================
// This gives stored events a friendly label without exposing raw timestamps.
function formatStoredDate(value) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeStoredDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
}

// Affirmations use this so a daily message stays stable during the same day.
function isSameDay(firstDate, secondDate) {
  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
}


// ============================================================
// src/data/emotionalStates.js
// ============================================================
// These profiles drive the full regulation experience for each nervous-system state.
// The UI, breathing, grounding prompts, particles, and audio all read from this data.
const emotionalStates = {
  fight: {
    name: "Fight",
    icon: "⚡",
    description: "Anxious, alert, tense, irritable",
    className: "state-fight",
    breathingPattern: { inhale: 4, hold: 2, exhale: 6 },
    breathingCycles: 3,
    breathingPhrase: "Slow your activation",
    breathingStyle: "Slightly slower, with a controlled exhale",
    breathingNote: "Longer exhales help reduce physical tension.",
    orbProfile: { motion: "fight", inhaleEnd: 1.28 },
    color: "#456d9f",
    particles: { count: 60, speed: "fast" },
    prompts: [
      "You are safe right now. Ground yourself here.",
      "Feel your feet on the ground. Notice 5 things you can see.",
      "Progressive muscle relaxation: tense and release each muscle group.",
      "Your body is protecting you. Thank it and let it rest.",
      "Slow, deep breaths. In through the nose, out through the mouth.",
      "You are stronger than you think. You can handle this.",
    ],
    groundingTechniques: [
      {
        title: "5 Senses Grounding",
        text: "Notice 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste.",
      },
      {
        title: "Cold Water",
        text: "Splash cold water on your face or hold ice. Activates the calming reflex.",
      },
      {
        title: "Movement",
        text: "Do 10 jumping jacks or a quick walk. Release stored energy safely.",
      },
      {
        title: "Grounding Statement",
        text: 'Say: "I am safe. I am here. I can handle this."',
      },
    ],
  },
  flight: {
    name: "Flight",
    icon: "🕊️",
    description: "Restless, eager to escape, avoidant, busy",
    className: "state-flight",
    breathingPattern: { inhale: 4, hold: 4, exhale: 4 },
    breathingCycles: 3,
    breathingPhrase: "Settle into stillness",
    breathingStyle: "Steady, rhythmic, and predictable",
    breathingNote: "Box breathing creates a consistent sense of safety.",
    orbProfile: { motion: "flight", inhaleEnd: 1.3 },
    color: "#508dc8",
    particles: { count: 45, speed: "medium" },
    prompts: [
      "You are allowed to pause. Rest is not avoidance.",
      "Notice where your body holds tension. Breathe into that space.",
      "You can stay. You are safe here.",
      "Slow down with intention. Each breath counts.",
      "Your nervous system is learning to trust stillness.",
      "Rest is productive. Allow yourself this moment.",
    ],
    groundingTechniques: [
      {
        title: "Grounding Stones",
        text: "Hold something cold or textured in your hands. Notice its weight.",
      },
      {
        title: "Containment Practice",
        text: "Wrap yourself in a blanket. Feel held and supported.",
      },
      {
        title: "Slow Walks",
        text: "Walk slowly with intention. Feel each step.",
      },
      {
        title: "Anchor Object",
        text: "Hold something meaningful. Let it anchor you to the present.",
      },
    ],
  },
  freeze: {
    name: "Freeze",
    icon: "❄️",
    description: "Numb, disconnected, stuck, paralyzed",
    className: "state-freeze",
    breathingPattern: { inhale: 3, hold: 1, exhale: 4 },
    holdLabel: "Soft pause",
    breathingCycles: 2,
    breathingPhrase: "Gently return to your body",
    breathingStyle: "Very gentle, soft, and slow",
    breathingNote:
      "A tiny pause keeps the breath supportive without forcing retention.",
    orbProfile: { motion: "freeze", inhaleEnd: 1.18 },
    color: "#7081bf",
    particles: { count: 25, speed: "slow" },
    prompts: [
      "You are safe. It is okay to come back to your body slowly.",
      "Gently wiggle your fingers and toes. Reconnect gradually.",
      "Notice small sensations. You are here. You are real.",
      "Your body is protecting you. Thank it with compassion.",
      "Slow, rhythmic breathing brings you back to the present.",
      "You can return at your own pace. There is no rush.",
    ],
    groundingTechniques: [
      {
        title: "Pendulum Exercise",
        text: "Gently sway side to side. Feel your weight shift and ground.",
      },
      {
        title: "Progressive Awareness",
        text: "Start with toes, move up to head. Notice each body part.",
      },
      {
        title: "Warm Touch",
        text: "Hold a warm cup or wrap in a warm blanket. Feel the comfort.",
      },
      {
        title: "Sound Anchoring",
        text: "Hum or listen to calming sounds. Let vibrations bring you back.",
      },
    ],
  },
  shutdown: {
    name: "Shutdown",
    icon: "⏸️",
    description: "Depressed, hopeless, empty, withdrawn",
    className: "state-shutdown",
    breathingPattern: { inhale: 5, hold: 1, exhale: 5 },
    breathingCycles: 2,
    breathingPhrase: "Breath by breath, moment by moment",
    breathingStyle: "Deep, balanced, and not intense",
    breathingNote:
      "Balanced breathing can restore presence without overstimulating.",
    orbProfile: { motion: "shutdown", inhaleEnd: 1.22 },
    color: "#4a5464",
    particles: { count: 15, speed: "slow" },
    prompts: [
      "Your nervous system is protecting you. This will pass.",
      "One small action at a time. Just breathe with me.",
      "You matter. Your presence matters.",
      "This is temporary, even though it feels permanent.",
      "Gentleness is strength. Be kind to yourself.",
      "Reach out. You don't have to do this alone.",
    ],
    groundingTechniques: [
      {
        title: "Minimum Viable Action",
        text: "Do one tiny thing: stand up, stretch, drink water. Small wins matter.",
      },
      {
        title: "Connection",
        text: "Reach out to someone. Hear a voice. Feel less alone.",
      },
      {
        title: "Self-Compassion",
        text: 'Place hand on heart. Say: "I am doing the best I can."',
      },
      {
        title: "Light Exposure",
        text: "Step outside or open curtains. Let natural light in gently.",
      },
    ],
  },
  overstimulated: {
    name: "Overstimulated",
    icon: "🌊",
    description: "Overwhelmed, bombarded, fractured attention, chaotic",
    className: "state-overstimulated",
    breathingPattern: { inhale: 4, hold: 1, exhale: 6 },
    breathingCycles: 4,
    breathingPhrase: "Slow and steady. One thing at a time.",
    breathingStyle: "Simple, repetitive, and low-complexity",
    breathingNote: "A longer exhale reduces intensity and creates steadiness.",
    orbProfile: { motion: "overstimulated", inhaleEnd: 1.26 },
    color: "#456d9f",
    particles: { count: 80, speed: "fast" },
    prompts: [
      "You can only handle one thing at a time. That's okay.",
      "Notice 3 things that feel calm right now.",
      "Close your eyes. Let your nervous system rest.",
      "You don't have to respond to everything. You can choose.",
      "Simplify: drink water, breathe, rest.",
      "This intensity will pass. You are capable of riding this wave.",
    ],
    groundingTechniques: [
      {
        title: "Sensory Reset",
        text: "Reduce stimulation: turn off sounds, dim lights, find quiet.",
      },
      {
        title: "Progressive Relaxation",
        text: "Tense each muscle group for 5 seconds, then release. Calm your system.",
      },
      {
        title: "Safe Space",
        text: "Go to your safe corner or room. Let your body decompress.",
      },
      {
        title: "Gentle Movement",
        text: "Stretch slowly. Shake out your limbs. Release held tension.",
      },
    ],
  },
  calm: {
    name: "Calm",
    icon: "🌙",
    description: "Peaceful, regulated, present, grounded",
    className: "state-calm",
    breathingPattern: { inhale: 5, hold: 2, exhale: 7 },
    breathingCycles: 5,
    breathingPhrase: "Rest and restoration",
    breathingStyle: "Slow, fluid, and restorative",
    breathingNote: "This rhythm helps maintain regulation and relaxation.",
    orbProfile: { motion: "calm", inhaleEnd: 1.34 },
    color: "#7081bf",
    particles: { count: 35, speed: "slow" },
    prompts: [
      "You are exactly where you need to be right now.",
      "Notice the calm in your body. Appreciate this regulation.",
      "This is what safety feels like. Remember this feeling.",
      "You have the capacity to return here anytime.",
      "Rest deeply. You deserve this peace.",
      "Celebrate your nervous system's wisdom and resilience.",
    ],
    groundingTechniques: [
      {
        title: "Gratitude Practice",
        text: "Notice 3 things you're grateful for. Let appreciation settle in.",
      },
      {
        title: "Mindful Breathing",
        text: "Breathe naturally. Notice the rise and fall of your chest.",
      },
      {
        title: "Gentle Presence",
        text: "Notice the present moment without judgment. Just be.",
      },
      {
        title: "Self-Appreciation",
        text: "Thank your body for carrying you. You are doing well.",
      },
    ],
  },
};

const affirmationsByState = {
  fight: [
    "My energy can become protection, clarity, and choice.",
    "I can soften without surrendering my strength.",
    "My body is allowed to stand down now.",
    "I can meet this charge one steady exhale at a time.",
  ],
  flight: [
    "I do not have to outrun this moment.",
    "Stillness can be safe in small pieces.",
    "I can pause and remain connected to myself.",
    "A steady rhythm can carry me back to choice.",
  ],
  freeze: [
    "I can return slowly, gently, and without force.",
    "Small sensations are enough to begin again.",
    "There is no rush to come back all at once.",
    "Soft breath is still powerful breath.",
  ],
  shutdown: [
    "One small action is a real movement toward life.",
    "My presence matters even when my energy is low.",
    "I can re-enter the day at a humane pace.",
    "Gentleness is a valid form of strength.",
  ],
  overstimulated: [
    "I can simplify the moment and choose one thing.",
    "Not everything needs my attention right now.",
    "My system can settle through repetition and space.",
    "I can lower the volume of the world around me.",
  ],
  calm: [
    "I can remember this feeling and return to it.",
    "Regulation is something my body can learn again.",
    "I am allowed to rest inside this steadiness.",
    "This calm is not fragile; it is practice.",
  ],
};

// These lines are short and spacious so speech synthesis has room to feel calm.
const guidedMeditationsByState = {
  fight: [
    "Let your jaw soften... let it become heavy and relaxed.",
    "Feel your shoulders drop... one slow, gentle degree at a time.",
    "Breathe in steadily through your nose... and exhale longer than you think you need.",
    "Notice the strength in your body... without letting it take over the room.",
  ],
  flight: [
    "Let your eyes settle on something steady... something that doesn't move.",
    "Inhale for four... hold for four... exhale for four.",
    "You don't have to leave this moment... you can stay here and be safe.",
    "Let each breath make the next moment feel more... predictable.",
  ],
  freeze: [
    "Begin very gently... notice the air touching your nose or your lips.",
    "Inhale softly... pause only if it feels kind... exhale without any force.",
    "If it feels available... wiggle one finger... or one toe... slowly.",
    "You can return to your body at your own pace... there's no rush.",
  ],
  shutdown: [
    "Let this practice be very simple... just breathing, nothing more.",
    "Inhale as if you're opening a small window in your chest... then pause... then exhale.",
    "You don't need a big shift right now... one breath is enough.",
    "Let your attention drift to one small place... where you feel safe and held.",
  ],
  overstimulated: [
    "Let the world narrow... focus on one sound... one breath... one moment.",
    "Breathe in simply... pause... and exhale longer... letting the edges soften.",
    "You don't have to process everything at once... it can all wait.",
    "Let the repetition of your breath become a quiet... container around you.",
  ],
  calm: [
    "Notice what already feels steady... what already feels at rest.",
    "Inhale slowly... hold the breath gently... exhale as if you're making more room.",
    "Let the calm become familiar... without needing to hold it or push it away.",
    "Rest here... in this moment... for one more breath... and then another.",
  ],
};


// ============================================================
// src/ui/particles.js
// ============================================================
// This creates the floating background particles used on each app screen.
function createParticles(container, count, preferredSpeed = null) {
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
function refreshParticlesForCurrentSection({ dom, appState, emotionalStates }) {
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
function setupParticleObserver({ dom, appState, emotionalStates }) {
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


// ============================================================
// src/ui/transitions.js
// ============================================================
// This handles the three screen-like sections and keeps audio aligned with the active screen.
function createSectionTransitioner({
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


// ============================================================
// src/ui/emotionGrid.js
// ============================================================
// This builds the selectable emotion cards from the shared state data.
function generateEmotionGrid({ dom, emotionalStates, onSelectEmotion }) {
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


// ============================================================
// src/ui/regulationContent.js
// ============================================================
// This fills the grounding and reminder areas for the selected emotional state.
function createRegulationContent({ dom }) {
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


// ============================================================
// src/ui/accessibility.js
// ============================================================
// This identifies elements whose text should respond to the font-size control.
function elementHasReadableText(element) {
  const textInputTypes = ["BUTTON", "INPUT", "SELECT", "TEXTAREA", "OPTION"];

  if (textInputTypes.includes(element.tagName)) {
    return true;
  }

  return Array.from(element.childNodes).some(
    (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim(),
  );
}

function createFontScaleManager({ dom, getPreferences }) {
  let fontScaleObserver = null;
  let fontScaleFrameId = null;

  function applyFontScaleToPage() {
    const scale = getPreferences().fontScale / 100;
    const elements = Array.from(dom.getAllBodyElements()).filter(elementHasReadableText);
    const measurements = elements.map((element) => {
      const baseSize =
        element.dataset.baseFontSize ||
        window.getComputedStyle(element).fontSize.replace("px", "");

      return {
        element,
        baseSize: Number(baseSize),
      };
    });

    measurements.forEach(({ element, baseSize }) => {
      if (!Number.isFinite(baseSize)) return;

      element.dataset.baseFontSize = String(baseSize);
      element.style.fontSize = `${(baseSize * scale).toFixed(2)}px`;
    });
  }

  // This batches font updates so repeated DOM changes do not cause extra layout work.
  function scheduleFontScaleRefresh() {
    if (fontScaleFrameId) {
      cancelAnimationFrame(fontScaleFrameId);
    }

    fontScaleFrameId = requestAnimationFrame(() => {
      fontScaleFrameId = null;
      applyFontScaleToPage();
    });
  }

  function setupFontScaleObserver() {
    if (fontScaleObserver) return;

    fontScaleObserver = new MutationObserver(scheduleFontScaleRefresh);
    fontScaleObserver.observe(dom.body, {
      childList: true,
      subtree: true,
    });
  }

  return {
    scheduleFontScaleRefresh,
    setupFontScaleObserver,
  };
}

// This adds lightweight accessibility metadata for screen readers and keyboard users.
function setupAccessibility(dom) {
  dom.getButtons().forEach((button) => {
    button.setAttribute("role", "button");
    button.setAttribute("tabindex", "0");
  });

  dom.heroSection.setAttribute("aria-label", "Hero introduction section");
  dom.stateSection.setAttribute("aria-label", "Emotion selection section");
  dom.regulationSection.setAttribute(
    "aria-label",
    "Regulation and healing section",
  );
  dom.journalInput.setAttribute("aria-label", "Reflection journal text input");

  if (dom.affirmationText) dom.affirmationText.setAttribute("aria-live", "polite");
  if (dom.routineContent) dom.routineContent.setAttribute("aria-live", "polite");
  if (dom.emotionTimeline) dom.emotionTimeline.setAttribute("aria-live", "polite");
}

// This preserves the glowing cursor movement from the original app.
function setupCustomCursor(dom) {
  document.addEventListener("mousemove", (event) => {
    if (dom.customCursor) {
      dom.customCursor.style.left = `${event.clientX - 10}px`;
      dom.customCursor.style.top = `${event.clientY - 10}px`;
    }

    if (dom.cursorFollower) {
      setTimeout(() => {
        dom.cursorFollower.style.left = `${event.clientX - 25}px`;
        dom.cursorFollower.style.top = `${event.clientY - 25}px`;
      }, 50);
    }
  });
}

// This keeps the Escape reset and Enter activation behavior intact.
function setupKeyboardNavigation({ dom, appState }) {
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && appState.currentSection !== "hero") {
      dom.resetButton.click();
    }

    if (
      event.key === "Enter" &&
      document.activeElement.classList.contains("btn")
    ) {
      document.activeElement.click();
    }
  });
}


// ============================================================
// src/breathing/breathingAnimations.js
// ============================================================
const defaultBreathingOrbScales = {
  inhaleStart: 1,
  inhaleEnd: 1.32,
};

function easeInOutSine(progress) {
  return -(Math.cos(Math.PI * progress) - 1) / 2;
}

function easeOutCubic(progress) {
  return 1 - Math.pow(1 - progress, 3);
}

function easeInOutQuad(progress) {
  return progress < 0.5
    ? 2 * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 2) / 2;
}

function easeBreathProgress(progress, phaseType, motion) {
  if (motion === "fight" && phaseType === "inhale") {
    return easeOutCubic(progress);
  }

  if (motion === "shutdown") {
    return easeInOutQuad(progress);
  }

  return easeInOutSine(progress);
}

// This handles the smooth inhale and exhale animation for the breathing orb.
function createBreathingAnimator({ dom, getIsBreathingActive }) {
  let breathingAnimationFrameId = null;
  let activeBreathingOrbScales = { ...defaultBreathingOrbScales };

  function setBreathingOrbScale(scale) {
    const glowProgress =
      (scale - activeBreathingOrbScales.inhaleStart) /
      (activeBreathingOrbScales.inhaleEnd - activeBreathingOrbScales.inhaleStart);
    const safeGlowProgress = Math.max(0, Math.min(glowProgress, 1));

    dom.breathingOrb.style.setProperty("--orb-scale", scale.toFixed(3));
    dom.breathingOrb.style.setProperty(
      "--orb-glow-primary",
      `${60 + 20 * safeGlowProgress}px`,
    );
    dom.breathingOrb.style.setProperty(
      "--orb-glow-secondary",
      `${100 + 50 * safeGlowProgress}px`,
    );
  }

  function applyOrbProfile(state) {
    const profile = state.orbProfile || {};

    activeBreathingOrbScales = {
      ...defaultBreathingOrbScales,
      inhaleEnd: profile.inhaleEnd || defaultBreathingOrbScales.inhaleEnd,
    };

    if (profile.motion) {
      dom.breathingOrb.dataset.motion = profile.motion;
    } else {
      dom.breathingOrb.removeAttribute("data-motion");
    }

    setBreathingOrbScale(activeBreathingOrbScales.inhaleStart);
  }

  function animateBreathingOrb(phase, state) {
    if (breathingAnimationFrameId) {
      cancelAnimationFrame(breathingAnimationFrameId);
    }

    const startTime = performance.now();
    const durationMs = phase.duration * 1000;
    const startScale =
      phase.type === "exhale"
        ? activeBreathingOrbScales.inhaleEnd
        : activeBreathingOrbScales.inhaleStart;
    const endScale =
      phase.type === "inhale"
        ? activeBreathingOrbScales.inhaleEnd
        : activeBreathingOrbScales.inhaleStart;
    const motion = state.orbProfile ? state.orbProfile.motion : "calm";

    dom.breathingOrb.dataset.phase = phase.type;

    if (phase.type === "hold") {
      setBreathingOrbScale(activeBreathingOrbScales.inhaleEnd);
      return;
    }

    if (phase.duration <= 0) {
      setBreathingOrbScale(endScale);
      return;
    }

    function updateOrbScale(now) {
      const rawProgress = Math.min((now - startTime) / durationMs, 1);
      const easedProgress = easeBreathProgress(rawProgress, phase.type, motion);
      const scale = startScale + (endScale - startScale) * easedProgress;

      setBreathingOrbScale(scale);

      if (rawProgress < 1 && getIsBreathingActive()) {
        breathingAnimationFrameId = requestAnimationFrame(updateOrbScale);
      }
    }

    breathingAnimationFrameId = requestAnimationFrame(updateOrbScale);
  }

  function stop() {
    if (breathingAnimationFrameId) {
      cancelAnimationFrame(breathingAnimationFrameId);
      breathingAnimationFrameId = null;
    }

    dom.breathingOrb.removeAttribute("data-phase");
    setBreathingOrbScale(activeBreathingOrbScales.inhaleStart);
  }

  return {
    applyOrbProfile,
    animateBreathingOrb,
    stop,
  };
}


// ============================================================
// src/breathing/breathingEngine.js
// ============================================================
function getBreathingPhases(state) {
  const pattern = state.breathingPattern;
  const phases = [
    { label: "Inhale", type: "inhale", duration: pattern.inhale },
  ];

  if (pattern.hold > 0) {
    phases.push({
      label: state.holdLabel || "Hold",
      type: "hold",
      duration: pattern.hold,
    });
  }

  phases.push({ label: "Exhale", type: "exhale", duration: pattern.exhale });
  return phases;
}

function formatBreathingPattern(state) {
  const pattern = state.breathingPattern;
  const holdText =
    pattern.hold > 0
      ? `${state.holdLabel || "Hold"} ${pattern.hold}`
      : "No hold";

  return `${state.breathingStyle}: inhale ${pattern.inhale}, ${holdText.toLowerCase()}, exhale ${pattern.exhale}.`;
}

// This runs the breathing countdown and asks the animator to move the orb.
function createBreathingEngine({
  dom,
  appState,
  emotionalStates,
  animator,
  onBreathingComplete,
}) {
  let breathingIntervalId = null;

  function stopBreathingExercise() {
    if (breathingIntervalId) {
      clearInterval(breathingIntervalId);
      breathingIntervalId = null;
    }

    appState.isBreathingActive = false;
    dom.startBreathingButton.disabled = false;
    dom.breathingOrb.classList.remove("breathing");
    animator.stop();
  }

  function setupBreathingExercise(emotionKey) {
    const state = emotionalStates[emotionKey];

    stopBreathingExercise();
    animator.applyOrbProfile(state);
    dom.breathingText.textContent = state.breathingPhrase;
    dom.breathingCount.textContent = "";
    dom.breathingPattern.textContent = formatBreathingPattern(state);
    dom.breathingNote.textContent = state.breathingNote;

    dom.startBreathingButton.onclick = () => {
      startBreathingExercise(emotionKey);
    };
  }

  function completeBreathingExercise(emotionKey, state) {
    stopBreathingExercise();
    onBreathingComplete(emotionKey);
    dom.breathingText.textContent = "Complete";
    dom.breathingCount.textContent = "Done";

    setTimeout(() => {
      if (appState.selectedEmotion === emotionKey && !appState.isBreathingActive) {
        dom.breathingText.textContent = state.breathingPhrase;
        dom.breathingCount.textContent = "";
      }
    }, 2000);
  }

  function startBreathingExercise(emotionKey) {
    stopBreathingExercise();

    const state = emotionalStates[emotionKey];
    appState.isBreathingActive = true;
    dom.startBreathingButton.disabled = true;

    let cycleCount = 0;
    const phases = getBreathingPhases(state);
    let phaseIndex = 0;
    let phaseTime = phases[phaseIndex].duration;

    // Restarting the class makes the CSS motion profile begin cleanly each time.
    dom.breathingOrb.classList.remove("breathing");
    void dom.breathingOrb.offsetWidth;
    dom.breathingOrb.classList.add("breathing");
    dom.breathingText.textContent = phases[phaseIndex].label;
    dom.breathingCount.textContent = phaseTime;
    animator.animateBreathingOrb(phases[phaseIndex], state);

    breathingIntervalId = setInterval(() => {
      phaseTime--;
      dom.breathingCount.textContent = phaseTime > 0 ? phaseTime : "Now";

      if (phaseTime <= 0) {
        phaseIndex++;

        if (phaseIndex >= phases.length) {
          phaseIndex = 0;
          cycleCount++;
        }

        if (cycleCount >= state.breathingCycles) {
          completeBreathingExercise(emotionKey, state);
          return;
        }

        dom.breathingText.textContent = phases[phaseIndex].label;
        phaseTime = phases[phaseIndex].duration;
        dom.breathingCount.textContent = phaseTime;
        animator.animateBreathingOrb(phases[phaseIndex], state);
      }
    }, 1000);
  }

  return {
    setupBreathingExercise,
    startBreathingExercise,
    stopBreathingExercise,
  };
}


// ============================================================
// src/audio/audioUtils.js
// ============================================================
// This keeps ramps smooth even when volume changes interrupt an existing fade.
function holdAudioParamAtCurrentValue(audioParam, time) {
  try {
    if (typeof audioParam.cancelAndHoldAtTime === "function") {
      audioParam.cancelAndHoldAtTime(time);
      return;
    }
  } catch (error) {
    // Some browsers expose the method but do not support every parameter.
  }

  const currentValue = audioParam.value;
  audioParam.cancelScheduledValues(time);
  audioParam.setValueAtTime(currentValue, time);
}

function setGainValue(audioContext, gainNode, value, rampSeconds = 0.25) {
  if (!gainNode || !audioContext) return;

  const now = audioContext.currentTime;
  holdAudioParamAtCurrentValue(gainNode.gain, now);
  gainNode.gain.linearRampToValueAtTime(value, now + rampSeconds);
}

function safeStopAudioNode(node, stopTime) {
  if (!node || typeof node.stop !== "function") return;

  try {
    node.stop(stopTime);
  } catch (error) {
    // A node may already be stopped after a quick state change.
  }
}

function safeDisconnectAudioNode(node) {
  if (!node || typeof node.disconnect !== "function") return;

  try {
    node.disconnect();
  } catch (error) {
    // Already-disconnected nodes are harmless.
  }
}


// ============================================================
// src/audio/guidedMeditation.js
// ============================================================
function isAppleTouchDevice() {
  const userAgent = navigator.userAgent || "";
  const platform = navigator.platform || "";

  return (
    /iPad|iPhone|iPod/i.test(userAgent) ||
    (platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function getVoiceSearchText(voice) {
  return [
    voice.name,
    voice.voiceURI,
    voice.lang,
    voice.localService ? "local" : "",
    voice.default ? "default" : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function scoreMeditationVoice(voice, index) {
  const searchText = getVoiceSearchText(voice);
  const language = (voice.lang || "").toLowerCase();
  const isiOS = isAppleTouchDevice();
  let score = 0;

  if (/en[-_]?gb|united kingdom|british|uk english/.test(searchText)) {
    score += 80;
  } else if (/en[-_]?(ie|au|nz)|irish|australian|new zealand/.test(searchText)) {
    score += 36;
  } else if (/^en([_-]|$)/.test(language) || /english/.test(searchText)) {
    score += 18;
  } else {
    score -= 90;
  }

  if (
    /google.*uk.*english.*female|google.*english.*united kingdom.*female|microsoft.*(sonia|libby)|\b(serena|kate|martha)\b/.test(
      searchText,
    )
  ) {
    score += 120;
  }

  if (
    /\b(moira|fiona|karen|ava|victoria|samantha|allison|susan|zoe)\b|microsoft.*(aria|jenny|zira)|google.*female/.test(
      searchText,
    )
  ) {
    score += 52;
  }

  if (/female|woman|natural|neural|premium|enhanced|siri/.test(searchText)) {
    score += 28;
  }

  if (isiOS) {
    if (/\b(serena|kate|martha|moira|fiona|karen)\b/.test(searchText)) {
      score += 42;
    }

    if (/\bsamantha\b/.test(searchText)) {
      score -= 16;
    }
  }

  if (
    /\b(daniel|fred|alex|tom|thomas|xander|oliver|arthur|aaron|nathan|david|mark|george)\b|\bmale\b/.test(
      searchText,
    )
  ) {
    score -= 70;
  }

  if (/robot|compact/.test(searchText)) {
    score -= 30;
  }

  return score - index / 1000;
}

function getGuidedMeditationSpeechSettings() {
  if (isAppleTouchDevice()) {
    return {
      rate: 0.84,
      pitch: 1,
      volumeScale: 0.82,
      fallbackLanguage: "en-GB",
    };
  }

  return {
    rate: 0.72,
    pitch: 0.88,
    volumeScale: 0.9,
    fallbackLanguage: "en-GB",
  };
}

function calculateMeditationPauseDuration(text) {
  const baseMs = 3500;
  const extraMs = Math.floor(text.length / 100) * 500;
  return baseMs + Math.min(extraMs, 1500);
}

// This controls the optional spoken meditation guidance.
function createGuidedMeditationManager({
  dom,
  guidedMeditationsByState,
  getPreferences,
  savePreferences,
  applyPreferences,
  getActiveAudioStateKey,
  getRoutineStateKey,
  updateSoundStatus,
}) {
  let selectedMeditationVoice = null;
  let guidedMeditationTimeoutId = null;
  let guidedMeditationLineIndex = 0;
  let isGuidedMeditationPlaying = false;

  function supportsGuidedMeditation() {
    return "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  }

  function isAudioForActiveState(stateKey) {
    return Boolean(stateKey && getActiveAudioStateKey() === stateKey);
  }

  function selectMeditationVoice() {
    if (!supportsGuidedMeditation()) return null;

    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;

    const englishVoices = voices.filter((voice) => {
      const language = (voice.lang || "").toLowerCase();
      const searchText = getVoiceSearchText(voice);

      return (
        !language ||
        /^en([_-]|$)/.test(language) ||
        /english|british|united kingdom|serena|kate|martha|moira|fiona|karen|samantha/.test(
          searchText,
        )
      );
    });
    const candidates = englishVoices.length ? englishVoices : voices;

    return candidates
      .map((voice, index) => ({
        voice,
        score: scoreMeditationVoice(voice, index),
      }))
      .sort((a, b) => b.score - a.score)[0].voice;
  }

  function preloadVoiceSelection() {
    if (!supportsGuidedMeditation()) return;

    window.speechSynthesis.onvoiceschanged = () => {
      selectedMeditationVoice = selectMeditationVoice();
    };
    selectedMeditationVoice = selectMeditationVoice();
  }

  function getGuidedMeditationStateKey() {
    return getActiveAudioStateKey() || getRoutineStateKey();
  }

  function getGuidedMeditationLines(stateKey) {
    return guidedMeditationsByState[stateKey] || guidedMeditationsByState.calm;
  }

  function updateGuidedMeditationControls() {
    const preferences = getPreferences();

    if (dom.guidedMeditationToggle) {
      dom.guidedMeditationToggle.checked = preferences.guidedMeditationEnabled;
    }

    if (dom.guidedMeditationButton) {
      dom.guidedMeditationButton.textContent = isGuidedMeditationPlaying
        ? "Stop Guidance"
        : "Play Guidance";
    }
  }

  function stopGuidedMeditation(message = "Guided voice is paused.") {
    if (guidedMeditationTimeoutId) {
      clearTimeout(guidedMeditationTimeoutId);
      guidedMeditationTimeoutId = null;
    }

    if (supportsGuidedMeditation()) {
      window.speechSynthesis.cancel();
    }

    isGuidedMeditationPlaying = false;
    updateGuidedMeditationControls();

    if (dom.guidedMeditationText) {
      dom.guidedMeditationText.textContent = message;
    }
  }

  function speakGuidedMeditationLine(stateKey) {
    if (!isGuidedMeditationPlaying) return;

    if (!isAudioForActiveState(stateKey)) {
      stopGuidedMeditation("Guided voice will follow the selected state.");
      return;
    }

    const lines = getGuidedMeditationLines(stateKey);

    if (guidedMeditationLineIndex >= lines.length) {
      stopGuidedMeditation("Guidance complete. Stay with the breath you found.");
      return;
    }

    const preferences = getPreferences();
    const line = lines[guidedMeditationLineIndex];
    const utterance = new SpeechSynthesisUtterance(line);
    const speechSettings = getGuidedMeditationSpeechSettings();
    const voiceVolume =
      (preferences.masterVolume / 100) * (preferences.meditationVolume / 100);

    // A warm available voice makes browser speech feel more like guidance.
    if (selectedMeditationVoice) {
      utterance.voice = selectedMeditationVoice;
    }
    utterance.lang =
      (selectedMeditationVoice && selectedMeditationVoice.lang) ||
      speechSettings.fallbackLanguage;

    utterance.rate = speechSettings.rate;
    utterance.pitch = speechSettings.pitch;
    utterance.volume = Math.max(
      0,
      Math.min(voiceVolume * speechSettings.volumeScale, 0.9),
    );

    if (dom.guidedMeditationText) {
      dom.guidedMeditationText.textContent = line;
    }

    utterance.onend = () => {
      if (!isGuidedMeditationPlaying || !isAudioForActiveState(stateKey)) {
        return;
      }

      guidedMeditationLineIndex++;
      guidedMeditationTimeoutId = setTimeout(() => {
        speakGuidedMeditationLine(stateKey);
      }, calculateMeditationPauseDuration(line));
    };

    utterance.onerror = () => {
      stopGuidedMeditation("Guided voice stopped. You can continue silently.");
    };

    window.speechSynthesis.speak(utterance);
  }

  function startGuidedMeditation(stateKey = getGuidedMeditationStateKey()) {
    const activeStateKey = getActiveAudioStateKey();

    if (!activeStateKey) {
      stopGuidedMeditation("Guided voice will follow the selected state.");
      updateSoundStatus();
      return;
    }

    stateKey = activeStateKey;

    if (!supportsGuidedMeditation()) {
      if (dom.guidedMeditationText) {
        dom.guidedMeditationText.textContent =
          "Guided voice is not available in this browser.";
      }
      return;
    }

    const preferences = getPreferences();

    if (!preferences.soundEnabled || !preferences.guidedMeditationEnabled) {
      preferences.soundEnabled = true;
      preferences.guidedMeditationEnabled = true;
      savePreferences();
      applyPreferences({ refreshParticles: false, updateAudio: true });
    }

    selectedMeditationVoice = selectMeditationVoice();
    window.speechSynthesis.cancel();
    guidedMeditationLineIndex = 0;
    isGuidedMeditationPlaying = true;
    updateGuidedMeditationControls();
    speakGuidedMeditationLine(stateKey);
  }

  function toggleGuidedMeditation() {
    if (isGuidedMeditationPlaying) {
      stopGuidedMeditation();
    } else {
      startGuidedMeditation();
    }
  }

  preloadVoiceSelection();

  return {
    isPlaying: () => isGuidedMeditationPlaying,
    supportsGuidedMeditation,
    startGuidedMeditation,
    stopGuidedMeditation,
    toggleGuidedMeditation,
    updateGuidedMeditationControls,
  };
}


// ============================================================
// src/audio/meditationAudio.js
// ============================================================
const meditationProfiles = {
  fight: {
    root: 110,
    color: 1.6,
    movement: 0.045,
    filter: 680,
    breathRate: 0.055,
  },
  flight: {
    root: 98,
    color: 1.35,
    movement: 0.038,
    filter: 620,
    breathRate: 0.05,
  },
  freeze: {
    root: 82,
    color: 1.2,
    movement: 0.025,
    filter: 520,
    breathRate: 0.036,
  },
  shutdown: {
    root: 73,
    color: 1.1,
    movement: 0.02,
    filter: 460,
    breathRate: 0.032,
  },
  overstimulated: {
    root: 92,
    color: 1.25,
    movement: 0.03,
    filter: 560,
    breathRate: 0.04,
  },
  calm: {
    root: 88,
    color: 1.3,
    movement: 0.028,
    filter: 600,
    breathRate: 0.038,
  },
};

// This owns the generated meditation drone so the main audio manager stays readable.
function createMeditationAudio({
  audioContext,
  getAmbientMasterGain,
  getPreferences,
  getSyncToken,
  isAudioForActiveState,
  isCurrentAudioSync,
  resumeAudioContext,
  updateSoundStatus,
}) {
  let meditationSound = null;
  let meditationTransitionTimeoutId = null;
  let meditationGeneration = 0;

  function getMeditationProfile(stateKey) {
    return meditationProfiles[stateKey] || meditationProfiles.calm;
  }

  function getMeditationLevel(profile) {
    const preferences = getPreferences();

    if (!preferences.soundEnabled || !preferences.meditationEnabled) {
      return 0;
    }

    return 0.08 * (preferences.meditationVolume / 100) * profile.color;
  }

  function disconnectMeditationSound(sound) {
    if (!sound) return;

    sound.oscillators.forEach(safeDisconnectAudioNode);
    sound.lfos.forEach(safeDisconnectAudioNode);
    sound.gains.forEach(safeDisconnectAudioNode);
    sound.filters.forEach(safeDisconnectAudioNode);
    sound.delayNodes.forEach(safeDisconnectAudioNode);
    sound.panners.forEach(safeDisconnectAudioNode);
  }

  function stopMeditationSound(options = {}) {
    const { fadeSeconds = 0.65 } = options;
    meditationGeneration++;

    if (meditationTransitionTimeoutId) {
      clearTimeout(meditationTransitionTimeoutId);
      meditationTransitionTimeoutId = null;
    }

    if (!meditationSound || !audioContext) return;

    const sound = meditationSound;
    const now = audioContext.currentTime;
    const stopTime = now + Math.max(fadeSeconds, 0.03);

    meditationSound = null;
    holdAudioParamAtCurrentValue(sound.outputGain.gain, now);
    sound.outputGain.gain.linearRampToValueAtTime(0, stopTime);

    sound.oscillators.forEach((oscillator) => {
      safeStopAudioNode(oscillator, stopTime + 0.05);
    });
    sound.lfos.forEach((lfo) => {
      safeStopAudioNode(lfo, stopTime + 0.05);
    });

    setTimeout(
      () => {
        disconnectMeditationSound(sound);
      },
      (fadeSeconds + 0.2) * 1000,
    );
  }

  function createMeditationVoice(config, profile, sharedNodes) {
    const oscillator = audioContext.createOscillator();
    const voiceGain = audioContext.createGain();
    const frequency = profile.root * config.ratio;

    oscillator.type = config.type;
    oscillator.frequency.setValueAtTime(frequency * 0.985, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      frequency,
      audioContext.currentTime + 3.5,
    );
    oscillator.detune.value = config.detune;
    voiceGain.gain.value = config.gain;

    oscillator.connect(voiceGain);

    if (audioContext.createStereoPanner) {
      const panner = audioContext.createStereoPanner();
      panner.pan.value = config.pan;
      voiceGain.connect(panner);
      panner.connect(sharedNodes.filter);
      sharedNodes.panners.push(panner);
    } else {
      voiceGain.connect(sharedNodes.filter);
    }

    sharedNodes.pitchLfoGain.connect(oscillator.detune);
    oscillator.start();

    sharedNodes.oscillators.push(oscillator);
    sharedNodes.gains.push(voiceGain);
  }

  function createMeditationSound(stateKey, generation) {
    if (
      !audioContext ||
      generation !== meditationGeneration ||
      !isAudioForActiveState(stateKey)
    ) {
      return;
    }

    try {
      const ambientMasterGain = getAmbientMasterGain();
      if (!ambientMasterGain) return;

      const profile = getMeditationProfile(stateKey);
      const now = audioContext.currentTime;
      const outputGain = audioContext.createGain();
      const breathGain = audioContext.createGain();
      const filter = audioContext.createBiquadFilter();
      const delay = audioContext.createDelay(4);
      const delayFeedback = audioContext.createGain();
      const delayWetGain = audioContext.createGain();
      const pitchLfo = audioContext.createOscillator();
      const pitchLfoGain = audioContext.createGain();
      const breathLfo = audioContext.createOscillator();
      const breathLfoGain = audioContext.createGain();
      const filterLfo = audioContext.createOscillator();
      const filterLfoGain = audioContext.createGain();

      outputGain.gain.value = 0;
      breathGain.gain.value = 0.86;
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(profile.filter * 0.75, now);
      filter.frequency.exponentialRampToValueAtTime(profile.filter, now + 4);
      filter.Q.value = 0.35;
      delay.delayTime.value = 1.8;
      delayFeedback.gain.value = 0.16;
      delayWetGain.gain.value = 0.05;

      filter.connect(breathGain);
      filter.connect(delay);
      delay.connect(delayFeedback);
      delayFeedback.connect(delay);
      delay.connect(delayWetGain);
      delayWetGain.connect(breathGain);
      breathGain.connect(outputGain);
      outputGain.connect(ambientMasterGain);

      // A tiny pitch movement keeps the tone warm without sounding robotic.
      pitchLfo.type = "sine";
      pitchLfo.frequency.value = profile.movement;
      pitchLfoGain.gain.value = 1.2;
      pitchLfo.connect(pitchLfoGain);

      // This creates a subtle breath-like pulse under the tone.
      breathLfo.type = "sine";
      breathLfo.frequency.value = profile.breathRate;
      breathLfoGain.gain.value = 0.08;
      breathLfo.connect(breathLfoGain);
      breathLfoGain.connect(breathGain.gain);

      // This softens the filter over time so the sound feels organic.
      filterLfo.type = "sine";
      filterLfo.frequency.value = profile.movement * 0.7;
      filterLfoGain.gain.value = 8;
      filterLfo.connect(filterLfoGain);
      filterLfoGain.connect(filter.frequency);

      const sound = {
        stateKey,
        profile,
        outputGain,
        oscillators: [],
        lfos: [pitchLfo, breathLfo, filterLfo],
        gains: [
          outputGain,
          breathGain,
          delayFeedback,
          delayWetGain,
          pitchLfoGain,
          breathLfoGain,
          filterLfoGain,
        ],
        filters: [filter],
        delayNodes: [delay],
        panners: [],
        pitchLfoGain,
        filter,
      };

      const voiceConfigs = [
        { ratio: 1, detune: -5, gain: 0.42, type: "sine", pan: -0.28 },
        { ratio: 1.006, detune: 4, gain: 0.22, type: "sine", pan: 0.28 },
        { ratio: 1.5, detune: -3, gain: 0.11, type: "sine", pan: 0.06 },
        { ratio: 2, detune: 2, gain: 0.045, type: "triangle", pan: -0.08 },
      ];

      voiceConfigs.forEach((config) => {
        createMeditationVoice(config, profile, sound);
      });

      sound.lfos.forEach((lfo) => lfo.start());
      meditationSound = sound;
      outputGain.gain.linearRampToValueAtTime(getMeditationLevel(profile), now + 4.5);
    } catch (error) {
      console.log("Audio not available:", error);
      stopMeditationSound({ fadeSeconds: 0.05 });
    }
  }

  function playMeditationSound(stateKey) {
    if (!isAudioForActiveState(stateKey)) {
      stopMeditationSound({ fadeSeconds: 0.18 });
      updateSoundStatus();
      return;
    }

    const preferences = getPreferences();

    if (!preferences.soundEnabled || !preferences.meditationEnabled) {
      stopMeditationSound({ fadeSeconds: 0.45 });
      updateSoundStatus();
      return;
    }

    const transitionFadeSeconds = 0.55;
    const syncToken = getSyncToken();

    stopMeditationSound({ fadeSeconds: transitionFadeSeconds });
    const requestedGeneration = ++meditationGeneration;

    resumeAudioContext().then((isReady) => {
      if (
        !isReady ||
        requestedGeneration !== meditationGeneration ||
        !isCurrentAudioSync(syncToken, stateKey)
      ) {
        return;
      }

      meditationTransitionTimeoutId = setTimeout(() => {
        if (
          requestedGeneration !== meditationGeneration ||
          !isCurrentAudioSync(syncToken, stateKey)
        ) {
          return;
        }

        createMeditationSound(stateKey, requestedGeneration);
        updateSoundStatus();
      }, (transitionFadeSeconds + 0.08) * 1000);
    });
  }

  function updateMeditationVolume() {
    if (!meditationSound) return;

    if (!isAudioForActiveState(meditationSound.stateKey)) {
      stopMeditationSound({ fadeSeconds: 0.18 });
      return;
    }

    setGainValue(
      audioContext,
      meditationSound.outputGain,
      getMeditationLevel(meditationSound.profile),
      1.5,
    );
  }

  return {
    getCurrentSound: () => meditationSound,
    playMeditationSound,
    stopMeditationSound,
    updateMeditationVolume,
  };
}


// ============================================================
// src/audio/audioManager.js
// ============================================================
const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;

// This coordinates all ambient audio so sounds only play inside the active regulation screen.
function createAudioManager({
  dom,
  appState,
  emotionalStates,
  guidedMeditationsByState,
  getPreferences,
  savePreferences,
  applyPreferences,
  getRoutineStateKey,
}) {
  const audioContext = AudioContextConstructor
    ? new AudioContextConstructor()
    : null;
  const audioLifecycle = {
    activeStateKey: null,
    syncToken: 0,
    fadeInSeconds: 0.8,
    fadeOutSeconds: 0.45,
    quickFadeSeconds: 0.18,
  };

  let ambientMasterGain = null;
  let natureGain = null;
  let natureSource = null;
  let natureFilter = null;
  let natureLfo = null;
  let natureLfoGain = null;
  let natureStopTimeoutId = null;
  let activeNatureType = null;
  let forestIntervalId = null;

  function ensureAudioGraph() {
    if (!audioContext) return false;

    if (!ambientMasterGain) {
      ambientMasterGain = audioContext.createGain();
      ambientMasterGain.gain.value = getPreferences().masterVolume / 100;
      ambientMasterGain.connect(audioContext.destination);
    }

    if (!natureGain) {
      natureGain = audioContext.createGain();
      natureGain.gain.value = 0;
      natureGain.connect(ambientMasterGain);
    }

    return true;
  }

  function resumeAudioContext() {
    if (!ensureAudioGraph()) return Promise.resolve(false);

    if (audioContext.state === "suspended") {
      return audioContext
        .resume()
        .then(() => true)
        .catch(() => false);
    }

    return Promise.resolve(true);
  }

  function getActiveAudioStateKey() {
    if (appState.currentSection !== "regulation") {
      return null;
    }

    if (!appState.selectedEmotion || !emotionalStates[appState.selectedEmotion]) {
      return null;
    }

    return appState.selectedEmotion;
  }

  function isAudioForActiveState(stateKey) {
    return Boolean(stateKey && getActiveAudioStateKey() === stateKey);
  }

  function nextAudioSyncToken() {
    audioLifecycle.syncToken += 1;
    return audioLifecycle.syncToken;
  }

  function isCurrentAudioSync(syncToken, stateKey) {
    return (
      syncToken === audioLifecycle.syncToken && isAudioForActiveState(stateKey)
    );
  }

  function createNoiseBuffer() {
    const bufferLength = audioContext.sampleRate * 2;
    const buffer = audioContext.createBuffer(
      1,
      bufferLength,
      audioContext.sampleRate,
    );
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferLength; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    return buffer;
  }

  function clearNatureStopTimeout() {
    if (natureStopTimeoutId) {
      clearTimeout(natureStopTimeoutId);
      natureStopTimeoutId = null;
    }
  }

  function stopForestChimeLoop() {
    if (forestIntervalId) {
      clearInterval(forestIntervalId);
      forestIntervalId = null;
    }
  }

  function disconnectNatureSound() {
    if (natureSource) {
      safeStopAudioNode(natureSource);
      safeDisconnectAudioNode(natureSource);
      natureSource = null;
    }

    if (natureFilter) {
      safeDisconnectAudioNode(natureFilter);
      natureFilter = null;
    }

    if (natureLfo) {
      safeStopAudioNode(natureLfo);
      safeDisconnectAudioNode(natureLfo);
      natureLfo = null;
    }

    if (natureLfoGain) {
      safeDisconnectAudioNode(natureLfoGain);
      natureLfoGain = null;
    }

    activeNatureType = null;
  }

  function stopNatureSound(options = {}) {
    const {
      fadeSeconds = audioLifecycle.fadeOutSeconds,
      force = false,
    } = options;

    clearNatureStopTimeout();
    stopForestChimeLoop();

    if (!natureSource && !natureFilter && !natureLfo && !natureLfoGain) {
      if (natureGain) setGainValue(audioContext, natureGain, 0, 0.1);
      activeNatureType = null;
      return;
    }

    if (force || !audioContext || !natureGain || fadeSeconds <= 0.05) {
      if (natureGain) setGainValue(audioContext, natureGain, 0, 0.05);
      disconnectNatureSound();
      return;
    }

    setGainValue(audioContext, natureGain, 0, fadeSeconds);
    natureStopTimeoutId = setTimeout(
      () => {
        natureStopTimeoutId = null;
        disconnectNatureSound();
      },
      (fadeSeconds + 0.15) * 1000,
    );
  }

  function configureNatureTexture() {
    const preferences = getPreferences();
    natureFilter = audioContext.createBiquadFilter();

    if (preferences.natureType === "ocean") {
      natureFilter.type = "lowpass";
      natureFilter.frequency.value = 520;
      natureFilter.Q.value = 0.9;

      natureLfo = audioContext.createOscillator();
      natureLfoGain = audioContext.createGain();
      natureLfo.frequency.value = 0.08;
      natureLfoGain.gain.value = 260;
      natureLfo.connect(natureLfoGain);
      natureLfoGain.connect(natureFilter.frequency);
      natureLfo.start();
    } else if (preferences.natureType === "forest") {
      natureFilter.type = "bandpass";
      natureFilter.frequency.value = 1450;
      natureFilter.Q.value = 0.7;
      forestIntervalId = setInterval(playForestChime, 4200);
    } else if (preferences.natureType === "whiteNoise") {
      natureFilter.type = "lowpass";
      natureFilter.frequency.value = 6500;
      natureFilter.Q.value = 0.5;
    } else if (preferences.natureType === "greenNoise") {
      natureFilter.type = "peaking";
      natureFilter.frequency.value = 800;
      natureFilter.Q.value = 0.7;
      natureFilter.gain.value = 3;

      natureLfo = audioContext.createOscillator();
      natureLfoGain = audioContext.createGain();
      natureLfo.frequency.value = 0.12;
      natureLfoGain.gain.value = 100;
      natureLfo.connect(natureLfoGain);
      natureLfoGain.connect(natureFilter.frequency);
      natureLfo.start();
    } else if (preferences.natureType === "brownNoise") {
      natureFilter.type = "lowpass";
      natureFilter.frequency.value = 280;
      natureFilter.Q.value = 0.8;

      natureLfo = audioContext.createOscillator();
      natureLfoGain = audioContext.createGain();
      natureLfo.frequency.value = 0.06;
      natureLfoGain.gain.value = 120;
      natureLfo.connect(natureLfoGain);
      natureLfoGain.connect(natureFilter.frequency);
      natureLfo.start();
    } else {
      natureFilter.type = "highpass";
      natureFilter.frequency.value = 900;
      natureFilter.Q.value = 0.5;
    }
  }

  function playForestChime() {
    const preferences = getPreferences();

    if (
      !audioContext ||
      !natureGain ||
      !getActiveAudioStateKey() ||
      !preferences.soundEnabled ||
      !preferences.natureEnabled ||
      preferences.natureType !== "forest"
    ) {
      return;
    }

    const chime = audioContext.createOscillator();
    const chimeGain = audioContext.createGain();
    const frequency = 820 + Math.random() * 540;

    chime.type = "sine";
    chime.frequency.value = frequency;
    chimeGain.gain.value = 0;
    chime.connect(chimeGain);
    chimeGain.connect(natureGain);

    chime.start();
    chimeGain.gain.linearRampToValueAtTime(0.012, audioContext.currentTime + 0.08);
    chimeGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.7);
    chime.stop(audioContext.currentTime + 0.8);
  }

  function startNatureSound() {
    if (!ensureAudioGraph()) return;

    clearNatureStopTimeout();
    stopForestChimeLoop();
    disconnectNatureSound();
    configureNatureTexture();

    natureSource = audioContext.createBufferSource();
    natureSource.buffer = createNoiseBuffer();
    natureSource.loop = true;
    natureSource.connect(natureFilter);
    natureFilter.connect(natureGain);
    natureSource.start();
    activeNatureType = getPreferences().natureType;
  }

  function updateNatureSound(options = {}) {
    const {
      fadeInSeconds = audioLifecycle.fadeInSeconds,
      fadeOutSeconds = audioLifecycle.fadeOutSeconds,
    } = options;
    const preferences = getPreferences();

    if (
      !getActiveAudioStateKey() ||
      !preferences.soundEnabled ||
      !preferences.natureEnabled
    ) {
      stopNatureSound({ fadeSeconds: fadeOutSeconds });
      return;
    }

    clearNatureStopTimeout();

    if (!natureSource || activeNatureType !== preferences.natureType) {
      startNatureSound();
    }

    const natureLevel = 0.16 * (preferences.natureVolume / 100);
    setGainValue(audioContext, natureGain, natureLevel, fadeInSeconds);
  }

  function updateSoundStatus() {
    if (!dom.soundStatus) return;

    const activeStateKey = getActiveAudioStateKey();
    const preferences = getPreferences();

    if (!activeStateKey) {
      dom.soundStatus.textContent =
        "Sound is paused until you enter a regulation environment.";
      return;
    }

    if (!preferences.soundEnabled) {
      dom.soundStatus.textContent =
        "Sound is off. Your visual routine stays active.";
      return;
    }

    const activeLayers = [];
    if (preferences.natureEnabled && natureSource) {
      activeLayers.push(preferences.natureType);
    }
    if (preferences.meditationEnabled && meditationAudio.getCurrentSound()) {
      activeLayers.push("meditation");
    }
    if (
      preferences.guidedMeditationEnabled &&
      guidedMeditation.isPlaying()
    ) {
      activeLayers.push("guided voice");
    }

    dom.soundStatus.textContent = activeLayers.length
      ? `Playing ${activeLayers.join(" + ")}.`
      : "Sound is on, with all layers muted.";
  }

  const guidedMeditation = createGuidedMeditationManager({
    dom,
    guidedMeditationsByState,
    getPreferences,
    savePreferences,
    applyPreferences,
    getActiveAudioStateKey,
    getRoutineStateKey,
    updateSoundStatus,
  });

  const meditationAudio = createMeditationAudio({
    audioContext,
    getAmbientMasterGain: () => ambientMasterGain,
    getPreferences,
    getSyncToken: () => audioLifecycle.syncToken,
    isAudioForActiveState,
    isCurrentAudioSync,
    resumeAudioContext,
    updateSoundStatus,
  });

  function stopActiveSoundscape(options = {}) {
    const {
      fadeSeconds = audioLifecycle.fadeOutSeconds,
      force = false,
      guidedMessage = "Guided voice will follow the selected state.",
      updateStatus = true,
    } = options;
    const appliedFadeSeconds = force
      ? Math.min(fadeSeconds, audioLifecycle.quickFadeSeconds)
      : fadeSeconds;

    nextAudioSyncToken();
    audioLifecycle.activeStateKey = null;

    if (ambientMasterGain && audioContext) {
      setGainValue(
        audioContext,
        ambientMasterGain,
        0,
        Math.max(appliedFadeSeconds, 0.05),
      );
    }

    stopNatureSound({ fadeSeconds: appliedFadeSeconds, force });
    meditationAudio.stopMeditationSound({ fadeSeconds: appliedFadeSeconds });
    guidedMeditation.stopGuidedMeditation(guidedMessage);

    if (updateStatus) updateSoundStatus();
  }

  function updateSoundscape(options = {}) {
    const {
      fadeInSeconds = audioLifecycle.fadeInSeconds,
      fadeOutSeconds = audioLifecycle.fadeOutSeconds,
      inactiveMessage = "Guided voice will follow the selected state.",
    } = options;
    const activeStateKey = getActiveAudioStateKey();
    const preferences = getPreferences();

    if (!activeStateKey) {
      stopActiveSoundscape({
        fadeSeconds: fadeOutSeconds,
        guidedMessage: inactiveMessage,
      });
      return;
    }

    const syncToken = nextAudioSyncToken();
    audioLifecycle.activeStateKey = activeStateKey;

    if (!ensureAudioGraph()) {
      if (dom.soundStatus) {
        dom.soundStatus.textContent =
          preferences.guidedMeditationEnabled &&
          guidedMeditation.supportsGuidedMeditation()
            ? "Guided voice can play; ambient audio is unavailable."
            : "Audio is unavailable in this browser.";
      }
      return;
    }

    if (!preferences.soundEnabled) {
      setGainValue(audioContext, ambientMasterGain, 0, fadeOutSeconds);
      stopNatureSound({ fadeSeconds: fadeOutSeconds });
      meditationAudio.stopMeditationSound({ fadeSeconds: fadeOutSeconds });
      guidedMeditation.stopGuidedMeditation("Sound is off. Guided voice is paused.");
      updateSoundStatus();
      return;
    }

    resumeAudioContext().then((isReady) => {
      if (!isReady || !isCurrentAudioSync(syncToken, activeStateKey)) return;

      setGainValue(
        audioContext,
        ambientMasterGain,
        preferences.masterVolume / 100,
        fadeInSeconds,
      );
      updateNatureSound({ fadeInSeconds, fadeOutSeconds });

      if (
        !preferences.guidedMeditationEnabled &&
        guidedMeditation.isPlaying()
      ) {
        guidedMeditation.stopGuidedMeditation();
      }

      const currentMeditationSound = meditationAudio.getCurrentSound();

      if (!preferences.meditationEnabled) {
        meditationAudio.stopMeditationSound({ fadeSeconds: fadeOutSeconds });
      } else if (
        activeStateKey &&
        (!currentMeditationSound ||
          currentMeditationSound.stateKey !== activeStateKey)
      ) {
        meditationAudio.playMeditationSound(activeStateKey);
      } else {
        meditationAudio.updateMeditationVolume();
      }

      updateSoundStatus();
    });
  }

  function pauseAudioForInactiveDocument(force = false) {
    stopActiveSoundscape({
      fadeSeconds: force ? 0.08 : audioLifecycle.quickFadeSeconds,
      force,
      guidedMessage: "Guided voice will follow the selected state.",
      updateStatus: false,
    });
  }

  return {
    audioLifecycle,
    getActiveAudioStateKey,
    pauseAudioForInactiveDocument,
    stopActiveSoundscape,
    stopGuidedMeditation: guidedMeditation.stopGuidedMeditation,
    stopNatureSound,
    toggleGuidedMeditation: guidedMeditation.toggleGuidedMeditation,
    updateGuidedMeditationControls: guidedMeditation.updateGuidedMeditationControls,
    updateSoundscape,
    updateSoundStatus,
  };
}


// ============================================================
// src/wellnessManager.js
// ============================================================
// This owns saved reflections, affirmations, routines, and progress history.
function createWellnessManager({
  dom,
  appState,
  activityData,
  saveActivity,
  emotionalStates,
  affirmationsByState,
}) {
  const routineRefreshOffsets = {};

  function getReflections() {
    const reflections = readStorage(storageKeys.reflections, []);
    return Array.isArray(reflections) ? reflections : [];
  }

  function getStateKeyFromName(stateName) {
    const entry = Object.entries(emotionalStates).find(
      ([, state]) => state.name === stateName,
    );
    return entry ? entry[0] : "calm";
  }

  function trackEmotionSelection(emotionKey) {
    const state = emotionalStates[emotionKey];
    const now = new Date();

    activityData.emotionHistory.unshift({
      id: now.getTime(),
      stateKey: emotionKey,
      stateName: state.name,
      color: state.color,
      createdAt: now.toISOString(),
    });

    saveActivity();
  }

  function trackBreathingSession(emotionKey) {
    const state = emotionalStates[emotionKey];
    const now = new Date();

    activityData.breathingSessions.unshift({
      id: now.getTime(),
      stateKey: emotionKey,
      stateName: state.name,
      pattern: state.breathingPattern,
      cycles: state.breathingCycles,
      createdAt: now.toISOString(),
    });

    saveActivity();
    renderDashboard();
    renderTimeline();
    renderPersonalRoutine();
  }

  function trackAppVisit() {
    const now = new Date();

    activityData.appVisits.unshift({
      id: now.getTime(),
      createdAt: now.toISOString(),
    });

    saveActivity();
  }

  function countByState(records) {
    return records.reduce((totals, record) => {
      const key = record.stateKey || getStateKeyFromName(record.stateName);
      totals[key] = (totals[key] || 0) + 1;
      return totals;
    }, {});
  }

  function getDominantStateKey() {
    const stateCounts = countByState(activityData.emotionHistory);
    const rankedStates = Object.entries(stateCounts).sort((a, b) => b[1] - a[1]);
    return rankedStates.length
      ? rankedStates[0][0]
      : appState.selectedEmotion || "calm";
  }

  function getRoutineStateKey() {
    if (appState.selectedEmotion) return appState.selectedEmotion;

    const recentStates = activityData.emotionHistory.slice(0, 6);
    if (!recentStates.length) return "calm";

    const recentCounts = countByState(recentStates);
    return Object.entries(recentCounts).sort((a, b) => b[1] - a[1])[0][0];
  }

  function renderAffirmation(affirmation) {
    if (!dom.affirmationText || !dom.affirmationMeta || !affirmation) return;

    dom.affirmationText.textContent = affirmation.text;
    dom.affirmationMeta.textContent = `${affirmation.stateName} affirmation shown ${formatStoredDate(
      affirmation.createdAt,
    )}.`;
  }

  function showAffirmation(emotionKey = getRoutineStateKey(), forceNew = false) {
    const today = new Date();
    const lastAffirmation = readStorage(storageKeys.lastAffirmation, null);

    if (
      !forceNew &&
      lastAffirmation &&
      lastAffirmation.stateKey === emotionKey &&
      isSameDay(new Date(lastAffirmation.createdAt), today)
    ) {
      renderAffirmation(lastAffirmation);
      return;
    }

    const affirmations =
      affirmationsByState[emotionKey] || affirmationsByState.calm;
    const previousText = lastAffirmation ? lastAffirmation.text : "";
    const candidates = affirmations.filter((text) => text !== previousText);
    const selectedText =
      candidates[Math.floor(Math.random() * candidates.length)] ||
      affirmations[0];

    const affirmation = {
      text: selectedText,
      stateKey: emotionKey,
      stateName: emotionalStates[emotionKey].name,
      createdAt: today.toISOString(),
    };

    writeStorage(storageKeys.lastAffirmation, affirmation);
    renderAffirmation(affirmation);
  }

  function renderDashboard() {
    if (!dom.stateCountStat) return;

    const reflections = getReflections();
    const dominantStateKey = getDominantStateKey();
    const dominantState = emotionalStates[dominantStateKey];
    const dominantCount =
      countByState(activityData.emotionHistory)[dominantStateKey] || 0;
    const latestVisit = activityData.appVisits[0];

    dom.stateCountStat.textContent = activityData.emotionHistory.length;
    dom.breathingCountStat.textContent = activityData.breathingSessions.length;
    dom.journalCountStat.textContent = reflections.length;
    dom.visitCountStat.textContent = activityData.appVisits.length;

    dom.dominantStateStat.textContent = activityData.emotionHistory.length
      ? `${dominantState.name} has appeared most often in your check-ins (${dominantCount} total). Latest visit: ${formatStoredDate(
          latestVisit ? latestVisit.createdAt : null,
        )}.`
      : `Your pattern will build as you choose states and complete sessions. Latest visit: ${formatStoredDate(
          latestVisit ? latestVisit.createdAt : null,
        )}.`;
  }

  function renderTimeline() {
    if (!dom.emotionTimeline) return;

    const reflectionEvents = getReflections().map((reflection) => {
      const stateKey =
        reflection.emotionKey || getStateKeyFromName(reflection.emotion);

      return {
        type: "reflection",
        stateKey,
        stateName: reflection.emotion || emotionalStates[stateKey].name,
        text: reflection.text,
        createdAt: reflection.createdAt || normalizeStoredDate(reflection.id),
      };
    });

    const stateEvents = activityData.emotionHistory.map((event) => ({
      ...event,
      type: "state",
      text: "State selected",
    }));

    const timelineEvents = [...stateEvents, ...reflectionEvents]
      .filter((event) => event.createdAt)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 16);

    if (!timelineEvents.length) {
      dom.emotionTimeline.innerHTML =
        '<p class="module-note">Your timeline will appear after your first check-in.</p>';
      return;
    }

    dom.emotionTimeline.innerHTML = timelineEvents
      .map((event) => {
        const state = emotionalStates[event.stateKey] || emotionalStates.calm;
        const label =
          event.type === "reflection"
            ? `${event.stateName} reflection`
            : `${event.stateName} check-in`;

        return `
          <div class="timeline-item" style="--timeline-color: ${state.color}">
            <div class="timeline-label">${escapeHtml(label)}</div>
            <div class="timeline-date">${formatStoredDate(event.createdAt)}</div>
            <div class="timeline-text">${escapeHtml(event.text || "")}</div>
          </div>
        `;
      })
      .join("");
  }

  function formatRoutineBreath(state) {
    const pattern = state.breathingPattern;
    const holdText = pattern.hold > 0 ? pattern.hold : 0;
    return `${pattern.inhale}-${holdText}-${pattern.exhale}`;
  }

  function getRoutineRefreshOffset(stateKey) {
    return routineRefreshOffsets[stateKey] || 0;
  }

  function renderPersonalRoutine() {
    if (!dom.routineContent) return;

    const stateKey = getRoutineStateKey();
    const state = emotionalStates[stateKey];
    const refreshOffset = getRoutineRefreshOffset(stateKey);
    const sessionCount = activityData.breathingSessions.filter(
      (session) => session.stateKey === stateKey,
    ).length;
    const reflectionCount = getReflections().filter(
      (reflection) =>
        (reflection.emotionKey || getStateKeyFromName(reflection.emotion)) ===
        stateKey,
    ).length;
    const routineSeed = sessionCount + reflectionCount + refreshOffset;
    const promptIndex = routineSeed % state.prompts.length;
    const firstTechniqueIndex = routineSeed % state.groundingTechniques.length;
    const firstTechnique =
      state.groundingTechniques[firstTechniqueIndex];
    const secondTechnique =
      state.groundingTechniques[
        (firstTechniqueIndex + 1) % state.groundingTechniques.length
      ];

    dom.routineContent.innerHTML = `
      <div class="routine-chip-row">
        <span class="routine-chip">${state.name}</span>
        <span class="routine-chip">${formatRoutineBreath(state)} breath</span>
        <span class="routine-chip">${state.breathingCycles} cycles</span>
      </div>
      <div class="routine-step">
        <div class="routine-step-title">Breath</div>
        <div>${escapeHtml(state.breathingStyle)}. Follow ${formatRoutineBreath(
          state,
        )} for ${state.breathingCycles} cycles.</div>
      </div>
      <div class="routine-step">
        <div class="routine-step-title">Prompt</div>
        <div>${escapeHtml(state.prompts[promptIndex])}</div>
      </div>
      <div class="routine-step">
        <div class="routine-step-title">Grounding</div>
        <div>${escapeHtml(firstTechnique.title)}: ${escapeHtml(
          firstTechnique.text,
        )}</div>
        <div>${escapeHtml(secondTechnique.title)}: ${escapeHtml(
          secondTechnique.text,
        )}</div>
      </div>
      <div class="routine-step">
        <div class="routine-step-title">Pattern</div>
        <div>${sessionCount} completed breathing sessions and ${reflectionCount} reflections for this state are shaping this recommendation.</div>
      </div>
    `;
  }

  function refreshPersonalRoutine() {
    const stateKey = getRoutineStateKey();

    // The routine is history-based, so refresh needs a small nudge to show a new option.
    routineRefreshOffsets[stateKey] = getRoutineRefreshOffset(stateKey) + 1;
    renderPersonalRoutine();

    if (!dom.refreshRoutineButton) return;

    dom.refreshRoutineButton.textContent = "Routine Refreshed";
    setTimeout(() => {
      dom.refreshRoutineButton.textContent = "Refresh Routine";
    }, 1200);
  }

  function saveReflection() {
    const text = dom.journalInput.value.trim();
    if (!text) {
      alert("Please write something before saving.");
      return;
    }

    const now = new Date();
    const reflection = {
      id: now.getTime(),
      text,
      emotionKey: appState.selectedEmotion,
      emotion: emotionalStates[appState.selectedEmotion].name,
      timestamp: now.toLocaleString(),
      createdAt: now.toISOString(),
      date: now.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const reflections = [reflection, ...getReflections()].slice(0, 20);
    writeStorage(storageKeys.reflections, reflections);

    dom.journalInput.value = "";
    dom.charCount.textContent = "0";

    loadReflections();
    renderDashboard();
    renderTimeline();
    renderPersonalRoutine();

    dom.saveReflectionButton.textContent = "Saved ✓";
    setTimeout(() => {
      dom.saveReflectionButton.textContent = "Save Reflection";
    }, 2000);
  }

  function loadReflections() {
    const reflections = getReflections();
    dom.reflectionsList.innerHTML = "";

    if (reflections.length === 0) {
      dom.reflectionsList.innerHTML =
        '<p style="color: rgba(255,255,255,0.5); font-style: italic;">No reflections yet. Start your journey today.</p>';
      return;
    }

    reflections.forEach((reflection) => {
      const card = document.createElement("div");
      card.className = "reflection-card";
      card.innerHTML = `
        <div class="reflection-date">${reflection.date} • ${reflection.emotion}</div>
        <div class="reflection-content">${escapeHtml(reflection.text)}</div>
      `;
      dom.reflectionsList.appendChild(card);
    });
  }

  function bindJournalControls() {
    dom.journalInput.addEventListener("input", (event) => {
      dom.charCount.textContent = event.target.value.length;
    });

    dom.saveReflectionButton.addEventListener("click", saveReflection);
  }

  function renderInitialWellness() {
    renderDashboard();
    renderTimeline();
    renderPersonalRoutine();

    const lastAffirmation = readStorage(storageKeys.lastAffirmation, null);
    if (lastAffirmation) {
      renderAffirmation(lastAffirmation);
    } else {
      showAffirmation("calm");
    }
  }

  return {
    bindJournalControls,
    getRoutineStateKey,
    loadReflections,
    renderDashboard,
    renderInitialWellness,
    renderPersonalRoutine,
    refreshPersonalRoutine,
    renderTimeline,
    showAffirmation,
    trackAppVisit,
    trackBreathingSession,
    trackEmotionSelection,
  };
}


// ============================================================
// src/main.js
// ============================================================
let userPreferences = loadPreferences();
let activityData = loadActivity();
let emotionSelectionToken = 0;

function getPreferences() {
  return userPreferences;
}

function savePreferences() {
  writeStorage(storageKeys.preferences, userPreferences);
}

function saveActivity() {
  activityData.emotionHistory = activityData.emotionHistory.slice(0, 80);
  activityData.breathingSessions = activityData.breathingSessions.slice(0, 80);
  activityData.appVisits = activityData.appVisits.slice(0, 120);
  writeStorage(storageKeys.activity, activityData);
}

const wellnessManager = createWellnessManager({
  dom,
  appState,
  activityData,
  saveActivity,
  emotionalStates,
  affirmationsByState,
});

const fontScaleManager = createFontScaleManager({
  dom,
  getPreferences,
});

let audioManager = null;

// This applies saved preferences to controls, theme, font size, particles, and audio.
function applyPreferences(options = {}) {
  const { refreshParticles = true, updateAudio = true } = options;

  dom.body.classList.toggle("theme-light", userPreferences.theme === "light");
  dom.body.classList.toggle("theme-dark", userPreferences.theme === "dark");
  dom.documentElement.style.setProperty(
    "--font-scale",
    (userPreferences.fontScale / 100).toFixed(2),
  );
  fontScaleManager.scheduleFontScaleRefresh();

  syncPreferenceControls();
  if (refreshParticles) {
    refreshParticlesForCurrentSection({ dom, appState, emotionalStates });
  }
  if (updateAudio && audioManager) {
    audioManager.updateSoundscape();
  }
}

function syncPreferenceControls() {
  if (dom.themeToggleButton) {
    const isLight = userPreferences.theme === "light";
    dom.themeToggleButton.textContent = isLight ? "Dark Mode" : "Light Mode";
    dom.themeToggleButton.setAttribute("aria-pressed", String(isLight));
  }

  if (dom.soundEnabledToggle) {
    dom.soundEnabledToggle.checked = userPreferences.soundEnabled;
  }
  if (dom.natureSoundToggle) {
    dom.natureSoundToggle.checked = userPreferences.natureEnabled;
  }
  if (dom.meditationSoundToggle) {
    dom.meditationSoundToggle.checked = userPreferences.meditationEnabled;
  }
  if (audioManager) {
    audioManager.updateGuidedMeditationControls();
  }
  if (dom.natureSoundSelect) {
    dom.natureSoundSelect.value = userPreferences.natureType;
  }
  if (dom.masterVolumeInput) {
    dom.masterVolumeInput.value = userPreferences.masterVolume;
  }
  if (dom.natureVolumeInput) {
    dom.natureVolumeInput.value = userPreferences.natureVolume;
  }
  if (dom.meditationVolumeInput) {
    dom.meditationVolumeInput.value = userPreferences.meditationVolume;
  }
  if (dom.fontScaleInput) {
    dom.fontScaleInput.value = userPreferences.fontScale;
  }
}

audioManager = createAudioManager({
  dom,
  appState,
  emotionalStates,
  guidedMeditationsByState,
  getPreferences,
  savePreferences,
  applyPreferences,
  getRoutineStateKey: wellnessManager.getRoutineStateKey,
});

const breathingAnimator = createBreathingAnimator({
  dom,
  getIsBreathingActive: () => appState.isBreathingActive,
});

const breathingEngine = createBreathingEngine({
  dom,
  appState,
  emotionalStates,
  animator: breathingAnimator,
  onBreathingComplete: wellnessManager.trackBreathingSession,
});

const regulationContent = createRegulationContent({ dom });

const sectionTransitioner = createSectionTransitioner({
  dom,
  appState,
  emotionalStates,
  stopActiveSoundscape: (...args) => audioManager.stopActiveSoundscape(...args),
});

function updatePreference(key, value) {
  if (key === "natureType") {
    audioManager.stopNatureSound();
  }

  if (key === "guidedMeditationEnabled" && !value) {
    audioManager.stopGuidedMeditation();
  }

  userPreferences[key] = value;
  savePreferences();

  const soundKeys = [
    "soundEnabled",
    "natureEnabled",
    "meditationEnabled",
    "guidedMeditationEnabled",
    "natureType",
    "masterVolume",
    "natureVolume",
    "meditationVolume",
  ];

  applyPreferences({
    refreshParticles: false,
    updateAudio: soundKeys.includes(key),
  });
}

function bindPreferenceControls() {
  if (dom.themeToggleButton) {
    dom.themeToggleButton.addEventListener("click", () => {
      updatePreference(
        "theme",
        userPreferences.theme === "light" ? "dark" : "light",
      );
    });
  }

  if (dom.soundEnabledToggle) {
    dom.soundEnabledToggle.addEventListener("change", (event) => {
      updatePreference("soundEnabled", event.target.checked);
    });
  }

  if (dom.natureSoundToggle) {
    dom.natureSoundToggle.addEventListener("change", (event) => {
      updatePreference("natureEnabled", event.target.checked);
    });
  }

  if (dom.meditationSoundToggle) {
    dom.meditationSoundToggle.addEventListener("change", (event) => {
      updatePreference("meditationEnabled", event.target.checked);
    });
  }

  if (dom.guidedMeditationToggle) {
    dom.guidedMeditationToggle.addEventListener("change", (event) => {
      updatePreference("guidedMeditationEnabled", event.target.checked);
    });
  }

  if (dom.guidedMeditationButton) {
    dom.guidedMeditationButton.addEventListener(
      "click",
      audioManager.toggleGuidedMeditation,
    );
  }

  if (dom.natureSoundSelect) {
    dom.natureSoundSelect.addEventListener("change", (event) => {
      updatePreference("natureType", event.target.value);
    });
  }

  [
    ["masterVolume", dom.masterVolumeInput],
    ["natureVolume", dom.natureVolumeInput],
    ["meditationVolume", dom.meditationVolumeInput],
    ["fontScale", dom.fontScaleInput],
  ].forEach(([preferenceKey, input]) => {
    if (!input) return;

    input.addEventListener("input", (event) => {
      updatePreference(preferenceKey, Number(event.target.value));
    });
  });

  if (dom.newAffirmationButton) {
    dom.newAffirmationButton.addEventListener("click", () => {
      wellnessManager.showAffirmation(wellnessManager.getRoutineStateKey(), true);
    });
  }

  if (dom.refreshRoutineButton) {
    dom.refreshRoutineButton.addEventListener(
      "click",
      wellnessManager.refreshPersonalRoutine,
    );
  }
}

function setupRegulationEnvironment(emotionKey) {
  const state = emotionalStates[emotionKey];

  dom.regulationSection.className = "regulation-section";
  dom.regulationSection.classList.add("active", state.className);
  dom.currentStateDisplay.textContent = `State: ${state.name}`;

  breathingEngine.setupBreathingExercise(emotionKey);
  regulationContent.setupGroundingTechniques(state);
  regulationContent.setupPrompts(state);
  wellnessManager.loadReflections();
  wellnessManager.showAffirmation(emotionKey);
  wellnessManager.renderPersonalRoutine();
  wellnessManager.renderDashboard();
  wellnessManager.renderTimeline();

  if (dom.guidedMeditationText) {
    dom.guidedMeditationText.textContent = `Guided voice is ready for ${state.name}.`;
  }

  audioManager.updateSoundscape();
}

function selectEmotion(emotionKey, event) {
  const selectionToken = ++emotionSelectionToken;

  if (appState.selectedEmotion && appState.selectedEmotion !== emotionKey) {
    audioManager.stopActiveSoundscape({
      fadeSeconds: audioManager.audioLifecycle.quickFadeSeconds,
      force: true,
      guidedMessage: "Guided voice will follow the selected state.",
      updateStatus: false,
    });
  }

  appState.selectedEmotion = emotionKey;
  wellnessManager.trackEmotionSelection(emotionKey);

  dom.getEmotionCards().forEach((card) => {
    card.classList.remove("active");
  });
  if (event && event.target) {
    const card = event.target.closest(".emotion-card");
    if (card) card.classList.add("active");
  }

  setTimeout(() => {
    if (
      selectionToken !== emotionSelectionToken ||
      appState.selectedEmotion !== emotionKey
    ) {
      return;
    }

    sectionTransitioner.transitionToSection("regulation");
    setupRegulationEnvironment(emotionKey);
  }, 500);
}

function bindPrimaryNavigation() {
  dom.beginButton.addEventListener("click", () => {
    sectionTransitioner.transitionToSection("state");
    generateEmotionGrid({ dom, emotionalStates, onSelectEmotion: selectEmotion });
  });

  dom.backButton.addEventListener("click", () => {
    breathingEngine.stopBreathingExercise();
    audioManager.stopActiveSoundscape({
      fadeSeconds: audioManager.audioLifecycle.fadeOutSeconds,
      guidedMessage: "Guided voice will follow the selected state.",
      updateStatus: false,
    });
    dom.breathingText.textContent = "Get ready...";
    dom.breathingCount.textContent = "";
    sectionTransitioner.transitionToSection("state");
  });

  dom.resetButton.addEventListener("click", () => {
    appState.selectedEmotion = null;
    breathingEngine.stopBreathingExercise();
    dom.breathingText.textContent = "Get ready...";
    dom.breathingCount.textContent = "";
    dom.journalInput.value = "";
    dom.charCount.textContent = "0";

    audioManager.stopActiveSoundscape({
      fadeSeconds: audioManager.audioLifecycle.quickFadeSeconds,
      guidedMessage: "Guided voice will follow the selected state.",
      updateStatus: false,
    });
    sectionTransitioner.transitionToSection("hero");
  });
}

function bindPageLifecycleControls() {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      audioManager.pauseAudioForInactiveDocument();
      return;
    }

    audioManager.updateSoundscape({
      fadeInSeconds: audioManager.audioLifecycle.fadeInSeconds,
    });
  });

  window.addEventListener("pagehide", () => {
    audioManager.pauseAudioForInactiveDocument(true);
  });

  window.addEventListener("pageshow", () => {
    audioManager.updateSoundscape({
      fadeInSeconds: audioManager.audioLifecycle.fadeInSeconds,
    });
  });
}

// This is the single startup path for the whole app.
function initializeApp() {
  applyPreferences({ refreshParticles: false, updateAudio: false });
  bindPreferenceControls();
  bindPrimaryNavigation();
  wellnessManager.bindJournalControls();
  fontScaleManager.setupFontScaleObserver();
  wellnessManager.trackAppVisit();

  dom.heroSection.classList.add("active");
  createParticles(dom.particlesHero, 30);

  setupAccessibility(dom);
  setupCustomCursor(dom);
  setupKeyboardNavigation({ dom, appState });
  setupParticleObserver({ dom, appState, emotionalStates });
  bindPageLifecycleControls();

  wellnessManager.renderInitialWellness();
  audioManager.updateSoundStatus();
  fontScaleManager.scheduleFontScaleRefresh();

  console.log("LandStrong Nervous System Simulator initialized");
}


// ============================================================
// src/entry.js
// ============================================================
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}

})();
