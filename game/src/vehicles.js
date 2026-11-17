// Cars: sedan bodies extruded from a side profile (hood–cabin–trunk), dark
// glasshouse, rimmed wheels, emissive lights; driving physics, traffic loops,
// parked cars. Car-local space: +X is the nose, +Z is the left flank.
import { Mesh, matModel, matMul, matRotY } from './gl.js';
import { CARS, POLICE_CAR, CITY } from './config.js';
import { collideCircle } from './city.js';

const CAR_ROT = matRotY(-Math.PI / 2);
export function carModel(x, z, h) { return matMul(matModel(x, 0, z, h), CAR_ROT); }

function wheel(m, cx, cy, cz, r, w) {
  const sides = 8, z0 = cz - w / 2, z1 = cz + w / 2;
  for (let i = 0; i < sides; i++) {
    const a0 = (i / sides) * Math.PI * 2, a1 = ((i + 1) / sides) * Math.PI * 2;
    const x0 = cx + Math.cos(a0) * r, y0 = cy + Math.sin(a0) * r, x1 = cx + Math.cos(a1) * r, y1 = cy + Math.sin(a1) * r;
    const nx = Math.cos((a0 + a1) / 2), ny = Math.sin((a0 + a1) / 2);
    m.quad([x0, y0, z0], [x1, y1, z0], [x1, y1, z1], [x0, y0, z1], [nx, ny, 0], [0.07, 0.07, 0.08], 0);
    m.tri([cx, cy, z1], [x0, y0, z1], [x1, y1, z1], [0, 0, 1], [0.07, 0.07, 0.08], 0);
    m.tri([cx, cy, z0], [x1, y1, z0], [x0, y0, z0], [0, 0, -1], [0.07, 0.07, 0.08], 0);
  }
  m.box(cx, cy, z1 + 0.02, 0.3, 0.3, 0.06, [0.72, 0.72, 0.75], 0);
  m.box(cx, cy, z0 - 0.02, 0.3, 0.3, 0.06, [0.72, 0.72, 0.75], 0);
}

export function buildCarMesh(paint, opts) {
  const m = new Mesh();
  const body = [[-2.3, 0.3], [2.3, 0.3], [2.32, 0.72], [1.15, 0.95], [0.4, 1.32], [-0.6, 1.32], [-1.4, 0.92], [-2.32, 0.82]];
  m.profile(body, 1.9, paint, 0);
  const glass = [[-0.85, 0.92], [0.65, 0.92], [0.22, 1.3], [-0.5, 1.3]];
  m.profile(glass, 1.7, [0.08, 0.12, 0.18], 0.25);
  m.box(2.28, 0.45, 0, 0.18, 0.3, 1.8, [0.15, 0.15, 0.17], 0);
  m.box(-2.28, 0.45, 0, 0.18, 0.3, 1.8, [0.15, 0.15, 0.17], 0);
  m.box(2.32, 0.62, 0.55, 0.08, 0.18, 0.42, [1.0, 0.95, 0.75], 0.9);
  m.box(2.32, 0.62, -0.55, 0.08, 0.18, 0.42, [1.0, 0.95, 0.75], 0.9);
  m.box(-2.32, 0.68, 0.55, 0.08, 0.16, 0.45, [1.0, 0.12, 0.10], 1.0);
  m.box(-2.32, 0.68, -0.55, 0.08, 0.16, 0.45, [1.0, 0.12, 0.10], 1.0);
  m.box(0.55, 1.05, 0.98, 0.22, 0.14, 0.12, paint, 0);
  m.box(0.55, 1.05, -0.98, 0.22, 0.14, 0.12, paint, 0);
  if (opts.coupe) {
    m.box(-2.02, 1.04, 0, 0.5, 0.08, 1.6, paint, 0);
    m.box(-2.02, 0.94, 0.6, 0.16, 0.14, 0.12, [0.1, 0.1, 0.1], 0);
    m.box(-2.02, 0.94, -0.6, 0.16, 0.14, 0.12, [0.1, 0.1, 0.1], 0);
  }
  if (opts.police) {
    m.box(0.1, 0.62, 0.96, 1.6, 0.4, 0.04, [0.1, 0.12, 0.2], 0);
    m.box(0.1, 0.62, -0.96, 1.6, 0.4, 0.04, [0.1, 0.12, 0.2], 0);
    m.box(-0.1, 1.42, 0, 0.5, 0.12, 1.1, [0.12, 0.12, 0.14], 0);
  }
  for (const [wx, wz] of [[1.45, 0.82], [1.45, -0.82], [-1.45, 0.82], [-1.45, -0.82]]) wheel(m, wx, 0.36, wz, 0.36, 0.3);
  let barRed = null, barBlue = null;
  if (opts.police) {
    barRed = new Mesh(); barRed.box(-0.1, 1.56, 0.34, 0.42, 0.24, 0.6, [1.0, 0.1, 0.1], 1.0);
    barBlue = new Mesh(); barBlue.box(-0.1, 1.56, -0.34, 0.42, 0.24, 0.6, [0.15, 0.3, 1.0], 1.0);
  }
  return { mesh: m, barRed, barBlue };
}

export function buildCarMeshes(gl) {
  const out = CARS.map((c) => {
    const built = buildCarMesh(c.paint, { coupe: c.coupe });
    built.mesh.upload(gl);
    return built;
  });
  const police = buildCarMesh(POLICE_CAR.paint, { police: true });
  police.mesh.upload(gl);
  if (police.barRed) police.barRed.upload(gl);
  if (police.barBlue) police.barBlue.upload(gl);
  out.push(police);
  return out;
}

