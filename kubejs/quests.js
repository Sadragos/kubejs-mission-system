// priority: 0

//----------------------
// CONSTANTS 
//----------------------

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

// Missionen
let avgMissionsPerHour = 0.7;
let avgMissionPerHourPlayer = 0.2;
let missionSummonMaxPlayerDist = 16 * 8;
let rewardItem = 'kubejs:mission_scroll';
let checkInterval = 100;
let announceIntervalSeconds = 60;
let missionMinTime = 20 * 60 * 5;
let missionMaxTime = missionMinTime + (20 * 60 * 15)

// Sonstiges
let ticksPerSecond = 20;
let ticksPerMinute = ticksPerSecond * 60;
let ticksPerHour = ticksPerMinute * 60;
let curseChance = 0.05;
const HUNT_SCOREBOARD_NAME = 'quest_hunt_score';
const MULTIPLAYER_PERCENTAGE = 0.7;
const MISSION_TARGET_PLAYER_MULT = 0.5;

// Schwierigkeit
let playTimeTarget = 20 * 60 * 60 * 24 * 3;     // 3 Tage
let mobKillsTarget = 10000;

//----------------------
// Caches
//----------------------
let currentEvent;
let logget_in_players = [];
let unlucky = false;


//----------------------
// MISSION TYPES 
//----------------------
const MISSION_TYPE_ITEM = {
    id: 'item',
    text: '§aSende§r',
    weight: 6,
    hint: (name) => `Du kannst diesen Auftrag erfüllen, indem du ${name} im Inventar hast und mit dem Auftrag-Item rechtsklickst.`,
    rightClickHandler: (event, dataItem, stack) => {
        let player = event.player;
        let need = dataItem.currentDamage;

        let take = removeFromInventory(player, dataItem.item, need);

        let remaining = dataItem.currentDamage - take;
        if (remaining > 0) {
            player.tell(`§aDu hast §6${take}x ${dataItem.name}§a abgegeben! Du brauchst noch ${remaining} um den Auftrag zu erledigen!`);
            stack.setDamage(remaining);
            event.cancel();
        } else {
            player.tell(`§aDu hast §6${take}x ${dataItem.name}§a abgegeben!`);
            stack.count = 0;
            finishMission(event, player, dataItem);
        }
    }
};

const MISSION_TYPE_KILL = {
    id: 'kill',
    text: '§4Töte§r',
    weight: 4,
    hint: (name) => `Du kannst diesen Auftrag erfüllen, indem dieses Auftrag-Item im Inventar hast, während du ${name} tötest.`,
    rightClickHandler: (event, dataItem, stack) => {
        let player = event.player;
        let need = dataItem.currentDamage;
        player.tell(`§cDir fehlen noch §6${need}x ${dataItem.name}§c.`);

        if (remaining === 0) {
            player.tell(`§aDu hast alle benötigten §6${dataItem.name}§a umgebracht!`);
            stack.count = 0;
            finishMission(event, player, dataItem);
        }
    }
};

const MISSION_TYPE_JOUNREY = {
    id: 'journey',
    text: '§bReise§r',
    weight: 1,
    hint: (name, item) => `Bringe diesen Auftrag nach ${item} und rechtsklicke ihn dort. Du kannst ihn so rechtsklicken um einen Wegpunkt zu erzeugen.`,
    rightClickHandler: (event, dataItem, stack) => {
        let player = event.player;
        let isNear = false;
        let parts = dataItem.item.replace(/[\[\]\s]/g, "").split(",");
        let targetPos = { x: parseInt(parts[0]), y: 0, z: parseInt(parts[1]) };

        let dx = targetPos.x - player.position().x;
        let dz = targetPos.z - player.position().z;
        let dist = Math.floor(Math.sqrt(dx * dx + dz * dz));
        if (dist < 3) {
            isNear = true;
        }
        stack.damage = dist;

        if (isNear) {
            event.server.runCommandSilent(`jm waypoint delete "${dataItem.name}" ${player.username}`);
            player.tell(`§aDu bist da. Die Gilde ist dir sehr dankbar!`);
            stack.count = 0;
            finishMission(event, player, dataItem);
        } else {
            event.server.runCommandSilent(`jm waypoint delete "${dataItem.name}" ${player.username}`);
            event.server.runCommandSilent(`jm waypoint temp create "${dataItem.name}" minecraft:overworld ${targetPos.x} 64 ${targetPos.z} gold ${player.username}`);
            player.tell(`§cDu bist noch ${dist} Meter entfernt.`);
        }
    }
};

const MISSION_TYPE_MISSIONS = {
    id: 'missions',
    text: '§eHelfe bei§r',
    weight: 1,
    hint: (name, item) => `Helfe dem Server, in dem du ${name}-Events zum Erfolg bringst während diese Mission in deinem Inventar hast.`,
    rightClickHandler: (event, dataItem, stack) => {
        let player = event.player;
        let need = dataItem.currentDamage;
        player.tell(`§cDir fehlen noch §6${need}x Events§c.`);

        if (remaining === 0) {
            player.tell(`§aDu hast alle benötigten Events abgeschlossen!`);
            stack.count = 0;
            finishMission(event, player, dataItem);
        }
    }
};

