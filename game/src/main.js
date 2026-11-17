// WILWATIKTA 3D — boot, fixed-step loop, chase camera, drawing, screens,
// garage upgrades, and the title backdrop. All systems meet here.
import { Renderer, Mesh, matPerspective, matLookAt, matMul, matTrans, matRotY, matRotX, matModel, lerpPal, IDENTITY } from './gl.js';
import { RNG } from './random.js';
import { PALETTES, WEAPONS, DISPATCH, RADIO } from './config.js';
import { buildCity } from './city.js';
import { buildCarMeshes, buildCarMesh, makeCar, driveCar, carCarCollide, spawnTraffic, updateTraffic, spawnParked, carModel } from './vehicles.js';
import { buildPersonMeshes, drawPerson, makePlayer, updateOnFoot, spawnPeds, spawnBeachgoers, updatePeds } from './actor.js';
import { buildHeliMeshes, buildConeMesh, buildBlockerMesh, setWanted, addHeat, updatePolice, clearRoadblocks } from './police.js';
import { buildPickupMeshes, buildFlashMesh, addFx, updateFx, switchWeapon, reloadWeapon, fireWeapon, updateThugs, spawnPickups, updatePickups } from './combat.js';
import { buildBeaconMeshes, getTarget, startMission, nextMission, updateMission } from './missions.js';
import { initHud, updateHud } from './hud.js';
import { makeAudio } from './audio.js';
import { saveGame, loadGame, refreshSlotButtons } from './save.js';
import { makeInput } from './input.js';
import { setupShot } from './shots.js';

function paletteAt(hour) {
  const { day, dusk, night } = PALETTES;
  if (hour < 6) return night;
  if (hour < 7.5) return lerpPal(night, day, (hour - 6) / 1.5);
  if (hour < 17) return day;
  if (hour < 19) return lerpPal(day, dusk, (hour - 17) / 2);
  if (hour < 20.5) return lerpPal(dusk, night, (hour - 19) / 1.5);
  return night;
}
function discMesh(r, col, glow) { const m = new Mesh(); m.disc(0, 0, 0, r, col, glow, 16); return m; }
function buildShafts() {
  const m = new Mesh();
  const C = [1.0, 0.75, 0.45];
  for (let i = 0; i < 4; i++) {
    const z = -20 + i * 32, x = -134;
    m.quad([x, 0.2, z], [x + 14, 0.2, z], [x + 4, 17, z], [x - 10, 17, z], [0, 0, 1], C, 0.5);
  }
  return m;
}

function resetWorld(G) {
  G.rng = RNG(G.seed);
  G.world.colliders.length = G.world.baseColliders;
  G.traffic = spawnTraffic(G.world, G.rng, 26);
  G.parked = spawnParked(G.world, G.rng, 30);
  G.peds = [...spawnPeds(G.world, G.rng, 34), ...spawnBeachgoers(G.world, G.rng, 14)];
  G.thugs = []; G.policeCars = []; G.roadblocks = []; G.pickups = []; G.fx = [];
  G.player = makePlayer(38, 52);
  const car = makeCar(0, 44, 52, 0); car.topMul = 1;
  G.player.car = car; G.player.onFoot = false; G.player.h = 0;
  G.carsAll = [car, ...G.traffic, ...G.parked];
  G.cash = 1250; G.rep = 0; G.clock = 10.5; G.day = 1; G.station = 0; G.track = 0;
  G.weapons = { wi: 1, mag: 12, reserve: 60, fireT: 0, reloadT: 0 };
  G.unlocked = [true, true, false]; G.upgrades = { engine: 0, paint: 0 }; G.stats = {};
  G.storyDone = false; G.wanted = { stars: 0, heat: 0 };
  G.heli = { active: false, x: 0, y: 26, z: 0, h: 0, spin: 0, ang: 0 };
  G.dialogue = null; G.dispatch = DISPATCH[0]; G.dispatchT = 8; G.shotTimer = 0; G.hurtFlash = 0;
  G.pickupT = 0; G.pickupNote = ''; G.missionLock = false; G.forceHeli = false;
  G.blockTimer = 10; G.bustedTimer = 0; G.routeT = 0; G.smokeT = 0; G.missionTarget = null;
  G.mapOpen = false; G.camFixed = null; G.shotFrozen = false; G.shotInput = null;
  spawnPickups(G);
  startMission(G, 0);
  G.cam = { px: 44, py: 4, pz: 40, tx: 44, ty: 1, tz: 52, fov: 62 }; G.camH = 0;
  updateCamera(G, 1);
}

