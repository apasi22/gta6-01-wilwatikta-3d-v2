// WPD: wanted stars, pursuit cars, roadblocks, and the police helicopter with
// its searchlight. The helicopter blocks wanted decay while it is overhead.
import { Mesh, matModel, matMul, matTrans, matRotY, IDENTITY } from './gl.js';
import { DISPATCH } from './config.js';
import { makeCar, driveCar } from './vehicles.js';

export function buildHeliMeshes(gl) {
  const body = new Mesh();
  const NAVY = [0.10, 0.16, 0.38], WHITE = [0.92, 0.93, 0.95], YELLOW = [1.0, 0.8, 0.15];
  body.box(0, 0, 0, 2.3, 1.9, 4.4, NAVY, 0);
  body.box(0, 0.15, 2.3, 1.9, 1.3, 1.2, [0.08, 0.12, 0.18], 0.3);
  body.box(0, -0.35, 1.2, 2.34, 0.5, 3.4, WHITE, 0);
  body.box(0, -0.35, 1.2, 2.36, 0.18, 3.4, YELLOW, 0);
  body.box(0, 1.05, 0.3, 1.6, 0.5, 2.6, NAVY, 0);
  body.box(0, 0.25, -3.6, 0.7, 0.7, 3.4, NAVY, 0);
  body.box(0, 0.9, -5.2, 0.18, 1.4, 0.9, YELLOW, 0);
  body.box(0, 0.9, -5.35, 0.12, 1.8, 0.14, [0.2, 0.2, 0.22], 0);
  body.box(0.7, 0.9, -5.35, 0.12, 0.14, 1.6, [0.2, 0.2, 0.22], 0);
  for (const s of [-1, 1]) {
    body.box(s * 1.05, -1.25, 0.4, 0.16, 0.16, 3.4, [0.25, 0.25, 0.28], 0);
    body.box(s * 1.05, -0.9, 1.2, 0.14, 0.6, 0.14, [0.25, 0.25, 0.28], 0);
    body.box(s * 1.05, -0.9, -0.6, 0.14, 0.6, 0.14, [0.25, 0.25, 0.28], 0);
  }
  body.box(0, -0.9, 2.0, 0.5, 0.4, 0.5, [0.9, 0.9, 0.85], 0.8);
  body.box(0, 1.45, 0, 0.3, 0.5, 0.3, [0.15, 0.15, 0.17], 0);
  const rotor = new Mesh();
  rotor.box(0, 0, 0, 9.4, 0.1, 0.42, [0.12, 0.12, 0.14], 0);
  rotor.box(0, 0, 0, 0.42, 0.1, 9.4, [0.12, 0.12, 0.14], 0);
  rotor.box(0, 0.12, 0, 0.6, 0.24, 0.6, [0.3, 0.3, 0.32], 0);
  const blur = new Mesh();
  blur.disc(0, 0, 0, 4.7, [0.6, 0.6, 0.65], 0, 20);
  body.upload(gl); rotor.upload(gl); blur.upload(gl);
  return { body, rotor, blur };
}
export function buildConeMesh(gl) {
  const m = new Mesh();
  const sides = 12, H = 27, R = 6.5;
  for (let i = 0; i < sides; i++) {
    const a0 = (i / sides) * Math.PI * 2, a1 = ((i + 1) / sides) * Math.PI * 2;
    const x0 = Math.cos(a0) * R, z0 = Math.sin(a0) * R, x1 = Math.cos(a1) * R, z1 = Math.sin(a1) * R;
    const nx = Math.cos((a0 + a1) / 2), nz = Math.sin((a0 + a1) / 2);
    m.tri([0, 0, 0], [x1, -H, z1], [x0, -H, z0], [nx, 0.25, nz], [1.0, 0.95, 0.80], 0.6);
  }
  m.upload(gl);
  return m;
}
export function buildBlockerMesh(gl) {
  const m = new Mesh();
  for (let i = 0; i < 5; i++)
    m.box(-2.4 + i * 1.2, 1.0, 0, 1.2, 0.7, 0.3, i % 2 ? [0.95, 0.95, 0.95] : [1.0, 0.45, 0.05], 0.4);
  m.box(-2.4, 0.4, 0, 0.5, 0.8, 0.5, [0.2, 0.2, 0.22], 0);
  m.box(2.4, 0.4, 0, 0.5, 0.8, 0.5, [0.2, 0.2, 0.22], 0);
  m.box(0, 1.6, 0, 0.5, 0.3, 0.4, [1.0, 0.15, 0.1], 1.0);
  m.cone(-3.4, 0, 0.8, 0.45, 1.0, 7, [1.0, 0.45, 0.05], 0.3);
  m.cone(3.4, 0, -0.8, 0.45, 1.0, 7, [1.0, 0.45, 0.05], 0.3);
  m.upload(gl);
  return m;
}

