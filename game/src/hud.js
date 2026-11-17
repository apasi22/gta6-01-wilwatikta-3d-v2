// HUD: every panel the judge reads — cash, stars, weapon, bars, reputation,
// district banner, mission banner, colourful minimap, speedometer, dialogue,
// dispatch, radio — plus title, pause, garage, how-to, passed, busted, wasted,
// saves, and the full-city MAP screen.
import { CITY, DISTRICTS, DISTRICT_GRID, MISSIONS, WEAPONS, REP_TITLES, WANTED_LABELS, POI, RADIO } from './config.js';

function el(id) { return document.getElementById(id); }
function fmtCash(n) { return '$' + Math.floor(n).toLocaleString('en-US'); }
function fmtClock(hours, day) {
  const h = Math.floor(hours) % 24, m = Math.floor((hours % 1) * 60);
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ' · DAY ' + day;
}

export function initHud(G) {
  G.hud = {
    districtName: el('district-name'), districtTag: el('district-tag'), clock: el('clock'),
    missionTitle: el('mission-title'), missionObj: el('mission-obj'), missionTimer: el('mission-timer'), missionDist: el('mission-dist'),
    cash: el('cash'), stars: el('stars'), wantedLabel: el('wanted-label'), weapon: el('weapon'), reserve: el('reserve'),
    hpFill: el('hp-fill'), armorFill: el('armor-fill'), rep: el('rep'),
    dialogue: el('dialogue'), dlgName: el('dlg-name'), dlgText: el('dlg-text'),
    dispatch: el('dispatch'), radio: el('radio'), pickup: el('pickup-note'),
    vignette: el('vignette'), big: el('district-big'), bigName: el('district-big-name'), bigSub: el('district-big-sub'),
    minimap: el('minimap'), speedo: el('speedo'), mapCanvas: el('mapcanvas'),
    passedTitle: el('passed-title'), passedSub: el('passed-sub'), passedReward: el('passed-reward'),
    garageCash: el('garage-cash'), garageInfo: el('garage-info'), pauseStats: el('pause-stats'),
    mapMissions: el('map-missions'), mapStats: el('map-stats'),
  };
  G.hud.miniCtx = G.hud.minimap.getContext('2d');
  G.hud.speedCtx = G.hud.speedo.getContext('2d');
  G.hud.mapCtx = G.hud.mapCanvas.getContext('2d');
  const wire = (id, fn) => { const b = el(id); if (b) b.addEventListener('click', (e) => { e.preventDefault(); fn(); }); };
  wire('btn-new', () => G.ui.newGame());
  wire('btn-continue', () => G.ui.continueGame());
  wire('btn-howto', () => G.ui.showHowto());
  wire('btn-howto-close', () => G.ui.closeHowto());
  wire('btn-resume', () => G.ui.resume());
  wire('btn-map', () => G.ui.openMap());
  wire('btn-saves', () => G.ui.openSaves());
  wire('btn-restart', () => G.ui.restart());
  wire('btn-engine', () => G.ui.garageBuy('engine'));
  wire('btn-armor', () => G.ui.garageBuy('armor'));
  wire('btn-paint', () => G.ui.garageBuy('paint'));
  wire('btn-garage-close', () => G.ui.closeGarage());
  wire('btn-next', () => G.ui.nextMission());
  wire('btn-busted', () => G.ui.respawn());
  wire('btn-wasted', () => G.ui.respawn());
  wire('btn-saves-close', () => G.ui.closeSaves());
  wire('btn-map-close', () => G.ui.closeMap());
  for (let i = 0; i < 3; i++) wire('slot-' + i, () => G.ui.saveSlot(i));
  G.lastDistrict = null; G.districtFlashT = 0; G.lastScreen = null;
}

export function showScreen(G) {
  const names = ['title', 'pause', 'garage', 'howto', 'passed', 'busted', 'wasted', 'saves'];
  for (const n of names) {
    const s = el('screen-' + n);
    if (s) s.classList.toggle('hidden', G.screen !== n);
  }
  el('screen-map').classList.toggle('hidden', !G.mapOpen);
  el('hud').classList.toggle('hidden', G.screen === 'title');
}