function respawn(G) {
  G.cash = Math.floor(G.cash * 0.88);
  const p = G.player;
  p.hp = 100; p.armor = 0; p.onFoot = true; p.car = null;
  p.x = G.world.garagePos[0]; p.z = G.world.garagePos[1] + 6; p.h = 0;
  setWanted(G, 0); clearRoadblocks(G); G.policeCars = []; G.thugs = [];
  G.parked = G.parked.filter((c) => !c.missionCar);
  G.heli.active = false; G.forceHeli = false; G.missionLock = false; G.bustedTimer = 0;
  startMission(G, G.mission.idx);
  updateCamera(G, 1);
  G.screen = 'play';
}

function tryEnterCar(G) {
  const p = G.player;
  let best = null, bestD = 3.6;
  for (const c of G.carsAll) {
    const d = Math.hypot(c.x - p.x, c.z - p.z);
    if (d < bestD) { best = c; bestD = d; }
  }
  if (!best) return;
  if (best.traffic) { G.traffic = G.traffic.filter((c) => c !== best); best.traffic = false; }
  if (best.parked) { best.parked = false; G.stats.stolen = (G.stats.stolen || 0) + 1; addHeat(G, 8); }
  if (best.police) addHeat(G, 12);
  p.car = best; p.onFoot = false; p.h = best.h;
}
function exitCar(G) {
  const p = G.player, car = p.car;
  if (!car) return;
  p.x = car.x + Math.cos(car.h) * 2.4; p.z = car.z - Math.sin(car.h) * 2.4;
  p.h = car.h; p.onFoot = true; p.car = null;
  car.speed = 0;
}

function updateCamera(G, dt) {
  const cam = G.cam, p = G.player;
  let ix, iy, iz, tx, ty, tz, fov = 62;
  if (G.screen === 'title') {
    const a = G.time * 0.05;
    ix = Math.sin(a) * 70; iy = 30; iz = Math.cos(a) * 70; tx = 0; ty = 2; tz = 0; fov = 58;
  } else if (G.camFixed) {
    [ix, iy, iz] = G.camFixed.eye; [tx, ty, tz] = G.camFixed.target; fov = G.camFixed.fov;
  } else if (!p.onFoot && p.car) {
    const c = p.car, sp = Math.abs(c.speed);
    const dist = 7.2 + Math.min(3, sp * 0.07);
    ix = c.x - Math.sin(c.h) * dist; iy = 3.2; iz = c.z - Math.cos(c.h) * dist;
    tx = c.x + Math.sin(c.h) * 6; ty = 1.4; tz = c.z + Math.cos(c.h) * 6;
    fov = 62 + Math.min(12, sp * 0.35);
  } else {
    ix = p.x - Math.sin(p.h) * 6.5; iy = 3.1; iz = p.z - Math.cos(p.h) * 6.5;
    tx = p.x + Math.sin(p.h) * 3.5; ty = 1.5; tz = p.z + Math.cos(p.h) * 3.5;
  }
  const k = Math.min(1, dt * 4.5);
  cam.px += (ix - cam.px) * k; cam.py += (iy - cam.py) * k; cam.pz += (iz - cam.pz) * k;
  cam.tx += (tx - cam.tx) * k; cam.ty += (ty - cam.ty) * k; cam.tz += (tz - cam.tz) * k;
  cam.fov += (fov - cam.fov) * Math.min(1, dt * 3);
  G.camH = Math.atan2(cam.tx - cam.px, cam.tz - cam.pz);
}

