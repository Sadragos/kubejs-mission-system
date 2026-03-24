// Caches
let currentEvent;
let unlucky = false;

let QE_REWARDS = [
    {
        id: 'coin',
        name: COIN_ITEM_NAME,
        minPerPlayer: 4,
        maxPerPlayer: 6,
        weight: 100,
        chance: 1.0
    }, {
        id: 'mission',
        name: MISSION_ITEM_NAME,
        minPerPlayer: 1,
        maxPerPlayer: 1,
        chance: 0.1
    }, {
        id: 'buff',
        name: 'Buff',
        chance: 1.0,
        buffs: [
            {
                name: 'Speed',
                buff: 'minecraft:speed',
                minDuration: 10,
                maxDuration: 20,
                minAmplifier: 0,
                maxAmplifier: 1
            },
            {
                name: 'Dark Ward',
                buff: 'born_in_chaos_v1:dark_ward',
                minDuration: 10,
                maxDuration: 20,
                minAmplifier: 0,
                maxAmplifier: 0
            },
            {
                name: 'Vitalität',
                buff: 'apothic_attributes:vitality',
                minDuration: 10,
                maxDuration: 20,
                minAmplifier: 0,
                maxAmplifier: 4
            },
            {
                name: 'Haste',
                buff: 'minecraft:haste',
                minDuration: 5,
                maxDuration: 20,
                minAmplifier: 0,
                maxAmplifier: 2
            },
            {
                name: 'Stärke',
                buff: 'minecraft:strength',
                minDuration: 5,
                maxDuration: 15,
                minAmplifier: 0,
                maxAmplifier: 2
            },
            {
                name: 'Resistenz',
                buff: 'minecraft:resistance',
                minDuration: 5,
                maxDuration: 15,
                minAmplifier: 2,
                maxAmplifier: 2
            },
            {
                name: 'Regeneration',
                buff: 'minecraft:regeneration',
                minDuration: 5,
                maxDuration: 15,
                minAmplifier: 0,
                maxAmplifier: 2
            },
            {
                name: 'Luck',
                buff: 'minecraft:luck',
                minDuration: 5,
                maxDuration: 15,
                minAmplifier: 0,
                maxAmplifier: 4
            },
            {
                name: 'Lebenssteigerung',
                buff: 'minecraft:health_boost',
                minDuration: 10,
                maxDuration: 20,
                minAmplifier: 0,
                maxAmplifier: 9
            },
            {
                name: 'Fliegen',
                buff: 'apothic_attributes:flying',
                minDuration: 2,
                maxDuration: 5,
                minAmplifier: 0,
                maxAmplifier: 0
            },
            {
                name: 'Altes Wissen',
                buff: 'apothic_attributes:knowledge',
                minDuration: 4,
                maxDuration: 8,
                minAmplifier: 0,
                maxAmplifier: 1
            },
            {
                name: 'Sättigung',
                buff: 'farmersdelight:nourishment',
                minDuration: 10,
                maxDuration: 20,
                minAmplifier: 0,
                maxAmplifier: 0
            }
        ]
    }
]