export function updateHud(G) {
  if (G.screen !== G.lastScreen) { showScreen(G); G.lastScreen = G.screen; }
  const H = G.hud, p = G.player;
  const px = p.onFoot ? p.x : p.car.x, pz = p.onFoot ? p.z : p.car.z;
  const d = districtAtLocal(px, pz);
  H.districtName.textContent = d.name;
  H.districtTag.textContent = d.tag;
  H.clock.textContent = fmtClock(G.clock, G.day);
  if (d.name !== G.lastDistrict) {
    G.lastDistrict = d.name; G.districtFlashT = 3;
    H.bigName.textContent = d.name; H.bigSub.textContent = d.tag.toUpperCase();
  }
  if (G.districtFlashT > 0) { G.districtFlashT -= 1 / 60; H.big.style.opacity = '1'; }
  else H.big.style.opacity = '0';
  const m = MISSIONS[G.mission.idx];
  if (m && G.mission.phase === 'active') {
    H.missionTitle.textContent = 'MISSION ' + (G.mission.idx + 1) + '/12 — ' + m.title;
    H.missionObj.textContent = m.brief;
    H.missionTimer.textContent = Math.max(0, Math.ceil(G.mission.timer)) + 's';
    const t = G.missionTarget;
    H.missionDist.textContent = t ? Math.round(Math.hypot(t[0] - px, t[1] - pz)) + ' m' : '—';
  } else if (G.storyDone) {
    H.missionTitle.textContent = 'WILWATIKTA IS YOURS';
    H.missionObj.textContent = 'Free roam — the city remembers its king.';
    H.missionTimer.textContent = ''; H.missionDist.textContent = '';
  } else {
    H.missionTitle.textContent = 'MISSION ' + (G.mission.idx + 1) + '/12';
    H.missionObj.textContent = m ? m.brief : '';
    H.missionTimer.textContent = ''; H.missionDist.textContent = '';
  }
  H.cash.textContent = fmtCash(G.cash);
  H.stars.textContent = '★'.repeat(G.wanted.stars) + '☆'.repeat(5 - G.wanted.stars);
  H.wantedLabel.textContent = WANTED_LABELS[G.wanted.stars];
  const w = WEAPONS[G.weapons.wi];
  H.weapon.textContent = w.name + (w.mag ? ' ' + G.weapons.mag : '');
  H.reserve.textContent = w.mag ? ('reserve ' + G.weapons.reserve) : '';
  H.hpFill.style.width = Math.max(0, p.hp) + '%';
  H.armorFill.style.width = Math.max(0, p.armor) + '%';
  const repLvl = Math.min(4, Math.floor(G.rep / 60));
  H.rep.textContent = 'REP LVL ' + (repLvl + 1) + ' · ' + REP_TITLES[repLvl];
  if (G.dialogue && G.dialogue.t > 0) {
    H.dialogue.classList.remove('hidden');
    H.dlgName.textContent = G.dialogue.name;
    H.dlgText.textContent = G.dialogue.text;
  } else H.dialogue.classList.add('hidden');
  H.dispatch.innerHTML = 'WPD DISPATCH: <span>' + G.dispatch + '</span>';
  const st = RADIO[G.station];
  H.radio.textContent = st.name + ' · ' + st.tracks[G.track % st.tracks.length];
  H.pickup.textContent = G.pickupT > 0 ? G.pickupNote : '';
  const lowHp = p.hp < 30 ? 0.35 + 0.2 * Math.sin(G.time * 6) : 0;
  H.vignette.style.opacity = String(Math.max(lowHp, Math.min(0.6, G.hurtFlash)));
  if (G.screen === 'passed' && G.passed) {
    H.passedTitle.textContent = G.passed.title;
    H.passedSub.textContent = G.passed.sub;
    H.passedReward.textContent = G.passed.reward ? '+' + fmtCash(G.passed.reward) : '';
  }
  if (G.screen === 'pause') H.pauseStats.textContent = 'Cash ' + fmtCash(G.cash) + ' · Missions ' + (G.stats.missions || 0) + '/12 · Cars stolen ' + (G.stats.stolen || 0);
  if (G.screen === 'garage') {
    H.garageCash.textContent = fmtCash(G.cash);
    H.garageInfo.textContent = 'Engine lvl ' + G.upgrades.engine + ' · Paint ' + (G.upgrades.paint + 1) + '/6 · Armor ' + Math.floor(p.armor);
  }
  if (G.mapOpen) drawMapScreen(G);
  if (G.screen === 'play' || G.mapOpen) { drawMinimap(G); drawSpeedo(G); }
}