function updateGame(G, dt) {
  const input = G.input;
  if (Object.keys(input.pressed).length || input.mouseClicked) G.audio.ensure(G);
  if (input.was('KeyM')) G.audio.toggleMute();
  G.time += dt;
  if (G.screen === 'title') {
    if (input.was('Enter')) { G.ui.newGame(); return; }
    G.clock = 18.4;
    updateTraffic(G, dt); updatePeds(G, dt);
    G.carsAll = [...G.traffic, ...G.parked, ...G.policeCars];
    updateCamera(G, dt);
    return;
  }
  if (G.screen === 'passed' || G.screen === 'busted' || G.screen === 'wasted') {
    if (input.was('Enter') || input.was('Space')) { if (G.screen === 'passed') G.ui.nextMission(); else G.ui.respawn(); }
    updateCamera(G, dt);
    return;
  }
  if (G.screen === 'howto') { if (input.was('Escape') || input.was('Enter')) G.ui.closeHowto(); return; }
  if (G.screen === 'saves') { if (input.was('Escape')) G.ui.closeSaves(); return; }
  if (G.mapOpen) { if (input.was('Tab') || input.was('Escape')) G.ui.closeMap(); return; }
  if (G.screen === 'pause') {
    if (input.was('KeyP') || input.was('Escape') || input.was('Enter')) G.ui.resume();
    if (input.was('Tab')) G.ui.openMap();
    return;
  }
  if (G.screen === 'garage') { if (input.was('Escape') || input.was('KeyG')) G.ui.closeGarage(); return; }
  if (input.was('KeyP') || input.was('Escape')) { G.screen = 'pause'; return; }
  if (input.was('Tab')) { G.ui.openMap(); return; }
  G.clock += dt / 240;
  if (G.clock >= 24) { G.clock -= 24; G.day++; }
  G.shotTimer = Math.max(0, G.shotTimer - dt);
  G.hurtFlash = Math.max(0, G.hurtFlash - dt);
  G.pickupT = Math.max(0, G.pickupT - dt);
  if (G.dialogue) G.dialogue.t -= dt;
  const W = G.weapons;
  W.fireT = Math.max(0, W.fireT - dt);
  if (W.reloadT > 0) {
    W.reloadT -= dt;
    if (W.reloadT <= 0) {
      const w = WEAPONS[W.wi];
      const take = Math.min(w.mag - W.mag, W.reserve);
      W.mag += take; W.reserve -= take;
    }
  }
  if (input.was('KeyT')) { G.station = (G.station + 1) % RADIO.length; G.track = 0; }
  if (input.was('KeyQ')) switchWeapon(G, 1);
  const setW = (i) => { if (G.unlocked[i]) { W.wi = i; W.mag = WEAPONS[i].mag; W.reloadT = 0; } };
  if (input.was('Digit1')) setW(0);
  if (input.was('Digit2')) setW(1);
  if (input.was('Digit3')) setW(2);
  if (input.was('KeyR')) reloadWeapon(G);
  if (input.was('KeyH')) G.audio.horn();
  const p = G.player;
  if (input.was('KeyE')) { if (p.onFoot) tryEnterCar(G); else exitCar(G); }
  const nearGarage = Math.hypot((p.car ? p.car.x : p.x) - G.world.garagePos[0], (p.car ? p.car.z : p.z) - G.world.garagePos[1]) < 14;
  if (input.was('KeyG') && nearGarage) { G.screen = 'garage'; return; }
  const [ax, ay] = input.axis();
  if (!p.onFoot && p.car) {
    const car = p.car;
    const shotIn = G.shotMode ? G.shotInput : null;
    driveCar(car, shotIn ? shotIn.throt : ay, shotIn ? shotIn.steer : ax, shotIn ? !!shotIn.brake : input.isDown('Space'), dt, G.world);
    p.x = car.x; p.z = car.z; p.h = car.h;
    const w = WEAPONS[W.wi];
    const wantFire = w.auto ? input.mouseDown : input.mouseClicked;
    if (wantFire && W.wi !== 0) {
      const m0 = W.mag;
      fireWeapon(G, Math.sin(car.h), Math.cos(car.h));
      if (W.mag < m0) G.audio.shot();
    }
  } else {
    const ch = G.camH;
    const fx = Math.sin(ch), fz = Math.cos(ch), rx = Math.cos(ch), rz = -Math.sin(ch);
    updateOnFoot(G, dt, fx * ay + rx * ax, fz * ay + rz * ax, input.isDown('ShiftLeft') || input.isDown('ShiftRight'));
    const w = WEAPONS[W.wi];
    const wantFire = w.auto ? input.mouseDown : (input.mouseClicked || input.was('Space'));
    if (input.was('KeyF')) { W.wi = 0; W.mag = 0; fireWeapon(G, Math.sin(p.h), Math.cos(p.h)); }
    else if (wantFire) {
      const m0 = W.mag;
      fireWeapon(G, Math.sin(p.h), Math.cos(p.h));
      if (W.mag < m0) G.audio.shot();
    }
  }
  updateTraffic(G, dt);
  updatePolice(G, dt);
  updatePeds(G, dt);
  updateThugs(G, dt);
  updatePickups(G, dt);
  updateFx(G, dt);
  updateMission(G, dt);
  G.carsAll = [];
  if (p.car) G.carsAll.push(p.car);
  G.carsAll.push(...G.traffic, ...G.parked, ...G.policeCars);
  carCarCollide(G.carsAll);
  G.smokeT -= dt;
  if (G.smokeT <= 0) {
    G.smokeT = 0.14;
    for (const c of G.carsAll) if (c.smoke) addFx(G, 'smoke', c.x - Math.sin(c.h) * 2, 1.2, c.z - Math.cos(c.h) * 2, 0.9);
  }
  G.missionTarget = G.mission.phase === 'active' ? getTarget(G) : null;
  if (G.bustedTimer > 2.5 && G.screen === 'play') G.screen = 'busted';
  updateCamera(G, dt);
  G.audio.update(G);
}