const MISSION_TYPES = [MISSION_TYPE_JOUNREY, MISSION_TYPE_ITEM, MISSION_TYPE_KILL, MISSION_TYPE_MISSIONS];
const ALL_MISSIONS = [];

//----------------------
// Event Types
//----------------------
const PRESENT_EVENT = {
    name: 'Geschenkt',
    id: 'present',
    weight: 1,
    startEvent(event) {
        let players = event.server.players;
        event.server.tell(`§fEs gibt eine §6Geschenkte Mission§f für jeden!`);
        for (let player of players) {
            summonQERewardAtPlayer(event, player.username);
        }
        currentEvent.stopEvent();
    },
    stopEvent(event) {
        currentEvent = undefined;
    }
}

const HUNT_EVENT = {
    id: 'hunt',
    weight: 4,
    name: undefined,
    startTick: undefined,
    endTick: undefined,
    missionTime: undefined,

    targetMonster: undefined,
    targetAmount: undefined,
    actionTable: undefined,
    multiplayer: undefined,
    wild: undefined,
    total: undefined,
    label: undefined,
    scoreLabel: undefined,

    startEvent(event) {
        currentEvent.startTick = event.server.tickCount;
        currentEvent.missionTime = randomInt(missionMinTime, missionMaxTime);
        currentEvent.endTick = event.server.tickCount + currentEvent.missionTime;

        currentEvent.multiplayer = randomInt(0, 100) <= (MULTIPLAYER_PERCENTAGE * 100);
        currentEvent.targetMonster = getWeightedRandomItem(getMissionByType('kill').filter(mission => mission.min >= event.server.players.length));
        currentEvent.wild = currentEvent.targetMonster.item === '*';

        if (currentEvent.wild && currentEvent.multiplayer) {
            currentEvent.name = 'Gemätzel';
            currentEvent.scoreLabel = '[G]';
        }
        else if (currentEvent.wild && !currentEvent.multiplayer) {
            currentEvent.name = 'Wilde Jagd';
            currentEvent.scoreLabel = '[W]';
        }
        else if (!currentEvent.wild && currentEvent.multiplayer) {
            currentEvent.name = 'Treibjagd';
            currentEvent.scoreLabel = '[T]';
        }
        else {
            currentEvent.name = 'Kopfgeldjagd';
            currentEvent.scoreLabel = '[K]';
        }

        currentEvent.label = unlucky ? `§4[${currentEvent.name}]§f` : `§6[${currentEvent.name}]§f`;
        currentEvent.scoreLabel = unlucky ? `§4${currentEvent.scoreLabel}§f` : `§6${currentEvent.scoreLabel}§f`;


        currentEvent.actionTable = new Map();
        currentEvent.total = 0;
        let targetName = currentEvent.targetMonster.name;
        let playermodsum = 0;
        let playermult = 0;
        for (let player of event.server.players) {
            playermodsum += getPlayerProgress(player, 'kill');
            playermult += MISSION_TARGET_PLAYER_MULT;
        }
        let playermod = playermodsum / event.server.players.length;
        currentEvent.targetAmount = Math.ceil(randomInt(currentEvent.targetMonster.min, currentEvent.targetMonster.max) * playermult);
        currentEvent.targetAmount = Math.max(Math.ceil(currentEvent.targetAmount * playermod), event.server.players.length);

        initScoreboard(event, `${currentEvent.scoreLabel} ${currentEvent.targetAmount}§8x§f ${targetName}`, currentEvent.multiplayer);

        if (currentEvent.multiplayer) {
            event.server.tell(`${currentEvent.label} Alle, die sich an der Vernichtung von §6${currentEvent.targetAmount}x ${targetName}§f beteiligen, werden belohnt!\n  -> Zeitlimit: ${tickTimeColor(currentEvent.missionTime)}${ticksToTime(currentEvent.missionTime)}\n  §7-> Ziel-ID: ${currentEvent.targetMonster.item}`);
        } else {
            event.server.tell(`${currentEvent.label} Derjenige, der zuerst §6${currentEvent.targetAmount}x ${targetName}§f tötet gewinnt!\n  -> Zeitlimit ${tickTimeColor(currentEvent.missionTime)}${ticksToTime(currentEvent.missionTime)}\n  §7-> Ziel-ID: ${currentEvent.targetMonster.item}`);
        }
    },

    handleDeath(event) {
        if (!isValidKill(event.entity, currentEvent.targetMonster?.item)) return;

        let player = event.source.player;
        let killer = String(player.username);
        currentEvent.actionTable.set(killer, (currentEvent.actionTable.get(killer) || 0) + 1);
        currentEvent.total++;

        setScore(event, killer, currentEvent.actionTable.get(killer));
        setScore(event, 'GESAMT', currentEvent.total);

        if (currentEvent.multiplayer && currentEvent.total >= currentEvent.targetAmount) {
            currentEvent.stopEvent(event);
        } else if (!currentEvent.multiplayer && currentEvent.actionTable.get(killer) >= currentEvent.targetAmount) {
            currentEvent.stopEvent(event);
        }
    },

    stopEvent(event) {

        // get the entry with the highest count from  actionTable
        let hunters = [];
        let huntersText = [];
        let winnerCount = 0;
        let winnerName = undefined;

        for (let [key, data] of currentEvent.actionTable) {
            hunters.push(key);
            huntersText.push(`${key} (${data})`);
            if (data > winnerCount) {
                winnerCount = data;
                winnerName = key;
            }
        }

        let failed = (currentEvent.multiplayer && currentEvent.total < currentEvent.targetAmount) || (!currentEvent.multiplayer && winnerCount < currentEvent.targetAmount);
        if (failed) {
            if (unlucky) {
                let effects = ['minecraft:slowness 300', 'minecraft:hunger 180', 'minecraft:infested 300', 'minecraft:mining_fatigue 180', 'minecraft:darkness 60', 'minecraft:oozing 300', 'minecraft:oozing 300', 'minecraft:nausea 20', 'minecraft:weaving 300'];
                let selectedEffect = effects[Math.floor(Math.random() * effects.length)];
                event.server.tell(`${currentEvent.label} §cZeit ist abgelaufen, die Vertragsstrafe wird verhängt!`);
                event.server.runCommandSilent(`effect give @a ${selectedEffect}`);
                event.server.runCommandSilent(`effect give @a minecraft:unluck 300 2`);
                unlucky = false;
            } else {
                event.server.tell(`${currentEvent.label} §cZeit ist abgelaufen!`);
            }
            currentEvent = undefined;
            return;
        }


        if (currentEvent.multiplayer) {
            event.server.tell(`${currentEvent.label} §aEvent war Erfolgreich!§f\n  -> Teilnehmer: §a${huntersText.join('§f, §a')}§f\n${getTimeStats(event)}`);
            hunters.forEach(hunter => {
                summonQERewardAtPlayer(event, hunter);
                checkForHelperMission(event, hunter, HUNT_EVENT.id);
            });
        } else {
            event.server.tell(`${currentEvent.label}  §a${winnerName}§f gewinnt!\n  -> Teilnehmer: §a${huntersText.join('§f, §a')}§f\n${getTimeStats(event)}`);
            summonQERewardAtPlayer(event, winnerName);
            checkForHelperMission(event, winnerName, HUNT_EVENT.id);
        }
        unlucky = false;
        currentEvent = undefined;
    },

    timeNotification(event) {
        getTimeRemaining(event, currentEvent.multiplayer);
    },
}

