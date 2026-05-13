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
// This function is a safekeeper for reading data from local storage. It tries to parse the stored JSON value and returns a fallback if anything goes wrong, preventing crashes from corrupted or unavailable storage data.
function readStorage(key, fallback) {
  try {
    const storedValue = localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : fallback;
  } catch (error) {
    console.log("Storage read failed:", error);
    return fallback;
  }
}

// This function saves data to local storage safely by stringifying the value and catching any errors that might occur during the write process, such as quota issues or unavailable storage.
function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.log("Storage write failed:", error);
  }
}

// This function is loading the user's preferences from local storage, merging them with default preferences to ensure all necessary settings are present. It provides a robust way to initialize the app's configuration while handling any missing or corrupted data gracefully.
function loadPreferences() {
  return {
    ...defaultPreferences,
    ...readStorage(storageKeys.preferences, {}),
  };
}

// THis function is laoding the users activity data from local storage, ensuring that the expected arrays for emotion history, breathing sessions, and app visits are present and properly initialized. It provides a structured way to track the user's interactions and progress within the app while safeguarding against missing or malformed data.
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

let userPreferences = loadPreferences();
let activityData = loadActivity();
//These set up the guided meditation voice and text elements, as well as the sound status display. They allow the app to control and update the guided meditation interface and provide feedback on the current soundscape configuration.
const AudioContextConstructor =
  window.AudioContext || window.webkitAudioContext;
const audioContext = AudioContextConstructor
  ? new AudioContextConstructor()
  : null;
let meditationSound = null;
let meditationTransitionTimeoutId = null;
let meditationGeneration = 0;
let ambientMasterGain = null;
let natureGain = null;
let natureSource = null;
let natureFilter = null;
let natureLfo = null;
let natureLfoGain = null;
let forestIntervalId = null;
let guidedMeditationTimeoutId = null;
let guidedMeditationLineIndex = 0;
let isGuidedMeditationPlaying = false;
// Selected meditation voice for warm, natural speech synthesis
let selectedMeditationVoice = null;
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

function savePreferences() {
  writeStorage(storageKeys.preferences, userPreferences);
}

function saveActivity() {
  activityData.emotionHistory = activityData.emotionHistory.slice(0, 80);
  activityData.breathingSessions = activityData.breathingSessions.slice(0, 80);
  activityData.appVisits = activityData.appVisits.slice(0, 120);
  writeStorage(storageKeys.activity, activityData);
}

function ensureAudioGraph() {
  if (!audioContext) return false;

  if (!ambientMasterGain) {
    ambientMasterGain = audioContext.createGain();
    ambientMasterGain.gain.value = userPreferences.masterVolume / 100;
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
    return audioContext.resume().then(() => true);
  }

  return Promise.resolve(true);
}

function holdAudioParamAtCurrentValue(audioParam, time) {
  try {
    if (typeof audioParam.cancelAndHoldAtTime === "function") {
      audioParam.cancelAndHoldAtTime(time);
      return;
    }
  } catch (error) {
    // Some browsers expose the method but do not support every param.
  }

  const currentValue = audioParam.value;
  audioParam.cancelScheduledValues(time);
  audioParam.setValueAtTime(currentValue, time);
}

