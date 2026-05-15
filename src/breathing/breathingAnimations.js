//the default orb scales are defined here to provide a baseline for the breathing orbs animation. These values can be overridden by specific emotional states that want to create a different visual effect, such as a more intense expansion for "fight" or a gentler one for "shutdown"
const defaultBreathingOrbScales = {
  inhaleStart: 1,
  inhaleEnd: 1.32,
};
//sine is used for a smooth, natural breathing motion that mimics the gentle rise and fall of the chest during relaxed breathing. The easeInOutSine function creates a gradual acceleration and deceleration effect
function easeInOutSine(progress) {
  //Math.cos is creating a curved wave- begins gently, accelerates smoothly, then slows down naturally. The formula transforms the linear progress (0 to 1) into a non-linear curve that eases in and out, making the breathing animation feel more organic and less mechanical, which can enhance the calming effect of the exercise.
  return -(Math.cos(Math.PI * progress) - 1) / 2;
}
// the easeOutCubic function creates a more dynamic and energetic feel for the inhale phase in "fight" mode, starting quickly and then slowing down towards the end
function easeOutCubic(progress) {
  return 1 - Math.pow(1 - progress, 3);
}
// The easeInOutQuad function provides a balanced acceleration and deceleration for "shutdown" mode, creating a smooth transition that can help users feel more grounded and relaxed as they move through the breathing cycle.
function easeInOutQuad(progress) {
  return progress < 0.5
    ? 2 * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 2) / 2;
}

//consditional statements here are calling the different functions above to get the appropriate easing effect based on the current breathing phase and motion profile. This allows the breathing orb animation to adapt its behavior to match the intended emotional state
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

  //This function updates the size and glow intensity of the breathing orb during the animation. As the orb grows and shrinks, also make the glow react naturally. Its taking in a scale value 1.0 normal size, 1.2 - 20% bigger 1.32 fully expanded
  function setBreathingOrbScale(scale) {
  
    const glowProgress =
      (scale - activeBreathingOrbScales.inhaleStart) /
      (activeBreathingOrbScales.inhaleEnd -
        activeBreathingOrbScales.inhaleStart);
//safely clamp the value- prevents weird numbers
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
//applyOrbProfile function is responsible for configuring the breathing orb's visual properties based on the selected emotional state. It includes fallback values for default states
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
//stop function is responsible for halting any ongoing breathing orb animations and resetting the orb to its default state. 
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
