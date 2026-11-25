// Global service-record achievements. Progress is stored outside the world
// saves so it carries across all five campaign slots and co-op sessions.

const STORAGE_KEY = "mindwar_achievements_v1";

export const ACHIEVEMENTS = [
  { id: "first_blood", name: "FIRST BLOOD", desc: "Get your first kill." },
  { id: "headhunter", name: "HEADHUNTER", desc: "Get 25 headshot kills." },
  { id: "close_quarters", name: "CLOSE QUARTERS", desc: "Kill 10 hostiles with the knife." },
  { id: "frag_out", name: "FRAG OUT", desc: "Kill 10 hostiles with grenades." },
  { id: "rocket_science", name: "ROCKET SCIENCE", desc: "Kill 5 hostiles with the bazooka." },
  { id: "long_shot", name: "LONG SHOT", desc: "Kill a hostile from 100 m or more." },
  { id: "sniper_hunter", name: "SNIPER HUNTER", desc: "Kill 10 Chorus snipers." },
  { id: "checkpoint_runner", name: "CHECKPOINT RUNNER", desc: "Clear 10 strongholds." },
  { id: "untouchable", name: "UNTOUCHABLE", desc: "Clear a checkpoint without taking damage." },
  { id: "nightmare_survivor", name: "NIGHTMARE SURVIVOR", desc: "Clear a stronghold on Nightmare." },
  { id: "voss_down", name: "THE INNER GATE", desc: "Defeat Captain Voss." },
  { id: "vex_down", name: "THE DIRECTOR IS DEAD", desc: "Defeat Director Vex." },
  { id: "field_medic", name: "FIELD MEDIC", desc: "Revive a downed co-op teammate." },
  { id: "squad_goals", name: "SQUAD GOALS", desc: "Clear a checkpoint with another player." },
  { id: "master_of_arms", name: "MASTER OF ARMS", desc: "Get a kill with every weapon." }
];

const EMPTY_STATS = {
  kills: 0,
  headshots: 0,
  knifeKills: 0,
  grenadeKills: 0,
  bazookaKills: 0,
  sniperKills: 0,
  maxKillDistance: 0,
  checkpoints: 0,
  revives: 0,
  weapons: []
};

export class AchievementTracker {
  constructor({ hud, onChange } = {}) {
    this.hud = hud || null;
    this.onChange = onChange || null;
    this.unlocked = new Set();
    this.stats = { ...EMPTY_STATS, weapons: [] };
    this.load();
  }

  load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!raw) return;
      if (Array.isArray(raw.unlocked)) {
        for (const id of raw.unlocked) {
          if (ACHIEVEMENTS.some(a => a.id === id)) this.unlocked.add(id);
        }
      }
      if (raw.stats && typeof raw.stats === "object") {
        for (const key of Object.keys(EMPTY_STATS)) {
          if (key === "weapons") {
            this.stats.weapons = Array.isArray(raw.stats.weapons)
              ? raw.stats.weapons.filter(id => typeof id === "string")
              : [];
          } else if (Number.isFinite(raw.stats[key])) {
            this.stats[key] = raw.stats[key];
          }
        }
      }
    } catch (e) { /* a broken record starts over */ }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        unlocked: [...this.unlocked],
        stats: this.stats
      }));
    } catch (e) { /* storage can fail */ }
  }

  has(id) { return this.unlocked.has(id); }

  progress() {
    return { unlocked: this.unlocked.size, total: ACHIEVEMENTS.length };
  }

  list() {
    return ACHIEVEMENTS.map(a => ({ ...a, unlocked: this.unlocked.has(a.id) }));
  }

  unlock(id) {
    if (this.unlocked.has(id)) return false;
    const def = ACHIEVEMENTS.find(a => a.id === id);
    if (!def) return false;
    this.unlocked.add(id);
    this.save();
    this.hud?.toast("ACHIEVEMENT UNLOCKED", `${def.name} // ${def.desc}`, "amber");
    this.onChange?.();
    return true;
  }

  recordKill({ weaponKey = null, headshot = false, sniper = false, distance = 0 } = {}) {
    if (!weaponKey) return;
    this.stats.kills++;
    if (headshot) this.stats.headshots++;
    if (weaponKey === "knife") this.stats.knifeKills++;
    else if (weaponKey === "grenade") this.stats.grenadeKills++;
    else if (weaponKey === "bazooka") this.stats.bazookaKills++;
    if (sniper) this.stats.sniperKills++;
    if (distance > this.stats.maxKillDistance) this.stats.maxKillDistance = distance;
    if (weaponKey !== "grenade" && !this.stats.weapons.includes(weaponKey)) {
      this.stats.weapons.push(weaponKey);
    }
    this.save();
    this.unlock("first_blood");
    if (this.stats.headshots >= 25) this.unlock("headhunter");
    if (this.stats.knifeKills >= 10) this.unlock("close_quarters");
    if (this.stats.grenadeKills >= 10) this.unlock("frag_out");
    if (this.stats.bazookaKills >= 5) this.unlock("rocket_science");
    if (this.stats.maxKillDistance >= 100) this.unlock("long_shot");
    if (this.stats.sniperKills >= 10) this.unlock("sniper_hunter");
    if (this.stats.weapons.length >= 8) this.unlock("master_of_arms");
  }

  recordCheckpoint({ zoneIndex, mode, untouched = false, coop = false, players = 1 } = {}) {
    if (zoneIndex < 2) return;
    this.stats.checkpoints++;
    this.save();
    if (this.stats.checkpoints >= 10) this.unlock("checkpoint_runner");
    if (untouched) this.unlock("untouchable");
    if (mode === "nightmare") this.unlock("nightmare_survivor");
    if (zoneIndex === 33) this.unlock("voss_down");
    if (zoneIndex === 34) this.unlock("vex_down");
    if (coop && players >= 2) this.unlock("squad_goals");
  }

  recordRevive() {
    this.stats.revives++;
    this.save();
    this.unlock("field_medic");
  }
}
