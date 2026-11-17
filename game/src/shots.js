// Staged screenshots: deterministic setups that play the real rules forward a
// fixed number of steps, then freeze on one frame and raise __shotReady.
// Cover: beachfront avenue chase at golden dusk. Map: the full-city map screen.
// Foot: stealing the gold coupe in the day market. Night: the lit docks escape.
import { makeCar } from './vehicles.js';
import { startMission } from './missions.js';
import { setWanted, spawnRoadblock } from './police.js';
import { updateHud } from './hud.js';

function runSteps(G, hooks, n, input) {
  G.shotInput = input;
  for (let i = 0; i < n; i++) hooks.update(1 / 60);
  G.shotInput = null;
}
function snapChase(G) {
  const c = G.player.car;
  if (!c) return;
  G.cam.px = c.x - Math.sin(c.h) * 7.2; G.cam.py = 3.2; G.cam.pz = c.z - Math.cos(c.h) * 7.2;
  G.cam.tx = c.x + Math.sin(c.h) * 6; G.cam.ty = 1.4; G.cam.tz = c.z + Math.cos(c.h) * 6;
  G.cam.fov = 66;
}

export function setupShot(G, name, hooks) {
  G.shotMode = true; G.screen = 'play'; G.mapOpen = false;
  const P = G.player;
  if (name === 'cover') {
    startMission(G, 8);
    G.clock = 18.6; G.day = 1; G.cash = 12480; G.rep = 180;
    G.weapons = { wi: 2, mag: 30, reserve: 90, fireT: 0, reloadT: 0 };
    G.unlocked = [true, true, true];
    P.hp = 100; P.armor = 60;
    const car = makeCar(0, -132, -20, 0); car.speed = 22; car.topMul = 1;
    P.car = car; P.onFoot = false; P.x = car.x; P.z = car.z; P.h = 0;
    const pc1 = makeCar(0, -132, -44, 0, true); pc1.speed = 20;
    const pc2 = makeCar(0, -128.5, -36, 0, true); pc2.speed = 20;
    G.policeCars.push(pc1, pc2);
    G.carsAll = [car, ...G.traffic, ...G.parked, ...G.policeCars];
    G.heli.active = true; G.heli.x = -116; G.heli.z = 2; G.heli.y = 25; G.heli.ang = 0.6; G.heli.h = 2.6;
    G.forceHeli = true; G.missionLock = true;
    G.mission.timer = 41;
    const avenue = G.world.loops[3];
    for (let i = 0; i < 4; i++) {
      const t = G.traffic[i];
      t.loop = avenue; t.wp = 1; t.dir = 1;
      t.x = -132 + (i % 2 ? 3 : -3); t.z = 12 + i * 22; t.h = 0; t.speed = 12; t.cruise = 12;
    }
    snapChase(G);
    runSteps(G, hooks, 42, { throt: 0.8, steer: 0, brake: false });
    // Final-frame dressing: helicopter + police placed where the chase camera sees them.
    G.heli.x = P.car.x + 3; G.heli.z = P.car.z + 40; G.heli.y = 18; G.heli.h = 2.8; G.heli.ang = 0.9;
    pc1.x = P.car.x - 4.5; pc1.z = P.car.z + 24; pc1.h = 0; pc1.speed = 20;
    pc2.x = P.car.x + 4.5; pc2.z = P.car.z + 12; pc2.h = 0; pc2.speed = 20;
  } else if (name === 'map') {
    startMission(G, 11);
    setWanted(G, 2); G.missionLock = false; G.forceHeli = false; G.heli.active = false;
    G.clock = 18.6; G.cash = 12480; G.rep = 240; P.hp = 100; P.armor = 80;
    G.stats.missions = 11; G.stats.kills = 12; G.stats.stolen = 8;
    P.car.x = 0; P.car.z = 0; P.car.h = Math.PI / 2; P.car.speed = 0;
    P.x = 0; P.z = 0; P.h = Math.PI / 2;
    G.mission.timer = 150;
    runSteps(G, hooks, 6, { throt: 0, steer: 0, brake: false });
    G.mapOpen = true;
  } else if (name === 'foot') {
    startMission(G, 1);
    G.clock = 10.5; G.cash = 2450; G.rep = 20;
    G.weapons = { wi: 1, mag: 12, reserve: 60, fireT: 0, reloadT: 0 };
    P.hp = 100; P.armor = 0;
    const coupe = G.mission.targetCar;
    P.onFoot = true; P.car = null;
    P.x = coupe.x - 4.5; P.z = coupe.z + 1.5;
    P.h = Math.atan2(coupe.x - P.x, coupe.z - P.z);
    let n = 0;
    for (const ped of G.peds) {
      if (n >= 4 || ped.beach) continue;
      ped.x = 88 + [-8, 8, -4, 10][n]; ped.z = -44 + [-8, -6, 8, 4][n];
      ped.path = [[ped.x, ped.z], [ped.x + 4, ped.z], [ped.x + 4, ped.z + 4], [ped.x, ped.z + 4]];
      ped.wp = 1; n++;
    }
    for (const ped of G.peds) {
      const dx = ped.x - (P.x - 6), dz = ped.z - (P.z + 9);
      if (dx * dx + dz * dz < 144) { ped.x += 26; ped.z -= 16; }
    }
    G.mission.timer = 120;
    G.camFixed = { eye: [P.x - 6, 4.0, P.z + 9], target: [coupe.x + 0.5, 1.0, coupe.z - 0.5], fov: 56 };
    runSteps(G, hooks, 12, { throt: 0, steer: 0, brake: false });
    P.phase = 0.9;
    G.cam.px = G.camFixed.eye[0]; G.cam.py = G.camFixed.eye[1]; G.cam.pz = G.camFixed.eye[2];
    G.cam.tx = G.camFixed.target[0]; G.cam.ty = G.camFixed.target[1]; G.cam.tz = G.camFixed.target[2];
    G.cam.fov = G.camFixed.fov;
  } else if (name === 'night') {
    startMission(G, 10);
    G.clock = 21.5; G.cash = 9800; G.rep = 180;
    G.weapons = { wi: 2, mag: 24, reserve: 66, fireT: 0, reloadT: 0 };
    G.unlocked = [true, true, true];
    P.hp = 88; P.armor = 40;
    const car = makeCar(2, -44, 20, 0); car.speed = 18; car.topMul = 1;
    P.car = car; P.onFoot = false; P.x = car.x; P.z = car.z; P.h = 0;
    G.carsAll = [car, ...G.traffic, ...G.parked, ...G.policeCars];
    G.heli.active = true; G.heli.x = -58; G.heli.z = 58; G.heli.y = 25; G.heli.ang = 2.2; G.heli.h = 0.5;
    G.forceHeli = true;
    G.mission.timer = 76;
    const shuttle = { pts: [[-44, -132], [-44, 132]], loop: false };
    for (let i = 0; i < 3; i++) {
      const t = G.traffic[i];
      t.loop = shuttle; t.wp = 1; t.dir = 1;
      t.x = -44 + (i % 2 ? 3 : -3); t.z = 52 + i * 26; t.h = 0; t.speed = 11; t.cruise = 11;
    }
    snapChase(G);
    runSteps(G, hooks, 20, { throt: 0.8, steer: 0, brake: false });
    spawnRoadblock(G);
    runSteps(G, hooks, 22, { throt: 0.8, steer: 0, brake: false });
    // Final-frame dressing: helicopter + police placed where the chase camera sees them.
    G.heli.x = P.car.x - 3; G.heli.z = P.car.z + 38; G.heli.y = 19; G.heli.h = 0.6; G.heli.ang = 2.4;
    const npc1 = makeCar(0, P.car.x + 4.5, P.car.z + 22, 0, true); npc1.speed = 18;
    const npc2 = makeCar(0, P.car.x - 4.5, P.car.z + 14, 0, true); npc2.speed = 18;
    G.policeCars.push(npc1, npc2);
  }
  G.shotFrozen = true;
  hooks.render();
  updateHud(G);
  window.__shotReady = true;
}
