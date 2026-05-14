// These profiles drive the full regulation experience for each nervous-system state.
// The UI, breathing, grounding prompts, particles, and audio all read from this data.
export const emotionalStates = {
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

export const affirmationsByState = {
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
export const guidedMeditationsByState = {
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
