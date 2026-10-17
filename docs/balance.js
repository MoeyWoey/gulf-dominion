// Gulf Dominion balance defaults, shared by the game (index.html) and the admin dashboard (admin.html).
// The dashboard's Balance tab saves overrides on the Worker; the game merges them over these defaults when it loads.
window.GD_NATION_CODES = [
  ['KW', 'Kuwait'], ['SA', 'Saudi Arabia'], ['BH', 'Bahrain'], ['QA', 'Qatar'], ['AE', 'UAE'], ['OM', 'Oman'],
  ['IQ', 'Iraq'], ['IR', 'Iran'], ['YE', 'Yemen'],
  // Middle East map only
  ['EG', 'Egypt'], ['JO', 'Jordan'], ['SY', 'Syria'], ['LB', 'Lebanon'], ['IL', 'Israel'], ['TR', 'Turkey'],
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
    EG: { drones: ['light'], missileTier: 2 },
    JO: { drones: ['light'], missileTier: 1 },
    SY: { drones: ['light'], missileTier: 1 },
    LB: { drones: ['light'], missileTier: 1 },
    IL: { drones: ['light'], missileTier: 3 },
    TR: { drones: ['light', 'strike', 'heavy'], missileTier: 2 },
  },
  // Drones from these nations stay hidden until they come within `reveal` tiles of the player's land
  stealth: { nations: ['IQ', 'IR', 'YE', 'SY', 'LB'], reveal: 8 },
  // Drone disadvantage for these nations: multipliers on cost, interceptability, blast radius and speed
  droneHandicap: { nations: ['KW', 'SA', 'BH', 'QA', 'AE', 'OM', 'EG', 'JO'], cost: 1.4, intercept: 1.3, radius: 0.8, speed: 0.9 },
  // Extra oil fields scattered across GCC land (0 = only the real fields, 0.1 = a lot more)
  oil: { gccExtra: 0.05 },
  // Radar: tracking range in tiles, and the hit-chance multiplier for air defense inside its own radar coverage
  radar: { range: 26, samBoost: 1.25 },
  // Silos are hidden from rivals; after firing they stay visible for `reveal` seconds
  silo: { reveal: 10 },
  // UAV recon flight: reveals hidden silos and drones for `duration` seconds, then needs `cooldown` seconds
  uav: { cost: 120, duration: 15, cooldown: 60 },
  // Special abilities by nation: UAV recon, and Drone rush (all ready drones at once at random enemy buildings)
  abilities: { uav: ['KW', 'SA', 'BH', 'QA', 'AE', 'OM', 'EG', 'JO', 'IL'], droneRush: ['IR', 'TR'] },
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
  cruiseHandicap: { nations: ['IQ', 'IR', 'YE', 'SY', 'LB'], cost: 1.5, reload: 1.4, slots: 2 },
  // Counter-battery radar: enemy silos that fire within `range` tiles stay revealed to you for `reveal` seconds
  counterBattery: { range: 55, reveal: 30 },
  // Ground combat (every nation). attackSpeed: how fast armies advance (1 = original pace). Taking a tile costs
  // tileBase + defDensity × (defender troops per tile); the defender loses defLoss × that cost. fort / capital / capitalRing:
  // how much harder land is to take near a fort, on the capital, and within 2 tiles of it. Troop regen per second is
  // regenBase + regenPerTile × tiles (+6 per city); troop cap is 300 + capPerTile × tiles. strikeTroops scales the share of a
  // nation's whole army that a drone or missile hit kills. fillPocket: empty pockets up to this many tiles that touch only one
  // nation's land are claimed by it automatically (0 = off). crater: missile hits empty the tiles within crater × blast radius
  // (0 = off); craterTime: seconds before an empty crater can be auto-claimed (anyone bordering it can still expand into it).
  combat: { attackSpeed: 0.5, tileBase: 4, defDensity: 1.5, defLoss: 0.35, fort: 2.5, capital: 4, capitalRing: 2, regenBase: 30, regenPerTile: 0.3, capPerTile: 10, strikeTroops: 0.5, fillPocket: 30, crater: 0.5, craterTime: 30 },
  // Nation perks. Multipliers: oil (oil income), cap (troop cap), regen (troop regen), gold (all gold), cityCost, mount (cost to
  // cross mountains), def (defense of all its land), mountDef (extra defense of its mountain tiles), missileCost, atk (cost of taking enemy land), neutral (cost of empty land).
  // Added amounts: coast (gold per coastal tile), cityCap (troop cap per city). startSilo: 1 = starts with a missile silo.
  perks: {
    KW: { oil: 1.6 },
    SA: { cap: 1.2 },
    BH: { regen: 1.12, coast: 0.1 },
    QA: { gold: 1.4 },
    AE: { cityCost: 0.65 },
    OM: { mount: 0.5, def: 1.15 },
    IQ: { regen: 1.1, cityCap: 100 },
    IR: { missileCost: 0.7, startSilo: 1 },
    YE: { atk: 0.75, neutral: 0.85, mount: 0.5, cap: 1.2, def: 1.25, mountDef: 1.6, regen: 1.2 },
    // Middle East map only. Extra keys: desert (cost to cross deserts), samPow (air defense accuracy), samR (added air defense range), droneCost
    EG: { coast: 0.1, def: 1.1, neutral: 1.15 },
    JO: { desert: 0.5, def: 1.2, neutral: 0.85 },
    SY: { missileCost: 0.75, mountDef: 1.4, regen: 1.08 },
    LB: { mountDef: 1.6, def: 1.1 },
    IL: { samPow: 1.25, samR: 1, def: 1.2, atk: 0.85, regen: 1.1 },
    TR: { droneCost: 0.75, cap: 1.2, mount: 0.6, regen: 1.08 },
  },
  // AI targeting. bloc: how much less attractive a same-bloc nation is as a target (GCC vs GCC, Iraq/Iran/Yemen vs each other);
  // blocChance: chance an AI still attacks a same-bloc nation it picked. pile: once an AI nation has recently lost this share of its
  // land (losses fade over pileTime seconds), other AIs stop opening new attacks or landings on it until it recovers; 0 = off.
  // Stops the whole GCC taking turns on Yemen. Never shields the player.
  ai: { bloc: 6, blocChance: 0.05, pile: 0.04, pileTime: 60 },
  // Heat difficulty: how much each heat level above 1 adds for AI rivals. Heat 1 is the baseline (regen ×0.92, cap ×1,
  // 300 starting troops, attack once 56% of cap is ready and send 37% of troops, strikes from 150 s).
  // regen/cap/troops: added multiplier per level; aggression: lower attack threshold per level; sendMore: bigger share sent
  // per level; playerFocus: how much more they pick on you per level; strikesEarlier: seconds earlier strikes begin per level.
  heat: { regen: 0.2, cap: 0.2, troops: 0.2, aggression: 0.1, sendMore: 0.12, playerFocus: 0.12, strikesEarlier: 20 },
  // Realistic mode (switch beside Begin campaign), applied to every nation: gold income and land-cost multipliers, pearl reward and diplomacy price multipliers,
  // and blocLoyalty: how much nations still spare their own bloc (1 = as in normal games, 0 = everyone treats everyone the same)
  realistic: { gold: 0.5, land: 2, pearls: 1.5, diplomacy: 0.75, blocLoyalty: 0.8 },
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
