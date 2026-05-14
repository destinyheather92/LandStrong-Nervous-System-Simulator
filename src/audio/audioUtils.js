// This keeps ramps smooth even when volume changes interrupt an existing fade.
export function holdAudioParamAtCurrentValue(audioParam, time) {
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

export function setGainValue(audioContext, gainNode, value, rampSeconds = 0.25) {
  if (!gainNode || !audioContext) return;

  const now = audioContext.currentTime;
  holdAudioParamAtCurrentValue(gainNode.gain, now);
  gainNode.gain.linearRampToValueAtTime(value, now + rampSeconds);
}

export function safeStopAudioNode(node, stopTime) {
  if (!node || typeof node.stop !== "function") return;

  try {
    node.stop(stopTime);
  } catch (error) {
    // A node may already be stopped after a quick state change.
  }
}

export function safeDisconnectAudioNode(node) {
  if (!node || typeof node.disconnect !== "function") return;

  try {
    node.disconnect();
  } catch (error) {
    // Already-disconnected nodes are harmless.
  }
}