const PRESENT_EVENT = {
    name: 'Geschenkt',
    id: 'present',
    weight: 1,
    showInStat: false,
    startEvent(event) {
        let players = event.server.players;
        event.server.tell(`§fEin neuer §aAuftrag§f der Gilde für jeden!`);
        for (let player of players) {
            rewardPlayer(event, player, event, PRESENT_EVENT.id, { items: [{ item: MISSION_TOKEN, amount: 1, name: MISSION_ITEM_NAME }] });
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
    showInStat: true,
    name: 'Jagd',
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
    rewards: [],

    startEvent(event) {
        currentEvent.startTick = event.server.tickCount;
        currentEvent.missionTime = randomInt(MISSION_MIN_TIME, MISSION_MAX_TIME);
        currentEvent.endTick = event.server.tickCount + currentEvent.missionTime;

        let avgPlayerProgress = getAveragePlayerProgress(event.server, 'kill', true);
        currentEvent.multiplayer = randomInt(0, 100) <= (MULTIPLAYER_PERCENTAGE * 100);
        currentEvent.targetMonster = getWeightedRandomItem(getMissionByType('kill').filter(mission => mission.min >= event.server.players.length && (!mission.minProgress || mission.minProgress <= avgPlayerProgress) ));
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

        currentEvent.rewards = generateRewards(event);

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
                text: ' vernichtet, gewinnt!'
            })
        }

        parts.push({
            text: `\n  -> Zeitlimit: ${tickTimeColor(currentEvent.missionTime)}${ticksToTime(currentEvent.missionTime)}`
        });
        parts.push({
            text: `\n  -> Belohnung: ${currentEvent.rewards.map(el => el.display).join(', ')}`
        });
        if (currentEvent.targetMonster.eggChance > 0 && currentEvent.targetMonster.egg) {
            parts.push({
                text: `\n  -> Spawn-Ei-Chance: §a${(currentEvent.targetMonster.eggChance * 100).toFixed(0)}%§f`
            });
        }
        event.server.tell(parts);
        playSoundAtPlayer(event, '@a', 'minecraft:item.goat_horn.sound.6');
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
                let effects = [
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
            playSoundAtPlayer(event, '@a', 'minecraft:entity.lightning_bolt.thunder');
            return;
        }

        playSoundAtPlayer(event, '@a', 'minecraft:entity.firework_rocket.launch');
        let bonus = getTimeBonusMultiplier(currentEvent.startTick, event.server.tickCount, currentEvent.endTick);
        let bonusText = `§a${(bonus * 100).toFixed(0)}%§f`;
        if (currentEvent.multiplayer) {
            event.server.tell(`${currentEvent.label} §aEvent war Erfolgreich!§f\n  -> Teilnehmer: §a${huntersText.join('§f, §a')}§f\n  -> Durchschnittliche Kills: §a${averageKills.toFixed(1)}§f\n${getTimeStats(event)}\n  -> Zeitbonus: ${bonusText}`);
            hunters.forEach(hunter => {
                currentEvent.handleWin(event, hunter, true);
            });
        } else {
            event.server.tell(`${currentEvent.label}  §a${winnerName}§f gewinnt!\n  -> Teilnehmer: §a${huntersText.join('§f, §a')}§f\n${getTimeStats(event)}\n  -> Zeitbonus: ${bonusText}`);
            currentEvent.handleWin(event, winnerName, true);
        }
        unlucky = false;
        currentEvent = undefined;
        removeScoreboard(event);
    },

    timeNotification(event) {
        let bonus = getTimeBonusMultiplier(currentEvent.startTick, event.server.tickCount, currentEvent.endTick);
        getTimeRemaining(event, currentEvent.multiplayer, bonus);
    },

    handleWin(event, hunter, canSpawnEgg) {
        let bonus = getTimeBonusMultiplier(currentEvent.startTick, event.server.tickCount, currentEvent.endTick);

        checkForHelperMission(event, hunter, HUNT_EVENT.id);
        let spawnEggItem = undefined;
        if (canSpawnEgg) {
            let mob = currentEvent.targetMonster;
            let chance = Math.random();
            let doSpawn = chance <= mob.eggChance;
            if (doSpawn) {
                if (mob.eggChance > 0 && mob.egg) {
                    if (mob.egg.indexOf(',') > -1) {
                        let eggs = mob.egg.split(',');
                        let weightedEggs = eggs.map(egg => {
                            let otherEggMission = ALL_MISSIONS.find(mission => mission.egg === egg);
                            return {
                                item: egg,
                                weight: otherEggMission.weight * otherEggMission.eggChance,
                                name: otherEggMission.name
                            }
                        });
                        let pickedEgg = getWeightedRandomItem(weightedEggs);
                        spawnEggItem = { item: pickedEgg.item, amount: 1, name: pickedEgg.name };
                    } else {
                        spawnEggItem = { item: mob.egg, amount: 1, name: mob.name };
                    }
                }
            }
        }
        handleReward(event, currentEvent.rewards, hunter, bonus, spawnEggItem);
    }
}

