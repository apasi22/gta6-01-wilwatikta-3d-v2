// WILWATIKTA 3D — tuning, palettes, districts, cars, weapons, missions.
// One source of truth shared by the 3D city, the minimap, the map screen and staging,
// so all three views of the city always agree.
export const CITY = {
  STEP: 44,
  ROADS: [-132, -88, -44, 0, 44, 88, 132],
  ROAD_W: 13,
  BLOCKS: [-110, -66, -22, 22, 66, 110],
  EXT: 154,
  SAND_X0: -162, SAND_X1: -141,
  SEA_X: -162,
};

export const DISTRICTS = [
  { name: 'PANTAI KIDUL', tag: 'Beachfront avenue, palms and gold light', facades: [[0.93, 0.75, 0.55], [0.96, 0.82, 0.62], [0.85, 0.62, 0.48], [0.98, 0.88, 0.70]], hMin: 8, hMax: 22, shops: 0.5, palms: 1.0 },
  { name: 'PELABUHAN SEGARA', tag: 'Docks, warehouses and cranes', facades: [[0.55, 0.48, 0.42], [0.62, 0.52, 0.40], [0.48, 0.55, 0.58], [0.70, 0.58, 0.45]], hMin: 7, hMax: 16, shops: 0.3, palms: 0.3 },
  { name: 'ALUN-ALUN', tag: 'Old square, new towers, gold teeth', facades: [[0.78, 0.60, 0.42], [0.85, 0.68, 0.50], [0.62, 0.55, 0.50], [0.90, 0.74, 0.55]], hMin: 16, hMax: 44, shops: 0.6, palms: 0.5 },
  { name: 'PASAR SENJA', tag: 'Spices, noise and second chances', facades: [[0.88, 0.55, 0.35], [0.75, 0.45, 0.30], [0.95, 0.65, 0.40], [0.60, 0.42, 0.35]], hMin: 7, hMax: 15, shops: 1.0, palms: 0.4 },
  { name: 'KAMPUNG BATIK', tag: 'Dye vats, looms and quiet lanes', facades: [[0.80, 0.52, 0.45], [0.70, 0.48, 0.55], [0.85, 0.62, 0.48], [0.55, 0.50, 0.45]], hMin: 7, hMax: 18, shops: 0.5, palms: 0.6 },
  { name: 'LORONG EMAS', tag: 'Casinos, neon and fast money', facades: [[0.72, 0.60, 0.38], [0.55, 0.48, 0.55], [0.85, 0.70, 0.45], [0.48, 0.42, 0.48]], hMin: 14, hMax: 38, shops: 0.8, palms: 0.3 },
];
// District per block: DISTRICT_GRID[gz][gx], gz/gx index into CITY.BLOCKS (north to south).
export const DISTRICT_GRID = [
  [0, 5, 5, 5, 5, 5],
  [0, 2, 2, 5, 3, 3],
  [0, 2, 2, 2, 3, 3],
  [0, 2, 2, 2, 3, 3],
  [1, 1, 4, 4, 3, 3],
  [1, 1, 4, 4, 4, 3],
];
export function districtAt(x, z) {
  let gx = 0, gz = 0, bd = 1e9;
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) {
    const d = Math.abs(x - CITY.BLOCKS[i]) + Math.abs(z - CITY.BLOCKS[j]);
    if (d < bd) { bd = d; gx = i; gz = j; }
  }
  return DISTRICTS[DISTRICT_GRID[gz][gx]];
}

function pal(sunDir, sunCol, amb, fogCol, fogNear, fogFar, glow, top, mid, hor, sun, sunPos, shaft) {
  return { sunDir, sunCol, amb, fogCol, fogNear, fogFar, glow, skyTop: top, skyMid: mid, skyHor: hor, sunCol2: sun, sunPos, shaft };
}
export const PALETTES = {
  day: pal([-0.42, 0.82, 0.30], [1.0, 0.95, 0.85], 0.60, [0.74, 0.87, 0.95], 170, 540, 0.35,
    [0.24, 0.55, 0.85], [0.55, 0.78, 0.93], [0.92, 0.96, 1.0], [1.0, 0.95, 0.80], [0.68, 0.66], 0.0),
  dusk: pal([-0.78, 0.30, 0.28], [1.0, 0.60, 0.36], 0.46, [0.98, 0.64, 0.42], 130, 430, 1.0,
    [0.42, 0.28, 0.62], [0.91, 0.42, 0.54], [1.0, 0.70, 0.42], [1.0, 0.75, 0.45], [0.60, 0.58], 1.0),
  night: pal([0.30, 0.70, -0.40], [0.45, 0.55, 0.80], 0.40, [0.11, 0.14, 0.25], 105, 390, 1.5,
    [0.04, 0.06, 0.19], [0.15, 0.21, 0.37], [0.29, 0.29, 0.48], [0.85, 0.88, 1.0], [0.30, 0.70], 0.0),
};

export const CARS = [
  { name: 'GARUDA GT', paint: [0.78, 0.08, 0.10], top: 34, accel: 15, grip: 2.6, coupe: true },
  { name: 'KENCANA S', paint: [0.85, 0.62, 0.15], top: 30, accel: 13, grip: 2.4, coupe: false },
  { name: 'ARJUNA', paint: [0.75, 0.76, 0.78], top: 29, accel: 12, grip: 2.3, coupe: false },
  { name: 'SRIKANDI', paint: [0.10, 0.55, 0.52], top: 28, accel: 12, grip: 2.3, coupe: false },
  { name: 'GATOTKACA', paint: [0.12, 0.12, 0.14], top: 27, accel: 11, grip: 2.2, coupe: false },
  { name: 'BIMA', paint: [0.92, 0.90, 0.82], top: 26, accel: 11, grip: 2.2, coupe: false },
];
export const POLICE_CAR = { name: 'WPD INTERCEPTOR', paint: [0.92, 0.93, 0.95], top: 33, accel: 14, grip: 2.7 };

