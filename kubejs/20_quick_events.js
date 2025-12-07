// Caches
let currentEvent;
let unlucky = false;

const PRESENT_EVENT = {
    name: 'Geschenkt',
    id: 'present',
    weight: 1,
    startEvent(event) {
        let players = event.server.players;
        event.server.tell(`§fEs gibt eine §aGeschenkte Mission§f für jeden!`);
        for (let player of players) {
            summonRewardItem(event, player.username, rewardAmountMin, rewardAmountMax);
        }
        currentEvent.stopEvent(event);
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

        let parts = [{ text: currentEvent.label }];
        let mobPart = Text.of(`[${currentEvent.targetAmount}x ${targetName}]`)
                    .color('green')
                    .hover('§lMonsterliste§r\n' + (currentEvent.targetMonster.item === '*' ? 'alle Gegner' : getMoblist(currentEvent.targetMonster.item).map(el => el.item).join(', ')));

        if (currentEvent.multiplayer) {
            parts.push({
                text: ' Alle, die sich an der Vernichtung von '
            })
            parts.push(mobPart);
            parts.push({
                text: ' beteiligen, werden belohnt!'
            })
        } else {
            parts.push({
                text: ' Derjenige, der zuerst '
            })
            parts.push(mobPart);
            parts.push({
                text: ' vernichtet, wird gewinnt!'
            })
        }

        if (currentEvent.targetMonster.eggChance > 0 && currentEvent.targetMonster.egg) {
            parts.push({
                text: ' Bei Erfolg könnte ein Spawn-Ei erscheinen.'
            });
        }
        parts.push({
            text: `\n  -> Zeitlimit: ${tickTimeColor(currentEvent.missionTime)}${ticksToTime(currentEvent.missionTime)}`
        });
        event.server.tell(parts);



    },

    handleDeath(event) {
        if (!isValidKill(event.entity, currentEvent.targetMonster?.item)) return;

        let player = event.source.player;
        let killer = String(player.username);
        currentEvent.actionTable.set(killer, (currentEvent.actionTable.get(killer) || 0) + 1);
        currentEvent.total++;

        summonParticleAtPosition(event, event.entity.position(), 'minecraft:totem_of_undying', 20, 1, 0.1);

        setScore(event, killer, currentEvent.actionTable.get(killer));
        if (currentEvent.multiplayer) setScore(event, 'GESAMT', currentEvent.total);

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
        let averageKills = currentEvent.total / hunters.length;

        let failed = (currentEvent.multiplayer && currentEvent.total < currentEvent.targetAmount) || (!currentEvent.multiplayer && winnerCount < currentEvent.targetAmount);
        if (failed) {
            if (unlucky) {
                let effects = ['minecraft:slowness 300','gametechbcs_spellbooks:blackout 120','elixirum:shrink 120 5','irons_spellbooks:chilled 240', 'minecraft:hunger 180', 'minecraft:infested 300', 'minecraft:mining_fatigue 180', 'minecraft:darkness 60', 'minecraft:oozing 300', 'minecraft:oozing 300', 'minecraft:nausea 20', 'minecraft:weaving 300'];
                let selectedEffect = effects[Math.floor(Math.random() * effects.length)];
                event.server.tell(`${currentEvent.label} §cZeit ist abgelaufen, die Vertragsstrafe wird verhängt!`);
                event.server.runCommandSilent(`effect give @a ${selectedEffect}`);
                event.server.runCommandSilent(`effect give @a minecraft:unluck 300 2`);
                summonParticleAtPlayer(event, '@a', 'minecraft:ash', 100, 3, 0.2);
                unlucky = false;
            } else {
                event.server.tell(`${currentEvent.label} §cZeit ist abgelaufen!`);
            }
            currentEvent = undefined;
            removeScoreboard(event);
            return;
        }


        if (currentEvent.multiplayer) {
            event.server.tell(`${currentEvent.label} §aEvent war Erfolgreich!§f\n  -> Teilnehmer: §a${huntersText.join('§f, §a')}§f\n  -> Durchschnittliche Kills: §a${averageKills.toFixed(1)}§f\n${getTimeStats(event)}`);
            hunters.forEach(hunter => {
                currentEvent.handleWin(event, hunter, true);
            });
        } else {
            event.server.tell(`${currentEvent.label}  §a${winnerName}§f gewinnt!\n  -> Teilnehmer: §a${huntersText.join('§f, §a')}§f\n${getTimeStats(event)}`);
            currentEvent.handleWin(event, winnerName, true);
        }
        unlucky = false;
        currentEvent = undefined;
        removeScoreboard(event);
    },

    timeNotification(event) {
        getTimeRemaining(event, currentEvent.multiplayer);
    },

    handleWin(event, hunter, canSpawnEgg) {
        summonRewardItem(event, hunter, rewardAmountMin, rewardAmountMax);
        checkForHelperMission(event, hunter, HUNT_EVENT.id);
        if (!canSpawnEgg) return;
        let mob = currentEvent.targetMonster;
        let chance = Math.random();
        let doSpawn = chance <= mob.eggChance;
        if (!doSpawn) return;
        if (mob.eggChance > 0 && mob.egg) {
            if (mob.egg.indexOf(',') > -1) {
                let eggs = mob.egg.split(',');
                let weightedEggs = eggs.map(egg => {
                    let otherEggMission = ALL_MISSIONS.find(mission => mission.egg === egg);
                    return {
                        item: egg,
                        weight: otherEggMission.weight * otherEggMission.eggChance,
                    }
                });
                let pickedEgg = getWeightedRandomItem(weightedEggs);
                summonItem(event, hunter, pickedEgg.item, 1);
            } else {
                summonItem(event, hunter, mob.egg, 1);
            }
        }
    }
}

