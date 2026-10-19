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
  // Which drone types each nation can fly, the highest missile tier it can fire (0 = none), and whether it can build
  // rocket artillery and coastal anti-ship batteries (1 = yes, 0 = no)
  arsenal: {
    KW: { drones: ['light'], missileTier: 3, artillery: 0, antiShip: 0 },
    SA: { drones: ['light'], missileTier: 3, artillery: 0, antiShip: 0 },
    BH: { drones: ['light'], missileTier: 3, artillery: 0, antiShip: 0 },
    QA: { drones: ['light'], missileTier: 3, artillery: 0, antiShip: 0 },
    AE: { drones: ['light'], missileTier: 3, artillery: 0, antiShip: 0 },
    OM: { drones: ['light'], missileTier: 3, artillery: 0, antiShip: 0 },
    IQ: { drones: ['light'], missileTier: 1, artillery: 0, antiShip: 0 },
    IR: { drones: ['light', 'strike', 'heavy'], missileTier: 1, artillery: 0, antiShip: 1 },
    YE: { drones: ['light'], missileTier: 1, artillery: 0, antiShip: 1 },
    EG: { drones: ['light'], missileTier: 2, artillery: 0, antiShip: 1 },
    JO: { drones: ['light'], missileTier: 1, artillery: 0, antiShip: 0 },
    SY: { drones: ['light'], missileTier: 1, artillery: 1, antiShip: 0 },
    LB: { drones: ['light'], missileTier: 1, artillery: 1, antiShip: 0 },
    IL: { drones: ['light'], missileTier: 3, artillery: 1, antiShip: 0 },
    TR: { drones: ['light', 'strike', 'heavy'], missileTier: 2, artillery: 1, antiShip: 0 },
  },
  // Rocket artillery (Artillery building): cost per salvo, reach in tiles, rockets per salvo, blast radius of each rocket,
  // troops = % of the target nation's troops each rocket kills, reload seconds after a salvo, spread = how far rockets scatter
  // (tiles), bld = chance a rocket wrecks a building it lands on, intercept = multiplier on air defense hit chance, bldCost = building price
  artillery: { name: 'Rocket artillery', cost: 40, range: 18, rockets: 6, radius: 0.9, troops: 0.7, reload: 12, spread: 3, speed: 4, bld: 0.12, intercept: 0.5, bldCost: 140 },
  // Coastal anti-ship battery: fires by itself at enemy warships, dhows and ports within `range` tiles. mag missiles, then
  // `reload` seconds. A hit sinks a ship or dhow; a port is wrecked with chance `portHit`. intercept as above; bldCost = building price
  antiShip: { name: 'Anti-ship missile', range: 22, mag: 2, reload: 20, speed: 6, intercept: 0.8, portHit: 0.35, bldCost: 170 },
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
  unlocks: { tier2Strikes: 60, tier3Buildings: 150, uavRadars: 8, rushDrones: 250 },
  // Majlis upgrades: price of the first level, × growth for each further level, and the number of levels
  upgrades: {
    troops: { name: 'Majlis levies', base: 40, grow: 1.6, max: 10 },
    regen: { name: 'Recruitment halls', base: 50, grow: 1.65, max: 10 },
    home: { name: 'Ancestral lands', base: 75, grow: 2.05, max: 4 },
    gold: { name: 'Treasury', base: 30, grow: 1.55, max: 10 },
    cost: { name: 'Bedouin pathfinders', base: 65, grow: 1.7, max: 8 },
    choice: { name: 'Wise council', base: 200, grow: 2.55, max: 2 },
    reroll: { name: 'Second opinion', base: 100, grow: 2.05, max: 3 },
    fortune: { name: 'Pearl merchants', base: 65, grow: 1.75, max: 6 },
    siloMag: { name: 'Deep silos', base: 1000, grow: 3.55, max: 3 },
    sam: { name: 'Air defense network', base: 150, grow: 2.25, max: 2 },
    dhow: { name: 'Dhow fleet', base: 50, grow: 1.65, max: 15 },
  },
  // Decree drawbacks (Common and Rare decrees; Epic ones have none). Each value multiplies that stat when the decree is taken:
  // gold, regen, cap, def, samPow, navy, boatSpeed (below 1 = worse); atk, missileCost, desert, mount, reload (above 1 = worse).
  // troopsNow: share of troops lost at once; goldNow: gold lost at once.
  decrees: {
    falcon: { name: 'Falcon scouts', gold: 0.9 },
    bedouin: { name: 'Bedouin riders', mount: 1.2 },
    mount: { name: 'Mountain guides', desert: 1.2 },
    consc: { name: 'Conscription', regen: 0.9 },
    muster: { name: 'Majlis muster', cap: 0.9 },
    walls: { name: 'Mud-brick walls', atk: 1.1 },
    pearl: { name: 'Pearl banks', gold: 0.95 },
    souq: { name: 'Grand souq', regen: 0.9 },
    chest: { name: 'Merchant caravan', troopsNow: 0.15 },
    reinf: { name: 'Reinforcements', goldNow: 150 },
    diver: { name: 'Master diver', gold: 0.9 },
    layer: { name: 'Layered air defense', reload: 1.15 },
    bunker: { name: 'Hardened bunkers', gold: 0.9 },
    workshop: { name: 'Drone workshops', missileCost: 1.2 },
    drums: { name: 'War drums', def: 0.9 },
    oil: { name: 'Oil boom', regen: 0.9 },
    blitz: { name: 'Blitz', atk: 1.1 },
    urban: { name: 'Urban planning', gold: 0.9 },
    fortd: { name: 'Fortress doctrine', atk: 1.1 },
    plunder: { name: 'Plunder', def: 0.9 },
    armada: { name: 'Dhow armada', navy: 0.8 },
    navy: { name: 'Royal navy', boatSpeed: 0.8 },
    hyper: { name: 'Hypersonic warheads', missileCost: 1.25 },
    arsenal: { name: 'Strategic arsenal', reload: 1.15 },
    rearm: { name: 'Rapid rearm', samPow: 0.9 },
    mag: { name: 'Deep magazines', reload: 1.2 },
    falaj: { name: 'Falaj irrigation', cap: 0.85 },
  },
  // Pearl achievements: the goal (cumulative across campaigns, or the best single campaign for land %) and the pearls it pays.
  // The four weapon-unlock achievements use the unlocks goals above.
  achievements: {
    first_run: { name: 'First campaign', goal: 1, pearls: 20 },
    expand10: { name: 'Expansionist (land %)', goal: 15, pearls: 30 },
    capital: { name: 'Kingmaker (capitals)', goal: 3, pearls: 40 },
    intercepts: { name: 'Iron wall (interceptions)', goal: 200, pearls: 60 },
    kills: { name: 'Conqueror (rivals eliminated)', goal: 3, pearls: 50 },
    expand30: { name: 'Regional power (land %)', goal: 40, pearls: 80 },
    win: { name: 'Dominion (wins)', goal: 1, pearls: 100 },
    cruise: { name: 'Under the radar (cruise hits)', goal: 30, pearls: 50 },
    treaties: { name: 'Peacemaker (treaties)', goal: 10, pearls: 50 },
    dailies: { name: 'Daily devotion (days)', goal: 7, pearls: 120 },
    realwin: { name: 'Hard truths (Realistic wins)', goal: 1, pearls: 150 },
    heat3: { name: 'Under fire (heat level won)', goal: 3, pearls: 200 },
  },
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
  combat: { attackSpeed: 0.5, tileBase: 4, defDensity: 1.5, defLoss: 0.35, fort: 2.5, capital: 4, capitalRing: 2, regenBase: 30, regenPerTile: 0.3, capPerTile: 10, strikeTroops: 0.5, fortRadius: 4, fillPocket: 30, crater: 0.5, craterTime: 30 },
  // Nation perks. Multipliers: oil (oil income), cap (troop cap), regen (troop regen), gold (all gold), cityCost, mount (cost to
  // cross mountains), def (defense of all its land), mountDef (extra defense of its mountain tiles), missileCost, atk (cost of taking enemy land), neutral (cost of empty land).
  // Added amounts: coast (gold per coastal tile), cityCap (troop cap per city). startSilo: 1 = starts with a missile silo.
  perks: {
    KW: { respect: 2, oil: 1.6, def: 1.6, cap: 1.25, regen: 1.08 }, // respect (Diplomacy): rivals see it as a 2× less attractive target
    SA: { cap: 1.25, neutral: 0.8, def: 1.15, regen: 1.05 },
    BH: { regen: 1.12, coast: 0.1 },
    QA: { gold: 1.4 },
    AE: { cityCost: 0.65 },
    OM: { mount: 0.5, def: 1.15 },
    IQ: { regen: 1.1, cityCap: 100 },
    IR: { missileCost: 0.7, startSilo: 1 },
    YE: { atk: 0.75, neutral: 0.85, mount: 0.5, cap: 1.2, def: 1.25, mountDef: 1.6, regen: 1.2 },
    // Middle East map only. Extra keys: desert (cost to cross deserts), samPow (air defense accuracy), samR (added air defense range), droneCost, artyCost (rocket artillery salvos)
    EG: { coast: 0.1, def: 1.1, neutral: 1.15 },
    JO: { desert: 0.5, def: 1.2, neutral: 0.85 },
    SY: { missileCost: 0.75, mountDef: 1.4, regen: 1.08 },
    LB: { mountDef: 1.6, def: 1.1, artyCost: 0.7 },
    IL: { samPow: 1.25, samR: 1, def: 1.2, atk: 0.85, regen: 1.1 },
    TR: { droneCost: 0.75, cap: 1.2, mount: 0.6, regen: 1.08 },
  },
  // AI targeting. bloc: how much less attractive a same-bloc nation is as a target (GCC vs GCC, Iraq/Iran/Yemen vs each other);
  // blocChance: chance an AI still attacks a same-bloc nation it picked. pile: once an AI nation has recently lost this share of its
  // land (losses fade over pileTime seconds), other AIs stop opening new attacks or landings on it until it recovers; 0 = off.
  // Stops the whole GCC taking turns on Yemen. Never shields the player.
  // fortTiles: AI nations may keep one fort per this many tiles (on threatened borders); stuckTime: seconds at its troop cap
  // before an AI puts cities and air defense first
  ai: { bloc: 6, blocChance: 0.05, pile: 0.04, pileTime: 60, fortTiles: 300, stuckTime: 25, leaderPct: 30, leaderFocus: 3, leaderLoyalty: 0.3, leaderDef: 1.6,
    gang: 2, pilePlayer: 1, focusFloor: 0.75 },
  // Anti-pile-on: an AI won't open a new attack on a nation that `gang` other nations are already attacking (0 = no limit; counter-attacks
  // are never blocked); pilePlayer 1 = the breather also protects the player; focusFloor = the lowest Heat player focus (1 = the AI
  // sees the player as it really is, lower = the player looks weaker, so it is targeted more).
  // Leader coalition: once the biggest nation holds leaderPct% of the land, AI rivals see it as leaderFocus× more attractive
  // to attack and strike, their bloc loyalty toward it is multiplied by leaderLoyalty, and the leader's attacks on nations cost leaderDef× more.
  // Blocs: nations in the same bloc mostly spare each other. loyalty (normal games) and realistic (Realistic mode) run from
  // 1 = full loyalty to 0 = they treat each other like anyone else. A nation in no bloc stands alone; a nation listed in two
  // blocs belongs to the first. Codes not on the current map are ignored. Edit, add or remove blocs in the dashboard.
  blocs: [
    { name: 'Gulf and Arab partners', nations: ['KW', 'SA', 'BH', 'QA', 'AE', 'OM', 'EG', 'JO'], loyalty: 1, realistic: 0.6 },
    { name: 'Militias', nations: ['IQ', 'IR', 'YE', 'SY', 'LB'], loyalty: 1, realistic: 0.6 },
  ],
  // Heat difficulty: how much each heat level above 1 adds for AI rivals. Heat 1 is the baseline (regen ×0.92, cap ×1,
  // 300 starting troops, attack once 56% of cap is ready and send 37% of troops, strikes from 150 s).
  // regen/cap/troops: added multiplier per level; aggression: lower attack threshold per level; sendMore: bigger share sent
  // per level; playerFocus: how much more they pick on you per level; strikesEarlier: seconds earlier strikes begin per level.
  heat: { regen: 0.12, cap: 0.12, troops: 0.12, aggression: 0.06, sendMore: 0.08, playerFocus: 0.08, strikesEarlier: 12 },
  // Tribes: small neutral camps scattered over the map (count is for the Gulf map; the Middle East map gets more by land area).
  // Each starts with about `size` tiles that cost `cost`× normal empty land to take; taking the last tile pays `gold` (× Realistic gold).
  // Every `grow` seconds each camp spreads onto one more empty tile next to it, up to `maxSize` tiles (grow 0 = camps never grow).
  tribes: { count: 14, size: 12, cost: 2.5, gold: 250, grow: 20, maxSize: 30 },
  // Playtest switches (1 = on): hide the store everywhere, and show a 'playtest build, send feedback' banner on the home screen
  testing: { hideStore: 0, banner: 0 },
  // Realistic mode (switch beside Begin campaign), applied to every nation: gold income and land-cost multipliers, pearl reward and diplomacy price multipliers,
  // Realistic extras: overextension (past overStart% of the land, regen and troop cap drop overPer per extra %, down to overMin),
  // unrest (land taken from a nation gives no gold or regen for unrest seconds; a taken capital rebels back to its old owner if the
  // taker's troops fall below revoltBelow × its cap during that time, freeing land within revoltR tiles), an earlier and harder
  // leader coalition (leaderPct, leaderDef replace the AI targeting values), decree milestones × decreeGap and choices per decree.
  realistic: { gold: 0.5, land: 2, pearls: 1.5, diplomacy: 0.75,
    overStart: 20, overPer: 0.02, overMin: 0.4, unrest: 60, revoltBelow: 0.35, revoltR: 5,
    leaderPct: 20, leaderDef: 1.8, decreeGap: 1.5, choices: 2 },
};

