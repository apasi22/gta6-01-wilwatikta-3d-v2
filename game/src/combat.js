// Combat: hitscan weapons, reloads, enemy thugs, pickups, muzzle flashes,
// sparks and smoke. Shooting is loud: it scatters pedestrians and adds heat.
import { Mesh, matModel } from './gl.js';
import { WEAPONS } from './config.js';
import { addHeat } from './police.js';
import { collideCircle } from './city.js';

export function buildPickupMeshes(gl) {
  const kinds = [[0.2, 0.9, 0.3], [0.25, 0.5, 1.0], [1.0, 0.85, 0.2]];
  return kinds.map((c) => {
    const m = new Mesh();
    m.box(0, 0, 0, 0.7, 0.7, 0.7, c, 1.0);
    m.box(0, 0, 0, 0.9, 0.22, 0.22, [1, 1, 1], 1.0);
    m.upload(gl);
    return m;
  });
}
export function buildFlashMesh(gl) {
  const m = new Mesh();
  m.quad([-0.5, -0.5, 0], [0.5, -0.5, 0], [0.5, 0.5, 0], [-0.5, 0.5, 0], [0, 0, 1], [1.0, 0.85, 0.4], 1.0);
  m.quad([0, -0.5, -0.5], [0, -0.5, 0.5], [0, 0.5, 0.5], [0, 0.5, -0.5], [1, 0, 0], [1.0, 0.85, 0.4], 1.0);
  m.upload(gl);
  return m;
}

export function addFx(G, kind, x, y, z, life) {
  G.fx.push({ kind, x, y, z, life, max: life, seed: G.rng.next() * 6.28 });
}
export function updateFx(G, dt) {
  for (const f of G.fx) {
    f.life -= dt;
    if (f.kind === 'smoke') f.y += dt * 1.6;
  }
  G.fx = G.fx.filter((f) => f.life > 0);
}

export function switchWeapon(G, dir) {
  const order = [0, 1, 2].filter((i) => G.unlocked[i]);
  let at = order.indexOf(G.weapons.wi);
  at = (at + dir + order.length) % order.length;
  G.weapons.wi = order[at];
  const w = WEAPONS[G.weapons.wi];
  G.weapons.mag = w.mag;
  G.weapons.reloadT = 0;
}
export function reloadWeapon(G) {
  const w = WEAPONS[G.weapons.wi];
  if (w.mag === 0 || G.weapons.mag === w.mag || G.weapons.reserve <= 0) return;
  G.weapons.reloadT = w.name === 'SMG' ? 1.6 : 1.2;
}

export function fireWeapon(G, aimX, aimZ) {
  const W = G.weapons, w = WEAPONS[W.wi];
  if (W.fireT > 0 || W.reloadT > 0) return;
  const p = G.player;
  const ox = p.onFoot ? p.x : p.car.x, oz = p.onFoot ? p.z : p.car.z;
  if (w.mag === 0) {
    W.fireT = 1 / w.rate;
    for (const t of G.thugs) {
      if (t.fallen) continue;
      const dx = t.x - ox, dz = t.z - oz, d = Math.hypot(dx, dz);
      if (d < 2.4) { hurtThug(G, t, w.dmg); addFx(G, 'spark', t.x, 1.2, t.z, 0.18); }
    }
    return;
  }
  if (W.mag <= 0) { reloadWeapon(G); return; }
  W.mag -= 1;
  W.fireT = 1 / w.rate;
  G.shotTimer = 0.6;
  addHeat(G, 2);
  const mx = ox + Math.sin(p.h) * 1.0, mz = oz + Math.cos(p.h) * 1.0;
  addFx(G, 'flash', mx, p.onFoot ? 1.4 : 1.2, mz, 0.09);
  // Hitscan: nearest thug or car inside a narrow cone.
  let best = null, bestD = 46;
  const ax = aimX, az = aimZ, al = Math.hypot(ax, az) || 1;
  const nx = ax / al, nz = az / al;
  for (const t of G.thugs) {
    if (t.fallen) continue;
    const dx = t.x - ox, dz = t.z - oz, d = Math.hypot(dx, dz);
    if (d > bestD) continue;
    const dot = (dx * nx + dz * nz) / (d || 1);
    if (dot > 0.985) { best = { kind: 'thug', t, d }; bestD = d; }
  }
  for (const c of G.carsAll) {
    if (p.car === c) continue;
    const dx = c.x - ox, dz = c.z - oz, d = Math.hypot(dx, dz);
    if (d > bestD || d < 2) continue;
    const dot = (dx * nx + dz * nz) / (d || 1);
    if (dot > 0.97) { best = { kind: 'car', c, d }; bestD = d; }
  }
  if (best) {
    const hx = ox + nx * bestD, hz = oz + nz * bestD;
    addFx(G, 'spark', hx, 1.1, hz, 0.16);
    if (best.kind === 'thug') hurtThug(G, best.t, w.dmg);
    else {
      best.c.damage = Math.min(1, best.c.damage + 0.09);
      if (best.c.damage > 0.6) best.c.smoke = true;
      if (best.c.police) addHeat(G, 6);
    }
  }
}
function hurtThug(G, t, dmg) {
  t.hp -= dmg;
  if (t.hp <= 0 && !t.fallen) {
    t.fallen = true;
    G.cash += 40;
    G.stats.kills = (G.stats.kills || 0) + 1;
    if (G.rng.chance(0.3)) G.pickups.push({ x: t.x, z: t.z, kind: G.rng.int(3), bob: 0 });
  }
}