export const WEAPONS = [
  { name: 'FIST', dmg: 20, rate: 2.5, mag: 0, reserve: 0, auto: false },
  { name: 'PISTOL', dmg: 34, rate: 3.2, mag: 12, reserve: 60, auto: false },
  { name: 'SMG', dmg: 22, rate: 9.0, mag: 30, reserve: 90, auto: true },
];
export const REP_TITLES = ['PENDATANG', 'KENALAN', 'ORANG KEPERCAYAAN', 'LEGENDA', 'RAJA WILWATIKTA'];
export const WANTED_LABELS = ['CLEAN', 'SUSPECT', 'WANTED', 'WANTED', 'MOST WANTED', 'MOST WANTED'];

export const POI = {
  garage: [44, 44], docks: [-88, 110], market: [88, 22], casino: [44, -110],
  beach: [-132, -44], safehouse: [-88, 88], mansion: [132, -132], lookout: [0, -88],
  coupe: [88, -44], kencana: [-44, -44], shops: [44, 88],
};

export const MISSIONS = [
  { title: 'Selamat Datang', giver: 'AGUS', brief: 'Drive to Bengkel Bambang. Bambang has work for a driver like you.', say: ['AGUS', 'New in town, Sugeng? Bambang is waiting at the garage. Don\u2019t scratch anything.'], type: 'drive', target: POI.garage, time: 150, reward: 250 },
  { title: 'Hot Wheels', giver: 'AGUS', brief: 'Steal the gold coupe — bring it to Bengkel Bambang.', say: ['AGUS', 'The gold coupe is yours, Sugeng. Don\u2019t scratch the paint.'], type: 'steal', target: POI.coupe, target2: POI.garage, time: 180, reward: 500 },
  { title: 'Antar Paket', giver: 'BAMBANG', brief: 'Deliver the package to Pasar Senja. Fast. No questions.', say: ['BAMBANG', 'Pasar Senja, ninety seconds. The package does not like waiting.'], type: 'drive', target: POI.market, time: 100, reward: 400 },
  { title: 'Tagihan Pasar', giver: 'AGUS', brief: 'Collect the market debt. They pay, or they explain why not.', say: ['AGUS', 'Three shops owe us. Start at the corner stall and smile.'], type: 'drive', target: POI.shops, time: 120, reward: 450 },
  { title: 'Mata-Mata', giver: 'SUGENG', brief: 'Reach the Lorong Emas lookout. Watch the casino door.', say: ['SUGENG', 'Quiet night on the strip. Somebody is lying about the money.'], type: 'drive', target: POI.lookout, time: 150, reward: 400 },
  { title: 'Balapan Senja', giver: 'AGUS', brief: 'Race the sunset to Pantai Kidul. Beat the clock, beat the boys.', say: ['AGUS', 'Sunset race, beachfront avenue. Lose and you walk home.'], type: 'drive', target: POI.beach, time: 80, reward: 600 },
  { title: 'Gudang Segara', giver: 'BAMBANG', brief: 'Clear the dock thugs out of the warehouse. Loud is fine.', say: ['BAMBANG', 'Four of them at the docks. Make it quick, make it quiet after.'], type: 'combat', target: POI.docks, time: 180, reward: 700 },
  { title: 'Kabur dari WPD', giver: 'SUGENG', brief: 'Three stars. Break line of sight and lose the heat.', say: ['SUGENG', 'Three stars and nowhere to hide. Time to disappear.'], type: 'escape', target: null, time: 120, reward: 550, wanted: 3 },
  { title: 'Heat Wave', giver: 'AGUS', brief: 'Outrun the helicopter — reach the docks!', say: ['SUGENG', 'Four stars and a helicopter. Time to show WPD my taillights.'], type: 'drive', target: POI.docks, time: 150, reward: 800, wanted: 4 },
  { title: 'Kencana Hilang', giver: 'BAMBANG', brief: 'The Kencana S was taken. Take it back to the garage.', say: ['BAMBANG', 'They stole my Kencana. Bring her home, Sugeng.'], type: 'steal', target: POI.kencana, target2: POI.garage, time: 180, reward: 650 },
  { title: 'Double Cross', giver: 'AGUS', brief: 'Reach the safehouse. Lose the heat if you can.', say: ['AGUS', 'Double cross at the marina, Sugeng. Wanto set the whole thing up.'], type: 'drive', target: POI.safehouse, time: 150, reward: 900, wanted: 3, night: true },
  { title: 'The Last Ride', giver: 'SUGENG', brief: 'Cross the whole city — reach the mansion.', say: ['SUGENG', 'Last ride. Everything on the line.'], type: 'drive', target: POI.mansion, time: 180, reward: 1500, wanted: 5 },
];

export const DISPATCH = [
  'quiet morning in Pasar Senja. All units routine patrol.',
  'air support on scene, suspect heading west downtown.',
  'units respond to the marina — suspect armed.',
  'roadblock on Jalan Merdeka — stop the suspect.',
  'all units, gold coupe reported stolen near the market.',
  'helicopter refuelling. Ground units hold the cordon.',
  'suspect last seen near Alun-Alun. Eyes open.',
];
export const RADIO = [
  { name: 'GAMELAN FM 101.1', tracks: ['Saron Senja', 'Srimpi', 'Gending Wilwatikta'] },
  { name: 'RADIO WILWATIKTA 88.4', tracks: ['Lorong Emas Blues', 'Pantai Kidul Nights', 'Bambang Boogie'] },
];
