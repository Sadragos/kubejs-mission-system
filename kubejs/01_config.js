// Basisitems: interne IDs der von diesem Datapack registrierten Items (siehe startup_scripts/main.js)
const COIN_ITEM = 'kubejs:coin';
const MISSION_CONTRACT = 'kubejs:mission';
const MISSION_SCROLL = 'kubejs:mission_scroll';

// Quick Events & Missions
// Durchschnittliche Anzahl Quick Events pro Stunde, wenn niemand online ist ("Sockel"-Rate)
const AVG_MISSIONS_PER_HOUR = 0.7;
// Zusätzliche Events pro Stunde und Online-Spieler (steigt also mit der Spieleranzahl)
const AVG_MISSION_PER_HOUR_PLAYER = 0.2;
// Maximale Entfernung (in Blöcken) vom Zielspieler, in der Dieb/Airdrop erscheinen
const MISSION_SUMMON_MAX_PLAYER_DIST = 16 * 8;
// Alle wie viele Ticks der Event-Würfel-/Tick-Handler prüft (20 Ticks = 1 Sekunde)
const CHECK_INTERVAL = 100;
// Wie oft (in Sekunden) während eines laufenden Events die Restzeit angesagt wird
const ANNOUNCE_INTERVAL_SECONDS = 60;
// Zufällige Laufzeit eines Quick Events in Ticks: zwischen MISSION_MIN_TIME und MISSION_MAX_TIME
const MISSION_MIN_TIME = 20 * 60 * 10;
const MISSION_MAX_TIME = MISSION_MIN_TIME + (20 * 60 * 15)
// Item, das als "Bonus"-Belohnung verwendet wird (z.B. Airdrop-Fallback-Inhalt) - aktuell die Auftragsrolle
const REWARD_ITEM = MISSION_SCROLL;
// Preis (in Coins, im Nebenhand-Slot) um eine Mission gegen eine neue einzutauschen
const MISSION_SWAP_FEE = 2;
// Maximaler Zeitbonus-Multiplikator (1 = bis zu +100% Belohnung) bei sehr schneller Event-Erfüllung,
// linear abgebaut über die erste Hälfte der Eventlaufzeit
const MAX_TIME_BONUS = 1;
// Zusätzlicher globaler Multiplikator für Quick-Event-Belohnungen, multiplikativ mit dem
// Server-Durchschnittsfortschritt verrechnet (siehe generateRewards in 20_quick_events.js) -
// macht Quick Events grundsätzlich lohnenswerter als einzelne Missionen.
const QE_REWARD_MULTIPLIER = 1.5;

// Sonstiges
const TICKS_PER_SECOND = 20;
const TICKS_PER_MINUTE = TICKS_PER_SECOND * 60;
const TICKS_PER_HOUR = TICKS_PER_MINUTE * 60;
// Chance (0-1), dass eine neu gewürfelte Mission stattdessen eine "verfluchte" Wilde Jagd/Gemätzel
// auslöst (Strafe bei Fehlschlag, siehe CURSE_EFFECTS)
const CURSE_CHANCE = 0.05;
// Chance (0-1), dass ein Hunt-Event als Koop-Variante (alle gegen ein gemeinsames Ziel) statt solo
// (wer zuerst fertig ist gewinnt) gestartet wird
const MULTIPLAYER_PERCENTAGE = 0.7;
// Pro Online-Spieler wird das Hunt-/Bestellung-Ziel (targetAmount) um diesen Faktor multipliziert
// erhöht, damit Events bei mehr Spielern entsprechend mehr verlangen
const MISSION_TARGET_PLAYER_MULT = 0.35;

// Schwierigkeit
// Wie viele abgeschlossene Missionen pro Typ als "100% Fortschritt" gelten (siehe getPlayerProgress);
// bestimmt, wie schnell Belohnungsmengen/-ziele mit der Spielererfahrung skalieren
const MISSION_TYPE_GOALS = {
    item: 100,
    kill: 80,
    journey: 25,
    missions: 20
};
// Fortschritt, den ein Spieler mindestens "hat", auch ganz am Anfang (verhindert Division durch 0
// bzw. unfair niedrige Anfangsbelohnungen)
const MIN_DIFFICULTY = 0.05;
// false = Fortschritt wird über alle Missionstypen gemeinsam berechnet (ein Pool);
// true = jeder Missionstyp hat seinen eigenen, unabhängigen Fortschritt
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