export function spawnThugs(G, x, z, n) {
  for (let i = 0; i < n; i++) {
    const a = G.rng.range(0, Math.PI * 2), d = G.rng.range(4, 12);
    G.thugs.push({
      x: x + Math.sin(a) * d, z: z + Math.cos(a) * d, h: 0, hp: 60, phase: 0,
      variant: G.personMeshes.length - 1, attackT: 0, fallen: false,
    });
  }
}
export function updateThugs(G, dt) {
  const p = G.player;
  const px = p.onFoot ? p.x : p.car.x, pz = p.onFoot ? p.z : p.car.z;
  for (const t of G.thugs) {
    if (t.fallen) continue;
    const dx = px - t.x, dz = pz - t.z, d = Math.hypot(dx, dz);
    if (d > 34) continue;
    t.h = Math.atan2(dx, dz);
    t.attackT -= dt;
    if (d > 1.8) {
      const sp = 4.2;
      const hit = collideCircle(G.world.colliders, t.x + Math.sin(t.h) * sp * dt, t.z + Math.cos(t.h) * sp * dt, 0.5);
      t.x = hit.x; t.z = hit.z;
      t.phase += sp * dt * 2.4;
    } else if (t.attackT <= 0) {
      t.attackT = 1.0;
      damagePlayer(G, 9);
      addFx(G, 'spark', px, 1.2, pz, 0.15);
    }
  }
}

export function damagePlayer(G, dmg) {
  const p = G.player;
  let rest = dmg;
  if (p.armor > 0) {
    const absorbed = Math.min(p.armor, rest * 0.6);
    p.armor -= absorbed; rest -= absorbed;
  }
  p.hp -= rest;
  G.hurtFlash = 0.5;
  if (p.hp <= 0 && G.screen === 'play') G.screen = 'wasted';
}

export function spawnPickups(G) {
  const spots = [[44, 30], [88, 8], [-88, 96], [0, -74], [-118, -30], [66, 108]];
  const kinds = [0, 1, 2, 0, 1, 2];
  for (let i = 0; i < spots.length; i++) G.pickups.push({ x: spots[i][0], z: spots[i][1], kind: kinds[i], bob: i });
}
export function updatePickups(G, dt) {
  const p = G.player;
  const px = p.onFoot ? p.x : p.car.x, pz = p.onFoot ? p.z : p.car.z;
  for (const pk of G.pickups) {
    pk.bob += dt * 2;
    if (pk.taken) continue;
    if (Math.hypot(pk.x - px, pk.z - pz) < 2.2) {
      pk.taken = true;
      if (pk.kind === 0) p.hp = Math.min(100, p.hp + 40);
      else if (pk.kind === 1) p.armor = Math.min(100, p.armor + 50);
      else G.weapons.reserve = Math.min(180, G.weapons.reserve + 36);
      addFx(G, 'ring', pk.x, 0.8, pk.z, 0.4);
      G.pickupNote = pk.kind === 0 ? '+HEALTH' : pk.kind === 1 ? '+ARMOR' : '+AMMO';
      G.pickupT = 1.6;
    }
  }
  G.pickups = G.pickups.filter((pk) => !pk.taken);
}