const THIEF_EVENT = {
    name: 'Gilden-Dieb',
    id: 'thief',
    weight: 2,
    startEvent(event) {
        let players = event.server.players.filter(p => p.level.dimension === 'minecraft:overworld');
        if (players.length === 0) {
            currentEvent.stopEvent();
            return;
        }
        let player = players[Math.floor(Math.random() * players.length)];

        let summonPos = generateSummonPos(player);
        let mobOptions = ['minecraft:zombie', 'minecraft:skeleton', 'minecraft:husk', 'minecraft:pillager', 'minecraft:evoker', 'minecraft:vindicator', 'minecraft:wither_skeleton'];
        let pickedOption = mobOptions[Math.floor(Math.random() * mobOptions.length)];
        let materials = ['iron', 'iron', 'iron', 'golden', 'diamond']
        let material = materials[Math.floor(Math.random() * materials.length)];
        let weaponOptions = [rewardItem, rewardItem, rewardItem, rewardItem, rewardItem, `minecraft:${material}_sword`, `better_weaponry:${material}_dagger`, `better_weaponry:${material}_scythe`, `better_weaponry:${material}_spear`, `better_weaponry:${material}_broadsword`, `better_weaponry:${material}_battleaxe`, `better_weaponry:${material}_cutlass`];
        let weapon = weaponOptions[Math.floor(Math.random() * weaponOptions.length)];
        event.server.tell(`§6[${currentEvent.name}]§f Ein Dieb hat der Händlergilde Tokens geklaut! Er wurde bei §a${toChatPosition(summonPos)}§f gesichtet!`);
        event.server.runCommandSilent(`summon ${pickedOption} ${summonPos.x} ${summonPos.y} ${summonPos.z} {PersistenceRequired:1,CustomName:"\\"Gilden-Dieb\\"",CustomNameVisible:1b,PersistenceRequired:1,ArmorItems:[{id:"minecraft:${material}_boots",Count:1b},{id:"minecraft:${material}_leggings",Count:1b},{id:"minecraft:${material}_chestplate",Count:1b},{id:"minecraft:${material}_helmet",Count:1b}],ArmorDropChances:[0.1f,0.1f,0.1f,0.1f],HandItems:[{id:"${weapon}",Count:1b},{id:"${rewardItem}",Count:1b}],HandDropChances:[0.5f,1.0f]}`);
        event.server.runCommandSilent(`effect give @e[name="Gilden-Dieb"] minecraft:slow_falling 120`);
        event.server.runCommandSilent(`effect give @e[name="Gilden-Dieb"] minecraft:strength infinite 2`);
        event.server.runCommandSilent(`effect give @e[name="Gilden-Dieb"] minecraft:resistance infinite 2`);
        event.server.runCommandSilent(`effect give @e[name="Gilden-Dieb"] minecraft:glowing infinite`);
        event.server.runCommandSilent(`effect give @e[name="Gilden-Dieb"] minecraft:speed infinite`);
        markPosition(event, summonPos, currentEvent.name);
        currentEvent.stopEvent();
    },
    stopEvent(event) {
        currentEvent = undefined;
    }
}