function renderGame(G) {
  const R = G.renderer;
  R.resize(window.innerWidth, window.innerHeight);
  const pal = paletteAt(G.clock);
  const cam = G.cam;
  const view = matLookAt(cam.px, cam.py, cam.pz, cam.tx, cam.ty, cam.tz);
  const proj = matPerspective(cam.fov, R.aspect || 1.78, 0.5, 700);
  R.frame(view, proj, [cam.px, cam.py, cam.pz], pal);
  R.draw(G.cityMesh, IDENTITY, 1, 0.06);
  R.draw(G.shadowMesh, IDENTITY, 0.26, 0);
  if (G.routeMesh.count) R.draw(G.routeMesh, IDENTITY, 0.9, 0);
  const t = G.missionTarget;
  if (t && G.mission.phase === 'active') {
    R.draw(G.beaconMeshes.pillar, matTrans(t[0], 0, t[1]), 0.16, 0);
    const my = 11 + Math.sin(G.time * 2) * 0.8;
    R.draw(G.beaconMeshes.marker, matMul(matTrans(t[0], my, t[1]), matMul(matRotY(G.time * 1.5), matRotX(0.6))), 1, 0);
  }
  if (pal.shaft > 0.05) R.draw(G.shaftMesh, IDENTITY, pal.shaft * 0.20, 0);
  for (const c of G.carsAll) {
    const set = c.police ? G.carMeshes[6] : G.carMeshes[c.mi];
    const mesh = c.customMesh || set.mesh;
    const M = carModel(c.x, c.z, c.h);
    R.draw(mesh, M, 1, c === G.player.car ? 1.15 : 0.75);
    if (c.police && set.barRed) {
      const ph = Math.sin(G.time * 10) > 0;
      R.draw(set.barRed, M, ph ? 1 : 0.25, 0);
      R.draw(set.barBlue, M, ph ? 0.25 : 1, 0);
    }
    R.draw(G.blobMesh, matTrans(c.x, 0.1, c.z), 0.30, 0);
    if (pal.glow > 0.5) {
      const hx = c.x + Math.sin(c.h) * 4.2, hz = c.z + Math.cos(c.h) * 4.2;
      R.draw(G.headMesh, matTrans(hx, 0.08, hz), 0.28 * Math.min(1, pal.glow), 0);
    }
  }
  if (G.heli.active) {
    const hb = G.heli;
    R.draw(G.heliMeshes.body, matModel(hb.x, hb.y, hb.z, hb.h), 1, 0.5);
    R.draw(G.heliMeshes.rotor, matModel(hb.x, hb.y + 1.7, hb.z, hb.h + hb.spin), 1, 0);
    R.draw(G.heliMeshes.blur, matModel(hb.x, hb.y + 1.7, hb.z, 0), 0.18, 0);
    R.draw(G.coneMesh, matTrans(hb.x, hb.y - 0.9, hb.z), 0.22, 0);
    R.draw(G.poolMesh, matTrans(hb.x, 0.1, hb.z), 0.5, 0);
    R.draw(G.blobMesh, matTrans(hb.x, 0.09, hb.z), 0.22, 0);
  }
  for (const b of G.roadblocks) R.draw(G.blockerMesh, matModel(b.x, 0, b.z, b.h), 1, 0);
  for (const ped of G.peds) drawPerson(R, G.personMeshes[ped.variant], ped.x, ped.z, ped.h, ped.phase, false);
  for (const th of G.thugs) drawPerson(R, G.personMeshes[th.variant], th.x, th.z, th.h, th.phase, th.fallen);
  const p = G.player;
  if (p.onFoot) {
    drawPerson(R, G.personMeshes[0], p.x, p.z, p.h, p.phase, false);
    R.draw(G.ringMesh, matTrans(p.x, 0.1, p.z), 0.6, 0);
  }
  for (const pk of G.pickups) {
    if (pk.taken) continue;
    R.draw(G.pickupMeshes[pk.kind], matMul(matTrans(pk.x, 0.7 + Math.sin(pk.bob) * 0.15, pk.z), matRotY(pk.bob)), 1, 0);
  }
  for (const f of G.fx) {
    const a = Math.max(0, f.life / f.max);
    if (f.kind === 'flash' || f.kind === 'spark') R.draw(G.flashMesh, matTrans(f.x, f.y, f.z), a, 0);
    else if (f.kind === 'smoke') R.draw(G.blobMesh, matTrans(f.x, f.y, f.z), 0.22 * a, 0);
    else if (f.kind === 'ring') R.draw(G.ringMesh, matTrans(f.x, f.y, f.z), a * 0.7, 0);
  }
  R.end();
}

