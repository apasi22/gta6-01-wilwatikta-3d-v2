// Wilwatikta: a seeded 3D coastal city. One merged static mesh (buildings with
// dense small-window grids on all four faces, storefronts, roof props, palms,
// lamps, beach, sea, mountains, skyline) plus a translucent shadow mesh.
import { CITY, DISTRICTS, DISTRICT_GRID } from './config.js';
import { Mesh } from './gl.js';
import { RNG } from './random.js';

const WIN_BLUE = [0.42, 0.60, 0.74], WIN_WARM = [1.0, 0.74, 0.42], WIN_DARK = [0.15, 0.17, 0.23], WIN_CURT = [1.0, 0.58, 0.34];
function winPick(rng) {
  const r = rng.next();
  if (r < 0.50) return [WIN_BLUE, 0.22];
  if (r < 0.82) return [WIN_WARM, 1.0];
  if (r < 0.91) return [WIN_CURT, 0.9];
  return [WIN_DARK, 0.05];
}
function shade(c, f) { return [c[0] * f, c[1] * f, c[2] * f]; }

export function collideCircle(colliders, x, z, r) {
  let hit = false;
  for (const b of colliders) {
    if (x > b.x0 - r && x < b.x1 + r && z > b.z0 - r && z < b.z1 + r) {
      const dxl = x - (b.x0 - r), dxr = (b.x1 + r) - x, dzl = z - (b.z0 - r), dzr = (b.z1 + r) - z;
      const m = Math.min(dxl, dxr, dzl, dzr);
      if (m === dxl) x = b.x0 - r; else if (m === dxr) x = b.x1 + r; else if (m === dzl) z = b.z0 - r; else z = b.z1 + r;
      hit = true;
    }
  }
  return { x, z, hit };
}

function palm(m, sh, x, y, z, h, rng) {
  m.prism(x, y, z, 0.32, h, 7, [0.45, 0.32, 0.20], 0);
  const greens = [[0.14, 0.48, 0.20], [0.20, 0.60, 0.26], [0.12, 0.42, 0.18]];
  for (let ring = 0; ring < 2; ring++) {
    const n = ring ? 4 : 7, yy = y + h + ring * 0.5;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ring * 0.4 + rng.range(-0.15, 0.15);
      m.frond(x, yy, z, a, rng.range(3.0, 4.2), 0.55, rng.range(1.0, 2.0), rng.pick(greens), 0);
    }
  }
  m.box(x + 0.3, y + h - 0.2, z + 0.2, 0.35, 0.35, 0.35, [0.35, 0.22, 0.12], 0);
  m.box(x - 0.3, y + h - 0.2, z - 0.15, 0.35, 0.35, 0.35, [0.35, 0.22, 0.12], 0);
  sh.disc(x + 2.5, 0.07, z + 1.0, 1.4, [0, 0, 0], 0, 10);
}

function windows(m, rng, x0, x1, z0, z1, h, storefront) {
  const yStart = storefront ? 4.4 : 2.4;
  const faces = [
    { fixed: z1 + 0.07, n: [0, 0, 1], horiz: [x0, x1], along: 0 },
    { fixed: z0 - 0.07, n: [0, 0, -1], horiz: [x0, x1], along: 0 },
    { fixed: x1 + 0.07, n: [1, 0, 0], horiz: [z0, z1], along: 1 },
    { fixed: x0 - 0.07, n: [-1, 0, 0], horiz: [z0, z1], along: 1 },
  ];
  for (const f of faces) {
    for (let u = f.horiz[0] + 1.7; u < f.horiz[1] - 1.4; u += 2.55) {
      for (let y = yStart; y < h - 1.2; y += 2.75) {
        const [col, glow] = winPick(rng);
        const w = 1.3, hh = 1.6;
        if (f.along === 0) m.quad([u, y, f.fixed], [u + w, y, f.fixed], [u + w, y + hh, f.fixed], [u, y + hh, f.fixed], f.n, col, glow);
        else m.quad([f.fixed, y, u], [f.fixed, y, u + w], [f.fixed, y + hh, u + w], [f.fixed, y + hh, u], f.n, col, glow);
      }
    }
  }
}