const AIRDROP_EVENT = {
    name: 'Frachtverlust',
    id: 'airdrop',
    weight: 1,
    startEvent(event) {
        let players = event.server.players.filter(p => p.level.dimension === 'minecraft:overworld');
        if (players.length === 0) {
            currentEvent.stopEvent();
            return;
        }
        let player = players[Math.floor(Math.random() * players.length)];

        let summonPos = generateSummonPos(player);
        let options = ['Eine Flugmaschiene', 'Ein Gyrokopter', 'Eine Drohne', 'Ein betrunkener Pilot', 'Ein fliegender Kurier', 'Eine Eule', 'Ein wahnsinniger Flieger', 'Ein Transportflieger'];
        let pickedOption = options[Math.floor(Math.random() * options.length)];
        event.server.tell(`§6[${currentEvent.name}]§f ${pickedOption} hat bei §a${toChatPosition(summonPos)}§f Fracht verloren.`);
        event.server.runCommandSilent(`summon minecraft:item ${summonPos.x} ${summonPos.y} ${summonPos.z} {Item:{id:"${rewardItem}",Count:1}}`);
        event.server.runCommandSilent(`effect give @e[type=minecraft:item] minecraft:slow_falling 120`);
        markPosition(event, summonPos, currentEvent.name);
        currentEvent.stopEvent();
    },
    stopEvent(event) {
        currentEvent = undefined;
    }
}

const ITEM_REQUEST_EVENT = {
    name: 'Bestellung',
    id: 'request',
    weight: 2,
    startTick: undefined,
    endTick: undefined,
    missionTime: undefined,

    targetItem: undefined,
    targetAmount: undefined,
    actionTable: undefined,
    label: '§6[Bestellung]§f',
    scoreLabel: '§6[B]§f',
    total: 0,
    startEvent(event) {
        let playermodsum = 0;
        let playerMulti = 0;
        for (let player of event.server.players) {
            playermodsum += getPlayerProgress(player);
            playerMulti += MISSION_TARGET_PLAYER_MULT;
        }
        let playermod = playermodsum / event.server.players.length;
        currentEvent.startTick = event.server.tickCount;
        currentEvent.missionTime = randomInt(missionMinTime, missionMaxTime);
        currentEvent.endTick = event.server.tickCount + currentEvent.missionTime;
        currentEvent.total = 0;
        currentEvent.actionTable = new Map();

        currentEvent.targetItem = getWeightedRandomItem(getMissionByType('item').filter(mission => mission.min >= event.server.players.length));

        currentEvent.targetAmount = Math.ceil(randomInt(currentEvent.targetItem.min, currentEvent.targetItem.max) * playerMulti);
        currentEvent.targetAmount = Math.max(Math.ceil(currentEvent.targetAmount * playermod), event.server.players.length);
        let targetName = currentEvent.targetItem.name;

        initScoreboard(event, `${currentEvent.scoreLabel} ${currentEvent.targetAmount}§8x§f ${targetName}`, true);


        event.server.tell(`${currentEvent.label} Die Gilde hat §6${currentEvent.targetAmount}x ${targetName}§f bestellt. Jeder der mittels Holzschale ein paar einsendet, wird belohnt!\n  -> Zeitlimit: ${tickTimeColor(currentEvent.missionTime)}${ticksToTime(currentEvent.missionTime)}\n  §7-> Ziel-ID: ${currentEvent.targetItem.item}`);
    },
    stopEvent(event) {
        let hunters = [];
        let huntersText = [];
        let winnerCount = 0;

        for (let [key, data] of currentEvent.actionTable) {
            hunters.push(key);
            huntersText.push(`${key} (${data})`);
            if (data > winnerCount) {
                winnerCount = data;
                winnerName = key;
            }
        }

        let failed = currentEvent.total < currentEvent.targetAmount;
        if (failed) {
            event.server.tell(`${currentEvent.label} §cZeit ist abgelaufen!`);
            currentEvent = undefined;
            return;
        }


        event.server.tell(`${currentEvent.label} §aEvent war Erfolgreich!§f\n  -> Teilnehmer: §a${huntersText.join('§f, §a')}§f\n${getTimeStats(event)}`);
        hunters.forEach(hunter => {
            summonQERewardAtPlayer(event, hunter);
            checkForHelperMission(event, hunter, ITEM_REQUEST_EVENT.id);
        });
        currentEvent = undefined;
    },
    timeNotification(event) {
        getTimeRemaining(event, currentEvent.multiplayer);
    },
}

