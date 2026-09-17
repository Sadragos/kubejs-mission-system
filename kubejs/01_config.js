// Basisitems
const COIN_ITEM = 'kubejs:coin';
const MISSION_ITEM = 'kubejs:mission';
const MISSION_TOKEN = 'kubejs:mission_scroll';

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
    item: 100,
    kill: 80,
    journey: 25,
    missions: 20
};
const MIN_DIFFICULTY = 0.05;
const DIFFICULTY_BY_TYPE = false;

// Greeting (lang keys, resolved to a translated Component with the username as %s arg)
const DAILY_MESSAGE_KEYS = [
    'kubejs.daily.greeting.0', 'kubejs.daily.greeting.1', 'kubejs.daily.greeting.2',
    'kubejs.daily.greeting.3', 'kubejs.daily.greeting.4', 'kubejs.daily.greeting.5',
    'kubejs.daily.greeting.6', 'kubejs.daily.greeting.7', 'kubejs.daily.greeting.8',
    'kubejs.daily.greeting.9', 'kubejs.daily.greeting.10', 'kubejs.daily.greeting.11',
    'kubejs.daily.greeting.12', 'kubejs.daily.greeting.13', 'kubejs.daily.greeting.14',
    'kubejs.daily.greeting.15', 'kubejs.daily.greeting.16', 'kubejs.daily.greeting.17',
    'kubejs.daily.greeting.18', 'kubejs.daily.greeting.19', 'kubejs.daily.greeting.20',
    'kubejs.daily.greeting.21'
];

// Missions
const FALLBACK_EGG_CHANCE = 0.25;
const FALLBACK_MIN_AMOUNT = 64;
const FALLBACK_MAX_AMOUNT = FALLBACK_MIN_AMOUNT * 3;
const FALLBACK_MIN_COINS = 6;
const FALLBACK_MAX_COINS = FALLBACK_MIN_COINS * 2;
const COIN_REWARD_MINMIN = 1;
const COIN_REWARD_MINMAX = 3;
const MISSION_EGG_CHANCE_MULTIPLIER_MIN = -1;
const MISSION_EGG_CHANCE_MULTIPLIER_MAX = -1;