function building(m, sh, rng, bx, bz, w, d, h, D, colliders, garage) {
  const x0 = bx - w / 2, x1 = bx + w / 2, z0 = bz - d / 2, z1 = bz + d / 2;
  const facade = garage ? [0.78, 0.58, 0.36] : rng.pick(D.facades);
  const base = 0.12;
  m.box(bx, base + h / 2, bz, w, h, d, facade, 0, shade(facade, 0.62));
  m.box(bx, base + h * 0.36, bz, w + 0.3, 0.3, d + 0.3, shade(facade, 0.8), 0);
  m.box(bx, base + h * 0.68, bz, w + 0.3, 0.3, d + 0.3, shade(facade, 0.8), 0);
  m.box(bx, base + h + 0.2, bz, w + 0.7, 0.45, d + 0.7, shade(facade, 0.55), 0);
  const storefront = garage || rng.next() < D.shops;
  if (storefront) {
    m.box(bx, base + 1.7, bz, w + 0.25, 3.4, d + 0.25, shade(facade, 0.45), 0);
    const glassC = rng.chance(0.5) ? [0.55, 0.75, 0.85] : [1.0, 0.8, 0.5];
    m.quad([x0 + 1, base + 0.6, z1 + 0.16], [x1 - 1, base + 0.6, z1 + 0.16], [x1 - 1, base + 2.8, z1 + 0.16], [x0 + 1, base + 2.8, z1 + 0.16], [0, 0, 1], glassC, 0.7);
    m.quad([x1 - 1, base + 0.6, z0 - 0.16], [x0 + 1, base + 0.6, z0 - 0.16], [x0 + 1, base + 2.8, z0 - 0.16], [x1 - 1, base + 2.8, z0 - 0.16], [0, 0, -1], glassC, 0.7);
    const signs = [[1.0, 0.25, 0.45], [0.2, 0.9, 0.8], [1.0, 0.8, 0.2], [0.6, 0.4, 1.0], [1.0, 0.5, 0.15]];
    for (let s = 0; s < 2; s++) {
      const sx = bx + (s ? w * 0.24 : -w * 0.24);
      m.box(sx, base + 3.9, z1 + 0.3, 3.0, 0.9, 0.35, rng.pick(signs), 1.0);
    }
    m.quad([x0 + 0.5, base + 3.5, z1 + 0.2], [x1 - 0.5, base + 3.5, z1 + 0.2], [x1 - 0.5, base + 2.9, z1 + 1.6], [x0 + 0.5, base + 2.9, z1 + 1.6], [0, 0.7, 0.7], [0.8, 0.2, 0.2], 0);
  }
  windows(m, rng, x0, x1, z0, z1, h, storefront);
  // Roof props: AC boxes, vents, water towers, antennas, fire escapes.
  const nAC = 1 + rng.int(3);
  for (let i = 0; i < nAC; i++)
    m.box(bx + rng.range(-w / 2 + 2, w / 2 - 2), base + h + 0.5, bz + rng.range(-d / 2 + 2, d / 2 - 2), 1.6, 0.9, 1.6, [0.6, 0.62, 0.64], 0);
  m.prism(bx + w / 4, base + h + 0.4, bz - d / 4, 0.4, 1.2, 6, [0.5, 0.5, 0.52], 0);
  if (rng.chance(0.25)) {
    const tx = bx - w / 4, tz = bz + d / 4;
    for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) m.box(tx + lx, base + h + 1.5, tz + lz, 0.25, 3, 0.25, [0.3, 0.3, 0.32], 0);
    m.prism(tx, base + h + 3, tz, 1.7, 2.2, 8, [0.55, 0.42, 0.32], 0);
    m.cone(tx, base + h + 5.2, tz, 1.9, 1.1, 8, [0.4, 0.3, 0.24], 0);
  }
  if (rng.chance(0.3)) {
    m.box(bx + w / 3, base + h + 2.5, bz, 0.18, 5, 0.18, [0.25, 0.25, 0.28], 0);
    m.box(bx + w / 3, base + h + 5.1, bz, 0.4, 0.4, 0.4, [1.0, 0.2, 0.2], 1.0);
  }
  if (h > 14 && rng.chance(0.35)) {
    for (let f = 0; f < 3; f++) {
      const fy = base + 4 + f * (h / 3.2);
      m.box(x1 + 0.5, fy, bz, 1.0, 0.18, 4.5, [0.22, 0.22, 0.24], 0);
      m.quad([x1 + 0.9, fy, bz - 2], [x1 + 0.9, fy + h / 3.2, bz + 2], [x1 + 0.9, fy + h / 3.2 + 0.8, bz + 2], [x1 + 0.9, fy + 0.8, bz - 2], [1, 0, 0], [0.2, 0.2, 0.22], 0);
    }
  }
  if (garage) {
    m.box(x1 + 0.4, base + 2.2, bz, 0.8, 4.4, 8, [0.12, 0.11, 0.13], 0);
    m.box(bx, base + h + 1.0, z1 + 0.4, 10, 1.4, 0.4, [1.0, 0.55, 0.1], 1.0);
  }
  // Long fake shadow toward the east.
  const L = h * 1.5;
  sh.quad([x1, 0.08, z0], [x1 + L, 0.08, z0 + L * 0.22], [x1 + L, 0.08, z1 + L * 0.22], [x1, 0.08, z1], [0, 1, 0], [0, 0, 0], 0);
  colliders.push({ x0: x0 - 0.3, z0: z0 - 0.3, x1: x1 + 0.3, z1: z1 + 0.3 });
}

