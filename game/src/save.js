// Three save slots in localStorage. Saving never throws: a restricted
// browser simply keeps the game in memory.
const PREFIX = 'wilwatikta3d_slot';

export function saveGame(G, slot) {
  const p = G.player;
  const data = {
    cash: G.cash, rep: G.rep, missionIdx: G.mission.idx, hp: p.hp, armor: p.armor,
    clock: G.clock, day: G.day, unlocked: G.unlocked, upgrades: G.upgrades,
    stats: G.stats, storyDone: !!G.storyDone, x: p.x, z: p.z,
  };
  try { localStorage.setItem(PREFIX + slot, JSON.stringify(data)); return true; }
  catch (e) { return false; }
}
export function loadGame(G, slot) {
  try {
    const raw = localStorage.getItem(PREFIX + slot);
    if (!raw) return false;
    const d = JSON.parse(raw);
    G.cash = d.cash; G.rep = d.rep; G.player.hp = d.hp; G.player.armor = d.armor;
    G.clock = d.clock; G.day = d.day; G.unlocked = d.unlocked; G.upgrades = d.upgrades;
    G.stats = d.stats || {}; G.storyDone = !!d.storyDone;
    G.player.x = d.x; G.player.z = d.z; G.player.onFoot = true; G.player.car = null;
    return d.missionIdx;
  } catch (e) { return false; }
}
export function slotInfo(slot) {
  try {
    const raw = localStorage.getItem(PREFIX + slot);
    if (!raw) return 'EMPTY';
    const d = JSON.parse(raw);
    return 'Mission ' + (d.missionIdx + 1) + '/12 · $' + Math.floor(d.cash).toLocaleString('en-US');
  } catch (e) { return 'EMPTY'; }
}
export function refreshSlotButtons() {
  for (let i = 0; i < 3; i++) {
    const b = document.getElementById('slot-' + i);
    if (b) b.textContent = 'SLOT ' + (i + 1) + ' — ' + slotInfo(i);
  }
}