const THIEF_EVENT = {
    name: 'Gilden-Dieb',
    id: 'thief',
    weight: 2,
    showInStat: true,
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
        let weaponOptions = [REWARD_ITEM, REWARD_ITEM, 'kubejs:coins', 'kubejs:coins', 'kubejs:coins', 'kubejs:coins', 'kubejs:coins', 'kubejs:coins', `minecraft:${material}_sword`, `better_weaponry:${material}_dagger`, `better_weaponry:${material}_scythe`, `better_weaponry:${material}_spear`, `better_weaponry:${material}_broadsword`, `better_weaponry:${material}_battleaxe`, `better_weaponry:${material}_cutlass`];
        let weapon = weaponOptions[Math.floor(Math.random() * weaponOptions.length)];
        event.server.tell(`§6[${currentEvent.name}]§f Ein Dieb hat der Händlergilde Aufträge geklaut! Er wurde bei §a${toChatPosition(summonPos)}§f gesichtet!`);
        event.server.runCommandSilent(`summon ${pickedOption} ${summonPos.x} ${summonPos.y} ${summonPos.z} {PersistenceRequired:1,CustomName:"\\"Gilden-Dieb\\"",CustomNameVisible:1b,PersistenceRequired:1,ArmorItems:[{id:"minecraft:${material}_boots",Count:1b},{id:"minecraft:${material}_leggings",Count:1b},{id:"minecraft:${material}_chestplate",Count:1b},{id:"minecraft:${material}_helmet",Count:1b}],ArmorDropChances:[0.1f,0.1f,0.1f,0.1f],HandItems:[{id:"${weapon}",Count:1b},{id:"${REWARD_ITEM}",Count:1b}],HandDropChances:[0.5f,1.0f]}`);
        event.server.runCommandSilent(`effect give @e[name="Gilden-Dieb"] minecraft:slow_falling 120`);
        event.server.runCommandSilent(`effect give @e[name="Gilden-Dieb"] minecraft:strength infinite 2`);
        event.server.runCommandSilent(`effect give @e[name="Gilden-Dieb"] minecraft:resistance infinite 2`);
        event.server.runCommandSilent(`effect give @e[name="Gilden-Dieb"] minecraft:glowing infinite`);
        event.server.runCommandSilent(`effect give @e[name="Gilden-Dieb"] minecraft:speed infinite`);
        markPosition(event, summonPos, currentEvent.name);
        currentEvent.stopEvent(event);

        playSoundAtPlayer(event, '@a', 'minecraft:item.goat_horn.sound.4');
    },
    stopEvent(event) {
        currentEvent = undefined;
    }
}

const AIRDROP_EVENT = {
    name: 'Frachtverlust',
    id: 'airdrop',
    weight: 2,
    showInStat: false,
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
        let items = [];

        if (Math.random() < 0.2) {
            items.push(`{slot:0,item:{id:"${REWARD_ITEM}",count:1}}`);
        } else {
            let item = getWeightedRandomItem(getMissionByType('item').filter(it => it.item.includes(':')));
            let amount = Math.max(1, randomInt(item.min / 4, item.max / 4));
            let index = 0;
            do {
                let stackAmount = Math.min(64, amount);
                items.push(`{slot:${index},item:{id:"${item.item}",count:${stackAmount}}}`);
                amount -= stackAmount;
                index++;
            } while (index < 9 && amount > 0);
        }

        event.server.runCommandSilent(`summon item ${summonPos.x} ${summonPos.y} ${summonPos.z} {Item:{id:"create:cardboard_package_10x12",count:1,components:{"create:package_address":"Frachtverlust","create:package_contents":[${items.join(',')}]}}}`);
        markPosition(event, summonPos, currentEvent.name);
        currentEvent.stopEvent(event);
        playSoundAtPlayer(event, '@a', 'minecraft:item.goat_horn.sound.0');
    },
    stopEvent(event) {
        currentEvent = undefined;
    }
}