const ALL_QUICK_EVENTS = [THIEF_EVENT, AIRDROP_EVENT, PRESENT_EVENT, HUNT_EVENT, ITEM_REQUEST_EVENT];


//----------------------
// Event Handling
//----------------------

// Neue Mission würfeln
ItemEvents.rightClicked(missionToken, event => {
    try {

        if (Math.random() < curseChance) {
            event.server.tell(`§cACHTUNG! §6${event.player.username}§c hat eine verfluchte Mission erwischt! Arbeitet besser zusammen, damit sie nicht fehlschlägt!`);
            unlucky = true;
            startEvent(event, HUNT_EVENT.id, true);
        } else {
            let mission = getRandomMission();
            let playerProgress = getPlayerProgress(event.player, mission.type);
            let alteredMinCoins = Math.ceil(mission.minCoins * playerProgress);
            let alteredMaxCoins = Math.max(Math.ceil(mission.maxCoins * playerProgress), alteredMinCoins + 1);
            let alteredMinAmount = Math.ceil(mission.min * playerProgress);
            let alteredMaxAmount = Math.ceil(mission.max * playerProgress);
            giveMissionItem(event, mission.type, mission.item, mission.name, randomInt(alteredMinAmount, alteredMaxAmount), randomInt(alteredMinCoins, alteredMaxCoins), new Date(), event.player.username, playerProgress);
        }
        event.item.count = event.item.count - 1;
    } catch (e) {
        event.player.tell(`§cEs konnte keine Mission erzeugt werden! Versuch es nochmal.`);
        console.log(e);
    }
})

// Mission abgeben
ItemEvents.rightClicked(missionItem, event => {
    let stack = event.getItem();
    let data = parseMissionInfo(stack);
    data.type.rightClickHandler(event, data, stack);
});

// Items für Mission abgeben
ItemEvents.rightClicked('minecraft:bowl', event => {
    if (!currentEvent || currentEvent.id !== ITEM_REQUEST_EVENT.id) return
    let player = event.player;
    let take = removeFromInventory(player, currentEvent.targetItem.item, currentEvent.targetAmount - currentEvent.total);

    if (take === 0) {
        player.tell(`§cDu hast kein ${currentEvent.targetItem.name} im Inventar.`);
    } else {
        player.tell(`§aDu hast §6${take}x ${currentEvent.targetItem.name}§a zur Gilde geschickt!`);
        let playername = String(player.username);
        currentEvent.actionTable.set(playername, (currentEvent.actionTable.get(playername) || 0) + take);
        currentEvent.total += take;

        setScore(event, playername, currentEvent.actionTable.get(playername));
        setScore(event, 'GESAMT', currentEvent.total);

        if (currentEvent.total >= currentEvent.targetAmount) {
            currentEvent.stopEvent(event);
        }
    }
    event.cancel();
});

// Etwas stirbt
EntityEvents.death(event => {
    if (!event.source?.player?.username) return;
    if (currentEvent?.handleDeath) {
        currentEvent.handleDeath(event);
    }
    if (event.entity.hasCustomName() && event.entity.getCustomName().getString() == 'Gilden-Dieb') {
        event.server.tell(`§6[Gilden-Dieb]§f Der Gilden-Dieb bei §a${toChatPosition({ x: Math.floor(event.entity.position().x), y: Math.floor(event.entity.position().y), z: Math.floor(event.entity.position().z) })}§f wurde von §a${event.source.player.username}§f zur Strecke gebracht!`);
        checkForHelperMission(event, event.source.player.username, THIEF_EVENT.id);
    }

    let player = event.source.player;
    let inventory = player.inventory;
    let searchItem = Item.of(missionItem);

    for (let i = 0; i < inventory.getContainerSize(); i++) {
        let item = inventory.getItem(i);
        if (item.is(searchItem)) {
            let data = parseMissionInfo(item);
            if (data.type.id === MISSION_TYPE_KILL.id && isValidKill(event.entity, data.item)) {
                if (data.currentDamage === 1) {
                    player.tell(`§aDu hast den letzten Kill für den Auftrag §6${data.maxDamage}x ${data.name}§a ausgeführt!`);
                    finishMission(event, player, data);
                    item.count = 0;
                } else {
                    data.currentDamage--;
                    item.setDamage(data.currentDamage);
                    player.tell(`§a${generateMissionTitle(data.type.id, data.name, data.maxDamage)}§a - verbleibend: §6${data.currentDamage}§a.`);
                }
            }
        }
    }
});


