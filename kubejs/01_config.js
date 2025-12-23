// Basisitems
const coinItem = 'kubejs:coin';
const missionItem = 'kubejs:mission';
const missionToken = 'kubejs:mission_scroll';

// Regex
const typeRegEx = /Auftrag: (.+?) §6(\d+[x|m] )?.+§r/
const nameRegEx = /Auftrag: .+? §6\d+[x|m] ?(.+)§r/
const coinsRegex = /Belohnung: §6(\d+) Coins?/
const itemRegex = /Ziel: (.+)/
const erstelltRegex = /Erstellt: (.+)/
const playerRegex = /Von: (.+)/
const levelRegex = /Level: (.+) ?%/
const eggChanceRegex = /Ei-Chance: (.+) ?%/

// Quick Evens & Missions
let avgMissionsPerHour = 0.7;
let avgMissionPerHourPlayer = 0.2;
let missionSummonMaxPlayerDist = 16 * 8;
let checkInterval = 100;
let announceIntervalSeconds = 60;
let missionMinTime = 20 * 60 * 10;
let missionMaxTime = missionMinTime + (20 * 60 * 15)
let rewardItem = missionToken;
let missionSwapFee = 2;
let bonusRewardChance = 0.3;
let maxTimeBonus = 1;

// Sonstiges
let ticksPerSecond = 20;
let ticksPerMinute = ticksPerSecond * 60;
let ticksPerHour = ticksPerMinute * 60;
let curseChance = 0.05;
const HUNT_SCOREBOARD_NAME = 'quest_hunt_score';
const MULTIPLAYER_PERCENTAGE = 0.7;
const MISSION_TARGET_PLAYER_MULT = 0.35;

// Schwierigkeit
let playTimeTarget = 20 * 60 * 60 * 24 * 3;     // 3 Tage
let mobKillsTarget = 10000;

// Greeting
const dailyMessage = [
    "§aHallo USERNAME! Schön dass du da bist. Hier, geh schaffen!",
    "§aHi USERNAME! Willkommen zurück! Hier, eine kleine Aufgabe für dich!",
    "§aOh, da bist du ja, USERNAME. Könntest du das hier für mich erledigen?",
    "§aHey Username, wie wär es, wenn du das hier für mich machst?",
    "§aNeuer Tag, neuer Job. Hol ihn dir, USERNAME!",
    "§aHallo USERNAME! Ein kleiner gruß für dich.",
    "§aHoffentlich bist du fit, USERNAME. Es gibt nämlich Arbeit.",
    "§aHey, wie gehts USERNAME? Zeit für ne Mission?",
    "§aHallo USERNAME! Langweilig? Bitteschön!",
    "§aMöp. Arbeit für USERNAME.",
    "§aIst USERNAME anwesend? Auftrag für dich!"
];

// Missions
const FALLBACK_EGG_CHANCE = 0.25;
const FALLBACK_MIN_AMOUNT = 64;
const FALLBACK_MAX_AMOUNT = FALLBACK_MIN_AMOUNT * 3;
const FALLBACK_MIN_COINS = 6;
const FALLBACK_MAX_COINS = FALLBACK_MIN_COINS * 2;
const MISSION_EGG_CHANCE_MULTIPLIER_MIN = -1;
const MISSION_EGG_CHANCE_MULTIPLIER_MAX = -1;