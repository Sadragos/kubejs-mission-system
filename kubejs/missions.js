let avgMissionsPerHour = 0.6;
let avgMissionPerHourPlayer = 0.3;
let missionSummonMaxPlayerDist = 16 * 8;
let spawnPosition = { x: 19, y: 82, z: -87 };
let missionMinTime = 20 * 60 * 3;
let missionMaxTime = missionMinTime + (20 * 60 * 7)
let rewardItem = 'kubejs:mission_scroll';
let checkInterval = 100;
let announceIntervalSeconds = 60;
let raceMaxDistance = 1500;

let events = [
    {
        weight: 4, action: (event) => {    // SP Hunt
            const ev = HUNT_EVENT;
            ev.multiplayer = false;
            return ev;
        }
    },
    {
        weight: 12, action: (event) => {    // MP Hunt
            const ev = HUNT_EVENT;
            ev.multiplayer = true;
            return ev;
        }
    },
    {weight: 4 , action: (event) => THIEF_EVENT},
    {weight: 4 , action: (event) => AIRDROP_EVENT},
    {weight: 2 , action: (event) => SPAWN_RACE_EVENT},
    {weight: 2 , action: (event) => PRESENT_EVENT},
    {weight: 2 , action: (event) => PLANT_EVENT},
    {weight: 2 , action: (event) => MINE_EVENT},
    {weight: 2 , action: (event) => RACE_EVENT},
];

let validHuntTargets = [
    { weight: 18, id: '*', name: 'Gegner', amount: 150 },
    { weight: 5, id: 'zombie', name: 'Zombie', amount: 15 },
    { weight: 2, id: 'silverfish', name: 'Silberfisch', amount: 15 },
    { weight: 3, id: 'skeleton', name: 'Skelett', amount: 12 },
    { weight: 3, id: 'spider', name: 'Spinne', amount: 12 },
    { weight: 1, id: 'blaze', name: 'Lohe', amount: 8 },
    { weight: 1, id: 'minecraft:wither_skeleton', name: 'Wither-Skelett', amount: 8 },
    { weight: 1, id: 'enderman', name: 'Enderman', amount: 5 },
    { weight: 1, id: 'creeper', name: 'Creeper', amount: 5 },
    { weight: 1, id: 'slime', name: 'Schleim', amount: 15 },
    { weight: 1, id: 'minecraft:magma_cube', name: 'Magmawürfel', amount: 15 },
    { weight: 2, id: 'maggot', name: 'Maden', amount: 20 },
    { weight: 1, id: 'minecraft:piglin', name: 'Piglin', amount: 8 },
    { weight: 1, id: 'minecraft:zombified_piglin', name: 'Zombie-Piglin', amount: 10 },
    { weight: 1, id: 'born_in_chaos_v1:nightmare_stalker', name: 'Nightmare Stalker', amount: 1 },
];


// ----------------------------------------
// Caches
// ----------------------------------------
let currentEvent;

// ----------------------------------------
// Helper
// ----------------------------------------
let ticksPerSecond = 20;
let ticksPerMinute = ticksPerSecond * 60;
let ticksPerHour = ticksPerMinute * 60;

function rng(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
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
    // TODO Format anpassen
}

function toChatPosition(pos, includeY) {
    if(includeY) return `[${pos.x}, ${pos.z}, Höhe ${pos.y}]`;
    return `[${pos.x}, ${pos.z}]`;
}

function generateSummonPos(player) {
    let posX = player.blockPosition().x;
    let posZ = player.blockPosition().z;
    let distX = Math.floor((Math.random() - 0.5) * 2 * missionSummonMaxPlayerDist);
    let distZ = Math.floor((Math.random() - 0.5) * 2 * missionSummonMaxPlayerDist);
    let summonX = posX + distX;
    let summonZ = posZ + distZ;
    let summonY = 280;
    return { x: summonX, z: summonZ, y: summonY };
}