export function setWanted(G, stars) {
  G.wanted.stars = stars;
  G.wanted.heat = [0, 15, 35, 60, 85, 110][stars] || 0;
}
export function addHeat(G, n) {
  G.wanted.heat = Math.min(120, G.wanted.heat + n);
  const th = [0, 15, 35, 60, 85, 110];
  let s = 0;
  for (let i = 0; i < 6; i++) if (G.wanted.heat >= th[i]) s = i;
  G.wanted.stars = s;
}

function spawnPoliceCar(G) {
  const p = G.player;
  const px = p.onFoot ? p.x : p.car.x, pz = p.onFoot ? p.z : p.car.z;
  const a = G.rng.range(0, Math.PI * 2), d = G.rng.range(55, 85);
  let x = px + Math.sin(a) * d, z = pz + Math.cos(a) * d;
  x = Math.max(-145, Math.min(145, x)); z = Math.max(-145, Math.min(145, z));
  const snap = (v) => { let best = -132, bd = 1e9; for (const r of [-132, -88, -44, 0, 44, 88, 132]) { const dd = Math.abs(v - r); if (dd < bd) { bd = dd; best = r; } } return best; };
  if (Math.abs(x - snap(x)) < Math.abs(z - snap(z))) x = snap(x); else z = snap(z);
  const c = makeCar(0, x, z, Math.atan2(px - x, pz - z), true);
  c.speed = 12;
  G.policeCars.push(c);
}

export function spawnRoadblock(G) {
  if (G.roadblocks.length >= 2) return;
  const p = G.player;
  const car = p.car;
  if (!car) return;
  const ahead = 26;
  const tx = car.x + Math.sin(car.h) * ahead, tz = car.z + Math.cos(car.h) * ahead;
  const snap = (v) => { let best = -132, bd = 1e9; for (const r of [-132, -88, -44, 0, 44, 88, 132]) { const dd = Math.abs(v - r); if (dd < bd) { bd = dd; best = r; } } return best; };
  const horiz = Math.abs(Math.sin(car.h)) > Math.abs(Math.cos(car.h));
  const bx = horiz ? tx : snap(tx), bz = horiz ? snap(tz) : tz;
  const bh = horiz ? Math.PI / 2 : 0;
  const block = { x: bx, z: bz, h: bh };
  G.roadblocks.push(block);
  const box = horiz
    ? { x0: bx - 2, z0: bz - 7, x1: bx + 2, z1: bz + 7 }
    : { x0: bx - 7, z0: bz - 2, x1: bx + 7, z1: bz + 2 };
  block.box = box;
  G.world.colliders.push(box);
  const c1 = makeCar(0, bx + Math.sin(bh) * 4.5, bz + Math.cos(bh) * 4.5, bh + Math.PI / 2, true);
  const c2 = makeCar(0, bx - Math.sin(bh) * 4.5, bz - Math.cos(bh) * 4.5, bh - Math.PI / 2, true);
  c1.blocker = true; c2.blocker = true;
  G.policeCars.push(c1, c2);
}
export function clearRoadblocks(G) {
  for (const b of G.roadblocks) {
    const i = G.world.colliders.indexOf(b.box);
    if (i >= 0) G.world.colliders.splice(i, 1);
  }
  G.roadblocks = [];
  G.policeCars = G.policeCars.filter((c) => !c.blocker);
}

