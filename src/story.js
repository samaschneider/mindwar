// Radio story beats. Key checkpoints get a short burst of radio transmissions
// after the battle; ordinary clears stay in the HUD radio. Vex betrayed the
// nation with the Chorus Protocol: no signal, no broadcast, just a leash inside
// every citizen. The player and Mara refused it and must fight through the
// Chorus to reach Vex.

const REGION_BRIEFS = {
  beginning: [
    "Training ground. Learn the rifle, Captain. I will keep the channel open.",
    "Second drill. Grenades, the knife and cover. Six hostiles."
  ],
  farm: [
    "The Protocol does not need a tower, Captain. It lives in their skulls. Clear the garrison.",
    "Every one of them went through a clinic. They cannot stop. We still have to put them down.",
    "Farm country, one gun at a time. Every one of them between us and Vex."
  ],
  suburb: [
    "Cedar's Vill. Every basement clinic is one of his conversion houses.",
    "These people were neighbours before Vex made them his. They will not thank us for this.",
    "Clear the street. They do not surrender."
  ],
  city: [
    "Meridian. Vex's tower is on the skyline. The Chorus is thickest here.",
    "The city is a maze with teeth. Every mind in it belongs to Vex.",
    "Vex knows we are close. He will make this personal."
  ]
};

const ZONE_BRIEFS = {
  0: "Training ground. Four hostiles. Learn the rifle, Captain.",
  1: "Second drill. Six hostiles. Grenades, knife, cover.",
  2: "Harrow Fields. Eighteen hostiles. First real gate, Captain.",
  10: "The Fence. Last farm before the suburbs. Vex's garrisons are massing behind it.",
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
      { speaker: "MARA", text: "Vex didn't need a broadcast. He put the Protocol in every citizen before anyone thought to ask what it was." },
      { speaker: "DIRECTOR VEX", text: "I gave them certainty. A nation that cannot disagree. You should have taken my hand, Captain." }
    ]
  },
  2: {
    lines: [
      { speaker: "MARA", text: "Harrow Fields is ours. They are still wearing his orders. They will never thank us for this." },
      { speaker: "DIRECTOR VEX", text: "A field. You have taken a field. I have taken a nation." }
    ]
  },
  5: {
    lines: [
      { speaker: "MARA", text: "The clinic here was one of his conversion houses. I watched my old squad go quiet in a room like this. There was no signal to cut. There was nothing to save." }
    ]
  },
  8: {
    lines: [
      { speaker: "DIRECTOR VEX", text: "You keep climbing, Captain. Do you even remember saying no?" },
      { speaker: "MARA", text: "Do not answer him. He is fishing for a way in." }
    ]
  },
  10: {
    chapter: "ACT II",
    title: "CEDAR'S VILL",
    lines: [
      { speaker: "MARA", text: "The farms are behind us. Cedar's Vill has a clinic in every basement, and every one of them is his. What he does there does not come out." },
      { speaker: "DIRECTOR VEX", text: "You cannot undo them. You can only bury them. That is what you are doing, isn't it?" }
    ]
  },
  12: {
    lines: [
      { speaker: "MARA", text: "The Chorus does not kill people. It keeps them. They do not switch off, and neither do the orders." }
    ]
  },
  15: {
    lines: [
      { speaker: "CAPTAIN VOSS", text: "Captain Voss. You are approaching my district. The Protocol makes us certain. Turn back and I will make it quick." },
      { speaker: "MARA", text: "Voss. Vex's hand. He is not bluffing, but neither are we." }
    ]
  },
  18: {
    lines: [
      { speaker: "MARA", text: "They poisoned the reservoir. The survivors are still compliant. Vex calls it sanitation." }
    ]
  },
  20: {
    lines: [
      { speaker: "CAPTAIN VOSS", text: "You have a good squad, Captain. I had one too. Vex took them." },
      { speaker: "MARA", text: "He is trying to make you hesitate. Do not." }
    ]
  },
  22: {
    chapter: "ACT III",
    title: "MERIDIAN",
    lines: [
      { speaker: "MARA", text: "Meridian. Vex's tower is on the horizon. He is the architect; the nation is the machine now. Voss holds the gate." },
      { speaker: "CAPTAIN VOSS", text: "You are not the first free Echo to come this far. You are just the loudest." }
    ]
  },
  24: {
    lines: [
      { speaker: "MARA", text: "They are casting new armour in the foundry. For his soldiers, not for us. Vex is preparing for something." }
    ]
  },
  27: {
    lines: [
      { speaker: "DIRECTOR VEX", text: "You were the first mind I offered the Protocol, Captain. You refused. That is why you are still loud." },
      { speaker: "MARA", text: "Whatever he is selling, do not buy it. He needs you to believe it." }
    ]
  },
  29: {
    lines: [
      { speaker: "MARA", text: "Null Sector. No signal, no rescue. Just his orders and the people still following them. Whatever Vex says in the tower, it is a weapon." }
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
      { speaker: "CAPTAIN VOSS", text: "Kill me if you must. His orders will still be in me. Ask Vex what happens when the architect dies." },
      { speaker: "MARA", text: "He is stalling. Do not let him inside your head. Vex is next." }
    ]
  }
};

export function debriefFor(zone) {
  if (!zone || zone.index >= 34) return null;
  return BEATS[zone.index] || null;
}