// Missions: Fallback-Werte, die greifen, wenn eine CSV-Zeile die jeweilige Spalte leer lässt
// Chance (0-1), dass eine Kill-Mission zusätzlich ein Spawn-Ei als Belohnung anbietet, falls die
// CSV-Zeile keine eigene eggChance definiert
const FALLBACK_EGG_CHANCE = 0.25;
const FALLBACK_MIN_AMOUNT = 64;
const FALLBACK_MAX_AMOUNT = FALLBACK_MIN_AMOUNT * 3;
const FALLBACK_MIN_COINS = 12;
const FALLBACK_MAX_COINS = FALLBACK_MIN_COINS * 2;
// Spanne, aus der der "Mindest-Coins"-Wert für die Belohnungsberechnung gewürfelt wird, wenn eine
// Mission/ein Event selbst keinen expliziten Minimalwert vorgibt
const COIN_REWARD_MINMIN = 2;
const COIN_REWARD_MINMAX = 6;
// Multiplikator-Spanne, die auf die eggChance einer neu gewürfelten Kill-Mission angewendet wird.
// Bei -1/-1 (aktuell) wird die eggChance dadurch immer negativ, was Ei-Drops aus Kill-Missionen
// effektiv komplett deaktiviert - hinweis: das Feature ist ohnehin unvollständig, finishMission()
// rollt aktuell nirgends tatsächlich ein Ei für abgeschlossene Kill-Missionen aus.
const MISSION_EGG_CHANCE_MULTIPLIER_MIN = -1;
const MISSION_EGG_CHANCE_MULTIPLIER_MAX = -1;

// Gewichte: relative Wahrscheinlichkeit, mit der ein Missionstyp bzw. Quick Event gegenüber
// den anderen gewürfelt wird (höher = häufiger). "missions"/"präsent" sind absichtlich selten.
const MISSION_TYPE_WEIGHTS = { item: 13, kill: 8, journey: 2, missions: 1 };
const QUICK_EVENT_WEIGHTS = { thief: 2, airdrop: 2, present: 1, hunt: 4, request: 2, race: 2 };

// Wettrennen-Event: Zielpunkt wird in zufälliger Distanz (X/Z, Höhe irrelevant) zum Weltspawn gewählt
const RACE_MIN_DISTANCE = 300;
const RACE_MAX_DISTANCE = 3000;
// Entfernung (Blöcke), ab der ein Spieler per Chat auf die Nähe zum Ziel hingewiesen wird
const RACE_NEARBY_DISTANCE = 100;
// Entfernung (Blöcke), innerhalb derer das Ziel automatisch als erreicht gilt
const RACE_WIN_DISTANCE = 5;
const RACE_MIN_COINS = 16;
const RACE_MAX_COINS = 32;

// Belohnungen
// Dauer (in Sekunden) der /worldborder-Animation beim Vergrößern als Belohnung
const WORLDBORDER_ANIMATION_SECONDS = 3;

// Eine Farbe pro Belohnungstyp, zentral definiert und sowohl für die Belohnungsvorschau
// (Mission-Lore/Event-Ankündigung, siehe generateRewards) als auch für die tatsächliche
// Auszahlungsnachricht (rewardPlayer) verwendet, damit beide immer übereinstimmen.
const REWARD_COLORS = {
    coin: 'green',
    worldborder: 'green',
    xp: 'aqua',
    mission: 'green',
    command: 'gold',
    buff: 'light_purple'
};