ServerEvents.tick(event => {
    if (event.server.tickCount % checkInterval === 0) {
        if (currentEvent) {
            if (currentEvent.handleTick) {
                currentEvent.handleTick(event);
            }
            if (currentEvent.endTick < event.server.tickCount) {
                currentEvent.stopEvent(event);
                currentEvent = undefined;
            }
        } else {
            const scoreboard = event.server.getScoreboard();
            if (scoreboard.getObjective(HUNT_SCOREBOARD_NAME) !== null) {
                event.server.runCommandSilent(`scoreboard objectives remove ${HUNT_SCOREBOARD_NAME}`);
                return;
            }
            
            let playerCount = event.server.players.length;
            if(playerCount === 0) return;
            let bonusChance = playerCount * avgMissionPerHourPlayer;
            let totalMissionsPerHous = avgMissionsPerHour + bonusChance;
            let missionChance = totalMissionsPerHous / (ticksPerHour / checkInterval);
            let chance = Math.random();


            if (chance < missionChance) {
                startEvent(event);
            }
        }
    }
    if (currentEvent?.timeNotification) {
        let interval = announceIntervalSeconds;
        if ((currentEvent.endTick - event.server.tickCount) < 15 * 20) interval = 5;
        else if ((currentEvent.endTick - event.server.tickCount) < 80 * 20) interval = 20;
        if (event.server.tickCount % (interval * 20) === 0) {
            currentEvent.timeNotification(event);
        }
    }
});


//----------------------
// Helper
//----------------------

function initScoreboard(event, title, isMultiplayer) {
    event.server.runCommandSilent(`scoreboard objectives add ${HUNT_SCOREBOARD_NAME} dummy "${title}"`);
    event.server.runCommandSilent(`scoreboard objectives setdisplay sidebar ${HUNT_SCOREBOARD_NAME}`);
    if(isMultiplayer) event.server.runCommandSilent(`scoreboard players set GESAMT ${HUNT_SCOREBOARD_NAME} 0`);
}

