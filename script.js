/* ============================================================
   LandStrong: Nervous System Simulator - Main JavaScript
   ============================================================ */

// ============================================================
// APP STATE MANAGEMENT
// ============================================================
// This is basically the app state system its a global memory for the app and keeps track of what screen the user is on , what emotion they selected, whether the breathing exercise is active, and stores reflections. It allows different parts of the app to access and update shared information about the user's journey through the nervous system regulation experience.
const appState = {
  currentSection: "hero",
  selectedEmotion: null,
  isBreathingActive: false,
  reflections: [],
};

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let meditationOscillator = null;
let meditationGain = null;
let meditationLfo = null;
const meditationFrequencies = {
  fight: 220,
  flight: 185,
  freeze: 145,
  shutdown: 118,
  overstimulated: 175,
  calm: 185,
};

function stopMeditationSound() {
  if (meditationOscillator) {
    meditationOscillator.stop();
    meditationOscillator.disconnect();
    meditationOscillator = null;
  }
  if (meditationGain) {
    meditationGain.disconnect();
    meditationGain = null;
  }
  if (meditationLfo) {
    meditationLfo.stop();
    meditationLfo.disconnect();
    meditationLfo = null;
  }
}

function playMeditationSound(stateKey) {
  if (!audioContext) return;

  // Stop any existing sound first
  stopMeditationSound();

  // Resume audio context if needed (required by modern browsers)
  if (audioContext.state === "suspended") {
    audioContext.resume().then(() => {
      createMeditationSound(stateKey);
    });
  } else {
    createMeditationSound(stateKey);
  }
}

function createMeditationSound(stateKey) {
  try {
    meditationOscillator = audioContext.createOscillator();
    meditationGain = audioContext.createGain();
    meditationLfo = audioContext.createOscillator();
    const lfoGain = audioContext.createGain();

    meditationOscillator.type = "sine";
    meditationOscillator.frequency.value =
      meditationFrequencies[stateKey] || 180;
    meditationGain.gain.value = 0.0012;

    meditationOscillator.connect(meditationGain);
    meditationGain.connect(audioContext.destination);

    meditationLfo.type = "sine";
    meditationLfo.frequency.value = 0.18;
    lfoGain.gain.value = 8;
    meditationLfo.connect(lfoGain);
    lfoGain.connect(meditationOscillator.frequency);

    meditationOscillator.start();
    meditationLfo.start();

    meditationGain.gain.setValueAtTime(0, audioContext.currentTime);
    meditationGain.gain.linearRampToValueAtTime(
      0.0012,
      audioContext.currentTime + 2,
    );
  } catch (error) {
    console.log("Audio not available:", error);
  }
}

// ============================================================
// EMOTIONAL STATE CONFIGURATIONS
// ============================================================
        //acting like a mini database for every emotional state. Each state contains specific properties that define how the app should behave when that state is selected, including visual styling, breathing exercise parameters, prompts, grounding techniques, and particle effects. This structured data allows the app to dynamically adapt its content and appearance based on the user's emotional state selection, creating a personalized regulation experience.
