// Director Vex's co-op taunts. The host picks the line and sends it so
// every player hears the same transmission.

const LINES = {
  coopStart: [
    "Echo Company. Four heartbeats in the snow. I can hear every one of them.",
    "So the Captain brought friends. Good. The Chorus has been hungry.",
    "You think numbers make you safe. I have a nation of minds. You have a handful of rifles.",
    "Welcome to the sprawl. I have already counted the ways this ends.",
    "More minds for the choir. How generous of you to volunteer."
  ],
  downed: [
    "One of you is kneeling. I can feel the panic looking for a way in.",
    "{name} is down. Leave them, Captain. It will be easier for both of you.",
    "A wounded mind is such a noisy thing. I can almost taste it.",
    "Drag {name} back if you like. The Chorus remembers every hand that touches the dead.",
    "Do you feel that? The fear behind {name}'s eyes. That is me."
  ],
  revived: [
    "You pulled them back. How stubborn. How temporary.",
    "The Chorus does not forget a mind. Neither do I.",
    "Another breath for {name}. Spend it wisely.",
    "You cannot keep them. I have already heard the shape of their ending.",
    "A rescue. How sentimental. I will simply take them again."
  ]
};

const lastPick = new Map();

export function vexLine(moment, vars = {}) {
  const pool = LINES[moment];
  if (!pool || !pool.length) return "";
  let index = Math.floor(Math.random() * pool.length);
  if (pool.length > 1 && lastPick.get(moment) === index) {
    index = (index + 1 + Math.floor(Math.random() * (pool.length - 1))) % pool.length;
  }
  lastPick.set(moment, index);
  let line = pool[index];
  for (const [key, value] of Object.entries(vars)) {
    line = line.replaceAll(`{${key}}`, String(value));
  }
  return line;
}