function setScore(event, playername, score) {
    event.server.runCommandSilent(`scoreboard players set ${playername} ${HUNT_SCOREBOARD_NAME} ${score}`);
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function removeFromInventory(player, searchItem, amount) {
    let inv = player.inventory;
    let remaining = amount;
    let size = inv.getContainerSize();


    for (let i = 0; i < size && remaining > 0; i++) {
        let invItem = inv.getItem(i);
        if (isValidItem(invItem.id, searchItem, 'item')) {
            let take = Math.min(remaining, invItem.count);
            invItem.count -= take;
            remaining -= take;
        }
    }
    return amount - remaining;
}

function giveMissionItem(event, type, item, name, amount, reward, erstellt, username, mod) {
    if (type == MISSION_TYPE_JOUNREY.id) {
        let base = { x: Math.floor(event.player.position().x), y: Math.floor(event.player.position().y), z: Math.floor(event.player.position().z) };
        let angle = Math.random() * Math.PI * 2;
        let targetPos = {
            x: Math.floor(base.x + Math.cos(angle) * amount),
            y: base.y,
            z: Math.floor(base.z + Math.sin(angle) * amount)
        };
        item = toChatPosition(targetPos);
    }
    event.server.runCommandSilent(`give ${event.player.username} kubejs:mission[custom_name='["",{"text":"${generateMissionTitle(type, name, amount)}","italic":false}]',lore=['["",{"text":"${generateMissionLore(type, reward, erstellt, item, name, username, mod)}","italic":false}]'],damage=${amount},max_damage=${amount},max_stack_size=1]`);
}

function generateMissionTitle(type, name, amount) {
    let missionType = MISSION_TYPES.find(missionType => missionType.id === type);
    let unit = 'x';
    if (type === MISSION_TYPE_JOUNREY.id) {
        unit = 'm';
    }
    return `Auftrag: ${missionType.text} §6${amount}${unit} ${name}§r`;
}

function generateMissionLore(type, coins, erstellt, item, name, playername, mod) {
    mod = mod || 1;
    let missionType = MISSION_TYPES.find(missionType => missionType.id === type);
    let hint = missionType.hint(name, item);
    return `Belohnung: §6${coins} Coin${coins === 1 ? '' : 's'}§7\n\n${hint}\n\n§7Ziel: ${item}\nErstellt: ${erstellt.toISOString()}\nVon: ${playername}\nLevel: ${(mod * 100).toFixed(2)}%`;
}

function finishMission(event, player, data) {
    let playerName = player.username;
    let unit = data.type.id === MISSION_TYPE_JOUNREY.id ? 'm' : 'x';
    player.tell(`§aDer Auftrag ist abgeschlossen und du erhälst deine §6${data.coins} Coins§a Belohnung!`)
    event.server.runCommandSilent(`execute at ${playerName} run summon minecraft:item ~ ~ ~ {Item:{id:"${coinItem}",count:${data.coins}}}`);
    event.server.runCommandSilent(`execute at ${playerName} run particle supplementaries:confetti ~ ~3 ~ 0 0 0 0.1 100`);
    event.server.runCommandSilent(`tellraw @a[name=!${playerName}] "${playerName} §ahat den Auftrag §6${data.maxDamage}${unit} ${data.name}§a erledigt und §6${data.coins} Coins§a kassiert!"`);
}

function parseMissionInfo(itemStack) {
    let components = itemStack.getComponents();
    let componentName = components.get('minecraft:custom_name');
    let componentLore = components.get('minecraft:lore');
    let maxDamage = components.get('minecraft:max_damage') + 0;
    let currentDamage = components.get('minecraft:damage') + 0;

    let nameRaw = componentName.getSiblings().get(0).getString();
    let loreRaw = componentLore.styledLines().get(0).getString();


    let nameMatch = nameRaw.match(nameRegEx);
    let name = nameMatch ? nameMatch[1] : nameRaw;

    let coinsMatch = loreRaw.match(coinsRegex);
    let coins = coinsMatch ? coinsMatch[1] : 0;

    let erstelltMatch = loreRaw.match(erstelltRegex);
    let erstellt = erstelltMatch ? new Date(erstelltMatch[1]) : new Date();

    let itemMatch = loreRaw.match(itemRegex);
    let item = itemMatch ? itemMatch[1] : '';

    let playerMatch = loreRaw.match(playerRegex);
    let player = playerMatch ? playerMatch[1] : '';

    let typeMatch = nameRaw.match(typeRegEx);
    let type = typeMatch ? typeMatch[1] : '';
    let missionType = MISSION_TYPES.find(missionType => missionType.text === type);
    let typeId = missionType ? missionType.id : '';

    let levelMatch = loreRaw.match(levelRegex);
    let level = levelMatch ? levelMatch[1] : '100';
    let numberLevel = parseFloat(level) / 100;

    return {
        typeId: typeId,
        type: missionType,
        coins: coins,
        name: name,
        item: item,
        erstellt: erstellt,
        player: player,
        maxDamage: maxDamage,
        currentDamage: currentDamage,
        level: numberLevel
    }
}

function getWeightedRandomItem(list) {
    let totalWeight = list.reduce((acc, item) => acc + item.weight, 0);
    let random = Math.random() * totalWeight;
    let currentWeight = 0;
    for (let item of list) {
        currentWeight += item.weight;
        if (random < currentWeight) {
            return item;
        }
    }
    return null;
}

function getMissionByType(type) {
    // TODO Optimieren!
    return ALL_MISSIONS.filter(mission => mission.type === type);
}

function getRandomMission() {
    let missionType = getWeightedRandomItem(MISSION_TYPES);
    let relevantMissions = getMissionByType(missionType.id);
    return getWeightedRandomItem(relevantMissions);
}

function formatDateTime(date) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Monat ist 0-basiert

    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${day}.${month} ${hours}:${minutes}`;
}

function toMapPosition(name, pos, dimension) {
    let date = formatDateTime(new Date());
    return `[name:"${name} (${date})", x:${pos.x}, y:${pos.y}, z:${pos.z}, dim:${dimension}]`;
}

function toChatPosition(pos, includeY) {
    if (includeY) return `[${pos.x}, ${pos.z}, Höhe ${pos.y}]`;
    return `[${pos.x}, ${pos.z}]`;
}

function generateSummonPos(player) {
    let posX = player.blockPosition().x;
    let posZ = player.blockPosition().z;
    let offsetPos = randomPositionOffset({ x: posX, z: posZ, y: 280 }, 0, missionSummonMaxPlayerDist);
    let summonX = offsetPos.x;
    let summonZ = offsetPos.z;
    let summonY = 280;
    return { x: summonX, z: summonZ, y: summonY };
}

function randomPositionOffset(position, minDistance, maxDistance) {
    let offsetX = Math.floor((Math.random() - 0.5) * 2 * (maxDistance - minDistance) + minDistance);
    let offsetZ = Math.floor((Math.random() - 0.5) * 2 * (maxDistance - minDistance) + minDistance);
    return { x: position.x + offsetX, z: position.z + offsetZ, y: position.y };
}


function ticksToTime(ticks, withColor) {
    if (ticks < ticksPerSecond) return `${ticks} Ticks`;

    let seconds = Math.floor(ticks / 20);
    let minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes.toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

    let hours = Math.floor(minutes / 60);
    return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

function startEvent(event, typeFilter, force) {
    if (!currentEvent || currentEvent.endTick < event.server.tickCount || force) {
        let ev = getWeightedRandomItem(ALL_QUICK_EVENTS.filter(e => !typeFilter || e.id === typeFilter));
        this.currentEvent = ev;
        this.currentEvent.startEvent(event);
    }
}


function capitalizeFirstLetter(val) {
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

function tickTimeColor(ticks) {
    if (ticks < 20 * 20) return '§4';
    if (ticks < ticksPerMinute) return '§c';
    if (ticks < ticksPerMinute * 2) return '§e';
    return '§a';
}

function getTimeRemaining(event, fortschritt) {
    fortschritt = fortschritt === undefined ? false : fortschritt;
    let result = `${currentEvent.label || `§6[${currentEvent.name}]§f`} Verbleibende Zeit: ${tickTimeColor(currentEvent.endTick - event.server.tickCount)}${ticksToTime(currentEvent.endTick - event.server.tickCount)}§f.`;
    if (fortschritt) result += ` Fortschritt: §a${currentEvent.total} / ${currentEvent.targetAmount}§f.`;
    event.server.tell(result);
}

function getTimeStats(event) {
    const ticksRemaining = currentEvent.endTick - event.server.tickCount;
    const ticksTook = event.server.tickCount - currentEvent.startTick;
    return `  -> Benötigte Zeit ${tickTimeColor(ticksRemaining)}${ticksToTime(ticksTook)}§f\n  -> Verbleibende Zeit ${tickTimeColor(ticksRemaining)}${ticksToTime(ticksRemaining)}§f`;
}

function getDistance(pos1, pos2) {
    return Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2) + Math.pow(pos1.z - pos2.z, 2));
}

function summonQERewardAtPlayer(event, playerName, amountMin, amountMax) {
    let min = amountMin === undefined ? 1 : amountMin;
    let max = amountMax === undefined ? 1 : amountMax;
    let amount = randomInt(min, max);
    event.server.runCommandSilent(`execute at ${playerName} run summon minecraft:item ~ ~ ~ {Item:{id:"${rewardItem}",count:${amount}}}`);
    event.server.runCommandSilent(`execute at ${playerName} run particle supplementaries:confetti ~ ~3 ~ 0 0 0 0.1 100`);
}

function getPlayerProgress(player, missionType) {
    let stats = player.getStats();

    let playtime = stats.getPlayTime();
    let kills = stats.getMobKills();

    let playtimePercent = Math.max(Math.min(1, playtime / playTimeTarget), 0.01);
    let killsPercent = Math.max(Math.min(1, kills / mobKillsTarget), 0.01);

    if (missionType === 'kill') return killsPercent;
    return playtimePercent;
}

function isAnyValidKill(mob) {
    return getMissionByType('kill').some(mission => isValidItem(mob, mission.item))
}

function isValidKill(mob, target) {
    const entityName = mob.type.toString().toLowerCase();
    if (target === undefined || target === '*') return isAnyValidKill(entityName);
    return isValidItem(entityName, target);
}

function isValidItem(item, missionItem) {
    let options = missionItem.split(',');
    for (let i = 0; i < options.length; i++) {
        if (item.indexOf(options[i]) !== -1) return true;
    }
    return false;
}

function markPosition(event, summonPos, waypointName) {
    event.server.runCommandSilent(`particle minecraft:campfire_signal_smoke ${summonPos.x} ${summonPos.y} ${summonPos.z} 0 400 0 0 500 force`);
    event.server.runCommandSilent(`particle minecraft:totem_of_undying ${summonPos.x} ${summonPos.y} ${summonPos.z} 0 400 0 0 1000 force`);
    if (waypointName !== undefined) {
        event.server.runCommandSilent(`jm waypoint delete "${waypointName}" @a`);
        event.server.runCommandSilent(`jm waypoint temp create "${waypointName}" minecraft:overworld ${summonPos.x} 64 ${summonPos.z} green @a`);
    }
}

function checkForHelperMission(event, username, type) {
    let player = event.server.players.find(p => p.username === username);
    if (player === undefined) return;
    let inventory = player.inventory;
    let searchItem = Item.of(missionItem);

    for (let i = 0; i < inventory.getContainerSize(); i++) {
        let item = inventory.getItem(i);
        if (item.is(searchItem)) {
            let data = parseMissionInfo(item);
            if (data.type.id === MISSION_TYPE_MISSIONS.id && data.item === type) {
                if (data.currentDamage === 1) {
                    player.tell(`§aDu hast die letzte Mission für §6${data.maxDamage}x ${data.name}§a ausgeführt!`);
                    finishMission(event, player, data);
                    item.count = 0;
                } else {
                    data.currentDamage--;
                    item.setDamage(data.currentDamage);
                    player.tell(`§a${generateMissionTitle(data.type.id, data.name, data.maxDamage)}§a - verbleibend: §6${data.currentDamage}§a.`);
                }
            }
        }
    }
}

// ----------------------
// Daily
// ----------------------
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
    "§aMöp. Arbeit für USERNAME."
];
PlayerEvents.loggedIn(event => {
    setTimeout(() => {
        if (event.player === undefined) return;
        if (!event.server.players.some(p => p.username === event.player.username)) return;
        let currentDateString = new Date().toISOString().split('T')[0];
        let playerStage = event.player.stages.has("daily_mission_" + currentDateString);
        let yesterdayDateString = new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0];
        let yesterdayStage = event.player.stages.has("daily_mission_" + yesterdayDateString);

        if (!playerStage) {
            event.player.stages.add("daily_mission_" + currentDateString);
            let message = dailyMessage[randomInt(0, dailyMessage.length - 1)];
            message = message.replace("USERNAME", event.player.username);
            event.player.tell(message);
            let min = 2;
            let max = 4;
            if (!yesterdayStage) {
                min = 3;
                max = 6;
            }
            summonQERewardAtPlayer(event, event.player.username, min, max);
        }
    }, 30000);
});

// ------------------ ALL MISSIONS ------------------