function summonPlayerCoin(event, playerName, amountMin, amountMax) {
    let min = amountMin === undefined ? 1 : amountMin;
    let max = amountMax === undefined ? 1 : amountMax;
    let amount = rng(min, max);
    event.server.runCommandSilent(`execute at ${playerName} run summon minecraft:item ~ ~ ~ {Item:{id:"${rewardItem}",Count:${amount}}}`);
    event.server.runCommandSilent(`execute at ${playerName} run particle supplementaries:confetti ~ ~3 ~ 0 0 0 0.1 100`);
}

function summonPosCoin(event, pos, amountMin, amountMax) {
    let min = amountMin === undefined ? 1 : amountMin;
    let max = amountMax === undefined ? 1 : amountMax;
    let amount = rng(min, max);
    event.server.runCommandSilent(`summon minecraft:item ${pos.x} ${pos.y} ${pos.z} {Item:{id:"${rewardItem}",Count:${amount}}}`);
    event.server.runCommandSilent(`particle supplementaries:confetti ${pos.x} ${pos.y} ${pos.z} 0 0 0 0.1 100`);
}

function ticksToTime(ticks, withColor) {
    if (ticks < ticksPerSecond) return `${ticks} Ticks`;

    let seconds = Math.floor(ticks / 20);
    let minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes.toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

    let hours = Math.floor(minutes / 60);
    return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

function startEvent(event) {
    if (!currentEvent || currentEvent.endTick < event.server.tickCount) {
        const ev = getWeightedObject(events);
        this.currentEvent = ev.action(event);
        this.currentEvent.startEvent(event);
    }
}

function getWeightedObject(objects) {
    let totalWeight = 0;
    for (let object of objects) {
        totalWeight += object.weight;
    }
    let random = Math.random() * totalWeight;
    let currentWeight = 0;
    for (let object of objects) {
        currentWeight += object.weight;
        if (currentWeight >= random) {
            return object;
        }
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
    let result = `§6[${currentEvent.name}]§f Verbleibende Zeit: ${tickTimeColor(currentEvent.endTick - event.server.tickCount)}${ticksToTime(currentEvent.endTick - event.server.tickCount)}§f.`;
    if(fortschritt) result += ` Fortschritt: §a${currentEvent.total} / ${currentEvent.targetAmount}§f.`;
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
// ----------------------------------------
// Events
// ----------------------------------------

const HUNT_EVENT = {
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

    startEvent(event) {
        currentEvent.startTick = event.server.tickCount;
        currentEvent.missionTime = rng(missionMinTime, missionMaxTime);
        currentEvent.endTick = event.server.tickCount + currentEvent.missionTime;

        currentEvent.targetMonster = getWeightedObject(validHuntTargets);
        if (currentEvent.targetMonster.id === '*') {
            currentEvent.wild = true;
        }

        if (currentEvent.wild && currentEvent.multiplayer) currentEvent.name = 'Gemätzel'
        else if (currentEvent.wild && !currentEvent.multiplayer) currentEvent.name = 'Wilde Jagd';
        else if (!currentEvent.wild && currentEvent.multiplayer) currentEvent.name = 'Treibjagd';
        else currentEvent.name = 'Kopfgeldjagd';

        currentEvent.actionTable = new Map();
        currentEvent.total = 0;

        if (currentEvent.multiplayer) {
            currentEvent.targetAmount = rng(event.server.players.length, currentEvent.targetMonster.amount * event.server.players.length);
            event.server.tell(`§6[${currentEvent.name}]§f Alle, die sich an der Vernichtung von §6${currentEvent.targetAmount}x ${currentEvent.targetMonster?.name || 'Gegner'}§f beteiligen, werden belohnt!\n  -> Zeitlimit: ${tickTimeColor(currentEvent.missionTime)}${ticksToTime(currentEvent.missionTime)}`);
        } else {
            currentEvent.targetAmount = rng(1, currentEvent.targetMonster.amount);
            event.server.tell(`§6[${currentEvent.name}]§f Derjenige, der zuerst §6${currentEvent.targetAmount}x ${currentEvent.targetMonster?.name || 'Gegner'}§f tötet gewinnt!\n  -> Zeitlimit ${tickTimeColor(currentEvent.missionTime)}${ticksToTime(currentEvent.missionTime)}`);
        }
    },

    handleDeath(event) {
        if (!event.source?.player?.username) return;
        if (currentEvent.targetMonster && !currentEvent.wild && event.entity.type.toString().toLowerCase().indexOf(currentEvent.targetMonster.id) === -1) return;
        let player = event.source.player;
        let killer = String(player.username);
        currentEvent.actionTable.set(killer, (currentEvent.actionTable.get(killer) || 0) + 1);
        currentEvent.total++;

        event.server.tell(`§6[${currentEvent.name}]§f §a${killer}§f macht kill §a${currentEvent.multiplayer ? currentEvent.total : currentEvent.actionTable.get(killer)}§f / §a${currentEvent.targetAmount}`);

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
            event.server.tell(`§6[${currentEvent.name}]§f §cZeit ist abgelaufen!`);
            currentEvent = undefined;
            return;
        }


        if (currentEvent.multiplayer) {
            event.server.tell(`§6[${currentEvent.name}]§f §aEvent war Erolfgreich!§f\n  -> Teilnehmer: §a${huntersText.join('§f, §a')}§f\n${getTimeStats(event)}`);
            hunters.forEach(hunter => {
                summonPlayerCoin(event, hunter);
            });
        } else {
            event.server.tell(`§6[${currentEvent.name}]§f  §a${winnerName}§f gewinnt!\n  -> Teilnehmer: §a${huntersText.join('§f, §a')}§f\n${getTimeStats(event)}`);
            summonPlayerCoin(event, winnerName);
        }
        currentEvent = undefined;
    },

    timeNotification(event) {
        getTimeRemaining(event, currentEvent.multiplayer);
    }
}

const THIEF_EVENT = {
    name: 'Zombie-Dieb',
    startEvent(event) {
        let players = event.server.players.filter(p => p.level.dimension === 'minecraft:overworld');
        if (players.length === 0) {
            currentEvent.stopEvent();
            return;
        }
        let player = players[Math.floor(Math.random() * players.length)];
    
        let summonPos = generateSummonPos(player);
    
        // event.server.tell(`§fEin §6Zombie-Dieb§f hat der Händlergilde Tokens geklaut! Er wurde bei §a${toChatPosition(summonPos)}§f gesichtet!\n -> ${toMapPosition('Dieb', summonPos, 'minecraft:overworld')}`);
        event.server.tell(`§fEin §6Zombie-Dieb§f hat der Händlergilde Tokens geklaut! Er wurde bei §a${toChatPosition(summonPos)}§f gesichtet!`);
        event.server.runCommandSilent(`summon minecraft:zombie ${summonPos.x} ${summonPos.y} ${summonPos.z} {PersistenceRequired:1,CustomName:"\\"Zombie Dieb\\"",CustomNameVisible:1b,PersistenceRequired:1,ArmorItems:[{id:"minecraft:diamond_boots",Count:1b},{id:"minecraft:diamond_leggings",Count:1b},{id:"minecraft:diamond_chestplate",Count:1b},{id:"minecraft:diamond_helmet",Count:1b}],ArmorDropChances:[0.1f,0.1f,0.1f,0.1f],HandItems:[{id:"kubejs:mission_token",Count:1b},{id:"kubejs:mission_token",Count:1b}],HandDropChances:[1.0f,0.3f]}`);
        event.server.runCommandSilent(`effect give @e[name="Zombie Dieb"] minecraft:slow_falling 120`);
        event.server.runCommandSilent(`effect give @e[name="Zombie Dieb"] minecraft:strength infinite 2`);
        event.server.runCommandSilent(`effect give @e[name="Zombie Dieb"] minecraft:resistance infinite 2`);
        event.server.runCommandSilent(`effect give @e[name="Zombie Dieb"] minecraft:glowing infinite`);
        event.server.runCommandSilent(`effect give @e[name="Zombie Dieb"] minecraft:speed infinite`);
        event.server.runCommandSilent(`particle minecraft:campfire_signal_smoke ${summonPos.x} ${summonPos.y} ${summonPos.z} 0 400 0 0 500 force`);
        event.server.runCommandSilent(`particle minecraft:totem_of_undying ${summonPos.x} ${summonPos.y} ${summonPos.z} 0 400 0 0 1000 force`);
        currentEvent.stopEvent();
    },
    stopEvent(event) {
        currentEvent = undefined;
    }
}

const AIRDROP_EVENT = {
    name: 'Airdrop',
    startEvent(event) {
        let players = event.server.players.filter(p => p.level.dimension === 'minecraft:overworld');
        if (players.length === 0) {
            currentEvent.stopEvent();
            return;
        }
        let player = players[Math.floor(Math.random() * players.length)];
    
        let summonPos = generateSummonPos(player);
    
        event.server.runCommandSilent(`summon minecraft:item ${summonPos.x} ${summonPos.y} ${summonPos.z} {Item:{id:"kubejs:mission_token",Count:1}}`);
        event.server.runCommandSilent(`effect give @e[type=minecraft:item] minecraft:slow_falling 120`);
        event.server.runCommandSilent(`particle minecraft:campfire_signal_smoke ${summonPos.x} ${summonPos.y} ${summonPos.z} 0 400 0 0 500 force`);
        event.server.runCommandSilent(`particle minecraft:totem_of_undying ${summonPos.x} ${summonPos.y} ${summonPos.z} 0 400 0 0 1000 force`);
        // event.server.tell(`§fEine §6Flugmaschine hat§f bei §a${toChatPosition(summonPos)}§f Fracht verloren.\n -> ${toMapPosition('Fracht', summonPos, 'minecraft:overworld')}`);
        event.server.tell(`§fEine §6Flugmaschine hat§f bei §a${toChatPosition(summonPos)}§f Fracht verloren.`);
        currentEvent.stopEvent();
    },
    stopEvent(event) {
        currentEvent = undefined;
    }
}

const SPAWN_RACE_EVENT = {
    name: 'Spawn-Rennen',
    startEvent(event) {
        event.server.tell(`§fWer zuerst am §6Spawnpunkt§f ist, bekommt eine §6Mission§f!\n  -> ${toMapPosition('Spawnpunkt', spawnPosition, 'minecraft:overworld')}`);
        summonPosCoin(event, spawnPosition);
        currentEvent.stopEvent();
    },
    stopEvent(event) {
        currentEvent = undefined;
    }
}

const PRESENT_EVENT = {
    name: 'Geschenkt',
    startEvent(event) {
        let players = event.server.players;
        event.server.tell(`§fEs gibt eine §6Geschenkte Mission§f für jeden!`);
        for (let player of players) {
            summonPlayerCoin(event, player.username);
        }
        currentEvent.stopEvent();
    },
    stopEvent(event) {
        currentEvent = undefined;
    }
}

const PLANT_EVENT = {
    name: "Klimarettung",
    startTick: undefined,
    endTick: undefined,
    missionTime: undefined,

    targetAmount: undefined,
    actionTable: undefined,
    total: undefined,

    startEvent(event) {
        currentEvent.startTick = event.server.tickCount;
        currentEvent.missionTime = rng(missionMinTime, missionMaxTime);
        currentEvent.endTick = event.server.tickCount + currentEvent.missionTime;
        
        currentEvent.targetAmount = rng(event.server.players.length * 20, event.server.players.length * 128);
        currentEvent.actionTable = new Map();
        currentEvent.total = 0;

        event.server.tell(`§6[${currentEvent.name}]§f Das Klima spielt verrückt. §6Pflanzt ${currentEvent.targetAmount} Bäume oder Pflanzen§f um es zu retten. Ihr habt ${tickTimeColor(currentEvent.missionTime)}${ticksToTime(currentEvent.missionTime)}§f Zeit.`);
    },

    handlePlace(event) {
        if (!event?.player?.username) return;
        let player = event.player;
        if (event.player.mainHandItem?.id && event.player.mainHandItem.id.startsWith('constructionwand')) return;

        if(!event.block.hasTag('minecraft:crops') && !event.block.hasTag('minecraft:saplings') && !event.block.hasTag('minecraft:small_flowers') && !event.block.hasTag('minecraft:flowers')) return;

        let planter = String(player.username);
        currentEvent.actionTable.set(planter, (currentEvent.actionTable.get(planter) || 0) + 1);
        currentEvent.total++;
        if(currentEvent.actionTable.get(planter) === 1) {
            event.server.tell(`§6[${currentEvent.name}]§f §a${planter}§f ist dabei und pflanzt mit!`);
        }

        if(currentEvent.total >= currentEvent.targetAmount) {
            currentEvent.stopEvent(event);
        }
    },

    handleBreak(event) {
        if (!event?.player?.username) return;
        let player = event.player;
        if (event.player.mainHandItem?.id && event.player.mainHandItem.id.startsWith('constructionwand')) return;

        if(!event.block.hasTag('minecraft:crops') && !event.block.hasTag('minecraft:saplings') && !event.block.hasTag('minecraft:small_flowers') && !event.block.hasTag('minecraft:flowers')) return;

        let planter = String(player.username);
        currentEvent.actionTable.set(planter, (currentEvent.actionTable.get(planter) || 0) - 1);
        currentEvent.total--;
        event.server.tell(`§6[${currentEvent.name}]§f §a${planter}§c ist ein Umweltsünder!`);


        if(currentEvent.total >= currentEvent.targetAmount) {
            currentEvent.stopEvent(event);
        }
    },

    stopEvent(event) {

        // get the entry with the highest count from  actionTable
        let participants = [];
        let participantNames = [];
        let winnerCount = 0;
        let winnerName = undefined;

        for (let [key, data] of currentEvent.actionTable) {
            participants.push(key);
            participantNames.push(`${key} (${data})`);
            if (data > winnerCount) {
                winnerCount = data;
                winnerName = key;
            }
        }

        let failed = currentEvent.total < currentEvent.targetAmount;
        if (failed) {
            event.server.tell(`§6[${currentEvent.name}]§f §cZeit ist abgelaufen!`);
            currentEvent = undefined;
            return;
        }


        event.server.tell(`§6[${currentEvent.name}]§f §aEvent war Erolfgreich!§f\n  -> Teilnehmer: §a${participantNames.join('§f, §a')}§f\n${getTimeStats(event)}`);
        participants.forEach(hunter => {
            summonPlayerCoin(event, hunter);
        });
        currentEvent = undefined;
    },

    timeNotification(event) {
        getTimeRemaining(event, true);
    }
}

const MINE_EVENT = {
    name: "Mineneinsturz",
    startTick: undefined,
    endTick: undefined,
    missionTime: undefined,

    dimension: undefined,

    targetAmount: undefined,
    actionTable: undefined,
    total: undefined,

    startEvent(event) {
        currentEvent.startTick = event.server.tickCount;
        currentEvent.missionTime = rng(missionMinTime, missionMaxTime);
        currentEvent.endTick = event.server.tickCount + currentEvent.missionTime;
        
        currentEvent.targetAmount = rng(event.server.players.length * 128, event.server.players.length * 1024);
        currentEvent.actionTable = new Map();
        currentEvent.total = 0;

        event.server.tell(`§6[${currentEvent.name}]§f Bergarbeiter wurden in einer Höhle eingeschlossen! §6Baut ${currentEvent.targetAmount} Gestein§f ab um zu ihnen zu gelangen. Ihr habt ${tickTimeColor(currentEvent.missionTime)}${ticksToTime(currentEvent.missionTime)}§f Zeit, bevor sie ersticken.`);
    },

    handleBreak(event) {
        if (!event?.player?.username) return;
        let player = event.player;
        if (event.player.mainHandItem?.id && event.player.mainHandItem.id.startsWith('constructionwand')) return;
        if(!event.block.hasTag('c:stone') && !event.block.hasTag('c:cobblestone') && !event.block.hasTag('c:gravel')) return;

        let breaker = String(player.username);
        currentEvent.actionTable.set(breaker, (currentEvent.actionTable.get(breaker) || 0) + 1);
        currentEvent.total++;
        if(currentEvent.actionTable.get(breaker) === 1) {
            event.server.tell(`§6[${currentEvent.name}]§f §a${breaker}§f ist dabei und hilft mit!`);
        }

        if(currentEvent.total >= currentEvent.targetAmount) {
            currentEvent.stopEvent(event);
        }
    },

    stopEvent(event) {

        // get the entry with the highest count from  actionTable
        let participants = [];
        let participantNames = [];
        let winnerCount = 0;
        let winnerName = undefined;

        for (let [key, data] of currentEvent.actionTable) {
            participants.push(key);
            participantNames.push(`${key} (${data})`);
            if (data > winnerCount) {
                winnerCount = data;
                winnerName = key;
            }
        }

        let failed = currentEvent.total < currentEvent.targetAmount;
        if (failed) {
            event.server.tell(`§6[${currentEvent.name}]§f §cZeit ist abgelaufen - die armen Bergleute müssen leider sterben!`);
            currentEvent = undefined;
            return;
        }


        event.server.tell(`§6[${currentEvent.name}]§f §aBergleute gerettet!§f\n  -> Teilnehmer: §a${participantNames.join('§f, §a')}§f\n${getTimeStats(event)}`);
        participants.forEach(hunter => {
            summonPlayerCoin(event, hunter);
        });
        currentEvent = undefined;
    },

    timeNotification(event) {
        getTimeRemaining(event, true);
    }
}

const RACE_EVENT = {
    name: 'Rennen',
    startTick: undefined,
    endTick: undefined,
    missionTime: undefined,
    targetPos: undefined,
    dimension: 'minecraft:overworld',
    getPlayerRanking(event) {
        const players = event.server.players.filter(p => p.level.dimension === currentEvent.dimension);
        let playerDistance = new Map();
        if(players.length > 0) {
            players.forEach(p => {
                const distance = Math.round(getDistance(currentEvent.targetPos, p.blockPosition()));
                playerDistance.set(String(p.username), distance);
            });
            return Array.from(playerDistance.entries()).sort((a, b) => a[1] - b[1]);
        }
        return [];
    },
    startEvent(event) {
        currentEvent.startTick = event.server.tickCount;
        currentEvent.missionTime = rng(missionMinTime, missionMaxTime);
        currentEvent.endTick = event.server.tickCount + currentEvent.missionTime;

        let posX = spawnPosition.x + rng(-raceMaxDistance, raceMaxDistance);
        let posY = rng(-50, 200);
        let posZ = spawnPosition.z + rng(-raceMaxDistance, raceMaxDistance);
        currentEvent.targetPos = { x: posX, y: posY, z: posZ };

        // event.server.tell(`§fWer zuerst bei §6${toChatPosition(currentEvent.targetPos, true)}§f ist, gewinnt! Ihr habt ${tickTimeColor(currentEvent.missionTime)}${ticksToTime(currentEvent.missionTime)}§f Zeit.\n  -> ${toMapPosition('Rennen', currentEvent.targetPos, 'minecraft:overworld')}`);
        event.server.tell(`§fWer zuerst bei §6${toChatPosition(currentEvent.targetPos, true)}§f ist, gewinnt! Ihr habt ${tickTimeColor(currentEvent.missionTime)}${ticksToTime(currentEvent.missionTime)}§f Zeit.`);
    },
    handleTick(event) {
        const players = event.server.players.filter(p => p.level.dimension === currentEvent.dimension);
        players.forEach(p => {
            const distance = Math.round(getDistance(currentEvent.targetPos, p.blockPosition()));
            if (distance < 3) {
                event.server.tell(`§6[${currentEvent.name}]§f §a${p.username}§f hat das Rennen gewonnen!\n${getTimeStats(event)}`);
                summonPlayerCoin(event, String(p.username));
                currentEvent = undefined;
            } else if (distance < 75) {
                event.server.tell(`§6[${currentEvent.name}]§f §a${p.username}§f ist fast am Ziel! Nur noch ${Math.round(getDistance(currentEvent.targetPos, p.blockPosition()))}m!`);
            } else if (distance < 250) {
                p.tell(`§6[${currentEvent.name}]§7 Du bist noch §f${Math.round(getDistance(currentEvent.targetPos, p.blockPosition()))}m§7 entfernt.`);   
            }
        });
    },
    stopEvent(event) {
        event.server.tell(`§6[${currentEvent.name}]§f §cZeit ist abgelaufen - das Rennen ist vorbei!`);
        currentEvent = undefined;
    },
    timeNotification(event) {
        let players = event.server.players.filter(p => p.level.dimension === currentEvent.dimension);
        let ticksRemaining = currentEvent.endTick - event.server.tickCount;
        if(players.length > 0) {
            let sortedPlayerArray = currentEvent.getPlayerRanking(event);
            let playerRanking = '';
            for (let i = 0; i < sortedPlayerArray.length; i++) {
                playerRanking += `\n${i + 1}. ${sortedPlayerArray[i][0]} (${sortedPlayerArray[i][1]}m)`;
            }
            event.server.tell(`§6[${currentEvent.name}]§f Noch ${tickTimeColor(ticksRemaining)}${ticksToTime(ticksRemaining)}§f um zu §6${toChatPosition(currentEvent.targetPos, true)}§f zu kommen!${playerRanking}`);
        } else {
            event.server.tell(`§6[${currentEvent.name}]§f Noch ${tickTimeColor(ticksRemaining)}${ticksToTime(ticksRemaining)}§f um zu §6${toChatPosition(currentEvent.targetPos, true)}§f zu kommen!`);
        }
    }
}

// ----------------------------------------
// Event Handling
// ----------------------------------------

BlockEvents.broken(event => {
    if (currentEvent?.handleBreak) {
        currentEvent.handleBreak(event);
    }
});

BlockEvents.placed(event => {
    if (currentEvent?.handlePlace) {
        currentEvent.handlePlace(event);
    }
});

EntityEvents.death(event => {
    if (currentEvent?.handleDeath) {
        currentEvent.handleDeath(event);
    }
});

ItemEvents.entityInteracted(event => {
    if(currentEvent?.handeItemInteraction) {
        currentEvent.handeItemInteraction(event);
    }
});

ServerEvents.tick(event => {
    if (event.server.tickCount % checkInterval === 0) {
        if (currentEvent) {
            if(currentEvent.handleTick) {
                currentEvent.handleTick(event);
            }
            if (currentEvent.endTick < event.server.tickCount) {
                currentEvent.stopEvent(event);
                currentEvent = undefined;
            }
        } else {
            let playerCount = event.server.players.length;
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
        if ((currentEvent.endTick - event.server.tickCount) < 20 * 20) interval = 5;
        else if ((currentEvent.endTick - event.server.tickCount) < 90 * 20) interval = 20;
        if (event.server.tickCount % (interval * 20) === 0) {
            currentEvent.timeNotification(event);
        }
    }
});