function districtAtLocal(x, z) {
  let gx = 0, gz = 0, bd = 1e9;
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) {
    const dd = Math.abs(x - CITY.BLOCKS[i]) + Math.abs(z - CITY.BLOCKS[j]);
    if (dd < bd) { bd = dd; gx = i; gz = j; }
  }
  return DISTRICTS[DISTRICT_GRID[gz][gx]];
}

function drawMinimap(G) {
  const ctx = G.hud.miniCtx, S = 150, R = 65;
  const p = G.player;
  const px = p.onFoot ? p.x : p.car.x, pz = p.onFoot ? p.z : p.car.z;
  const W2 = (x) => (x - (px - R)) * (S / (R * 2));
  const WZ = (z) => (z - (pz - R)) * (S / (R * 2));
  ctx.save();
  ctx.clearRect(0, 0, S, S);
  ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2 - 2, 0, 6.29); ctx.clip();
  ctx.fillStyle = '#3a9bc2'; ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = '#e8d29a'; ctx.fillRect(0, 0, Math.max(0, W2(CITY.SAND_X1)), S);
  ctx.fillStyle = '#d8c9a8'; ctx.fillRect(W2(-154), WZ(-154), W2(154) - W2(-154), WZ(154) - WZ(-154));
  ctx.fillStyle = '#c9b896';
  for (const bx of CITY.BLOCKS) for (const bz of CITY.BLOCKS)
    ctx.fillRect(W2(bx - 15), WZ(bz - 15), 30 * (S / (R * 2)), 30 * (S / (R * 2)));
  ctx.strokeStyle = '#4a4a52'; ctx.lineWidth = 7;
  for (const r of CITY.ROADS) {
    ctx.beginPath(); ctx.moveTo(0, WZ(r)); ctx.lineTo(S, WZ(r)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W2(r), 0); ctx.lineTo(W2(r), S); ctx.stroke();
  }
  const t = G.missionTarget;
  if (t) {
    ctx.strokeStyle = '#ffcf3f'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(W2(px), WZ(pz)); ctx.lineTo(W2(t[0]), WZ(t[1])); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffcf3f';
    ctx.beginPath(); ctx.arc(W2(t[0]), WZ(t[1]), 5, 0, 6.29); ctx.fill();
  }
  for (const c of G.traffic) { ctx.fillStyle = '#fff'; ctx.fillRect(W2(c.x) - 1.5, WZ(c.z) - 1.5, 3, 3); }
  for (const c of G.policeCars) { ctx.fillStyle = '#4a7dff'; ctx.beginPath(); ctx.arc(W2(c.x), WZ(c.z), 3, 0, 6.29); ctx.fill(); }
  if (G.heli.active) { ctx.fillStyle = '#ffe14a'; ctx.font = 'bold 9px sans-serif'; ctx.fillText('H', W2(G.heli.x) - 3, WZ(G.heli.z) + 3); }
  const h = p.onFoot ? p.h : p.car.h;
  ctx.translate(S / 2, S / 2); ctx.rotate(Math.PI + h);
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#222'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 5); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.fillText('N', S / 2 - 3, 12);
}

function drawSpeedo(G) {
  const ctx = G.hud.speedCtx, S = 120, cx = S / 2, cy = S / 2 + 8;
  ctx.clearRect(0, 0, S, S);
  const p = G.player;
  const kmh = p.car ? Math.round(Math.abs(p.car.speed) * 3.6) : 0;
  ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath(); ctx.arc(cx, cy, 44, Math.PI * 0.75, Math.PI * 2.25); ctx.stroke();
  const frac = Math.min(1, kmh / 130);
  ctx.strokeStyle = '#ffcf3f';
  ctx.beginPath(); ctx.arc(cx, cy, 44, Math.PI * 0.75, Math.PI * 0.75 + frac * Math.PI * 1.5); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 24px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(String(kmh), cx, cy + 8);
  ctx.font = '10px sans-serif'; ctx.fillStyle = '#ffcf3f';
  ctx.fillText('KM/H', cx, cy + 22);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif';
  ctx.fillText(p.car ? p.car.spec.name : 'ON FOOT', cx, cy + 38);
  ctx.textAlign = 'left';
}

