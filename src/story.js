// Radio story beats. Key checkpoints get a short animated transmission after
// the battle; ordinary clears stay in the HUD radio. The arc runs through the
// two training stages, Harrow County, Cedar's Vill and Meridian.

const REGION_BRIEFS = {
  beginning: [
    "Training ground. Learn the rifle, Captain. I will keep the channel open.",
    "Second drill. Grenades, the knife and cover. Six hostiles."
  ],
  farm: [
    "Another Harrow County stronghold. Clear the gate and open the road.",
    "The Chorus has a relay here. Cut it before it calls the next sector.",
    "Farm country, one gun at a time. Keep moving north."
  ],
  suburb: [
    "Cedar's Vill. Every basement has a speaker and every speaker has a rifle.",
    "The Chorus is thinner here. That means Vex is listening harder.",
    "Clear the street. Do not let them circle behind you."
  ],
  city: [
    "Meridian. Vex's tower is on the skyline. Every checkpoint is a step closer.",
    "The city is a maze with teeth. Keep your rifle up.",
    "Vex knows we are close. He will make this personal."
  ]
};

const ZONE_BRIEFS = {
  0: "Training ground. Four hostiles. Learn the rifle, Captain.",
  1: "Second drill. Six hostiles. Grenades, knife, cover.",
  2: "Harrow Fields. Eighteen hostiles. First real gate, Captain.",
  10: "The Fence. Last farm before the suburbs. Vex is massing behind it.",
  22: "Ashmarket. The road into Meridian runs through this square.",
  33: "Voss's Gate. Voss is inside. There is no way around him.",
  34: "The Director's tower. Vex is waiting at the top."
};

export function briefingFor(zone) {
  if (!zone) return "";
  if (ZONE_BRIEFS[zone.index]) return ZONE_BRIEFS[zone.index];
  const pool = REGION_BRIEFS[zone.region] || REGION_BRIEFS.farm;
  return pool[zone.index % pool.length];
}

const BEATS = {
  1: {
    chapter: "ACT I",
    title: "HARROW COUNTY",
    lines: [
      { speaker: "MARA", text: "Training is over. Harrow County is the first link in Vex's chain. From here on, every gate is real." },
      { speaker: "DIRECTOR VEX", text: "You have learned to shoot, Captain. That was the easy part. Ask Mara what the Chorus does with the willing." }
    ]
  },
  2: {
    lines: [
      { speaker: "MARA", text: "Harrow Fields is ours. By morning the Chorus will know a field went quiet." },
      { speaker: "DIRECTOR VEX", text: "A field. You have taken a field. I have taken a nation." }
    ]
  },
  5: {
    lines: [
      { speaker: "MARA", text: "The relay here was screaming. I cut it. For a second I heard my old squad in the static." }
    ]
  },
  8: {
    lines: [
      { speaker: "DIRECTOR VEX", text: "You keep climbing, Captain. Do you even remember why?" },
      { speaker: "MARA", text: "Do not answer him. He is fishing for a way in." }
    ]
  },
  10: {
    chapter: "ACT II",
    title: "CEDAR'S VILL",
    lines: [
      { speaker: "MARA", text: "The farms are behind us. Cedar's Vill is a suburb with a Chorus relay in every basement." },
      { speaker: "DIRECTOR VEX", text: "You burn my fields, I take your streets. That is how a war stays polite." }
    ]
  },
  12: {
    lines: [
      { speaker: "MARA", text: "The Chorus does not kill people. It keeps them. That is the difference, Captain." }
    ]
  },
  15: {
    lines: [
      { speaker: "CAPTAIN VOSS", text: "Captain Voss. You are approaching my district. Turn back and I will make it quick." },
      { speaker: "MARA", text: "Voss. Vex's hand. He is not bluffing, but neither are we." }
    ]
  },
  18: {
    lines: [
      { speaker: "MARA", text: "They poisoned the reservoir. Vex calls it sanitisation. The Chorus calls it a choir." }
    ]
  },
  20: {
    lines: [
      { speaker: "CAPTAIN VOSS", text: "You have a good squad, Captain. I had one too. Vex kept it." },
      { speaker: "MARA", text: "He is trying to make you hesitate. Do not." }
    ]
  },
  22: {
    chapter: "ACT III",
    title: "MERIDIAN",
    lines: [
      { speaker: "MARA", text: "Meridian. Vex's tower is on the horizon. Voss holds the gate." },
      { speaker: "CAPTAIN VOSS", text: "You are not the first Echo to come this far. You are just the loudest." }
    ]
  },
  24: {
    lines: [
      { speaker: "MARA", text: "They are casting new armour in the foundry. For what? There is no one left to fight but us." }
    ]
  },
  27: {
    lines: [
      { speaker: "DIRECTOR VEX", text: "You were the first voice in the Chorus, Captain. The only one that did not stay." },
      { speaker: "MARA", text: "Whatever he is selling, do not buy it. He needs you to believe it." }
    ]
  },
  29: {
    lines: [
      { speaker: "MARA", text: "Null Sector. Maps end here. Whatever Vex says in the tower, it is a weapon. Do not let it in." }
    ]
  },
  31: {
    lines: [
      { speaker: "DIRECTOR VEX", text: "I gave you a war you could win. Every gate, a breadcrumb. You never asked who set the table." },
      { speaker: "MARA", text: "He is afraid. That is what this sounds like." }
    ]
  },
  33: {
    chapter: "THE INNER GATE",
    title: "VOSS'S GATE",
    lines: [
      { speaker: "CAPTAIN VOSS", text: "Kill me if you must. But when you reach the tower, ask him what he made you from." },
      { speaker: "MARA", text: "He is lying. Or he is not. Either way, Vex is next." }
    ]
  }
};

export function debriefFor(zone) {
  if (!zone || zone.index >= 34) return null;
  return BEATS[zone.index] || null;
}

export function coopStoryLine(zone) {
  const beat = debriefFor(zone);
  if (!beat || !beat.lines.length) return null;
  const line = beat.lines[0];
  return { speaker: line.speaker, text: line.text };
}