export function makeCar(mi, x, z, h, police) {
  const spec = police ? POLICE_CAR : CARS[mi];
  return { mi, police: !!police, spec, x, z, h, speed: 0, steer: 0, damage: 0, smoke: false, traffic: false, parked: false, loop: null, wp: 0, dir: 1, cruise: 10 };
}

export function driveCar(c, throt, steerIn, brake, dt, world) {
  const s = c.spec;
  c.steer += (steerIn * 0.55 - c.steer) * Math.min(1, dt * 8);
  if (throt > 0) c.speed += s.accel * throt * dt;
  else if (throt < 0) c.speed += s.accel * throt * dt * 0.7;
  if (brake) c.speed -= Math.sign(c.speed) * Math.min(Math.abs(c.speed), 24 * dt);
  c.speed -= c.speed * 0.55 * dt;
  const top = s.top * (c.topMul || 1) * (1 - c.damage * 0.4);
  c.speed = Math.max(-10, Math.min(top, c.speed));
  const turn = c.steer * (c.speed >= 0 ? 1 : -1) * Math.min(1, Math.abs(c.speed) / 8) * s.grip;
  c.h += turn * dt * (brake ? 1.5 : 1);
  const nx = c.x + Math.sin(c.h) * c.speed * dt, nz = c.z + Math.cos(c.h) * c.speed * dt;
  const hit = collideCircle(world.colliders, nx, nz, 1.5);
  if (hit.hit) { c.speed *= 0.35; c.damage = Math.min(1, c.damage + 0.04); if (c.damage > 0.6) c.smoke = true; }
  c.x = hit.x; c.z = hit.z;
}

export function carCarCollide(cars) {
  for (let i = 0; i < cars.length; i++) for (let j = i + 1; j < cars.length; j++) {
    const a = cars[i], b = cars[j];
    const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
    if (d < 3.4 && d > 0.01) {
      const push = (3.4 - d) / 2, nx = dx / d, nz = dz / d;
      const aMove = a.parked ? 0 : 1, bMove = b.parked ? 0 : 1, tot = aMove + bMove || 1;
      a.x -= nx * push * 2 * (aMove / tot); a.z -= nz * push * 2 * (aMove / tot);
      b.x += nx * push * 2 * (bMove / tot); b.z += nz * push * 2 * (bMove / tot);
      if (Math.abs(a.speed) > 6 || Math.abs(b.speed) > 6) { a.damage = Math.min(1, a.damage + 0.03); b.damage = Math.min(1, b.damage + 0.03); }
      a.speed *= 0.7; b.speed *= 0.7;
    }
  }
}

export function spawnTraffic(world, rng, n) {
  const cars = [];
  for (let i = 0; i < n; i++) {
    const loop = rng.pick(world.loops);
    const seg = rng.int(loop.pts.length), t = rng.next();
    const a = loop.pts[seg], b = loop.pts[(seg + 1) % loop.pts.length];
    const x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
    const c = makeCar(rng.int(CARS.length), x, z, Math.atan2(b[0] - a[0], b[1] - a[1]));
    c.loop = loop; c.wp = (seg + 1) % loop.pts.length;
    c.dir = loop.loop ? 1 : (rng.chance(0.5) ? 1 : -1);
    c.cruise = rng.range(8, 13); c.traffic = true; c.speed = c.cruise;
    cars.push(c);
  }
  return cars;
}

export function updateTraffic(G, dt) {
  for (const c of G.traffic) {
    const wp = c.loop.pts[c.wp];
    const dx = wp[0] - c.x, dz = wp[1] - c.z, dist = Math.hypot(dx, dz);
    if (dist < 7) {
      c.wp += c.dir;
      if (c.wp >= c.loop.pts.length) { if (c.loop.loop) c.wp = 0; else { c.wp = c.loop.pts.length - 2; c.dir = -1; } }
      if (c.wp < 0) { c.wp = 1; c.dir = 1; }
      continue;
    }
    const want = Math.atan2(dx, dz);
    let dh = want - c.h;
    while (dh > Math.PI) dh -= 2 * Math.PI;
    while (dh < -Math.PI) dh += 2 * Math.PI;
    const steer = Math.max(-1, Math.min(1, dh * 2.2));
    let blocked = false;
    for (const o of G.carsAll) {
      if (o === c) continue;
      const ox = o.x - c.x, oz = o.z - c.z;
      const fwd = ox * Math.sin(c.h) + oz * Math.cos(c.h), side = Math.abs(ox * Math.cos(c.h) - oz * Math.sin(c.h));
      if (fwd > 0 && fwd < 9 && side < 2.6) { blocked = true; break; }
    }
    driveCar(c, blocked ? -0.5 : (c.speed < c.cruise ? 0.7 : 0), steer, false, dt, G.world);
  }
}

export function spawnParked(world, rng, n) {
  const cars = [];
  let tries = 0;
  while (cars.length < n && tries++ < 300) {
    const road = rng.pick(CITY.ROADS), horiz = rng.chance(0.5);
    const along = rng.range(-140, 140), side = rng.chance(0.5) ? 1 : -1, off = 5.2 * side;
    if (CITY.ROADS.some((r) => Math.abs(along - r) < 9)) continue;
    const x = horiz ? along : road + off, z = horiz ? road + off : along;
    const h = horiz ? (side > 0 ? Math.PI / 2 : -Math.PI / 2) : (side > 0 ? Math.PI : 0);
    const c = makeCar(rng.int(CARS.length), x, z, h);
    c.parked = true;
    cars.push(c);
  }
  return cars;
}