function boot() {
  const params = new URLSearchParams(location.search);
  const seed = parseInt(params.get('seed') || '1', 10) || 1;
  const shot = params.get('shot');
  const canvas = document.getElementById('gl');
  const renderer = new Renderer(canvas);
  const G = {
    seed, rng: RNG(seed), time: 0, shotMode: !!shot, screen: 'title',
    renderer, gl: renderer.gl, camH: 0, station: 0, track: 0,
  };
  window.__G = G;
  const world = buildCity(seed);
  world.baseColliders = world.colliders.length;
  G.world = world;
  G.cityMesh = world.mesh.upload(G.gl);
  G.shadowMesh = world.shadowMesh.upload(G.gl);
  G.carMeshes = buildCarMeshes(G.gl);
  G.personMeshes = buildPersonMeshes(G.gl);
  G.heliMeshes = buildHeliMeshes(G.gl);
  G.coneMesh = buildConeMesh(G.gl);
  G.blockerMesh = buildBlockerMesh(G.gl);
  G.pickupMeshes = buildPickupMeshes(G.gl);
  G.flashMesh = buildFlashMesh(G.gl);
  G.beaconMeshes = buildBeaconMeshes(G.gl);
  G.routeMesh = new Mesh(); G.routeMesh.upload(G.gl);
  G.blobMesh = discMesh(2.3, [0, 0, 0], 0); G.blobMesh.upload(G.gl);
  G.poolMesh = discMesh(6.5, [1.0, 0.9, 0.6], 1.0); G.poolMesh.upload(G.gl);
  G.ringMesh = discMesh(0.95, [1, 1, 1], 0.8); G.ringMesh.upload(G.gl);
  G.headMesh = discMesh(2.6, [1.0, 0.85, 0.55], 0.9); G.headMesh.upload(G.gl);
  G.shaftMesh = buildShafts(); G.shaftMesh.upload(G.gl);
  G.input = makeInput();
  G.audio = makeAudio();
  G.ui = {
    newGame: () => { resetWorld(G); G.screen = 'play'; },
    continueGame: () => {
      resetWorld(G);
      const idx = loadGame(G, 0);
      if (typeof idx === 'number') startMission(G, idx);
      G.screen = 'play';
    },
    resume: () => { G.screen = 'play'; },
    openMap: () => { G.mapOpen = true; },
    closeMap: () => { G.mapOpen = false; },
    openSaves: () => { G.prevScreen = G.screen; G.screen = 'saves'; refreshSlotButtons(); },
    closeSaves: () => { G.screen = G.prevScreen || 'pause'; },
    restart: () => { resetWorld(G); G.screen = 'play'; },
    garageBuy: (kind) => {
      const p = G.player;
      if (kind === 'engine' && G.upgrades.engine < 3 && G.cash >= 800) {
        G.cash -= 800; G.upgrades.engine++;
        if (p.car) p.car.topMul = 1 + 0.08 * G.upgrades.engine;
      } else if (kind === 'armor' && G.cash >= 500) { G.cash -= 500; p.armor = 100; }
      else if (kind === 'paint' && G.cash >= 300 && p.car && !p.car.police) {
        G.cash -= 300; G.upgrades.paint = (G.upgrades.paint + 1) % 6;
        const paints = [[0.78, 0.08, 0.10], [0.85, 0.62, 0.15], [0.10, 0.55, 0.52], [0.12, 0.12, 0.14], [0.92, 0.90, 0.82], [0.55, 0.25, 0.70]];
        const b = buildCarMesh(paints[G.upgrades.paint], { coupe: p.car.spec.coupe });
        b.mesh.upload(G.gl);
        p.car.customMesh = b.mesh;
      }
    },
    closeGarage: () => { G.screen = 'play'; },
    nextMission: () => { const wasDone = G.mission.phase === 'done'; nextMission(G); if (wasDone) G.audio.fanfare(); },
    respawn: () => respawn(G),
    saveSlot: (i) => { saveGame(G, i); refreshSlotButtons(); G.ui.closeSaves(); },
    showHowto: () => { G.prevScreen = G.screen; G.screen = 'howto'; },
    closeHowto: () => { G.screen = G.prevScreen || 'title'; },
  };
  initHud(G);
  resetWorld(G);
  if (shot) {
    G.screen = 'play';
    setupShot(G, shot, { update: (dt) => updateGame(G, dt), render: () => renderGame(G) });
  } else {
    G.clock = 18.4;
  }
  let last = performance.now(), acc = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dtReal = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!G.shotFrozen) {
      acc += dtReal;
      let steps = 0;
      while (acc >= 1 / 60 && steps < 5) { updateGame(G, 1 / 60); acc -= 1 / 60; steps++; }
      if (steps === 5) acc = 0;
    }
    renderGame(G);
    updateHud(G);
    G.input.postUpdate();
  }
  requestAnimationFrame(frame);
  window.__gameReady = true;
}
boot();