const ITEM_REQUEST_EVENT = {
    name: 'Bestellung',
    id: 'request',
    weight: 2,
    showInStat: true,
    startTick: undefined,
    endTick: undefined,
    missionTime: undefined,

    targetItem: undefined,
    targetAmount: undefined,
    actionTable: undefined,
    label: '§6[Bestellung]§f',
    scoreLabel: '§6[B]§f',
    total: 0,
    rewards: [],
    startEvent(event) {
        let playermodsum = 0;
        let playerMulti = 0;
        for (let player of event.server.players) {
            playermodsum += getPlayerProgress(player, 'item');
            playerMulti += MISSION_TARGET_PLAYER_MULT;
        }
        let playermod = playermodsum / event.server.players.length;
        currentEvent.startTick = event.server.tickCount;
        currentEvent.missionTime = randomInt(MISSION_MIN_TIME, MISSION_MAX_TIME);
        currentEvent.endTick = event.server.tickCount + currentEvent.missionTime;
        currentEvent.total = 0;
        currentEvent.actionTable = new Map();

        currentEvent.rewards = generateRewards(event);

        currentEvent.targetItem = getWeightedRandomItem(getMissionByType('item').filter(mission => mission.min >= event.server.players.length && (!mission.minProgress || mission.minProgress <= playermodsum)));

        currentEvent.targetAmount = Math.ceil(randomInt(currentEvent.targetItem.min, currentEvent.targetItem.max) * playerMulti);
        currentEvent.targetAmount = Math.max(Math.ceil(currentEvent.targetAmount * playermod), event.server.players.length);
        let targetName = currentEvent.targetItem.name;

        initScoreboard(event, `${currentEvent.scoreLabel} ${currentEvent.targetAmount}§8x§f ${targetName}`, true);

        let parts = [{ text: currentEvent.label }];
        let itemPart = Text.of(`[${currentEvent.targetAmount}x ${targetName}]`)
            .color('green')
            .hover('§lItem ID§r\n' + currentEvent.targetItem.item);

        parts.push({
            text: ' Die Gilde hat  '
        })
        parts.push(itemPart);

        parts.push({
            text: ' bestellt. Jeder der mittels Holzschale ein paar einsendet, wird belohnt!'
        });

        parts.push({
            text: `\n  -> Zeitlimit: ${tickTimeColor(currentEvent.missionTime)}${ticksToTime(currentEvent.missionTime)}`
        });
        parts.push({
            text: `\n  -> Belohnung: ${currentEvent.rewards.map(el => el.display).join(', ')}`
        });
        event.server.tell(parts);
        playSoundAtPlayer(event, '@a', 'minecraft:item.goat_horn.sound.1');
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
            playSoundAtPlayer(event, '@a', 'minecraft:entity.lightning_bolt.thunder');
            return;
        }

        let bonus = getTimeBonusMultiplier(currentEvent.startTick, event.server.tickCount, currentEvent.endTick);
        let bonusText = `§a${(bonus * 100).toFixed(0)}%§f`;
        event.server.tell(`${currentEvent.label} §aEvent war Erfolgreich!§f\n  -> Teilnehmer: §a${huntersText.join('§f, §a')}§f\n${getTimeStats(event)}\n  -> Zeitbonus: ${bonusText}`);
        hunters.forEach(hunter => {
            handleReward(event, currentEvent.rewards, hunter, bonus);
            checkForHelperMission(event, hunter, ITEM_REQUEST_EVENT.id);
        });
        currentEvent = undefined;
        removeScoreboard(event);
    },
    timeNotification(event) {
        let bonus = getTimeBonusMultiplier(currentEvent.startTick, event.server.tickCount, currentEvent.endTick);
        getTimeRemaining(event, false, bonus);
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
        let reward = randomInt(1, 3);
        rewardPlayer(event, event.source.player, 'event', THIEF_EVENT.id, { xp: reward, worldborder: reward });
    }
});