const emotionalStates = {
  fight: {
    name: "Fight",
    icon: "⚡",
    description: "Anxious, alert, tense, irritable",
    className: "state-fight",
    breathingDuration: 4, // seconds
    breathingCycles: 3,
    breathingPhrase: "Slow your activation",
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
    breathingDuration: 5,
    breathingCycles: 3,
    breathingPhrase: "Settle into stillness",
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
    breathingDuration: 8,
    breathingCycles: 2,
    breathingPhrase: "Gently return to your body",
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
    breathingDuration: 7,
    breathingCycles: 2,
    breathingPhrase: "Breath by breath, moment by moment",
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
    breathingDuration: 6,
    breathingCycles: 4,
    breathingPhrase: "Slow and steady. One thing at a time.",
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
    breathingDuration: 6,
    breathingCycles: 5,
    breathingPhrase: "Rest and restoration",
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

// ============================================================
// DOM ELEMENTS
// ============================================================

const app = document.getElementById("app");
const heroSection = document.getElementById("heroSection");
const stateSection = document.getElementById("stateSection");
const regulationSection = document.getElementById("regulationSection");
const beginButton = document.getElementById("beginButton");
const emotionGrid = document.getElementById("emotionGrid");
const backButton = document.getElementById("backButton");
const resetButton = document.getElementById("resetButton");
const currentStateDisplay = document.getElementById("currentState");
const breathingOrb = document.getElementById("breathingOrb");
const startBreathingButton = document.getElementById("startBreathingButton");
const breathingText = document.getElementById("breathingText");
const breathingCount = document.getElementById("breathingCount");
const promptText = document.getElementById("promptText");
const nextPromptButton = document.getElementById("nextPromptButton");
const groundingContent = document.getElementById("groundingContent");
const journalInput = document.getElementById("journalInput");
const saveReflectionButton = document.getElementById("saveReflectionButton");
const reflectionsList = document.getElementById("reflectionsList");
const charCount = document.getElementById("charCount");

// ============================================================
// PARTICLES SYSTEM
// ============================================================

/**
 * Creates and manages floating particles in the background
 * @param {string} containerId - ID of the container where particles will be placed
 * @param {number} count - Number of particles to create
 */
function createParticles(containerId, count) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Clear existing particles
  container.innerHTML = "";

  for (let i = 0; i < count; i++) {
    const particle = document.createElement("div");
    particle.className = "particle";

    // Randomize particle properties
    const xPos = Math.random() * 100;
    const yPos = Math.random() * 100;
    const speed = ["slow", "medium", "fast"][Math.floor(Math.random() * 3)];
    const delay = Math.random() * 5;
    const duration = ["slow", "medium", "fast"].includes(speed)
      ? speed === "slow"
        ? 30
        : speed === "medium"
          ? 20
          : 10
      : 20;

    particle.classList.add(speed);
    particle.style.left = xPos + "%";
    particle.style.top = yPos + "%";
    particle.style.animation = `drift ${duration}s linear ${delay}s infinite`;

    container.appendChild(particle);
  }
}

// ============================================================
// CUSTOM CURSOR
// ============================================================

const customCursor = document.querySelector(".custom-cursor");
const cursorFollower = document.querySelector(".cursor-follower");

document.addEventListener("mousemove", (e) => {
  if (customCursor) {
    customCursor.style.left = e.clientX - 10 + "px";
    customCursor.style.top = e.clientY - 10 + "px";
  }

  if (cursorFollower) {
    setTimeout(() => {
      cursorFollower.style.left = e.clientX - 25 + "px";
      cursorFollower.style.top = e.clientY - 25 + "px";
    }, 50);
  }
});

// ============================================================
// EMOTION STATE GRID GENERATION
// ============================================================

/**
 * Generates the emotion selection cards
 */
function generateEmotionGrid() {
  emotionGrid.innerHTML = "";

  Object.entries(emotionalStates).forEach(([key, state]) => {
    const card = document.createElement("div");
    card.className = "emotion-card";
    card.innerHTML = `
            <div class="emotion-icon">${state.icon}</div>
            <div class="emotion-name">${state.name}</div>
            <div class="emotion-description">${state.description}</div>
        `;

    card.addEventListener("click", (evt) => selectEmotion(key, evt));
    emotionGrid.appendChild(card);
  });
}

// ============================================================
// EMOTION SELECTION
// ============================================================

/**
 * Handles emotion selection and transitions to regulation section
 * @param {string} emotionKey - Key of the selected emotional state
 */
function selectEmotion(emotionKey, event) {
  appState.selectedEmotion = emotionKey;
  const state = emotionalStates[emotionKey];

  // Update active card
  document.querySelectorAll(".emotion-card").forEach((card) => {
    card.classList.remove("active");
  });
  if (event && event.target) {
    const card = event.target.closest(".emotion-card");
    if (card) card.classList.add("active");
  }

  // Transition to regulation section
  setTimeout(() => {
    transitionToSection("regulation");
    setupRegulationEnvironment(emotionKey);
  }, 500);
}

// ============================================================
// SECTION TRANSITIONS
// ============================================================

/**
 * Transitions between main sections with smooth animations
 * @param {string} targetSection - Section to transition to: 'hero', 'state', 'regulation'
 */
function transitionToSection(targetSection) {
  // Hide current section
  if (appState.currentSection === "hero")
    heroSection.classList.remove("active");
  if (appState.currentSection === "state")
    stateSection.classList.remove("active");
  if (appState.currentSection === "regulation")
    regulationSection.classList.remove("active");

  // Show target section
  setTimeout(() => {
    if (targetSection === "hero") {
      heroSection.classList.remove("hidden");
      heroSection.classList.add("active");
      createParticles("particlesHero", 30);
    }
    if (targetSection === "state") {
      stateSection.classList.remove("hidden");
      stateSection.classList.add("active");
      createParticles("particlesState", 40);
    }
    if (targetSection === "regulation") {
      regulationSection.classList.remove("hidden");
      regulationSection.classList.add("active");
      const state = emotionalStates[appState.selectedEmotion];
      createParticles("particlesRegulation", state.particles.count);
    }
  }, 100);

  appState.currentSection = targetSection;
}

// ============================================================
// REGULATION ENVIRONMENT SETUP
// ============================================================

/**
 * Sets up the entire regulation environment based on selected emotion
 * @param {string} emotionKey - Key of the selected emotional state
 */
function setupRegulationEnvironment(emotionKey) {
  const state = emotionalStates[emotionKey];

  // Update visual state
  regulationSection.className = "regulation-section hidden";
  regulationSection.classList.add("active", state.className);

  // Update title
  currentStateDisplay.textContent = `State: ${state.name}`;

  // Setup breathing
  setupBreathingExercise(emotionKey);

  // Setup grounding techniques
  setupGroundingTechniques(emotionKey);

  // Setup prompts
  setupPrompts(emotionKey);

  // Load reflections
  loadReflections();

  // Play state-specific meditative sound
  playMeditationSound(emotionKey);
}

// ============================================================
// BREATHING EXERCISE MODULE
// ============================================================

/**
 * Sets up the breathing exercise with state-specific timing
 * @param {string} emotionKey - Key of the selected emotional state
 */
function setupBreathingExercise(emotionKey) {
  const state = emotionalStates[emotionKey];

  startBreathingButton.onclick = () => {
    startBreathingExercise(emotionKey);
  };
}

/**
 * Starts the breathing animation and guidance
 * @param {string} emotionKey - Key of the selected emotional state
 */
function startBreathingExercise(emotionKey) {
  const state = emotionalStates[emotionKey];
  appState.isBreathingActive = true;
  startBreathingButton.disabled = true;

  let cycleCount = 0;
  const phases = ["Inhale", "Hold", "Exhale"];
  let phaseIndex = 0;
  let phaseTime = state.breathingDuration;

  // Add breathing animation to orb
  breathingOrb.classList.add("breathing");

  // Determine animation speed
  if (state.breathingDuration <= 4) {
    breathingOrb.classList.add("fast-breath");
  } else if (state.breathingDuration >= 7) {
    breathingOrb.classList.add("slow-breath");
  } else if (state.breathingDuration <= 5) {
    breathingOrb.classList.add("combat");
  }

  breathingText.textContent = phases[0];

  // Breathing loop
  const breathingInterval = setInterval(() => {
    phaseTime--;
    breathingCount.textContent = phaseTime > 0 ? phaseTime : "Now";

    if (phaseTime <= 0) {
      phaseIndex++;

      if (phaseIndex >= phases.length) {
        phaseIndex = 0;
        cycleCount++;
      }

      if (cycleCount >= state.breathingCycles) {
        // Breathing complete
        clearInterval(breathingInterval);
        breathingOrb.classList.remove(
          "breathing",
          "fast-breath",
          "slow-breath",
          "combat",
        );
        breathingText.textContent = "Complete";
        breathingCount.textContent = "✓";
        startBreathingButton.disabled = false;
        appState.isBreathingActive = false;

        setTimeout(() => {
          breathingText.textContent = "Get ready...";
          breathingCount.textContent = "";
        }, 2000);
      } else {
        breathingText.textContent = phases[phaseIndex];
        phaseTime = state.breathingDuration;
      }
    }
  }, 1000);
}

// ============================================================
// GROUNDING TECHNIQUES MODULE
// ============================================================

/**
 * Sets up grounding techniques based on emotional state
 * @param {string} emotionKey - Key of the selected emotional state
 */
function setupGroundingTechniques(emotionKey) {
  const state = emotionalStates[emotionKey];
  groundingContent.innerHTML = "";

  state.groundingTechniques.forEach((technique) => {
    const item = document.createElement("div");
    item.className = "grounding-item";
    item.innerHTML = `
            <div class="grounding-item-title">${technique.title}</div>
            <div class="grounding-item-text">${technique.text}</div>
        `;
    groundingContent.appendChild(item);
  });
}

// ============================================================
// PROMPTS MODULE
// ============================================================

let currentPromptIndex = 0;

/**
 * Sets up the prompts/reminders system
 * @param {string} emotionKey - Key of the selected emotional state
 */
function setupPrompts(emotionKey) {
  const state = emotionalStates[emotionKey];
  currentPromptIndex = Math.floor(Math.random() * state.prompts.length);
  displayPrompt(emotionKey);

  nextPromptButton.onclick = () => {
    currentPromptIndex = (currentPromptIndex + 1) % state.prompts.length;
    displayPrompt(emotionKey);
  };
}

/**
 * Displays the current prompt with animation
 * @param {string} emotionKey - Key of the selected emotional state
 */
function displayPrompt(emotionKey) {
  const state = emotionalStates[emotionKey];
  const prompt = state.prompts[currentPromptIndex];

  promptText.style.opacity = "0";
  setTimeout(() => {
    promptText.textContent = prompt;
    promptText.style.opacity = "1";
  }, 200);
}

// ============================================================
// REFLECTION JOURNAL MODULE
// ============================================================

/**
 * Updates character count for journal textarea
 */
journalInput.addEventListener("input", (e) => {
  charCount.textContent = e.target.value.length;
});

/**
 * Saves a reflection to localStorage
 */
function saveReflection() {
  const text = journalInput.value.trim();
  if (!text) {
    alert("Please write something before saving.");
    return;
  }

  const reflection = {
    id: Date.now(),
    text: text,
    emotion: emotionalStates[appState.selectedEmotion].name,
    timestamp: new Date().toLocaleString(),
    date: new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  };

  // Load existing reflections
  let reflections = JSON.parse(
    localStorage.getItem("landstrongReflections") || "[]",
  );
  reflections.unshift(reflection);

  // Keep only last 20 reflections
  reflections = reflections.slice(0, 20);

  // Save to localStorage
  localStorage.setItem("landstrongReflections", JSON.stringify(reflections));

  // Clear input
  journalInput.value = "";
  charCount.textContent = "0";

  // Reload reflections display
  loadReflections();

  // Visual feedback
  saveReflectionButton.textContent = "Saved ✓";
  setTimeout(() => {
    saveReflectionButton.textContent = "Save Reflection";
  }, 2000);
}

/**
 * Loads and displays saved reflections from localStorage
 */
function loadReflections() {
  const reflections = JSON.parse(
    localStorage.getItem("landstrongReflections") || "[]",
  );
  reflectionsList.innerHTML = "";

  if (reflections.length === 0) {
    reflectionsList.innerHTML =
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
    reflectionsList.appendChild(card);
  });
}

