// Gulf Dominion balance defaults, shared by the game (index.html) and the admin dashboard (admin.html).
// The dashboard's Balance tab saves overrides on the Worker; the game merges them over these defaults when it loads.
window.GD_NATION_CODES = [
  ['KW', 'Kuwait'], ['SA', 'Saudi Arabia'], ['BH', 'Bahrain'], ['QA', 'Qatar'], ['AE', 'UAE'], ['OM', 'Oman'],
  ['IQ', 'Iraq'], ['IR', 'Iran'], ['YE', 'Yemen'],
];

window.GD_BALANCE_DEFAULTS = {
  // troops = % of the target nation's troops killed per hit; intercept = multiplier on air defense hit chance (higher = easier to shoot down)
  drones: {
    light: { name: 'Light drone', cost: 45, radius: 1, speed: 3, troops: 3, intercept: 1 },
    strike: { name: 'Strike drone', cost: 85, radius: 1.6, speed: 2.6, troops: 5, intercept: 1.1 },
    heavy: { name: 'Heavy drone', cost: 140, radius: 2.3, speed: 2.2, troops: 8, intercept: 1.25 },
  },
  // reload = multiplier on the silo's reload time after firing this tier
  missiles: {
    t1: { name: 'Missile I', cost: 200, radius: 2, speed: 6, troops: 8, intercept: 1, reload: 1 },
    t2: { name: 'Missile II', cost: 420, radius: 3, speed: 7, troops: 11, intercept: 0.9, reload: 1.5 },
    t3: { name: 'Missile III', cost: 750, radius: 4, speed: 8, troops: 15, intercept: 0.8, reload: 2.2 },
    cruise: { name: 'Cruise missile', cost: 300, radius: 1.5, speed: 5, troops: 6, intercept: 0.6, reload: 1.3 },
  },
  // Which drone types each nation can fly, and the highest missile tier it can fire (0 = none)
  arsenal: {
    KW: { drones: ['light'], missileTier: 3 },
    SA: { drones: ['light'], missileTier: 3 },
    BH: { drones: ['light'], missileTier: 3 },
    QA: { drones: ['light'], missileTier: 3 },
    AE: { drones: ['light'], missileTier: 3 },
    OM: { drones: ['light'], missileTier: 3 },
    IQ: { drones: ['light'], missileTier: 1 },
    IR: { drones: ['light', 'strike', 'heavy'], missileTier: 1 },
    YE: { drones: ['light'], missileTier: 1 },
  },
  // Drones from these nations stay hidden until they come within `reveal` tiles of the player's land
  stealth: { nations: ['IQ', 'IR', 'YE'], reveal: 8 },
  // Drone disadvantage for these nations: multipliers on cost, interceptability, blast radius and speed
  droneHandicap: { nations: ['KW', 'SA', 'BH', 'QA', 'AE', 'OM'], cost: 1.4, intercept: 1.3, radius: 0.8, speed: 0.9 },
  // Extra oil fields scattered across GCC land (0 = only the real fields, 0.1 = a lot more)
  oil: { gccExtra: 0.05 },
  // Radar: tracking range in tiles, and the hit-chance multiplier for air defense inside its own radar coverage
  radar: { range: 26, samBoost: 1.25 },
  // Silos are hidden from rivals; after firing they stay visible for `reveal` seconds
  silo: { reveal: 10 },
  // UAV recon flight: reveals hidden silos and drones for `duration` seconds, then needs `cooldown` seconds
  uav: { cost: 120, duration: 15, cooldown: 60 },
  // Special abilities by nation: UAV recon, and Drone rush (all ready drones at once at random enemy buildings)
  abilities: { uav: ['KW', 'SA', 'BH', 'QA', 'AE', 'OM'], droneRush: ['IR'] },
  // Drone rush: each drone costs `discount` × its normal price; then the ability needs `cooldown` seconds
  droneRush: { discount: 0.5, cooldown: 90 },
  // Achievement goals that unlock content for you and every AI: strikes for tier II, buildings destroyed for tier III, radars for UAV, drones for Drone rush
  unlocks: { tier2Strikes: 15, tier3Buildings: 40, uavRadars: 3, rushDrones: 60 },
  // World news: first headline after `first` seconds, then one every `min`–`max` seconds; effects last `duration` seconds
  news: { first: 200, min: 280, max: 420, duration: 60 },
  // Diplomacy: ceasefire and alliance length in seconds, and a multiplier on what AI nations charge
  diplomacy: { ceasefire: 60, alliance: 180, costMul: 1 },
  // Cruise missiles fly under radar: seen only within `reveal` tiles of your land; air defense engages them within `samRange` × its range
  cruise: { reveal: 5, samRange: 0.5 },
  // Cruise missile handicap: cost and reload multipliers, and silo slots used per launch
  cruiseHandicap: { nations: ['IQ', 'IR', 'YE'], cost: 1.5, reload: 1.4, slots: 2 },
  // Counter-battery radar: enemy silos that fire within `range` tiles stay revealed to you for `reveal` seconds
  counterBattery: { range: 55, reveal: 30 },
};

// Merge saved overrides over the defaults, keeping only known keys and sane values.
window.GD_mergeBalance = function merge(def, over) {
  if (Array.isArray(def)) return Array.isArray(over) ? over.filter((v) => typeof v === 'string').slice(0, 20) : def.slice();
  const out = {};
  for (const k of Object.keys(def)) {
    const d = def[k], o = over && typeof over === 'object' ? over[k] : undefined;
    if (Array.isArray(d)) out[k] = Array.isArray(o) ? o.filter((v) => typeof v === 'string').slice(0, 20) : d.slice();
    else if (d && typeof d === 'object') out[k] = merge(d, o);
    else if (typeof d === 'number') out[k] = typeof o === 'number' && isFinite(o) ? Math.max(0, Math.min(100000, o)) : d;
    else if (typeof d === 'string') out[k] = typeof o === 'string' && o.trim() ? o.trim().slice(0, 40) : d;
    else out[k] = d;
  }
  return out;
};
