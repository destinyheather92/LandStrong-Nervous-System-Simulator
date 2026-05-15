
//the get breathing phases function translates the breathing pattern from the emotional state into a structured format that the breathing engine can use to manage the timing and display of each phase. ITs essentially building a step by step breathing sequence based on the current settigns.  
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

// The formatBreathingPattern function creates a  string representation of the current breathing pattern, 
function formatBreathingPattern(state) {
  const pattern = state.breathingPattern;
  const holdText =
    pattern.hold > 0
      ? `${state.holdLabel || "Hold"} ${pattern.hold}`
      : "No hold";

  return `${state.breathingStyle}: inhale ${pattern.inhale}, ${holdText.toLowerCase()}, exhale ${pattern.exhale}.`;
}

// This runs the breathing countdown and asks the animator to move the orb.
export function createBreathingEngine({
  dom,
  appState,
  emotionalStates,
  animator,
  onBreathingComplete,
}) {
  let breathingIntervalId = null;

  function stopBreathingExercise() {
    if (breathingIntervalId) {
      //clearInterval method is used to stop the recurring execution of the function that was set up by setInterval. In this case, it stops the breathing countdown and orb animation updates when the user completes or exits a breathing exercise. Clean Up. 
      clearInterval(breathingIntervalId);
      breathingIntervalId = null;
    }
    //resetting the breathing state and UI elements ensures that the user can start a new breathing exercise without any leftover state from the previous one. 
    appState.isBreathingActive = false;
    dom.startBreathingButton.disabled = false;
    dom.breathingOrb.classList.remove("breathing");
    animator.stop();
  }
//this is going to set up the breathing exercise based on the selected emotion. It also attaches the event handler to the start button, which will trigger the actual breathing exercise when clicked. 
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
//complete breathing exercise is called when the user finishes the required number of breathing cycles. It stops the exercise, triggers any completion logic (like updating wellness scores or unlocking content), and updates the UI to indicate that the session is complete. After a short delay denoted in the setTimeout method
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