ServerEvents.tick(event => {
    if (event.server.tickCount % CHECK_INTERVAL === 0) {
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
            let bonusChance = playerCount * AVG_MISSION_PER_HOUR_PLAYER;
            let totalMissionsPerHous = AVG_MISSIONS_PER_HOUR + bonusChance;
            let missionChance = totalMissionsPerHous / (TICKS_PER_HOUR / CHECK_INTERVAL);
            let chance = Math.random();


            if (chance < missionChance) {
                startEvent(event);
            }
        }
    }
    if (currentEvent?.timeNotification) {
        let interval = ANNOUNCE_INTERVAL_SECONDS;
        if ((currentEvent.endTick - event.server.tickCount) < 15 * 20) interval = 5;
        else if ((currentEvent.endTick - event.server.tickCount) < 80 * 20) interval = 20;
        if (event.server.tickCount % (interval * 20) === 0) {
            currentEvent.timeNotification(event);
        }
    }
});


function startEvent(event, typeFilter, force) {
    console.log(`Starting Event: ${typeFilter}`);
    if (!currentEvent || currentEvent.endTick < event.server.tickCount || force) {
        let ev = getWeightedRandomItem(ALL_QUICK_EVENTS.filter(e => !typeFilter || e.id === typeFilter));
        this.currentEvent = ev;
        this.currentEvent.startEvent(event);
    }
}

function generateRewards(event) {
    let rewards = [];
    for (let i = 0; i < QE_REWARDS.length; i++) {
        let pick = QE_REWARDS[i];
        if (Math.random() >= pick.chance) continue;
        if (pick.id === 'buff') {
            let pickedBuff = pick.buffs[Math.floor(Math.random() * pick.buffs.length)];
            let preparedBuff = {
                id: pick.id,
                buff: pickedBuff.buff,
                name: pickedBuff.name,
                duration: randomInt(pickedBuff.minDuration, pickedBuff.maxDuration),
                amplifier: randomInt(pickedBuff.minAmplifier, pickedBuff.maxAmplifier)
            };
            preparedBuff.display = `§a${preparedBuff.duration} Minuten ${preparedBuff.name} ${toRoman(preparedBuff.amplifier)}§f`;
            rewards.push(preparedBuff);
        } else {
            let existing = rewards.find(r => r.id === pick.id);
            let amount = randomIntAdjusted(pick.minPerPlayer, pick.maxPerPlayer, getPlayerProgress(event.server, currentEvent.id));
            if (existing) {
                existing.amount += amount;
                existing.display = `§a${existing.amount}x ${existing.name}§f`;
                continue;
            }
            let preparedReward = {
                id: pick.id,
                name: pick.name,
                amount: amount
            }
            preparedReward.display = `§a${preparedReward.amount}x ${preparedReward.name}§f`;
            rewards.push(preparedReward);
        }
    };
    return rewards;
}

function handleReward(event, rewards, username, multiplier, spawnEggItem) {
    let player = event.server.players.find(p => p.username === username);
    let items = [];
    let buffs = [];
    let coins = 0;
    if (spawnEggItem) items.push(spawnEggItem);

    let parts = `§7Durch deine Teilnahme am Event hast du die folgenden Belohnungen erhalten:`;
    for (let reward of rewards) {
        switch (reward.id) {
            case 'buff':
                let duration = Math.round(reward.duration * multiplier);
                buffs.push({ buff: reward.buff, duration: duration, amplifier: reward.amplifier, name: reward.name });
                break;
            case 'coin':
                coins = Math.round(reward.amount * multiplier);
                break;
            case 'mission':
                let missions = Math.round(reward.amount * multiplier);
                items.push({ item: MISSION_TOKEN, amount: missions, name: MISSION_ITEM_NAME });
                break;
        }
    }
    rewardPlayer(event, player, 'event', currentEvent.id, { items: items, buffs: buffs, coins: coins, xp: coins, worldborder: Math.ceil(coins / 2) });
}

function getTimeBonusMultiplier(startTick, endTick, maxTick) {
    let duration = endTick - startTick;
    let maxDuration = maxTick - startTick;
    let maxBonusDuration = maxDuration / 2;
    let maxBonusProgress = Math.min(1, duration / maxBonusDuration);
    let bonusPercentMulti = 1 - maxBonusProgress;
    let bonus = Math.max(0, MAX_TIME_BONUS * bonusPercentMulti);
    return 1 + bonus;
}