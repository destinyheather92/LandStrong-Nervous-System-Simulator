import {
  holdAudioParamAtCurrentValue,
  safeDisconnectAudioNode,
  safeStopAudioNode,
  setGainValue,
} from "./audioUtils.js";

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
export function createMeditationAudio({
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