/**
 * Escapes HTML to prevent injection
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

saveReflectionButton.addEventListener("click", saveReflection);

// ============================================================
// BUTTON EVENT LISTENERS
// ============================================================

/**
 * Begin Regulation button - transitions to emotion selection
 */
beginButton.addEventListener("click", () => {
  transitionToSection("state");
  generateEmotionGrid();
});

/**
 * Back button - returns to emotion selection
 */
backButton.addEventListener("click", () => {
  transitionToSection("state");
});

/**
 * Reset button - returns to hero section and clears state
 */
resetButton.addEventListener("click", () => {
  appState.selectedEmotion = null;
  appState.isBreathingActive = false;
  breathingOrb.classList.remove(
    "breathing",
    "fast-breath",
    "slow-breath",
    "combat",
  );
  breathingText.textContent = "Get ready...";
  breathingCount.textContent = "";
  journalInput.value = "";
  charCount.textContent = "0";
  stopMeditationSound();
  transitionToSection("hero");
});

// ============================================================
// INITIALIZATION
// ============================================================

/**
 * Initializes the entire application on page load
 */
function initializeApp() {
  // Show hero section
  heroSection.classList.add("active");

  // Create initial particles
  createParticles("particlesHero", 30);

  // Set up accessibility
  setupAccessibility();

  // Log initialization
  console.log("LandStrong Nervous System Simulator initialized");
}

