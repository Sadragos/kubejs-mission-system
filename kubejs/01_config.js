// Basisitems
const COIN_ITEM = 'kubejs:coin';
const COIN_ITEM_NAME = 'Coin';
const MISSION_ITEM = 'kubejs:mission';
const MISSION_ITEM_NAME = 'Auftrag';
const MISSION_TOKEN = 'kubejs:mission_scroll';

// Regex
const TYPE_REGEX = /Auftrag: (.+?) §6(\d+[x|m] )?.+§r/
const NAME_REGEX = /Auftrag: .+? §6\d+[x|m] ?(.+)§r/
const COINS_REGEX = /Belohnung: §6(\d+) Coins?/
const ITEM_REGEX = /Ziel: (.+)/
const ERSTELLT_REGEX = /Erstellt: (.+)/
const PLAYER_REGEX = /Von: (.+)/
const LEVEL_REGEX = /Level: (.+) ?%/
const EGG_CHANCE_REGEX = /Ei-Chance: (.+) ?%/

// Quick Events & Missions
const AVG_MISSIONS_PER_HOUR = 0.7;
const AVG_MISSION_PER_HOUR_PLAYER = 0.2;
const MISSION_SUMMON_MAX_PLAYER_DIST = 16 * 8;
const CHECK_INTERVAL = 100;
const ANNOUNCE_INTERVAL_SECONDS = 60;
const MISSION_MIN_TIME = 20 * 60 * 10;
const MISSION_MAX_TIME = MISSION_MIN_TIME + (20 * 60 * 15)
const REWARD_ITEM = MISSION_TOKEN;
const MISSION_SWAP_FEE = 2;
const BONUS_REWARD_CHANCE = 0.3;
const MAX_TIME_BONUS = 1;

// Sonstiges
const TICKS_PER_SECOND = 20;
const TICKS_PER_MINUTE = TICKS_PER_SECOND * 60;
const TICKS_PER_HOUR = TICKS_PER_MINUTE * 60;
const CURSE_CHANCE = 0.05;
const MULTIPLAYER_PERCENTAGE = 0.7;
const MISSION_TARGET_PLAYER_MULT = 0.35;

// Schwierigkeit
const MISSION_TYPE_GOALS = {
    item: 400,
    kill: 250,
    journey: 60,
    missions: 40
};

// Greeting
const DAILY_MESSAGE = [
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
    "§aIst USERNAME anwesend? Auftrag für dich!",
    "§aAh, USERNAME. Perfektes Timing. Ich hab was für dich.",
    "§aGuten Morgen, USERNAME! Kaffee kann warten, Arbeit nicht.",
    "§aUSERNAME! Genau die Person, die ich brauchte.",
    "§aKeine Ausreden, USERNAME. Hier ist deine Mission.",
    "§aSieh an, USERNAME ist online. Dann kann's ja losgehen.",
    "§aUSERNAME, du siehst aus als hättest du Lust auf Arbeit. Stimmt's?",
    "§aFür dich, USERNAME. Frisch eingetroffen.",
    "§aDu weißt was das bedeutet, USERNAME. An die Arbeit!",
    "§aWillkommen, USERNAME. Ich hab hier was, das deinen Namen trägt.",
    "§aUSERNAME ist da! Na dann, hier deine Aufgaben für heute.",
    "§aHey USERNAME, die Welt rettet sich nicht von allein."
];

// Missions
const FALLBACK_EGG_CHANCE = 0.25;
const FALLBACK_MIN_AMOUNT = 64;
const FALLBACK_MAX_AMOUNT = FALLBACK_MIN_AMOUNT * 3;
const FALLBACK_MIN_COINS = 6;
const FALLBACK_MAX_COINS = FALLBACK_MIN_COINS * 2;
const MISSION_EGG_CHANCE_MULTIPLIER_MIN = -1;
const MISSION_EGG_CHANCE_MULTIPLIER_MAX = -1;