export function updatePolice(G, dt) {
  const p = G.player;
  const px = p.onFoot ? p.x : p.car.x, pz = p.onFoot ? p.z : p.car.z;
  const stars = G.wanted.stars;
  // Wanted decay: hidden when no unit is close and no helicopter is overhead.
  const heliNear = G.heli && G.heli.active && Math.hypot(G.heli.x - px, G.heli.z - pz) < 46;
  let nearest = 1e9;
  for (const c of G.policeCars) nearest = Math.min(nearest, Math.hypot(c.x - px, c.z - pz));
  if (stars > 0 && nearest > 46 && !heliNear && !G.missionLock) {
    G.wanted.heat = Math.max(0, G.wanted.heat - 5 * dt);
    const th = [0, 15, 35, 60, 85, 110];
    let s = 0;
    for (let i = 0; i < 6; i++) if (G.wanted.heat >= th[i]) s = i;
    G.wanted.stars = s;
  }
  // Maintain pursuit strength.
  const want = stars === 0 ? 0 : Math.min(4, stars + (stars >= 3 ? 1 : 0));
  const hunters = G.policeCars.filter((c) => !c.blocker);
  if (hunters.length < want) spawnPoliceCar(G);
  if (hunters.length > want + 1) {
    hunters.sort((a, b) => Math.hypot(b.x - px, b.z - pz) - Math.hypot(a.x - px, a.z - pz));
    const drop = hunters[0];
    G.policeCars.splice(G.policeCars.indexOf(drop), 1);
  }
  for (const c of G.policeCars) {
    if (c.blocker) continue;
    const dx = px - c.x, dz = pz - c.z, d = Math.hypot(dx, dz);
    if (d > 170) { c.x = px + (dx / d) * -80; c.z = pz + (dz / d) * -80; }
    const wantH = Math.atan2(dx, dz);
    let dh = wantH - c.h;
    while (dh > Math.PI) dh -= 2 * Math.PI;
    while (dh < -Math.PI) dh += 2 * Math.PI;
    const ram = d < 14;
    driveCar(c, ram ? 1 : 0.85, Math.max(-1, Math.min(1, dh * 2.4)), false, dt, G.world);
  }
  // Helicopter.
  const wantHeli = stars >= 4 || G.forceHeli;
  if (wantHeli && !G.heli.active) { G.heli.active = true; G.heli.ang = 0; G.heli.x = px + 30; G.heli.z = pz; G.heli.y = 26; }
  if (!wantHeli && G.heli.active && !G.missionLock) G.heli.active = false;
  if (G.heli.active) {
    G.heli.ang += dt * 0.22;
    const tx = px + Math.cos(G.heli.ang) * 30, tz = pz + Math.sin(G.heli.ang) * 30;
    G.heli.x += (tx - G.heli.x) * Math.min(1, dt * 1.6);
    G.heli.z += (tz - G.heli.z) * Math.min(1, dt * 1.6);
    G.heli.y += (26 - G.heli.y) * Math.min(1, dt * 1.2);
    G.heli.h = Math.atan2(-Math.sin(G.heli.ang), Math.cos(G.heli.ang));
    G.heli.spin += dt * 20;
  }
  // Roadblocks at 3+ stars.
  G.blockTimer -= dt;
  if (stars >= 3 && G.blockTimer <= 0 && p.car && Math.abs(p.car.speed) > 6) {
    spawnRoadblock(G);
    G.blockTimer = 14;
  }
  if (stars < 3) clearRoadblocks(G);
  // Busted: surrounded and stopped.
  if (stars > 0 && nearest < 4.5) {
    const spd = p.car ? Math.abs(p.car.speed) : 0;
    if (spd < 1.5) G.bustedTimer += dt; else G.bustedTimer = 0;
  } else G.bustedTimer = 0;
  // Dispatch chatter.
  G.dispatchT -= dt;
  if (G.dispatchT <= 0) {
    G.dispatchT = 9 + G.rng.next() * 6;
    G.dispatch = G.rng.pick(DISPATCH);
  }
}