// ============================================================
// ACCESSIBILITY SETUP
// ============================================================

/**
 * Sets up accessibility features
 */
function setupAccessibility() {
  // Ensure all buttons are focusable
  const buttons = document.querySelectorAll("button");
  buttons.forEach((button) => {
    button.setAttribute("role", "button");
    button.setAttribute("tabindex", "0");
  });

  // Add ARIA labels to major regions
  heroSection.setAttribute("aria-label", "Hero introduction section");
  stateSection.setAttribute("aria-label", "Emotion selection section");
  regulationSection.setAttribute(
    "aria-label",
    "Regulation and healing section",
  );

  // Add label to textarea
  journalInput.setAttribute("aria-label", "Reflection journal text input");
}

// ============================================================
// START THE APPLICATION
// ============================================================

// Wait for DOM to be fully loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}

// Handle keyboard navigation
document.addEventListener("keydown", (e) => {
  // ESC key to reset
  if (e.key === "Escape" && appState.currentSection !== "hero") {
    resetButton.click();
  }

  // Enter key to activate focused button
  if (e.key === "Enter" && document.activeElement.classList.contains("btn")) {
    document.activeElement.click();
  }
});

// ============================================================
// PERFORMANCE OPTIMIZATION
// ============================================================

// Lazy load particles only when section becomes visible
const observerOptions = {
  threshold: 0.1,
};

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting && !entry.target.dataset.particlesLoaded) {
      const container = entry.target.querySelector(".particles-container");
      if (container) {
        const state = emotionalStates[appState.selectedEmotion];
        const count = state ? state.particles.count : 30;
        createParticles(container.id, count);
        entry.target.dataset.particlesLoaded = true;
      }
    }
  });
}, observerOptions);

// Observe sections for lazy loading
[stateSection, regulationSection].forEach((section) => {
  sectionObserver.observe(section);
});