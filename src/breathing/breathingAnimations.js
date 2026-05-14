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
export function createBreathingAnimator({ dom, getIsBreathingActive }) {
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