export function buildCity(seed) {
  const rng = RNG(seed);
  const m = new Mesh(), sh = new Mesh();
  const colliders = [];
  // Ground, sand, sea.
  m.quad([-160, 0, -160], [160, 0, -160], [160, 0, 160], [-160, 0, 160], [0, 1, 0], [0.44, 0.42, 0.38], 0);
  m.quad([CITY.SAND_X0, 0.05, -160], [CITY.SAND_X1, 0.05, -160], [CITY.SAND_X1, 0.05, 160], [CITY.SAND_X0, 0.05, 160], [0, 1, 0], [0.88, 0.76, 0.55], 0);
  m.quad([-340, -0.25, -260], [CITY.SEA_X, -0.25, -260], [CITY.SEA_X, -0.25, 260], [-340, -0.25, 260], [0, 1, 0], [0.15, 0.45, 0.65], 0.35);
  for (let i = 0; i < 6; i++) {
    const z = -130 + i * 52 + rng.range(-8, 8);
    m.quad([-300, -0.18, z], [CITY.SEA_X, -0.18, z], [CITY.SEA_X, -0.18, z + 3.5], [-300, -0.18, z + 3.5], [0, 1, 0], [1.0, 0.7, 0.4], 0.8);
  }
  // Roads: horizontal strips own the intersections; vertical strips run between them.
  const ASPH = [0.16, 0.15, 0.17];
  for (const r of CITY.ROADS)
    m.quad([-154, 0.02, r - 6.5], [154, 0.02, r - 6.5], [154, 0.02, r + 6.5], [-154, 0.02, r + 6.5], [0, 1, 0], ASPH, 0);
  for (const r of CITY.ROADS) {
    const bounds = [-160, ...CITY.ROADS.map((q) => q - 6.5), ...CITY.ROADS.map((q) => q + 6.5), 160].sort((a, b) => a - b);
    for (let i = 0; i < bounds.length; i += 2) {
      const z0 = bounds[i], z1 = bounds[i + 1];
      if (z1 - z0 < 1) continue;
      m.quad([r - 6.5, 0.03, z0], [r + 6.5, 0.03, z0], [r + 6.5, 0.03, z1], [r - 6.5, 0.03, z1], [0, 1, 0], ASPH, 0);
    }
  }
  // Centre dashes, crosswalks, cracks, puddles.
  for (const r of CITY.ROADS) {
    for (let u = -148; u < 148; u += 7) {
      if (CITY.ROADS.some((q) => Math.abs(u - q) < 8)) continue;
      m.quad([u, 0.06, r - 0.35], [u + 3, 0.06, r - 0.35], [u + 3, 0.06, r + 0.35], [u, 0.06, r + 0.35], [0, 1, 0], [0.95, 0.8, 0.35], 0);
      m.quad([r - 0.35, 0.06, u], [r + 0.35, 0.06, u], [r + 0.35, 0.06, u + 3], [r - 0.35, 0.06, u + 3], [0, 1, 0], [0.95, 0.8, 0.35], 0);
    }
    for (const q of CITY.ROADS) {
      for (let s = -4.2; s <= 4.2; s += 2.4) {
        m.quad([q + s - 0.7, 0.06, r - 6.0], [q + s + 0.7, 0.06, r - 6.0], [q + s + 0.7, 0.06, r - 3.8], [q + s - 0.7, 0.06, r - 3.8], [0, 1, 0], [0.85, 0.85, 0.83], 0);
        m.quad([r - 6.0, 0.06, q + s - 0.7], [r - 3.8, 0.06, q + s - 0.7], [r - 3.8, 0.06, q + s + 0.7], [r - 6.0, 0.06, q + s + 0.7], [0, 1, 0], [0.85, 0.85, 0.83], 0);
      }
    }
  }
  for (let i = 0; i < 46; i++) {
    const r = rng.pick(CITY.ROADS), u = rng.range(-145, 145), w = rng.range(1.6, 3.4);
    if (rng.chance(0.5)) m.quad([u, 0.05, r - w / 2], [u + w * 1.6, 0.05, r - w / 2], [u + w * 1.6, 0.05, r + w / 2], [u, 0.05, r + w / 2], [0, 1, 0], [0.95, 0.6, 0.4], 0.55);
    else m.quad([r - w / 2, 0.05, u], [r + w / 2, 0.05, u], [r + w / 2, 0.05, u + w * 1.6], [r - w / 2, 0.05, u + w * 1.6], [0, 1, 0], [0.95, 0.6, 0.4], 0.55);
  }
  for (let i = 0; i < 26; i++) {
    const r = rng.pick(CITY.ROADS), u = rng.range(-145, 145), a = rng.range(0, Math.PI);
    const dx = Math.cos(a) * 2.4, dz = Math.sin(a) * 2.4;
    m.quad([u, 0.05, r], [u + dx, 0.05, r + dz], [u + dx + 0.3, 0.05, r + dz + 0.3], [u + 0.3, 0.05, r + 0.3], [0, 1, 0], [0.08, 0.08, 0.09], 0);
  }
  // Sidewalks + buildings, block by block.
  for (let gz = 0; gz < 6; gz++) for (let gx = 0; gx < 6; gx++) {
    const bx = CITY.BLOCKS[gx], bz = CITY.BLOCKS[gz];
    const D = DISTRICTS[DISTRICT_GRID[gz][gx]];
    m.quad([bx - 15.5, 0.12, bz - 15.5], [bx + 15.5, 0.12, bz - 15.5], [bx + 15.5, 0.12, bz + 15.5], [bx - 15.5, 0.12, bz + 15.5], [0, 1, 0], [0.62, 0.58, 0.52], 0);
    const isGarage = gx === 3 && gz === 3;
    if (isGarage) { building(m, sh, rng, bx, bz, 26, 18, 9, D, colliders, true); continue; }
    const hBoost = 1 + 0.35 * (1 - (Math.abs(bx) + Math.abs(bz)) / 220);
    if (rng.chance(0.4)) {
      const w = rng.range(19, 25), d = rng.range(19, 25), h = rng.range(D.hMin, D.hMax) * hBoost;
      building(m, sh, rng, bx, bz, w, d, h, D, colliders, false);
    } else {
      const alongX = rng.chance(0.5);
      for (const s of [-1, 1]) {
        const w = alongX ? rng.range(10, 13) : rng.range(19, 25), d = alongX ? rng.range(19, 25) : rng.range(10, 13);
        const h = rng.range(D.hMin, D.hMax) * hBoost;
        building(m, sh, rng, bx + (alongX ? s * 7.6 : 0), bz + (alongX ? 0 : s * 7.6), w, d, h, D, colliders, false);
      }
    }
    // Sidewalk shrubs + block palms.
    const nShrub = 2 + rng.int(3);
    for (let i = 0; i < nShrub; i++)
      m.cone(bx + rng.range(-14, 14), 0.12, bz + rng.range(-14, 14), rng.range(0.7, 1.1), rng.range(0.9, 1.5), 6, [0.2, 0.45, 0.22], 0);
    if (rng.next() < D.palms) palm(m, sh, bx + rng.range(-13, 13), 0.12, bz + rng.range(-13, 13), rng.range(5.5, 8), rng);
  }
  // Palm-lined beachfront avenue.
  for (let z = -143; z <= 143; z += 18) {
    palm(m, sh, -140, 0.05, z + rng.range(-2, 2), rng.range(6, 8.5), rng);
    palm(m, sh, -124, 0.12, z + 9 + rng.range(-2, 2), rng.range(6, 8.5), rng);
  }
  for (let i = 0; i < 12; i++) palm(m, sh, rng.range(-156, -144), 0.05, rng.range(-145, 145), rng.range(5, 7.5), rng);
  // Street lamps with light pools.
  for (const r of CITY.ROADS) {
    for (let u = -140; u <= 140; u += 30) {
      const side = (Math.round(u / 30) % 2 ? 1 : -1) * 8;
      const lx = r + side, lz = u;
      m.prism(lx, 0.05, lz, 0.16, 5.2, 6, [0.2, 0.2, 0.22], 0);
      m.box(lx, 5.2, lz, 0.7, 0.25, 0.4, [1.0, 0.85, 0.55], 1.2);
      m.disc(lx, 0.06, lz, 1.6, [1.0, 0.8, 0.5], 0.45, 10);
    }
  }
  // Beach umbrellas + towels.
  const beachSpots = [];
  const umbCols = [[1.0, 0.3, 0.3], [1.0, 0.8, 0.2], [0.2, 0.7, 0.9], [1.0, 0.5, 0.8], [0.3, 0.85, 0.4]];
  for (let i = 0; i < 11; i++) {
    const ux = rng.range(-157, -145), uz = rng.range(-140, 140), c = rng.pick(umbCols);
    m.prism(ux, 0.05, uz, 0.09, 2.3, 5, [0.8, 0.8, 0.8], 0);
    m.cone(ux, 2.3, uz, 2.3, 0.9, 8, c, 0);
    m.quad([ux + 2, 0.07, uz - 1], [ux + 4, 0.07, uz - 1], [ux + 4, 0.07, uz + 1], [ux + 2, 0.07, uz + 1], [0, 1, 0], c, 0);
    beachSpots.push([ux + 3, uz + 2.5], [ux - 2, uz - 2]);
  }
  // Boats + dock cranes.
  for (let i = 0; i < 4; i++) {
    const bx = -178 - i * 14, bz = 55 + i * 26;
    m.box(bx, 0.4, bz, 7, 1.4, 2.8, [0.75, 0.3, 0.2], 0);
    m.box(bx - 1, 1.5, bz, 2.4, 1.4, 2.0, [0.9, 0.88, 0.8], 0);
    m.box(bx + 2, 2.2, bz, 0.2, 3.5, 0.2, [0.4, 0.35, 0.3], 0);
  }
  for (const [cx, cz] of [[-100, 100], [-100, 128]]) {
    m.box(cx, 13, cz, 1.6, 26, 1.6, [0.9, 0.6, 0.15], 0);
    m.box(cx + 5, 25.5, cz, 16, 1.1, 1.1, [0.9, 0.6, 0.15], 0);
    m.box(cx - 4, 25.5, cz, 5, 1.1, 1.1, [0.8, 0.5, 0.12], 0);
    m.box(cx + 11, 22, cz, 0.15, 7, 0.15, [0.2, 0.2, 0.2], 0);
    m.box(cx + 11, 18.2, cz, 1.4, 1.4, 1.4, [0.3, 0.3, 0.32], 0);
    colliders.push({ x0: cx - 1, z0: cz - 1, x1: cx + 1, z1: cz + 1 });
  }
  // Distant mountains (skip the sea quadrant) + fog-faded skyline ring.
  for (let i = 0; i < 15; i++) {
    const a = (-65 + i * 19) * Math.PI / 180;
    if (Math.cos(a) < -0.15) continue;
    const r = rng.range(300, 345), h = rng.range(35, 70);
    m.cone(Math.cos(a) * r, -2, Math.sin(a) * r, rng.range(35, 55), h, 7, [0.55 + rng.range(-0.05, 0.05), 0.47, 0.58], 0.05);
  }
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + 0.2;
    if (Math.cos(a) < -0.3) continue;
    const r = rng.range(200, 238), h = rng.range(25, 62), w = rng.range(12, 20);
    m.box(Math.cos(a) * r, h / 2 - 2, Math.sin(a) * r, w, h, w, [0.55, 0.48, 0.48], 0);
  }
  const loops = [
    { pts: [[-132, -132], [132, -132], [132, 132], [-132, 132]], loop: true },
    { pts: [[-88, -88], [88, -88], [88, 88], [-88, 88]], loop: true },
    { pts: [[-44, -44], [44, -44], [44, 44], [-44, 44]], loop: true },
    { pts: [[-132, -132], [-132, 132]], loop: false },
    { pts: [[0, -132], [0, 132]], loop: false },
    { pts: [[-132, 0], [132, 0]], loop: false },
  ];
  return { mesh: m, shadowMesh: sh, colliders, loops, beachSpots, garagePos: [34, 34] };
}
