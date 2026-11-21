// Mara's radio pool. Every category has enough lines that repeat playthroughs
// do not sound like the same mission brief over and over.

const LINES = {
  intro: [
    "Echo Company is on the ground, Captain. Thirty-three towers between us and Vex. No cure, no rescue, no retreat.",
    "Radio check. Mara here. I kept the channel open through the Chorus static. Point me at the next gate.",
    "You made it out. What's left of Echo Company did. The rest are still wearing Vex's voice. Let's make it count.",
    "I've marked every stronghold on your map. Clear one, the next one opens. Simple. Brutal. Ours.",
    "The Captain is awake. Good. I was starting to think I would have to fight this war alone.",
    "Listen to me. The Chorus is loud, but it is not unbeatable. We take the beacons one at a time.",
    "I've got your back and a rifle with your name on the stock. Let's move before the snow gets thicker.",
    "Echo Company, this is Mara. I run the guns, the radios and the bad ideas. Today we only need the guns."
  ],
  coop: [
    "No AI squad besides me on this channel. Just us, our rifles and whatever I can put between you and the Chorus.",
    "I'm the only friendly voice in your ear today. Keep each other upright and share what you can.",
    "Co-op uplink is clean. If you go down, hold on — a teammate can hold E and drag you back.",
    "Supplies are tight. Press F near a teammate to pass health or ammo before the next wave hits.",
    "I'll call the field refits in. You keep the trigger discipline. Vex is listening to every one of these channels.",
    "Four players, one squad, plus me. No reinforcements. That is enough if you act like it."
  ],
  region: [
    "New sector. Watch the windows and the rooftops before you watch the street.",
    "The Chorus owns the high ground here. Clear it or it will clear you.",
    "I'm seeing movement on the scanners. Nothing friendly unless it answers the echo call.",
    "Different ground, same war. Keep your spacing and check your corners.",
    "The signal is stronger in this sector. That means more of them, and less time to think.",
    "Stay off the open road. The Chorus loves a clean firing lane.",
    "I've got the map up. Beacons are live. Pick your approach before you pick a fight.",
    "This place used to have a name that wasn't a checkpoint. Let's take it back.",
    "Weather is closing in. Good. It hides us too.",
    "I'm hearing a lot of Chorus traffic. They know we are close."
  ],
  engage: [
    "{n} hostiles on the scope. Make it loud.",
    "Contact. {n} of them, at least. I'll mark what I can see.",
    "{n} conscripts on the street. No civilians left to worry about.",
    "Beacon is hot. {n} Chorus signatures converging on your position.",
    "They see us. {n} rifles in the open. Hit them before they settle.",
    "I count {n}. That is a lot of minds Vex will not get back.",
    "{n} hostiles. Keep your head down, Captain.",
    "Contact front. {n} of them. This is going to get ugly.",
    "The Chorus is waking up. {n} signatures and more coming.",
    "{n} hostiles. Use the buildings. Do not give them a straight line.",
    "They are dug in. {n} of them. Break the position before they break you.",
    "Beacon engaged. {n} hostiles. I'll keep the channel open."
  ],
  clear: [
    "Beacon down. The Chorus is deaf in this sector. {count} of 33.",
    "Signal's flat. I can hear myself think again. {count} down.",
    "They're not waking up. They never will. But the signal is weaker here. {count} of 33.",
    "Stronghold's ours. Vex is going to feel that. {count} secured.",
    "Another hole in the net. Keep moving, Captain. {count} of 33.",
    "The conscripts are down. No cure, no rescue. Just the next gate. {count} secured.",
    "Beacon's dark. That's {count} sectors out of Vex's reach.",
    "One less choir. One more step north. {count} of 33.",
    "Clean work. Ugly, but clean. {count} strongholds down.",
    "I'm reading a lot less static on this channel. {count} of 33.",
    "The tower's silent. Restock, reload, and pick the next door. {count} secured.",
    "They died believing they were right. Vex made sure of that. {count} of 33.",
    "Another beacon bites the snow. {count} strongholds ours.",
    "The Chorus lost its voice here. Let's make it permanent. {count} of 33.",
    "Good hit. Bad odds. We're still standing. {count} secured.",
    "I can hear the next checkpoint humming. {count} of 33. Keep moving.",
    "No survivors, no prisoners. Just a quieter map. {count} secured.",
    "Beacon down. That's one more name Vex has to answer for. {count} of 33."
  ],
  lowHealth: [
    "You're bleeding bad, Captain. Find cover and let the squad work.",
    "Your vitals are in the red. I can hear it in your voice. Get behind something.",
    "That's too much blood. Fall back and breathe.",
    "I'm not losing you to a stray round. Pull back.",
    "You're hit hard. Let someone else take the next doorway.",
    "Captain, your signal is spiking. Get to cover before the next burst.",
    "You're running on fumes. Share a supply or find a cache.",
    "Stay with me. I've got the channel but I can't stop the bleeding from here."
  ],
  downed: [
    "You're down. Stay with me. A teammate can hold E and pull you back.",
    "Don't move. I'm marking your position. Someone get to the Captain.",
    "Signal's weak but alive. Hold on. Help is close.",
    "You're on the ground. Breathe. They're coming for you.",
    "I've still got your vitals. Hold on, Captain.",
    "Stay awake. I need you to stay awake."
  ],
  revived: [
    "There you are. On your feet. We're not done.",
    "I've got you. Breathe. Then get back in the fight.",
    "Good. You're back. Try to keep your blood inside next time.",
    "That was close. Too close. Move.",
    "You're up. The squad held the line while you were out.",
    "Back from the edge. Let's finish this.",
    "I thought I lost you. Don't do that again.",
    "Your vitals are climbing. Take a second, then take the next corner."
  ],
  share: [
    "Good. Keep each other supplied.",
    "That's what a squad does. Share the weight.",
    "Supplies passed. Make them count.",
    "I saw that. Keep it up.",
    "Health and ammo. The two things nobody has enough of.",
    "Nice. Now keep moving before Vex notices the generosity."
  ],
  upgrade: [
    "Battle's over. Field refit's in — more damage out, less coming back.",
    "Checkpoint secured. I've tuned the next load. You hit harder and bleed less.",
    "Requisition's in. Better rounds, better plates. Same war.",
    "The Chorus is learning. So are we. Damage up, incoming down.",
    "Every battle leaves something behind. I'm spending it on you.",
    "I've pushed the next load through. More punch, more protection, no tradeoff.",
    "Another beacon down. Another edge for us.",
    "Field refit installed. Everyone gets it. No exceptions."
  ],
  boss: [
    "That's a command signature. Big, loud and surrounded. Clear the escort before you commit.",
    "Boss on the field. I'm marking the guards too. Do not let them flank you.",
    "Command unit confirmed. Take the head and the rest of the Chorus will stumble.",
    "I've never seen a signal like that. Cut it out of the air.",
    "He's not hiding anymore. Good. Make him regret it.",
    "That's Voss, Vex's captain. He holds the inner gate. Put him down and the tower opens.",
    "That's him. Vex is on the field. Cut the head off and the Chorus dies with him."
  ]
};

const lastPick = new Map();

export function maraLine(category, vars = {}) {
  const pool = LINES[category];
  if (!pool || !pool.length) return "";
  let index = Math.floor(Math.random() * pool.length);
  if (pool.length > 1 && lastPick.get(category) === index) {
    index = (index + 1 + Math.floor(Math.random() * (pool.length - 1))) % pool.length;
  }
  lastPick.set(category, index);
  let line = pool[index];
  for (const [key, value] of Object.entries(vars)) {
    line = line.replaceAll(`{${key}}`, String(value));
  }
  return line;
}
