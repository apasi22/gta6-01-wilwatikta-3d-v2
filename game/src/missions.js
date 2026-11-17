// The 12-mission story chain: objectives, timers, dialogue, beacons, and the
// dashed gold route line along the roads. Missions drive the whole game.
import { Mesh } from './gl.js';
import { MISSIONS, CITY } from './config.js';
import { makeCar } from './vehicles.js';
import { spawnThugs } from './combat.js';
import { setWanted, clearRoadblocks } from './police.js';

export function buildBeaconMeshes(gl) {
  const pillar = new Mesh();
  pillar.prism(0, 0, 0, 0.8, 11, 8, [1.0, 0.8, 0.2], 1.0);
  const marker = new Mesh();
  marker.box(0, 0, 0, 0.85, 0.85, 0.85, [1.0, 0.8, 0.2], 1.0);
  pillar.upload(gl); marker.upload(gl);
  return { pillar, marker };
}

export function getTarget(G) {
  const m = MISSIONS[G.mission.idx];
  if (!m) return null;
  if (m.type === 'steal' && G.mission.stage === 1) return m.target2;
  return m.target;
}

export function startMission(G, idx) {
  const m = MISSIONS[idx];
  G.thugs = [];
  G.parked = G.parked.filter((c) => !c.missionCar);
  G.mission = { idx, phase: 'active', timer: m.time, stage: 0, targetCar: null };
  G.dialogue = { name: m.say[0], text: m.say[1], t: 9 };
  G.forceHeli = false;
  G.missionLock = false;
  clearRoadblocks(G);
  if (m.wanted) { setWanted(G, m.wanted); G.missionLock = true; }
  else setWanted(G, 0);
  if (m.night) { G.clock = 21.5; }
  if (m.type === 'steal') {
    const car = makeCar(idx === 9 ? 1 : 1, m.target[0] + 5.2, m.target[1], Math.PI / 2);
    car.parked = true; car.missionCar = true;
    G.parked.push(car);
    G.mission.targetCar = car;
  }
  if (m.type === 'combat') spawnThugs(G, m.target[0], m.target[1], 4);
  if (idx === 8) G.forceHeli = true;
  computeRouteMesh(G);
}

export function completeMission(G) {
  const m = MISSIONS[G.mission.idx];
  G.cash += m.reward;
  G.rep += 20;
  G.stats.missions = (G.stats.missions || 0) + 1;
  G.mission.phase = 'done';
  G.passed = { title: 'MISSION PASSED', sub: m.title, reward: m.reward };
  G.screen = 'passed';
  G.forceHeli = false;
  G.missionLock = false;
  if (G.mission.idx === 3 && !G.unlocked[2]) {
    G.unlocked[2] = true;
    G.passed.sub += ' — SMG UNLOCKED';
  }
  if (G.mission.idx >= MISSIONS.length - 1) G.storyDone = true;
}
export function failMission(G, why) {
  G.mission.phase = 'failed';
  G.passed = { title: 'MISSION FAILED', sub: why || MISSIONS[G.mission.idx].title, reward: 0 };
  G.screen = 'passed';
  G.forceHeli = false;
  G.missionLock = false;
}
export function nextMission(G) {
  if (G.mission.phase === 'done' && !G.storyDone) startMission(G, G.mission.idx + 1);
  else if (G.mission.phase === 'failed') startMission(G, G.mission.idx);
  else { G.screen = 'play'; }
  if (G.storyDone && G.mission.phase === 'done') G.screen = 'play';
}

export function updateMission(G, dt) {
  const M = G.mission;
  if (M.phase !== 'active') return;
  const m = MISSIONS[M.idx];
  M.timer -= dt;
  if (M.timer <= 0) { failMission(G, 'Out of time — ' + m.title); return; }
  const p = G.player;
  const px = p.onFoot ? p.x : p.car.x, pz = p.onFoot ? p.z : p.car.z;
  if (m.type === 'combat') {
    if (G.thugs.length > 0 && G.thugs.every((t) => t.fallen)) completeMission(G);
    return;
  }
  if (m.type === 'escape') {
    if (G.wanted.stars === 0) completeMission(G);
    return;
  }
  if (m.type === 'steal' && M.stage === 0) {
    if (p.car === M.targetCar) {
      M.stage = 1;
      G.dialogue = { name: 'SUGENG', text: 'Got it. Now to Bengkel Bambang — easy does it.', t: 6 };
      computeRouteMesh(G);
    }
    return;
  }
  const t = getTarget(G);
  if (t && Math.hypot(t[0] - px, t[1] - pz) < 8) completeMission(G);
  G.routeT -= dt;
  if (G.routeT <= 0) { G.routeT = 2; computeRouteMesh(G); }
}

// Dashed gold route along the road grid: snap to the nearest road, go along
// one axis, turn, then along the other axis to the target.
export function computeRouteMesh(G) {
  const t = getTarget(G);
  if (!t || !G.routeMesh) return;
  const p = G.player;
  const px = p.onFoot ? p.x : p.car.x, pz = p.onFoot ? p.z : p.car.z;
  const snap = (v) => { let best = CITY.ROADS[0], bd = 1e9; for (const r of CITY.ROADS) { const d = Math.abs(v - r); if (d < bd) { bd = d; best = r; } } return best; };
  const pts = [[px, pz], [snap(px), pz], [snap(px), t[1]], [t[0], t[1]]];
  const mesh = G.routeMesh;
  mesh.v = [];
  const GOLD = [1.0, 0.8, 0.2];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.floor(len / 4);
    for (let s = 0; s < n; s++) {
      if (s % 2) continue;
      const x = a[0] + (b[0] - a[0]) * (s / n), z = a[1] + (b[1] - a[1]) * (s / n);
      mesh.quad([x - 0.6, 0.09, z - 0.6], [x + 0.6, 0.09, z - 0.6], [x + 0.6, 0.09, z + 0.6], [x - 0.6, 0.09, z + 0.6], [0, 1, 0], GOLD, 0.6);
    }
  }
  mesh.upload(G.gl);
}
