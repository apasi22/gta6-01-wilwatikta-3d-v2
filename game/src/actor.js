// People: Sugeng on foot, sidewalk pedestrians, beachgoers. One small mesh per
// body part; legs swing from the hip. Colours are baked per variant.
import { Mesh, matModel, matMul, matTrans, matRotY, matRotX } from './gl.js';
import { CITY } from './config.js';
import { collideCircle } from './city.js';

export const VARIANTS = [
  { j: [0.16, 0.30, 0.42], p: [0.20, 0.22, 0.30], s: [0.85, 0.65, 0.50] },
  { j: [0.85, 0.30, 0.25], p: [0.25, 0.25, 0.30], s: [0.75, 0.55, 0.42] },
  { j: [0.95, 0.75, 0.25], p: [0.30, 0.35, 0.55], s: [0.90, 0.70, 0.55] },
  { j: [0.25, 0.65, 0.45], p: [0.85, 0.80, 0.70], s: [0.65, 0.48, 0.38] },
  { j: [0.90, 0.45, 0.65], p: [0.20, 0.55, 0.65], s: [0.88, 0.68, 0.52] },
  { j: [0.55, 0.35, 0.70], p: [0.15, 0.15, 0.18], s: [0.80, 0.60, 0.45] },
  { j: [0.30, 0.75, 0.85], p: [0.95, 0.60, 0.30], s: [0.70, 0.52, 0.40] },
  { j: [0.92, 0.92, 0.90], p: [0.40, 0.30, 0.55], s: [0.60, 0.44, 0.34] },
];
export const THUG_VARIANT = { j: [0.45, 0.10, 0.10], p: [0.12, 0.12, 0.14], s: [0.78, 0.58, 0.44] };

export function buildPersonMesh(v) {
  const body = new Mesh();
  body.box(0, 1.15, 0, 0.62, 0.7, 0.34, v.j, 0);
  body.box(0, 1.72, 0, 0.4, 0.4, 0.4, v.s, 0);
  body.box(0, 1.95, 0, 0.44, 0.12, 0.44, [0.15, 0.10, 0.08], 0);
  body.box(-0.42, 1.15, 0, 0.18, 0.6, 0.2, v.j, 0);
  body.box(0.42, 1.15, 0, 0.18, 0.6, 0.2, v.j, 0);
  const legL = new Mesh(); legL.box(0, -0.42, 0, 0.24, 0.84, 0.26, v.p, 0);
  const legR = new Mesh(); legR.box(0, -0.42, 0, 0.24, 0.84, 0.26, v.p, 0);
  return { body, legL, legR };
}
export function buildPersonMeshes(gl) {
  const out = VARIANTS.map((v) => {
    const ms = buildPersonMesh(v);
    ms.body.upload(gl); ms.legL.upload(gl); ms.legR.upload(gl);
    return ms;
  });
  const thug = buildPersonMesh(THUG_VARIANT);
  thug.body.upload(gl); thug.legL.upload(gl); thug.legR.upload(gl);
  out.push(thug);
  return out;
}

export function drawPerson(R, meshes, x, z, h, phase, fallen) {
  if (fallen) {
    R.draw(meshes.body, matMul(matModel(x, 0.35, z, h), matRotX(Math.PI / 2)), 1, 0);
    return;
  }
  R.draw(meshes.body, matModel(x, 0, z, h), 1, 0);
  const s = Math.sin(phase) * 0.55;
  const base = matMul(matTrans(x, 0.8, z), matRotY(h));
  R.draw(meshes.legL, matMul(matMul(base, matTrans(-0.16, 0, 0)), matRotX(s)), 1, 0);
  R.draw(meshes.legR, matMul(matMul(base, matTrans(0.16, 0, 0)), matRotX(-s)), 1, 0);
}

export function makePlayer(x, z) {
  return { x, z, h: 0, phase: 0, speed: 0, onFoot: true, car: null, hp: 100, armor: 0, variant: 0 };
}

export function updateOnFoot(G, dt, mx, mz, run) {
  const p = G.player;
  const len = Math.hypot(mx, mz);
  if (len > 0.01) {
    const want = Math.atan2(mx, mz);
    let dh = want - p.h;
    while (dh > Math.PI) dh -= 2 * Math.PI;
    while (dh < -Math.PI) dh += 2 * Math.PI;
    p.h += dh * Math.min(1, dt * 12);
    p.speed = run ? 8.5 : 5;
  } else p.speed = 0;
  const nx = p.x + Math.sin(p.h) * p.speed * dt, nz = p.z + Math.cos(p.h) * p.speed * dt;
  const hit = collideCircle(G.world.colliders, nx, nz, 0.5);
  p.x = hit.x; p.z = hit.z;
  p.phase += p.speed * dt * 2.4;
}

export function spawnPeds(world, rng, n) {
  const peds = [];
  for (let i = 0; i < n; i++) {
    const bx = rng.pick(CITY.BLOCKS), bz = rng.pick(CITY.BLOCKS);
    const path = [[bx - 13, bz - 13], [bx + 13, bz - 13], [bx + 13, bz + 13], [bx - 13, bz + 13]];
    const start = rng.int(4);
    peds.push({
      x: path[start][0], z: path[start][1], h: rng.range(0, 6.28), path,
      wp: (start + 1) % 4, speed: rng.range(1.4, 2.4), phase: rng.range(0, 6),
      variant: rng.int(VARIANTS.length), scatter: 0, beach: false,
    });
  }
  return peds;
}
export function spawnBeachgoers(world, rng, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const s = world.beachSpots[i % world.beachSpots.length];
    out.push({
      x: s[0] + rng.range(-1, 1), z: s[1] + rng.range(-1, 1), h: rng.range(0, 6.28),
      path: null, wp: 0, speed: 0, phase: rng.range(0, 6), variant: rng.int(VARIANTS.length),
      scatter: 0, beach: true,
    });
  }
  return out;
}

export function updatePeds(G, dt) {
  const p = G.player;
  const px = p.onFoot ? p.x : (p.car ? p.car.x : p.x), pz = p.onFoot ? p.z : (p.car ? p.car.z : p.z);
  const carSpeed = p.car ? Math.abs(p.car.speed) : 0;
  for (const ped of G.peds) {
    if (ped.beach) continue;
    const dx = ped.x - px, dz = ped.z - pz, d = Math.hypot(dx, dz);
    if (d < 7 && carSpeed > 8) ped.scatter = 2.5;
    if (G.shotTimer > 0 && d < 26) ped.scatter = 2.0;
    if (ped.scatter > 0) {
      ped.scatter -= dt;
      ped.h = Math.atan2(dx, dz);
      const sp = 5.5;
      const hit = collideCircle(G.world.colliders, ped.x + Math.sin(ped.h) * sp * dt, ped.z + Math.cos(ped.h) * sp * dt, 0.5);
      ped.x = hit.x; ped.z = hit.z;
      ped.phase += sp * dt * 2.4;
      continue;
    }
    const wp = ped.path[ped.wp];
    const wx = wp[0] - ped.x, wz = wp[1] - ped.z, wd = Math.hypot(wx, wz);
    if (wd < 1.5) { ped.wp = (ped.wp + 1) % ped.path.length; continue; }
    ped.h = Math.atan2(wx, wz);
    ped.x += Math.sin(ped.h) * ped.speed * dt;
    ped.z += Math.cos(ped.h) * ped.speed * dt;
    ped.phase += ped.speed * dt * 2.4;
  }
}