// Merge saved overrides over the defaults, keeping only known keys and sane values.
window.GD_mergeBalance = function merge(def, over) {
  if (Array.isArray(def)) return Array.isArray(over) ? over.filter((v) => typeof v === 'string').slice(0, 20) : def.slice();
  const out = {};
  for (const k of Object.keys(def)) {
    const d = def[k], o = over && typeof over === 'object' ? over[k] : undefined;
    const n01 = (v, dv) => (typeof v === 'number' && isFinite(v) ? Math.max(0, Math.min(1, v)) : dv);
    if (Array.isArray(d) && d.length && typeof d[0] === 'object') // a list of groups (blocs)
      out[k] = (Array.isArray(o) ? o : d).filter((x) => x && typeof x === 'object').slice(0, 12).map((x) => ({
        name: String(x.name || 'Bloc').trim().slice(0, 40) || 'Bloc',
        nations: Array.isArray(x.nations) ? x.nations.filter((v) => typeof v === 'string').slice(0, 30) : [],
        loyalty: n01(x.loyalty, 1), realistic: n01(x.realistic, 0.6),
      }));
    else if (Array.isArray(d)) out[k] = Array.isArray(o) ? o.filter((v) => typeof v === 'string').slice(0, 20) : d.slice();
    else if (d && typeof d === 'object') out[k] = merge(d, o);
    else if (typeof d === 'number') out[k] = typeof o === 'number' && isFinite(o) ? Math.max(0, Math.min(100000, o)) : d;
    else if (typeof d === 'string') out[k] = typeof o === 'string' && o.trim() ? o.trim().slice(0, 40) : d;
    else out[k] = d;
  }
  return out;
};