// Zentraler Belohnungspool für Missionen UND Quick Events: bei jeder Würfelung wird jeder
// Eintrag unabhängig gegen seine `chance` gewürfelt (0 bis length(MISSION_REWARDS) Einträge
// treffen zu). coin/worldborder/xp basieren auf der minCoins/maxCoins-Spanne der jeweils
// relevanten Missions-/Event-CSV-Zeile: coin zahlt sie direkt aus, worldborder und xp nutzen
// sie nur als Basis und wenden ihren eigenen `multiplier` darauf an. command führt unabhängig
// davon einfach den konfigurierten Befehl aus ("@p" wird durch den Zielspieler ersetzt).
// enable_in_mission/enable_in_quickevent schalten einen Eintrag jeweils für Missionen bzw.
// Quick Events komplett aus (Standard: beides an).
const MISSION_REWARDS = [
    {
        id: 'coin',
        chance: 1.0,
        enable_in_mission: true,
        enable_in_quickevent: true
    }, {
        id: 'worldborder',
        chance: 1.0,
        multiplier: 1.0,
        enable_in_mission: true,
        enable_in_quickevent: true
    }, {
        id: 'xp',
        chance: 0.5,
        multiplier: 1.0,
        enable_in_mission: true,
        enable_in_quickevent: true
    }, {
        id: 'mission',
        minPerPlayer: 1,
        maxPerPlayer: 1,
        chance: 0.1,
        enable_in_mission: true,
        enable_in_quickevent: true
    }, {
        id: 'command',
        chance: 0.03,
        command: 'give @p minecraft:diamond 1',
        nameKey: 'kubejs.reward.command.diamond',
        enable_in_mission: true,
        enable_in_quickevent: true
    }, {
        id: 'buff',
        chance: 0.3,
        enable_in_mission: true,
        enable_in_quickevent: true,
        buffs: [
            { buff: 'minecraft:speed', minDuration: 10, maxDuration: 20, minAmplifier: 0, maxAmplifier: 1 },
            { buff: 'born_in_chaos_v1:dark_ward', minDuration: 10, maxDuration: 20, minAmplifier: 0, maxAmplifier: 0 },
            { buff: 'apothic_attributes:vitality', minDuration: 10, maxDuration: 20, minAmplifier: 0, maxAmplifier: 4 },
            { buff: 'minecraft:haste', minDuration: 5, maxDuration: 20, minAmplifier: 0, maxAmplifier: 2 },
            { buff: 'minecraft:strength', minDuration: 5, maxDuration: 15, minAmplifier: 0, maxAmplifier: 2 },
            { buff: 'minecraft:resistance', minDuration: 5, maxDuration: 15, minAmplifier: 2, maxAmplifier: 2 },
            { buff: 'minecraft:regeneration', minDuration: 5, maxDuration: 15, minAmplifier: 0, maxAmplifier: 2 },
            { buff: 'minecraft:luck', minDuration: 5, maxDuration: 15, minAmplifier: 0, maxAmplifier: 4 },
            { buff: 'minecraft:health_boost', minDuration: 10, maxDuration: 20, minAmplifier: 0, maxAmplifier: 9 },
            { buff: 'apothic_attributes:flying', minDuration: 4, maxDuration: 10, minAmplifier: 0, maxAmplifier: 0 },
            { buff: 'apothic_attributes:knowledge', minDuration: 4, maxDuration: 10, minAmplifier: 0, maxAmplifier: 1 },
            { buff: 'farmersdelight:nourishment', minDuration: 10, maxDuration: 20, minAmplifier: 0, maxAmplifier: 0 }
        ]
    }
];

// Debuffs bei misslungener "verfluchter" Mission (zufällig wird genau einer verhängt)
const CURSE_EFFECTS = [
    'minecraft:slowness 300',
    'apothic_attributes:grievous 300',
    'sizeshiftingpotions:shrinking 120 5',
    'irons_spellbooks:chilled 240',
    'minecraft:hunger 180',
    'minecraft:infested 300',
    'minecraft:mining_fatigue 180',
    'apothic_attributes:sundering 240',
    'minecraft:darkness 60',
    'minecraft:oozing 300',
    'minecraft:oozing 300',
    'minecraft:nausea 20',
    'minecraft:weaving 300'
];

// Dieb-Event: Mob, Rüstungsmaterial, Waffe und Buffs werden pro Event zufällig gewürfelt
const THIEF_MOB_OPTIONS = ['minecraft:zombie', 'minecraft:skeleton', 'minecraft:husk', 'minecraft:pillager', 'minecraft:evoker', 'minecraft:vindicator', 'minecraft:wither_skeleton'];
const THIEF_MATERIAL_OPTIONS = [
    { id: 'iron', weight: 3 },
    { id: 'golden', weight: 1 },
    { id: 'diamond', weight: 1 }
];
// "{material}" wird durch das gewürfelte Material aus THIEF_MATERIAL_OPTIONS ersetzt
const THIEF_WEAPON_POOL = [
    { item: REWARD_ITEM, weight: 2 },
    { item: 'kubejs:coin_stack', weight: 6 },
    { item: 'minecraft:{material}_sword', weight: 1 },
    { item: 'minecraft:{material}_axe', weight: 1 }
];
// Chance, dass das jeweilige Ausrüstungsteil beim Tod des Diebs droppt (0-1)
const THIEF_ARMOR_DROP_CHANCE = 0.1;
const THIEF_WEAPON_DROP_CHANCE = 0.5;
const THIEF_TOKEN_DROP_CHANCE = 1.0;
// Effekte, die der Dieb beim Erscheinen erhält. "infinite" ist ein gültiger Wert für den
// Vanilla-/effect-give-Befehl (läuft nicht ab, solange der Dieb lebt); amplifier ist optional.
const THIEF_BUFFS = [
    { effect: 'minecraft:slow_falling', duration: 120 },
    { effect: 'minecraft:strength', duration: 'infinite', amplifier: 2 },
    { effect: 'minecraft:resistance', duration: 'infinite', amplifier: 2 },
    { effect: 'minecraft:glowing', duration: 'infinite' },
    { effect: 'minecraft:speed', duration: 'infinite' }
];