function setGainValue(gainNode, value, rampSeconds = 0.25) {
  if (!gainNode || !audioContext) return;

  const now = audioContext.currentTime;
  holdAudioParamAtCurrentValue(gainNode.gain, now);
  gainNode.gain.linearRampToValueAtTime(value, now + rampSeconds);
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

function stopNatureSound() {
  if (natureSource) {
    natureSource.stop();
    natureSource.disconnect();
    natureSource = null;
  }

  if (natureFilter) {
    natureFilter.disconnect();
    natureFilter = null;
  }

  if (natureLfo) {
    natureLfo.stop();
    natureLfo.disconnect();
    natureLfo = null;
  }

  if (natureLfoGain) {
    natureLfoGain.disconnect();
    natureLfoGain = null;
  }

  if (forestIntervalId) {
    clearInterval(forestIntervalId);
    forestIntervalId = null;
  }
}

function configureNatureTexture() {
  natureFilter = audioContext.createBiquadFilter();

  if (userPreferences.natureType === "ocean") {
    // Ocean: Low-mid frequency swell with subtle modulation
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
  } else if (userPreferences.natureType === "forest") {
    // Forest: Mid-high frequency with periodic chime accents
    natureFilter.type = "bandpass";
    natureFilter.frequency.value = 1450;
    natureFilter.Q.value = 0.7;
    forestIntervalId = setInterval(playForestChime, 4200);
  } else if (userPreferences.natureType === "whiteNoise") {
    // White Noise: Gentle, full spectrum with treble roll-off for smooth texture
    // Lowpass reduces harsh high frequencies for a softer, more calming white noise
    natureFilter.type = "lowpass";
    natureFilter.frequency.value = 6500; // Smooth treble cutoff instead of harsh high frequencies
    natureFilter.Q.value = 0.5;
  } else if (userPreferences.natureType === "greenNoise") {
    // Green Noise: Soft mid-frequency boost - pleasant, natural sounding
    // Similar to rustling leaves or soft wind - reduced aggressiveness
    natureFilter.type = "peaking";
    natureFilter.frequency.value = 800;
    natureFilter.Q.value = 0.7; // Softer peak (was 1.2)
    natureFilter.gain.value = 3; // Gentler boost (was 6)

    natureLfo = audioContext.createOscillator();
    natureLfoGain = audioContext.createGain();
    natureLfo.frequency.value = 0.12;
    natureLfoGain.gain.value = 100; // Reduced modulation intensity (was 180)
    natureLfo.connect(natureLfoGain);
    natureLfoGain.connect(natureFilter.frequency);
    natureLfo.start();
  } else if (userPreferences.natureType === "brownNoise") {
    // Brown Noise: Deep, low frequencies (below 500Hz) - rumbling, grounding effect
    // Like distant thunder or ocean depths
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
    // Rain (default): High-pass filter for crisp, rainlike texture
    natureFilter.type = "highpass";
    natureFilter.frequency.value = 900;
    natureFilter.Q.value = 0.5;
  }
}

function playForestChime() {
  if (
    !userPreferences.soundEnabled ||
    !userPreferences.natureEnabled ||
    userPreferences.natureType !== "forest"
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
  chimeGain.gain.linearRampToValueAtTime(
    0.012,
    audioContext.currentTime + 0.08,
  );
  chimeGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.7);
  chime.stop(audioContext.currentTime + 0.8);
}

function startNatureSound() {
  if (!ensureAudioGraph()) return;

  stopNatureSound();
  configureNatureTexture();

  natureSource = audioContext.createBufferSource();
  natureSource.buffer = createNoiseBuffer();
  natureSource.loop = true;
  natureSource.connect(natureFilter);
  natureFilter.connect(natureGain);
  natureSource.start();
}

function updateNatureSound() {
  if (!userPreferences.soundEnabled || !userPreferences.natureEnabled) {
    setGainValue(natureGain, 0);
    stopNatureSound();
    return;
  }

  if (!natureSource) {
    startNatureSound();
  }

  const natureLevel = 0.16 * (userPreferences.natureVolume / 100);
  setGainValue(natureGain, natureLevel);
}

function getMeditationProfile(stateKey) {
  return meditationProfiles[stateKey] || meditationProfiles.calm;
}

function getMeditationLevel(profile) {
  if (!userPreferences.soundEnabled || !userPreferences.meditationEnabled) {
    return 0;
  }

  return 0.08 * (userPreferences.meditationVolume / 100) * profile.color;
}

function safeStopAudioNode(node, stopTime) {
  if (!node || typeof node.stop !== "function") return;

  try {
    node.stop(stopTime);
  } catch (error) {
    // The node may already be stopped after a quick state change.
  }
}

function safeDisconnectAudioNode(node) {
  if (!node || typeof node.disconnect !== "function") return;

  try {
    node.disconnect();
  } catch (error) {
    // Already disconnected nodes are harmless.
  }
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

function playMeditationSound(stateKey) {
  if (!userPreferences.soundEnabled || !userPreferences.meditationEnabled) {
    stopMeditationSound({ fadeSeconds: 0.45 });
    updateSoundStatus();
    return;
  }

  stopMeditationSound({ fadeSeconds: 0.55 });
  const requestedGeneration = ++meditationGeneration;

  resumeAudioContext().then((isReady) => {
    if (!isReady || requestedGeneration !== meditationGeneration) return;

    meditationTransitionTimeoutId = setTimeout(() => {
      if (requestedGeneration !== meditationGeneration) return;

      createMeditationSound(stateKey, requestedGeneration);
      updateSoundStatus();
    }, 520);
  });
}

function createMeditationVoice(config, profile, sharedNodes) {
  const oscillator = audioContext.createOscillator();
  const voiceGain = audioContext.createGain();
  const frequency = profile.root * config.ratio;

  oscillator.type = config.type;
  oscillator.frequency.setValueAtTime(
    frequency * 0.985,
    audioContext.currentTime,
  );
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
  if (!audioContext || generation !== meditationGeneration) return;

  try {
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
    // Warmer, more grounded filter response (reduced Q for less resonance)
    filter.frequency.setValueAtTime(profile.filter * 0.75, now);
    filter.frequency.exponentialRampToValueAtTime(profile.filter, now + 4);
    filter.Q.value = 0.35; // Reduced from 0.45 for softer, less harsh filtering
    delay.delayTime.value = 1.8;
    delayFeedback.gain.value = 0.16;
    delayWetGain.gain.value = 0.05; // Slightly reduced from 0.07 to minimize spacey effect

    filter.connect(breathGain);
    filter.connect(delay);
    delay.connect(delayFeedback);
    delayFeedback.connect(delay);
    delay.connect(delayWetGain);
    delayWetGain.connect(breathGain);
    breathGain.connect(outputGain);
    outputGain.connect(ambientMasterGain);

    // Pitch LFO: creates subtle pitch variation for warm, organic feel
    // Reduced from 5 to 1.2 to eliminate sci-fi wobble effect
    pitchLfo.type = "sine";
    pitchLfo.frequency.value = profile.movement;
    pitchLfoGain.gain.value = 1.2; // Significantly reduced for warm, natural tone (was 5)
    pitchLfo.connect(pitchLfoGain);

    // Breath LFO: subtle rhythmic variation synced with breathing guidance
    breathLfo.type = "sine";
    breathLfo.frequency.value = profile.breathRate;
    breathLfoGain.gain.value = 0.08;
    breathLfo.connect(breathLfoGain);
    breathLfoGain.connect(breathGain.gain);

    // Filter LFO: gentle filter sweep for atmospheric, grounded feel
    // Reduced from 42 to 8 to minimize harsh electronic modulation
    filterLfo.type = "sine";
    filterLfo.frequency.value = profile.movement * 0.7;
    filterLfoGain.gain.value = 8; // Greatly reduced for warm, soft audio (was 42)
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
    outputGain.gain.linearRampToValueAtTime(
      getMeditationLevel(profile),
      now + 4.5,
    );
  } catch (error) {
    console.log("Audio not available:", error);
    stopMeditationSound({ fadeSeconds: 0.05 });
  }
}

function updateMeditationVolume() {
  if (!meditationSound) return;

  setGainValue(
    meditationSound.outputGain,
    getMeditationLevel(meditationSound.profile),
    1.5,
  );
}

// ============================================================
// GUIDED MEDITATION VOICE SELECTION & SPEECH SYNTHESIS
// ============================================================

/**
 * Intelligently selects the best available meditation voice for warm, natural delivery.
 * Prioritizes soft UK/Commonwealth and neural voices that reduce robotic speech.
 * Falls back gracefully if preferred voices are unavailable.
 */
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

function supportsGuidedMeditation() {
  return "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

// Preload meditation voice once on startup
if (supportsGuidedMeditation()) {
  // Voices may not be ready immediately; update when available
  window.speechSynthesis.onvoiceschanged = () => {
    selectedMeditationVoice = selectMeditationVoice();
  };
  selectedMeditationVoice = selectMeditationVoice();
}

function getGuidedMeditationStateKey() {
  return appState.selectedEmotion || getRoutineStateKey();
}

function getGuidedMeditationLines(stateKey) {
  return guidedMeditationsByState[stateKey] || guidedMeditationsByState.calm;
}

function updateGuidedMeditationControls() {
  if (guidedMeditationToggle) {
    guidedMeditationToggle.checked = userPreferences.guidedMeditationEnabled;
  }

  if (guidedMeditationButton) {
    guidedMeditationButton.textContent = isGuidedMeditationPlaying
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

  if (guidedMeditationText) {
    guidedMeditationText.textContent = message;
  }
}

/**
 * Speaks a guided meditation line with optimized speech parameters for natural delivery.
 * Uses slower rate, softer pitch, and warm volume settings to reduce robotic speech.
 * Includes intelligent pause timing based on line complexity.
 */
function speakGuidedMeditationLine(stateKey) {
  if (!isGuidedMeditationPlaying) return;

  const lines = getGuidedMeditationLines(stateKey);

  if (guidedMeditationLineIndex >= lines.length) {
    stopGuidedMeditation("Guidance complete. Stay with the breath you found.");
    return;
  }

  const line = lines[guidedMeditationLineIndex];
  const utterance = new SpeechSynthesisUtterance(line);
  const speechSettings = getGuidedMeditationSpeechSettings();
  const voiceVolume =
    (userPreferences.masterVolume / 100) *
    (userPreferences.meditationVolume / 100);

  // Apply selected meditation voice for warm, natural delivery
  if (selectedMeditationVoice) {
    utterance.voice = selectedMeditationVoice;
  }
  utterance.lang =
    (selectedMeditationVoice && selectedMeditationVoice.lang) ||
    speechSettings.fallbackLanguage;

  // Optimized speech parameters for warm, human-like meditation guidance:
  // iOS voices distort when slowed or pitched down too far, so those settings stay closer to native.
  utterance.rate = speechSettings.rate;
  utterance.pitch = speechSettings.pitch;
  utterance.volume = Math.max(
    0,
    Math.min(voiceVolume * speechSettings.volumeScale, 0.9),
  );

  if (guidedMeditationText) {
    guidedMeditationText.textContent = line;
  }

  utterance.onend = () => {
    guidedMeditationLineIndex++;

    // Calculate pause duration based on line complexity
    // Longer pauses (3500ms) give users time to breathe and absorb guidance
    // instead of rushing through the meditation
    const pauseDuration = calculateMeditationPauseDuration(line);
    guidedMeditationTimeoutId = setTimeout(() => {
      speakGuidedMeditationLine(stateKey);
    }, pauseDuration);
  };

  utterance.onerror = () => {
    stopGuidedMeditation("Guided voice stopped. You can continue silently.");
  };

  window.speechSynthesis.speak(utterance);
}

/**
 * Calculates natural pause duration between meditation lines.
 * Longer pauses allow users to integrate guidance and breathe.
 * Adjusts based on text length for smoother flow.
 */
function calculateMeditationPauseDuration(text) {
  // Base pause: 3500ms provides spacious, breathing-room timing
  // Roughly 100 characters adds 500ms to allow more time with longer guidance
  const baseMs = 3500;
  const extraMs = Math.floor(text.length / 100) * 500;
  return baseMs + Math.min(extraMs, 1500); // Cap extra pause at 1500ms
}

/**
 * Starts guided meditation with intelligent voice selection and warm speech parameters.
 * Ensures best available meditation voice is loaded for natural, calming delivery.
 */
function startGuidedMeditation(stateKey = getGuidedMeditationStateKey()) {
  if (!supportsGuidedMeditation()) {
    if (guidedMeditationText) {
      guidedMeditationText.textContent =
        "Guided voice is not available in this browser.";
    }
    return;
  }

  if (
    !userPreferences.soundEnabled ||
    !userPreferences.guidedMeditationEnabled
  ) {
    userPreferences.soundEnabled = true;
    userPreferences.guidedMeditationEnabled = true;
    savePreferences();
    applyPreferences({ refreshParticles: false, updateAudio: true });
  }

  // Refresh voice selection to ensure best available voice is active
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

function updateSoundscape() {
  if (!ensureAudioGraph()) {
    if (soundStatus) {
      soundStatus.textContent =
        userPreferences.guidedMeditationEnabled && supportsGuidedMeditation()
          ? "Guided voice can play; ambient audio is unavailable."
          : "Audio is unavailable in this browser.";
    }
    return;
  }

  setGainValue(ambientMasterGain, userPreferences.masterVolume / 100);

  if (!userPreferences.soundEnabled) {
    setGainValue(ambientMasterGain, 0);
    stopNatureSound();
    stopMeditationSound();
    stopGuidedMeditation("Sound is off. Guided voice is paused.");
    updateSoundStatus();
    return;
  }

  resumeAudioContext().then(() => {
    setGainValue(ambientMasterGain, userPreferences.masterVolume / 100);
    updateNatureSound();

    if (!userPreferences.guidedMeditationEnabled && isGuidedMeditationPlaying) {
      stopGuidedMeditation();
    }

    if (!userPreferences.meditationEnabled) {
      stopMeditationSound();
    } else if (
      appState.selectedEmotion &&
      (!meditationSound ||
        meditationSound.stateKey !== appState.selectedEmotion)
    ) {
      playMeditationSound(appState.selectedEmotion);
    } else {
      updateMeditationVolume();
    }

    updateSoundStatus();
  });
}

function updateSoundStatus() {
  if (!soundStatus) return;

  if (!userPreferences.soundEnabled) {
    soundStatus.textContent = "Sound is off. Your visual routine stays active.";
    return;
  }

  const activeLayers = [];
  if (userPreferences.natureEnabled) {
    activeLayers.push(userPreferences.natureType);
  }
  if (userPreferences.meditationEnabled) activeLayers.push("meditation");
  if (userPreferences.guidedMeditationEnabled) {
    activeLayers.push("guided voice");
  }

  soundStatus.textContent = activeLayers.length
    ? `Playing ${activeLayers.join(" + ")}.`
    : "Sound is on, with all layers muted.";
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

// Guided meditation lines optimized for natural speech synthesis
// Enhanced with ellipses, pauses, and softer wording for warm, human-like delivery
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
const breathingPattern = document.getElementById("breathingPattern");
const breathingNote = document.getElementById("breathingNote");
const promptText = document.getElementById("promptText");
const nextPromptButton = document.getElementById("nextPromptButton");
const groundingContent = document.getElementById("groundingContent");
const journalInput = document.getElementById("journalInput");
const saveReflectionButton = document.getElementById("saveReflectionButton");
const reflectionsList = document.getElementById("reflectionsList");
const charCount = document.getElementById("charCount");
const themeToggleButton = document.getElementById("themeToggleButton");
const soundEnabledToggle = document.getElementById("soundEnabledToggle");
const natureSoundToggle = document.getElementById("natureSoundToggle");
const meditationSoundToggle = document.getElementById("meditationSoundToggle");
const guidedMeditationToggle = document.getElementById(
  "guidedMeditationToggle",
);
const natureSoundSelect = document.getElementById("natureSoundSelect");
const masterVolumeInput = document.getElementById("masterVolumeInput");
const natureVolumeInput = document.getElementById("natureVolumeInput");
const meditationVolumeInput = document.getElementById("meditationVolumeInput");
const guidedMeditationButton = document.getElementById(
  "guidedMeditationButton",
);
const guidedMeditationText = document.getElementById("guidedMeditationText");
const soundStatus = document.getElementById("soundStatus");
const affirmationText = document.getElementById("affirmationText");
const affirmationMeta = document.getElementById("affirmationMeta");
const newAffirmationButton = document.getElementById("newAffirmationButton");
const routineContent = document.getElementById("routineContent");
const refreshRoutineButton = document.getElementById("refreshRoutineButton");
const stateCountStat = document.getElementById("stateCountStat");
const breathingCountStat = document.getElementById("breathingCountStat");
const journalCountStat = document.getElementById("journalCountStat");
const visitCountStat = document.getElementById("visitCountStat");
const dominantStateStat = document.getElementById("dominantStateStat");
const emotionTimeline = document.getElementById("emotionTimeline");
const fontScaleInput = document.getElementById("fontScaleInput");

let breathingIntervalId = null;
let breathingAnimationFrameId = null;
let fontScaleObserver = null;
let fontScaleFrameId = null;

const defaultBreathingOrbScales = {
  inhaleStart: 1,
  inhaleEnd: 1.32,
};
let activeBreathingOrbScales = { ...defaultBreathingOrbScales };

// ============================================================
// FONT ACCESSIBILITY
// ============================================================

function elementHasReadableText(element) {
  const textInputTypes = ["BUTTON", "INPUT", "SELECT", "TEXTAREA", "OPTION"];

  if (textInputTypes.includes(element.tagName)) {
    return true;
  }

  return Array.from(element.childNodes).some(
    (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim(),
  );
}

function applyFontScaleToPage() {
  const scale = userPreferences.fontScale / 100;
  const elements = Array.from(document.body.querySelectorAll("*")).filter(
    elementHasReadableText,
  );
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
  fontScaleObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// ============================================================
// PARTICLES SYSTEM
// ============================================================

/**
 * Creates and manages floating particles in the background
 * @param {string} containerId - ID of the container where particles will be placed
 * @param {number} count - Number of particles to create
 * @param {string} preferredSpeed - Optional speed profile for state-specific movement
 */
function createParticles(containerId, count, preferredSpeed = null) {
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
    const speed =
      preferredSpeed ||
      ["slow", "medium", "fast"][Math.floor(Math.random() * 3)];
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
  trackEmotionSelection(emotionKey);

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
  // Scroll to top of page when transitioning between sections
  window.scrollTo(0, 0);

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
      createParticles(
        "particlesRegulation",
        state.particles.count,
        state.particles.speed,
      );
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

  showAffirmation(emotionKey);
  renderPersonalRoutine();
  renderDashboard();
  renderTimeline();
  if (guidedMeditationText && !isGuidedMeditationPlaying) {
    guidedMeditationText.textContent = `Guided voice is ready for ${state.name}.`;
  }

  // Sync state-specific audio and saved sound preferences
  updateSoundscape();
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

  stopBreathingExercise();
  applyOrbProfile(state);
  breathingText.textContent = state.breathingPhrase;
  breathingCount.textContent = "";
  breathingPattern.textContent = formatBreathingPattern(state);
  breathingNote.textContent = state.breathingNote;

  startBreathingButton.onclick = () => {
    startBreathingExercise(emotionKey);
  };
}

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

function applyOrbProfile(state) {
  const profile = state.orbProfile || {};

  activeBreathingOrbScales = {
    ...defaultBreathingOrbScales,
    inhaleEnd: profile.inhaleEnd || defaultBreathingOrbScales.inhaleEnd,
  };

  if (profile.motion) {
    breathingOrb.dataset.motion = profile.motion;
  } else {
    breathingOrb.removeAttribute("data-motion");
  }

  setBreathingOrbScale(activeBreathingOrbScales.inhaleStart);
}

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

function setBreathingOrbScale(scale) {
  const glowProgress =
    (scale - activeBreathingOrbScales.inhaleStart) /
    (activeBreathingOrbScales.inhaleEnd - activeBreathingOrbScales.inhaleStart);
  const safeGlowProgress = Math.max(0, Math.min(glowProgress, 1));

  breathingOrb.style.setProperty("--orb-scale", scale.toFixed(3));
  breathingOrb.style.setProperty(
    "--orb-glow-primary",
    `${60 + 20 * safeGlowProgress}px`,
  );
  breathingOrb.style.setProperty(
    "--orb-glow-secondary",
    `${100 + 50 * safeGlowProgress}px`,
  );
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

  breathingOrb.dataset.phase = phase.type;

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

    if (rawProgress < 1 && appState.isBreathingActive) {
      breathingAnimationFrameId = requestAnimationFrame(updateOrbScale);
    }
  }

  breathingAnimationFrameId = requestAnimationFrame(updateOrbScale);
}

function stopBreathingExercise() {
  if (breathingIntervalId) {
    clearInterval(breathingIntervalId);
    breathingIntervalId = null;
  }

  if (breathingAnimationFrameId) {
    cancelAnimationFrame(breathingAnimationFrameId);
    breathingAnimationFrameId = null;
  }

  appState.isBreathingActive = false;
  startBreathingButton.disabled = false;
  breathingOrb.classList.remove("breathing");
  breathingOrb.removeAttribute("data-phase");
  setBreathingOrbScale(activeBreathingOrbScales.inhaleStart);
}

/**
 * Starts the breathing animation and guidance
 * @param {string} emotionKey - Key of the selected emotional state
 */
function startBreathingExercise(emotionKey) {
  stopBreathingExercise();

  const state = emotionalStates[emotionKey];
  appState.isBreathingActive = true;
  startBreathingButton.disabled = true;

  let cycleCount = 0;
  const phases = getBreathingPhases(state);
  let phaseIndex = 0;
  let phaseTime = phases[phaseIndex].duration;

  // Restart the CSS motion profile each time a new exercise begins.
  breathingOrb.classList.remove("breathing");
  void breathingOrb.offsetWidth;
  breathingOrb.classList.add("breathing");
  breathingText.textContent = phases[phaseIndex].label;
  breathingCount.textContent = phaseTime;
  animateBreathingOrb(phases[phaseIndex], state);

  // Breathing loop
  breathingIntervalId = setInterval(() => {
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
        stopBreathingExercise();
        trackBreathingSession(emotionKey);
        breathingText.textContent = "Complete";
        breathingCount.textContent = "Done";

        setTimeout(() => {
          if (
            appState.selectedEmotion === emotionKey &&
            !appState.isBreathingActive
          ) {
            breathingText.textContent = state.breathingPhrase;
            breathingCount.textContent = "";
          }
        }, 2000);
      } else {
        breathingText.textContent = phases[phaseIndex].label;
        phaseTime = phases[phaseIndex].duration;
        breathingCount.textContent = phaseTime;
        animateBreathingOrb(phases[phaseIndex], state);
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
// WELLNESS MEMORY, AFFIRMATIONS, ROUTINES & DASHBOARD
// ============================================================

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

function isSameDay(firstDate, secondDate) {
  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
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

function renderAffirmation(affirmation) {
  if (!affirmationText || !affirmationMeta || !affirmation) return;

  affirmationText.textContent = affirmation.text;
  affirmationMeta.textContent = `${affirmation.stateName} affirmation shown ${formatStoredDate(
    affirmation.createdAt,
  )}.`;
}

function renderDashboard() {
  if (!stateCountStat) return;

  const reflections = getReflections();
  const dominantStateKey = getDominantStateKey();
  const dominantState = emotionalStates[dominantStateKey];
  const dominantCount =
    countByState(activityData.emotionHistory)[dominantStateKey] || 0;
  const latestVisit = activityData.appVisits[0];

  stateCountStat.textContent = activityData.emotionHistory.length;
  breathingCountStat.textContent = activityData.breathingSessions.length;
  journalCountStat.textContent = reflections.length;
  visitCountStat.textContent = activityData.appVisits.length;

  dominantStateStat.textContent = activityData.emotionHistory.length
    ? `${dominantState.name} has appeared most often in your check-ins (${dominantCount} total). Latest visit: ${formatStoredDate(
        latestVisit ? latestVisit.createdAt : null,
      )}.`
    : `Your pattern will build as you choose states and complete sessions. Latest visit: ${formatStoredDate(
        latestVisit ? latestVisit.createdAt : null,
      )}.`;
}

function renderTimeline() {
  if (!emotionTimeline) return;

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
    emotionTimeline.innerHTML =
      '<p class="module-note">Your timeline will appear after your first check-in.</p>';
    return;
  }

  emotionTimeline.innerHTML = timelineEvents
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

function renderPersonalRoutine() {
  if (!routineContent) return;

  const stateKey = getRoutineStateKey();
  const state = emotionalStates[stateKey];
  const sessionCount = activityData.breathingSessions.filter(
    (session) => session.stateKey === stateKey,
  ).length;
  const reflectionCount = getReflections().filter(
    (reflection) =>
      (reflection.emotionKey || getStateKeyFromName(reflection.emotion)) ===
      stateKey,
  ).length;
  const promptIndex = (sessionCount + reflectionCount) % state.prompts.length;
  const firstTechnique =
    state.groundingTechniques[promptIndex % state.groundingTechniques.length];
  const secondTechnique =
    state.groundingTechniques[
      (promptIndex + 1) % state.groundingTechniques.length
    ];

  routineContent.innerHTML = `
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

function refreshParticlesForCurrentSection() {
  if (appState.currentSection === "hero") {
    createParticles("particlesHero", 30);
    return;
  }

  if (appState.currentSection === "state") {
    createParticles("particlesState", 40);
    return;
  }

  if (appState.currentSection === "regulation" && appState.selectedEmotion) {
    const state = emotionalStates[appState.selectedEmotion];
    createParticles(
      "particlesRegulation",
      state.particles.count,
      state.particles.speed,
    );
  }
}

function applyPreferences(options = {}) {
  const { refreshParticles = true, updateAudio = true } = options;

  document.body.classList.toggle(
    "theme-light",
    userPreferences.theme === "light",
  );
  document.body.classList.toggle(
    "theme-dark",
    userPreferences.theme === "dark",
  );
  document.documentElement.style.setProperty(
    "--font-scale",
    (userPreferences.fontScale / 100).toFixed(2),
  );
  scheduleFontScaleRefresh();

  syncPreferenceControls();
  if (refreshParticles) refreshParticlesForCurrentSection();
  if (updateAudio) updateSoundscape();
}

function syncPreferenceControls() {
  if (themeToggleButton) {
    const isLight = userPreferences.theme === "light";
    themeToggleButton.textContent = isLight ? "Dark Mode" : "Light Mode";
    themeToggleButton.setAttribute("aria-pressed", String(isLight));
  }

  if (soundEnabledToggle) {
    soundEnabledToggle.checked = userPreferences.soundEnabled;
  }
  if (natureSoundToggle)
    natureSoundToggle.checked = userPreferences.natureEnabled;
  if (meditationSoundToggle) {
    meditationSoundToggle.checked = userPreferences.meditationEnabled;
  }
  updateGuidedMeditationControls();
  if (natureSoundSelect) natureSoundSelect.value = userPreferences.natureType;
  if (masterVolumeInput) masterVolumeInput.value = userPreferences.masterVolume;
  if (natureVolumeInput) natureVolumeInput.value = userPreferences.natureVolume;
  if (meditationVolumeInput) {
    meditationVolumeInput.value = userPreferences.meditationVolume;
  }
  if (fontScaleInput) fontScaleInput.value = userPreferences.fontScale;
}

function updatePreference(key, value) {
  if (key === "natureType") {
    stopNatureSound();
  }

  if (key === "guidedMeditationEnabled" && !value) {
    stopGuidedMeditation();
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

function bindWellnessControls() {
  if (themeToggleButton) {
    themeToggleButton.addEventListener("click", () => {
      updatePreference(
        "theme",
        userPreferences.theme === "light" ? "dark" : "light",
      );
    });
  }

  if (soundEnabledToggle) {
    soundEnabledToggle.addEventListener("change", (event) => {
      updatePreference("soundEnabled", event.target.checked);
    });
  }

  if (natureSoundToggle) {
    natureSoundToggle.addEventListener("change", (event) => {
      updatePreference("natureEnabled", event.target.checked);
    });
  }

  if (meditationSoundToggle) {
    meditationSoundToggle.addEventListener("change", (event) => {
      updatePreference("meditationEnabled", event.target.checked);
    });
  }

  if (guidedMeditationToggle) {
    guidedMeditationToggle.addEventListener("change", (event) => {
      updatePreference("guidedMeditationEnabled", event.target.checked);
    });
  }

  if (guidedMeditationButton) {
    guidedMeditationButton.addEventListener("click", toggleGuidedMeditation);
  }

  if (natureSoundSelect) {
    natureSoundSelect.addEventListener("change", (event) => {
      updatePreference("natureType", event.target.value);
    });
  }

  [
    ["masterVolume", masterVolumeInput],
    ["natureVolume", natureVolumeInput],
    ["meditationVolume", meditationVolumeInput],
    ["fontScale", fontScaleInput],
  ].forEach(([preferenceKey, input]) => {
    if (!input) return;

    input.addEventListener("input", (event) => {
      updatePreference(preferenceKey, Number(event.target.value));
    });
  });

  if (newAffirmationButton) {
    newAffirmationButton.addEventListener("click", () => {
      showAffirmation(getRoutineStateKey(), true);
    });
  }

  if (refreshRoutineButton) {
    refreshRoutineButton.addEventListener("click", renderPersonalRoutine);
  }
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

  const now = new Date();
  const reflection = {
    id: now.getTime(),
    text: text,
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

  // Load existing reflections
  let reflections = getReflections();
  reflections.unshift(reflection);

  // Keep only last 20 reflections
  reflections = reflections.slice(0, 20);

  // Save to localStorage
  writeStorage(storageKeys.reflections, reflections);

  // Clear input
  journalInput.value = "";
  charCount.textContent = "0";

  // Reload reflections display
  loadReflections();
  renderDashboard();
  renderTimeline();
  renderPersonalRoutine();

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
  const reflections = getReflections();
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
  stopBreathingExercise();
  stopMeditationSound({ fadeSeconds: 0.4 });
  stopGuidedMeditation("Guided voice will follow the selected state.");
  updateSoundStatus();
  breathingText.textContent = "Get ready...";
  breathingCount.textContent = "";
  transitionToSection("state");
});

/**
 * Reset button - returns to hero section and clears state
 * Stops all audio (breathing, meditation, guided voice, and nature sounds)
 */
resetButton.addEventListener("click", () => {
  appState.selectedEmotion = null;
  stopBreathingExercise();
  breathingText.textContent = "Get ready...";
  breathingCount.textContent = "";
  journalInput.value = "";
  charCount.textContent = "0";

  // Stop all active audio to prevent sounds continuing after reset
  stopNatureSound();
  stopMeditationSound({ fadeSeconds: 0.35 });
  stopGuidedMeditation("Guided voice will follow the selected state.");

  // Immediately mute all audio by setting master gain to 0
  if (ambientMasterGain && audioContext) {
    setGainValue(ambientMasterGain, 0, 0.1); // Fast fade to silence
  }

  updateSoundStatus();
  transitionToSection("hero");
});

// ============================================================
// INITIALIZATION
// ============================================================

/**
 * Initializes the entire application on page load
 */
function initializeApp() {
  applyPreferences({ refreshParticles: false, updateAudio: false });
  bindWellnessControls();
  setupFontScaleObserver();
  trackAppVisit();

  // Show hero section
  heroSection.classList.add("active");

  // Create initial particles
  createParticles("particlesHero", 30);

  // Set up accessibility
  setupAccessibility();

  renderDashboard();
  renderTimeline();
  renderPersonalRoutine();
  const lastAffirmation = readStorage(storageKeys.lastAffirmation, null);
  if (lastAffirmation) {
    renderAffirmation(lastAffirmation);
  } else {
    showAffirmation("calm");
  }
  updateSoundStatus();
  scheduleFontScaleRefresh();

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

  if (affirmationText) affirmationText.setAttribute("aria-live", "polite");
  if (routineContent) routineContent.setAttribute("aria-live", "polite");
  if (emotionTimeline) emotionTimeline.setAttribute("aria-live", "polite");
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
        createParticles(
          container.id,
          count,
          state ? state.particles.speed : null,
        );
        entry.target.dataset.particlesLoaded = true;
      }
    }
  });
}, observerOptions);

// Observe sections for lazy loading
[stateSection, regulationSection].forEach((section) => {
  sectionObserver.observe(section);
});