const THIEF_EVENT = {
    name: 'Gilden-Dieb',
    id: 'thief',
    weight: 2,
    startEvent(event) {
        let players = event.server.players.filter(p => p.level.dimension === 'minecraft:overworld');
        if (players.length === 0) {
            currentEvent.stopEvent(event);
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
        currentEvent.stopEvent(event);
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
            currentEvent.stopEvent(event);
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
        currentEvent.stopEvent(event);
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


        event.server.tell(`${currentEvent.label} Die Gilde hat §a${currentEvent.targetAmount}x ${targetName}§f bestellt. Jeder der mittels Holzschale ein paar einsendet, wird belohnt!\n  -> Zeitlimit: ${tickTimeColor(currentEvent.missionTime)}${ticksToTime(currentEvent.missionTime)}\n  §7-> Ziel-ID: ${currentEvent.targetItem.item}`);
    },
    stopEvent(event) {
        let hunters = [];
        let huntersText = [];

        for (let [key, data] of currentEvent.actionTable) {
            hunters.push(key);
            huntersText.push(`${key} (${data})`);
        }

        let failed = currentEvent.total < currentEvent.targetAmount;
        if (failed) {
            event.server.tell(`${currentEvent.label} §cZeit ist abgelaufen!`);
            currentEvent = undefined;
            removeScoreboard(event);
            return;
        }


        event.server.tell(`${currentEvent.label} §aEvent war Erfolgreich!§f\n  -> Teilnehmer: §a${huntersText.join('§f, §a')}§f\n${getTimeStats(event)}`);
        hunters.forEach(hunter => {
            summonRewardItem(event, hunter, rewardAmountMin, rewardAmountMax);
            checkForHelperMission(event, hunter, ITEM_REQUEST_EVENT.id);
        });
        currentEvent = undefined;
        removeScoreboard(event);
    },
    timeNotification(event) {
        getTimeRemaining(event, currentEvent.multiplayer);
    },
}

const ALL_QUICK_EVENTS = [THIEF_EVENT, AIRDROP_EVENT, PRESENT_EVENT, HUNT_EVENT, ITEM_REQUEST_EVENT];

// Items für QuickEvent abgeben
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
        summonParticleAtPlayer(event, player.username, 'minecraft:totem_of_undying', 20, 3, 0.1);

        setScore(event, playername, currentEvent.actionTable.get(playername));
        setScore(event, 'GESAMT', currentEvent.total);

        if (currentEvent.total >= currentEvent.targetAmount) {
            currentEvent.stopEvent(event);
        }
    }
    event.cancel();
});

EntityEvents.death(event => {
    if (!event.source?.player?.username) return;
    if (currentEvent?.handleDeath) {
        currentEvent.handleDeath(event);
    }
    if (event.entity.hasCustomName() && event.entity.getCustomName().getString() == 'Gilden-Dieb') {
        event.server.tell(`§6[Gilden-Dieb]§f Der Gilden-Dieb bei §a${toChatPosition({ x: Math.floor(event.entity.position().x), y: Math.floor(event.entity.position().y), z: Math.floor(event.entity.position().z) })}§f wurde von §a${event.source.player.username}§f zur Strecke gebracht!`);
        checkForHelperMission(event, event.source.player.username, THIEF_EVENT.id);
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

            let playerCount = event.server.players.length;
            if (playerCount === 0) return;
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


function startEvent(event, typeFilter, force) {
    if (!currentEvent || currentEvent.endTick < event.server.tickCount || force) {
        let ev = getWeightedRandomItem(ALL_QUICK_EVENTS.filter(e => !typeFilter || e.id === typeFilter));
        this.currentEvent = ev;
        this.currentEvent.startEvent(event);
    }
}

function summonRewardItem(event, playerName, amountMin, amountMax) {
    let min = amountMin === undefined ? 1 : amountMin;
    let max = amountMax === undefined ? 1 : amountMax;
    let amount = randomInt(min, max);
    summonItem(event, playerName, rewardItem, amount);
}