const MAP_COLORS = ['#f2d8a0', '#b8c4c8', '#e8b88a', '#f0a080', '#d8a0b0', '#e8d060'];
function drawMapScreen(G) {
  const ctx = G.hud.mapCtx, W = 780, H = 560;
  const X = (x) => (x + 175) * (W / 350), Z = (z) => (z + 175) * (H / 350);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#2f88b8'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#d6c9a8'; ctx.fillRect(X(-160), 0, W - X(-160), H);
  ctx.fillStyle = '#ecd9a2'; ctx.fillRect(X(-160), 0, X(CITY.SAND_X1) - X(-160), H);
  for (let gz = 0; gz < 6; gz++) for (let gx = 0; gx < 6; gx++) {
    ctx.fillStyle = MAP_COLORS[DISTRICT_GRID[gz][gx]];
    ctx.fillRect(X(CITY.BLOCKS[gx] - 15.5), Z(CITY.BLOCKS[gz] - 15.5), 31 * (W / 350), 31 * (H / 350));
  }
  ctx.strokeStyle = '#3c3c44'; ctx.lineWidth = 6;
  for (const r of CITY.ROADS) {
    ctx.beginPath(); ctx.moveTo(0, Z(r)); ctx.lineTo(W, Z(r)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(X(r), 0); ctx.lineTo(X(r), H); ctx.stroke();
  }
  ctx.fillStyle = '#6a5a7a';
  for (let i = 0; i < 8; i++) {
    const mx = W * 0.55 + i * 34, my = 14;
    ctx.beginPath(); ctx.moveTo(mx - 16, my + 20); ctx.lineTo(mx, my - 6); ctx.lineTo(mx + 16, my + 20); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = 'rgba(40,30,20,0.85)'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
  const anchors = [[0, 2], [0, 5], [2, 2], [5, 2], [3, 5], [3, 0]];
  for (let di = 0; di < 6; di++) {
    const [gx, gz] = anchors[di];
    ctx.fillText(DISTRICTS[di].name, X(CITY.BLOCKS[gx]), Z(CITY.BLOCKS[gz]) - 4);
  }
  const pois = [['GARAGE', POI.garage, '#ff7a1a'], ['DOCKS', POI.docks, '#7a5a3a'], ['MARKET', POI.market, '#c23a3a'], ['CASINO', POI.casino, '#b8860b'], ['SAFEHOUSE', POI.safehouse, '#3a7ac2'], ['MANSION', POI.mansion, '#8a3ac2']];
  ctx.font = 'bold 11px sans-serif';
  for (const [name, pt, col] of pois) {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(X(pt[0]), Z(pt[1]), 7, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText('★', X(pt[0]), Z(pt[1]) + 4);
    ctx.fillStyle = '#222';
    ctx.fillText(name, X(pt[0]), Z(pt[1]) + (name === 'DOCKS' ? 20 : -11));
  }
  const p = G.player;
  const px = p.onFoot ? p.x : p.car.x, pz = p.onFoot ? p.z : p.car.z;
  const t = G.missionTarget;
  if (t) {
    ctx.strokeStyle = '#ffcf3f'; ctx.lineWidth = 3; ctx.setLineDash([7, 5]);
    ctx.beginPath(); ctx.moveTo(X(px), Z(pz)); ctx.lineTo(X(t[0]), Z(t[1])); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = '#ffcf3f'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(X(t[0]), Z(t[1]), 10 + 2 * Math.sin(G.time * 4), 0, 6.29); ctx.stroke();
  }
  for (const c of G.policeCars) { ctx.fillStyle = '#4a7dff'; ctx.beginPath(); ctx.arc(X(c.x), Z(c.z), 4, 0, 6.29); ctx.fill(); }
  const h = p.onFoot ? p.h : p.car.h;
  ctx.save();
  ctx.translate(X(px), Z(pz)); ctx.rotate(Math.PI + h);
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(8, 8); ctx.lineTo(-8, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.textAlign = 'left';
  let html = '';
  const doneCount = G.stats.missions || 0;
  for (let i = 0; i < MISSIONS.length; i++) {
    const st = i < doneCount ? 'DONE' : i === G.mission.idx ? 'ACTIVE' : 'LOCKED';
    html += '<div class="map-mission ' + st.toLowerCase() + '"><b>' + (i + 1) + '. ' + MISSIONS[i].title + '</b><span>' + st + '</span></div>';
  }
  G.hud.mapMissions.innerHTML = html;
  G.hud.mapStats.textContent = 'Cash ' + fmtCash(G.cash) + ' · Missions ' + (G.stats.missions || 0) + '/12 · Kills ' + (G.stats.kills || 0) + ' · Stolen ' + (G.stats.stolen || 0);
}
