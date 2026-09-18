// Caches
let currentEvent;
let unlucky = false;

/**
 * Builds the colored "[Event Name]" label component used at the start of chat broadcasts.
 * @param {string} nameKey lang key of the event's display name
 * @param {boolean} [unlucky] whether to use the "cursed" (dark red) color instead of gold
 * @returns {Internal.Component}
 */
function eventLabel(nameKey, unlucky) {
    return Text.of('[').append(Text.translate(nameKey)).append(Text.of(']')).color(unlucky ? 'dark_red' : 'gold');
}

/**
 * Builds the plain-text scoreboard sidebar title. Scoreboard titles are a single shared
 * string (not per-viewer translatable in a meaningful way here), so this intentionally
 * resolves using the server's default (English) name resolution instead of per-player text.
 * @param {string} abbr short plain-text event abbreviation (e.g. "BH")
 * @param {number} amount
 * @param {Internal.Component} target
 * @param {boolean} [unlucky]
 * @returns {string}
 */
function scoreboardTitle(abbr, amount, target, unlucky) {
    let color = unlucky ? '§4' : '§6';
    return `${color}[${abbr}]§f ${amount}§8x§f ${target.getString()}`;
}

const PRESENT_EVENT = {
    nameKey: 'kubejs.event.present.name',
    id: 'present',
    weight: QUICK_EVENT_WEIGHTS.present,
    showInStat: false,
    startEvent(event) {
        let players = event.server.players;
        event.server.tell(Text.translate('kubejs.event.present.announce').color('white'));
        for (let player of players) {
            rewardPlayer(event, player, event, PRESENT_EVENT.id, { items: [{ item: MISSION_SCROLL, amount: 1 }] });
        }
        currentEvent.stopEvent(event);
    },
    stopEvent(event) {
        currentEvent = undefined;
    }
}

const HUNT_EVENT = {
    id: 'hunt',
    progressType: 'kill',
    weight: QUICK_EVENT_WEIGHTS.hunt,
    showInStat: true,
    nameKey: 'kubejs.event.hunt.generic',
    abbr: 'H',
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
    rewards: [],

    startEvent(event) {
        currentEvent.startTick = event.server.tickCount;
        currentEvent.missionTime = MathUtils.randomInt(MISSION_MIN_TIME, MISSION_MAX_TIME);
        currentEvent.endTick = event.server.tickCount + currentEvent.missionTime;

        let avgPlayerProgress = getAveragePlayerProgress(event.server, 'kill', true);
        currentEvent.multiplayer = MathUtils.randomInt(0, 100) <= (MULTIPLAYER_PERCENTAGE * 100);
        currentEvent.targetMonster = MathUtils.randomWeightedEntry(getMissionByType('kill').filter(mission => mission.min >= event.server.players.length && (!mission.minProgress || mission.minProgress <= avgPlayerProgress)));
        currentEvent.wild = currentEvent.targetMonster.item === '*';

        if (currentEvent.wild && currentEvent.multiplayer) {
            currentEvent.nameKey = 'kubejs.event.hunt.slaughter';
            currentEvent.abbr = 'S';
        }
        else if (currentEvent.wild && !currentEvent.multiplayer) {
            currentEvent.nameKey = 'kubejs.event.hunt.wild';
            currentEvent.abbr = 'WH';
        }
        else if (!currentEvent.wild && currentEvent.multiplayer) {
            currentEvent.nameKey = 'kubejs.event.hunt.driven';
            currentEvent.abbr = 'DH';
        }
        else {
            currentEvent.nameKey = 'kubejs.event.hunt.bounty';
            currentEvent.abbr = 'BH';
        }

        currentEvent.label = eventLabel(currentEvent.nameKey, unlucky);

        currentEvent.rewards = generateRewards({ min: currentEvent.targetMonster.minCoins, max: currentEvent.targetMonster.maxCoins }, avgPlayerProgress * QE_REWARD_MULTIPLIER);

        currentEvent.actionTable = new Map();
        currentEvent.total = 0;
        let target = TextUtils.entityName(currentEvent.targetMonster.item, currentEvent.targetMonster.name);
        let playermodsum = 0;
        let playermult = 0;
        for (let player of event.server.players) {
            playermodsum += getPlayerProgress(player, 'kill', true);
            playermult += MISSION_TARGET_PLAYER_MULT;
        }
        let playermod = playermodsum / event.server.players.length;
        currentEvent.targetAmount = Math.ceil(MathUtils.randomInt(currentEvent.targetMonster.min, currentEvent.targetMonster.max) * playermult);
        currentEvent.targetAmount = Math.max(Math.ceil(currentEvent.targetAmount * playermod), event.server.players.length);

        ScoreboardUtils.initBoard(event.server, 'my_mission_scores', scoreboardTitle(currentEvent.abbr, currentEvent.targetAmount, target, unlucky));
        if (currentEvent.multiplayer) ScoreboardUtils.setScore(event.server, 'my_mission_scores', 'GESAMT', 0);

        let moblistHeader = Text.translate('kubejs.event.hunt.moblist_header').getString();
        let moblistBody = currentEvent.wild
            ? Text.translate('kubejs.mission.any_monster').getString()
            : getMoblist(currentEvent.targetMonster.item).map(el => TextUtils.entityName(el.item, el.name).getString()).join(', ');
        let mobPart = Text.of(`[${currentEvent.targetAmount}x `).append(target).append(Text.of(']'))
            .color('green')
            .hover(`§l${moblistHeader}§r\n${moblistBody}`);

        let introKey = currentEvent.multiplayer ? 'kubejs.event.hunt.announce.coop' : 'kubejs.event.hunt.announce.solo';

        let parts = [
            currentEvent.label,
            Text.translate(introKey, mobPart),
            Text.translate('kubejs.event.time_limit', tickTimeColor(currentEvent.missionTime) + ticksToTime(currentEvent.missionTime))
        ];
        parts.push(Text.translate('kubejs.event.reward', TextUtils.join(Text.of(', '), currentEvent.rewards.map(el => el.display))));
        if (currentEvent.targetMonster.eggChance > 0 && currentEvent.targetMonster.egg) {
            parts.push(Text.translate('kubejs.event.egg_chance', (currentEvent.targetMonster.eggChance * 100).toFixed(0)));
        }
        parts.push(Text.translate('kubejs.event.difficulty', (playermod * 100).toFixed(1)));

        event.server.tell(parts);
        SoundUtils.playSoundAtPlayer(event.server, '@a', 'minecraft:item.goat_horn.sound.6');
    },

    handleDeath(event) {
        if (!isValidKill(event.entity, currentEvent.targetMonster?.item)) return;

        let player = event.source.player;
        let killer = String(player.username);
        currentEvent.actionTable.set(killer, (currentEvent.actionTable.get(killer) || 0) + 1);
        currentEvent.total++;

        ParticleUtils.summonParticleAtPosition(event.server, event.entity.position(), 'minecraft:totem_of_undying', 20, 1, 0.1, 0.1, 0.1);

        ScoreboardUtils.setScore(event.server, 'my_mission_scores', killer, currentEvent.actionTable.get(killer));
        if (currentEvent.multiplayer) ScoreboardUtils.setScore(event.server, 'my_mission_scores', 'GESAMT', currentEvent.total);

        if (currentEvent.multiplayer && currentEvent.total >= currentEvent.targetAmount) {
            currentEvent.stopEvent(event);
        } else if (!currentEvent.multiplayer && currentEvent.actionTable.get(killer) >= currentEvent.targetAmount) {
            currentEvent.stopEvent(event);
        }
    },

    stopEvent(event) {
        // get the entry with the highest count from  actionTable
        let hunters = [];
        let winnerCount = 0;
        let winnerName = undefined;

        for (let [key, data] of currentEvent.actionTable) {
            hunters.push(`${key} (${data})`);
            if (data > winnerCount) {
                winnerCount = data;
                winnerName = key;
            }
        }
        let averageKills = currentEvent.total / hunters.length;

        let failed = (currentEvent.multiplayer && currentEvent.total < currentEvent.targetAmount) || (!currentEvent.multiplayer && winnerCount < currentEvent.targetAmount);
        if (failed) {
            if (unlucky) {
                let selectedEffect = CURSE_EFFECTS[Math.floor(Math.random() * CURSE_EFFECTS.length)];
                event.server.tell(Text.translate('kubejs.event.failed.cursed', currentEvent.label));
                event.server.runCommandSilent(`effect give @a ${selectedEffect}`);
                event.server.runCommandSilent(`effect give @a minecraft:unluck 300 2`);
                ParticleUtils.summonParticleAtPlayer(event.server, '@a', 'minecraft:ash', 100, 3, 0.2, 0.2, 0.2);
                unlucky = false;
            } else {
                event.server.tell(Text.translate('kubejs.event.failed', currentEvent.label));
            }
            currentEvent = undefined;
            ScoreboardUtils.removeScoreboard(event.server, 'my_mission_scores');
            SoundUtils.playSoundAtPlayer(event.server, '@a', 'minecraft:entity.lightning_bolt.thunder');
            return;
        }

        SoundUtils.playSoundAtPlayer(event.server, '@a', 'minecraft:entity.firework_rocket.launch');
        let bonus = getTimeBonusMultiplier(currentEvent.startTick, event.server.tickCount, currentEvent.endTick);
        let bonusText = TextUtils.colored(`${(bonus * 100).toFixed(0)}%`, 'green');
        let lines = [];
        if (currentEvent.multiplayer) {
            lines.push(Text.translate('kubejs.event.success', currentEvent.label));
            lines.push(Text.translate('kubejs.event.participants', TextUtils.colored(hunters.join(', '), 'green')));
            lines.push(Text.translate('kubejs.event.avg_kills', TextUtils.colored(averageKills.toFixed(1), 'green')));
        } else {
            lines.push(Text.translate('kubejs.event.winner', currentEvent.label, TextUtils.colored(winnerName, 'green')));
            lines.push(Text.translate('kubejs.event.participants', TextUtils.colored(hunters.join(', '), 'green')));
        }
        Array.prototype.push.apply(lines, getTimeStats(event));
        lines.push(Text.translate('kubejs.event.time_bonus', bonusText));
        event.server.tell(TextUtils.join(Text.of('\n'), lines));

        if (currentEvent.multiplayer) {
            for (let [key] of currentEvent.actionTable) {
                currentEvent.handleWin(event, key, true);
            }
        } else {
            currentEvent.handleWin(event, winnerName, true);
        }
        unlucky = false;
        currentEvent = undefined;
        ScoreboardUtils.removeScoreboard(event.server, 'my_mission_scores');
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
                                weight: otherEggMission.weight * otherEggMission.eggChance
                            };
                        });
                        let pickedEgg = MathUtils.randomWeightedEntry(weightedEggs);
                        spawnEggItem = { item: pickedEgg.item, amount: 1 };
                    } else {
                        spawnEggItem = { item: mob.egg, amount: 1 };
                    }
                }
            }
        }
        handleReward(event, currentEvent.rewards, hunter, bonus, spawnEggItem);
    }
}

const THIEF_EVENT = {
    nameKey: 'kubejs.event.thief.name',
    id: 'thief',
    weight: QUICK_EVENT_WEIGHTS.thief,
    showInStat: true,
    startEvent(event) {
        let players = event.server.players.filter(p => p.level.dimension === 'minecraft:overworld');
        if (players.length === 0) {
            currentEvent.stopEvent(event);
            return;
        }
        let player = players[Math.floor(Math.random() * players.length)];

        let summonPos = PositionUtils.generateSummonPos(player, MISSION_SUMMON_MAX_PLAYER_DIST);
        let pickedOption = THIEF_MOB_OPTIONS[Math.floor(Math.random() * THIEF_MOB_OPTIONS.length)];
        let material = MathUtils.randomWeightedEntry(THIEF_MATERIAL_OPTIONS).id;
        let weapon = MathUtils.randomWeightedEntry(THIEF_WEAPON_POOL).item.replace('{material}', material);
        event.server.tell(Text.translate('kubejs.event.thief.announce', eventLabel(THIEF_EVENT.nameKey), TextUtils.colored(PositionUtils.toChatPosition(summonPos), 'green')));
        // CustomName is a static (non-interpolated) translatable component JSON literal, so it's safe to embed directly.
        event.server.runCommandSilent(`summon ${pickedOption} ${summonPos.x} ${summonPos.y} ${summonPos.z} {PersistenceRequired:1,CustomName:'{"translate":"kubejs.event.thief.mob_name"}',CustomNameVisible:1b,ArmorItems:[{id:"minecraft:${material}_boots",Count:1b},{id:"minecraft:${material}_leggings",Count:1b},{id:"minecraft:${material}_chestplate",Count:1b},{id:"minecraft:${material}_helmet",Count:1b}],ArmorDropChances:[${THIEF_ARMOR_DROP_CHANCE}f,${THIEF_ARMOR_DROP_CHANCE}f,${THIEF_ARMOR_DROP_CHANCE}f,${THIEF_ARMOR_DROP_CHANCE}f],HandItems:[{id:"${weapon}",Count:1b},{id:"${REWARD_ITEM}",Count:1b}],HandDropChances:[${THIEF_WEAPON_DROP_CHANCE}f,${THIEF_TOKEN_DROP_CHANCE}f]}`);
        let thiefName = Text.translate('kubejs.event.thief.mob_name').getString();
        THIEF_BUFFS.forEach(b => {
            let amplifier = b.amplifier !== undefined ? ` ${b.amplifier}` : '';
            event.server.runCommandSilent(`effect give @e[name="${thiefName}"] ${b.effect} ${b.duration}${amplifier}`);
        });
        PositionUtils.markPosition(event.server, summonPos, Text.translate(THIEF_EVENT.nameKey).getString());
        currentEvent.stopEvent(event);

        SoundUtils.playSoundAtPlayer(event.server, '@a', 'minecraft:item.goat_horn.sound.4');
    },
    stopEvent(event) {
        currentEvent = undefined;
    }
}

const AIRDROP_EVENT = {
    nameKey: 'kubejs.event.airdrop.name',
    id: 'airdrop',
    weight: QUICK_EVENT_WEIGHTS.airdrop,
    showInStat: false,
    startEvent(event) {
        let players = event.server.players.filter(p => p.level.dimension === 'minecraft:overworld');
        if (players.length === 0) {
            currentEvent.stopEvent(event);
            return;
        }
        let player = players[Math.floor(Math.random() * players.length)];

        let summonPos = PositionUtils.generateSummonPos(player, MISSION_SUMMON_MAX_PLAYER_DIST);
        let vehicleKeys = ['kubejs.event.airdrop.vehicle.0', 'kubejs.event.airdrop.vehicle.1', 'kubejs.event.airdrop.vehicle.2', 'kubejs.event.airdrop.vehicle.3', 'kubejs.event.airdrop.vehicle.4', 'kubejs.event.airdrop.vehicle.5', 'kubejs.event.airdrop.vehicle.6', 'kubejs.event.airdrop.vehicle.7'];
        let pickedVehicle = Text.translate(vehicleKeys[Math.floor(Math.random() * vehicleKeys.length)]);
        event.server.tell(Text.translate('kubejs.event.airdrop.announce', pickedVehicle, TextUtils.colored(PositionUtils.toChatPosition(summonPos), 'green')));
        let items = [];

        let resolvedItemId = Math.random() < 0.2 ? undefined : resolveAirdropItemId();
        if (!resolvedItemId) {
            items.push({ id: REWARD_ITEM, count: 1 });
        } else {
            let item = resolvedItemId.mission;
            let amount = Math.max(1, MathUtils.randomInt(item.min / 4, item.max / 4));
            do {
                let stackAmount = Math.min(64, amount);
                items.push({ id: resolvedItemId.id, count: stackAmount });
                amount -= stackAmount;
            } while (items.length < 9 && amount > 0);
        }

        if (Platform.isLoaded('create')) {
            let packageContents = items.map((it, index) => `{slot:${index},item:{id:"${it.id}",count:${it.count}}}`).join(',');
            event.server.runCommandSilent(`summon item ${summonPos.x} ${summonPos.y} ${summonPos.z} {Item:{id:"create:cardboard_package_10x12",count:1,components:{"create:package_address":"${Text.translate(AIRDROP_EVENT.nameKey).getString()}","create:package_contents":[${packageContents}]}}}`);
        } else {
            items.forEach(it => {
                event.server.runCommandSilent(`summon item ${summonPos.x} ${summonPos.y} ${summonPos.z} {Item:{id:"${it.id}",count:${it.count}}}`);
            });
        }
        PositionUtils.markPosition(event.server, summonPos, Text.translate(AIRDROP_EVENT.nameKey).getString());
        currentEvent.stopEvent(event);
        SoundUtils.playSoundAtPlayer(event.server, '@a', 'minecraft:item.goat_horn.sound.0');
    },
    stopEvent(event) {
        currentEvent = undefined;
    }
}

const ITEM_REQUEST_EVENT = {
    nameKey: 'kubejs.event.request.name',
    id: 'request',
    progressType: 'item',
    weight: QUICK_EVENT_WEIGHTS.request,
    showInStat: true,
    abbr: 'O',
    startTick: undefined,
    endTick: undefined,
    missionTime: undefined,

    targetItem: undefined,
    targetAmount: undefined,
    actionTable: undefined,
    label: undefined,
    total: 0,
    rewards: [],
    startEvent(event) {
        currentEvent.label = eventLabel(ITEM_REQUEST_EVENT.nameKey);
        let playermodsum = 0;
        let playerMulti = 0;
        for (let player of event.server.players) {
            playermodsum += getPlayerProgress(player, 'item', true);
            playerMulti += MISSION_TARGET_PLAYER_MULT;
        }
        let playermod = playermodsum / event.server.players.length;
        currentEvent.startTick = event.server.tickCount;
        currentEvent.missionTime = MathUtils.randomInt(MISSION_MIN_TIME, MISSION_MAX_TIME);
        currentEvent.endTick = event.server.tickCount + currentEvent.missionTime;
        currentEvent.total = 0;
        currentEvent.actionTable = new Map();

        currentEvent.targetItem = MathUtils.randomWeightedEntry(getMissionByType('item').filter(mission => mission.min >= event.server.players.length && (!mission.minProgress || mission.minProgress <= playermodsum)));

        currentEvent.rewards = generateRewards({ min: currentEvent.targetItem.minCoins, max: currentEvent.targetItem.maxCoins }, playermod * QE_REWARD_MULTIPLIER);

        currentEvent.targetAmount = Math.ceil(MathUtils.randomInt(currentEvent.targetItem.min, currentEvent.targetItem.max) * playerMulti);
        currentEvent.targetAmount = Math.max(Math.ceil(currentEvent.targetAmount * playermod), event.server.players.length);
        let target = TextUtils.itemName(currentEvent.targetItem.item, currentEvent.targetItem.name);

        ScoreboardUtils.initBoard(event.server, 'my_mission_scores', scoreboardTitle(ITEM_REQUEST_EVENT.abbr, currentEvent.targetAmount, target));
        ScoreboardUtils.setScore(event.server, 'my_mission_scores', 'GESAMT', 0);

        let itemIdHeader = Text.translate('kubejs.event.request.item_id_header').getString();
        let itemPart = Text.of(`[${currentEvent.targetAmount}x `).append(target).append(Text.of(']'))
            .color('green')
            .hover(`§l${itemIdHeader}§r\n${currentEvent.targetItem.item}`);

        let parts = [
            currentEvent.label,
            Text.translate('kubejs.event.request.announce', itemPart),
            Text.translate('kubejs.event.time_limit', tickTimeColor(currentEvent.missionTime) + ticksToTime(currentEvent.missionTime))
        ];
        parts.push(Text.translate('kubejs.event.reward', TextUtils.join(Text.of(', '), currentEvent.rewards.map(el => el.display))));
        parts.push(Text.translate('kubejs.event.difficulty', (playermod * 100).toFixed(1)));

        event.server.tell(parts);
        SoundUtils.playSoundAtPlayer(event.server, '@a', 'minecraft:item.goat_horn.sound.1');
    },
    stopEvent(event) {
        let hunters = [];

        for (let [key, data] of currentEvent.actionTable) {
            hunters.push(`${key} (${data})`);
        }

        let failed = currentEvent.total < currentEvent.targetAmount;
        if (failed) {
            event.server.tell(Text.translate('kubejs.event.failed', currentEvent.label));
            currentEvent = undefined;
            ScoreboardUtils.removeScoreboard(event.server, 'my_mission_scores');
            SoundUtils.playSoundAtPlayer(event.server, '@a', 'minecraft:entity.lightning_bolt.thunder');
            return;
        }

        let bonus = getTimeBonusMultiplier(currentEvent.startTick, event.server.tickCount, currentEvent.endTick);
        let bonusText = TextUtils.colored(`${(bonus * 100).toFixed(0)}%`, 'green');
        let lines = [Text.translate('kubejs.event.success', currentEvent.label)];
        lines.push(Text.translate('kubejs.event.participants', TextUtils.colored(hunters.join(', '), 'green')));
        Array.prototype.push.apply(lines, getTimeStats(event));
        lines.push(Text.translate('kubejs.event.time_bonus', bonusText));
        event.server.tell(TextUtils.join(Text.of('\n'), lines));

        for (let [key] of currentEvent.actionTable) {
            handleReward(event, currentEvent.rewards, key, bonus);
            checkForHelperMission(event, key, ITEM_REQUEST_EVENT.id);
        }
        currentEvent = undefined;
        ScoreboardUtils.removeScoreboard(event.server, 'my_mission_scores');
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
    let take = ItemUtils.removeFromInventory(player, currentEvent.targetItem.item, currentEvent.targetAmount - currentEvent.total);
    let target = TextUtils.itemName(currentEvent.targetItem.item, currentEvent.targetItem.name);

    if (take === 0) {
        player.tell(Text.translate('kubejs.event.request.no_item', target).color('red'));
    } else {
        player.tell(Text.translate('kubejs.event.request.delivered', TextUtils.colored(take), target).color('green'));
        let playername = String(player.username);
        currentEvent.actionTable.set(playername, (currentEvent.actionTable.get(playername) || 0) + take);
        currentEvent.total += take;
        ParticleUtils.summonParticleAtPlayer(event.server, player.username, 'minecraft:totem_of_undying', 20, 3, 0.1, 0.1, 0.1);

        ScoreboardUtils.setScore(event.server, 'my_mission_scores', playername, currentEvent.actionTable.get(playername));
        ScoreboardUtils.setScore(event.server, 'my_mission_scores', 'GESAMT', currentEvent.total);

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
    if (event.entity.hasCustomName() && event.entity.getCustomName().getString() == Text.translate('kubejs.event.thief.mob_name').getString()) {
        event.server.tell(Text.translate('kubejs.event.thief.defeated', eventLabel(THIEF_EVENT.nameKey), TextUtils.colored(PositionUtils.toChatPosition({ x: Math.floor(event.entity.position().x), y: Math.floor(event.entity.position().y), z: Math.floor(event.entity.position().z) }), 'green'), TextUtils.colored(event.source.player.username, 'green')));
        checkForHelperMission(event, event.source.player.username, THIEF_EVENT.id);
        let reward = MathUtils.randomInt(1, 3);
        rewardPlayer(event, event.source.player, 'event', THIEF_EVENT.id, {  worldborder: reward });
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
        let ev = MathUtils.randomWeightedEntry(ALL_QUICK_EVENTS.filter(e => !typeFilter || e.id === typeFilter));
        this.currentEvent = ev;
        this.currentEvent.startEvent(event);
    }
}

/**
 * Würfelt den MISSION_REWARDS-Pool aus (unabhängig pro Eintrag gegen dessen `chance`) und baut
 * für jeden Treffer ein bereits farbig formatiertes `.display`-Component. Wird sowohl für
 * Quick Events als auch für normale Missionen verwendet.
 * @param {{min: number, max: number}} coinRange - minCoins/maxCoins der relevanten Missions-/Event-CSV-Zeile
 * @param {number} multiplier - Skalierungsfaktor für coin/worldborder/xp/buff (individueller
 *   Spieler-Fortschritt bei Missionen, Server-Durchschnitt * QE_REWARD_MULTIPLIER bei Quick Events)
 * @returns {object[]} Liste gewürfelter Belohnungs-Einträge
 */
function generateRewards(coinRange, multiplier) {
    let rewards = [];
    let coinAmount = MathUtils.randomIntAdjusted(coinRange.min, coinRange.max, multiplier, 1, MathUtils.randomInt(COIN_REWARD_MINMIN, COIN_REWARD_MINMAX));

    for (let i = 0; i < MISSION_REWARDS.length; i++) {
        let pick = MISSION_REWARDS[i];
        if (Math.random() >= pick.chance) continue;

        switch (pick.id) {
            case 'coin': {
                let reward = { id: 'coin', amount: coinAmount };
                reward.display = Text.translate('kubejs.reward.item_count', TextUtils.colored(coinAmount), TextUtils.itemName(COIN_ITEM)).color('green');
                rewards.push(reward);
                break;
            }
            case 'worldborder': {
                let amount = Math.max(1, Math.round(coinAmount * pick.multiplier));
                let reward = { id: 'worldborder', amount: amount };
                reward.display = Text.translate('kubejs.reward.worldborder', TextUtils.colored(amount, 'green')).color('green');
                rewards.push(reward);
                break;
            }
            case 'xp': {
                let amount = Math.max(1, Math.round(coinAmount * pick.multiplier));
                let reward = { id: 'xp', amount: amount };
                reward.display = Text.translate('kubejs.reward.xp', TextUtils.colored(amount, 'aqua')).color('aqua');
                rewards.push(reward);
                break;
            }
            case 'mission': {
                let amount = Math.max(1, Math.round(MathUtils.randomIntAdjusted(pick.minPerPlayer, pick.maxPerPlayer, multiplier, 1, 1)));
                let reward = { id: 'mission', item: MISSION_SCROLL, amount: amount };
                reward.display = Text.translate('kubejs.reward.item_count', TextUtils.colored(amount), TextUtils.itemName(MISSION_SCROLL)).color('green');
                rewards.push(reward);
                break;
            }
            case 'command': {
                let reward = { id: 'command', command: pick.command, nameKey: pick.nameKey };
                reward.display = Text.translate(pick.nameKey).color('gold');
                rewards.push(reward);
                break;
            }
            case 'buff': {
                let pickedBuff = pick.buffs[Math.floor(Math.random() * pick.buffs.length)];
                let duration = Math.max(1, Math.round(MathUtils.randomInt(pickedBuff.minDuration, pickedBuff.maxDuration) * multiplier));
                let amplifier = Math.max(0, Math.round(MathUtils.randomInt(pickedBuff.minAmplifier, pickedBuff.maxAmplifier) * multiplier));
                let reward = { id: 'buff', buff: pickedBuff.buff, duration: duration, amplifier: amplifier };
                reward.display = Text.translate('kubejs.reward.buff', TextUtils.colored(duration), TextUtils.effectName(pickedBuff.buff), TextUtils.colored(TextUtils.toRoman(amplifier))).color('light_purple');
                rewards.push(reward);
                break;
            }
        }
    }
    return rewards;
}

/**
 * Wendet gewürfelte MISSION_REWARDS-Einträge (siehe `generateRewards`) auf ein `rewardPlayer`-
 * taugliches Payload-Objekt an, ohne den Spieler bereits zu belohnen. Wird sowohl von
 * `handleReward` (Quick Events) als auch von `giveMissionItem`/`finishMission` (Missionen) genutzt.
 * @param {object[]} rewards - gewürfelte Belohnungs-Einträge aus `generateRewards`
 * @param {number} multiplier - zusätzlicher Auszahlungs-Multiplikator (z.B. Zeitbonus bei Quick
 *   Events; bei Missionen einfach 1, da die Skalierung dort schon beim Würfeln passiert ist)
 * @param {object} [spawnEggItem] - optionales zusätzliches Item (z.B. Kill-Missions-Ei), das immer dazukommt
 * @param {string} [username] - Zielspieler, gegen den `@p` in command-Belohnungen ersetzt wird
 * @returns {{items: object[], buffs: object[], commands: object[], coins: number, xp: number, worldborder: number}}
 */
function resolveRewardPayload(rewards, multiplier, spawnEggItem, username) {
    let items = [];
    let buffs = [];
    let commands = [];
    let coins = 0;
    let xp = 0;
    let worldborder = 0;
    if (spawnEggItem) items.push(spawnEggItem);

    for (let reward of rewards) {
        switch (reward.id) {
            case 'coin':
                coins += Math.max(1, Math.round(reward.amount * multiplier));
                break;
            case 'worldborder':
                worldborder += Math.max(1, Math.round(reward.amount * multiplier));
                break;
            case 'xp':
                xp += Math.max(1, Math.round(reward.amount * multiplier));
                break;
            case 'mission':
                items.push({ item: reward.item, amount: Math.max(1, Math.round(reward.amount * multiplier)) });
                break;
            case 'command':
                commands.push({ command: reward.command.replace(/@p\b/g, username), nameKey: reward.nameKey });
                break;
            case 'buff':
                buffs.push({ buff: reward.buff, duration: Math.max(1, Math.round(reward.duration * multiplier)), amplifier: reward.amplifier });
                break;
        }
    }
    return { items: items, buffs: buffs, commands: commands, coins: coins, xp: xp, worldborder: worldborder };
}

function handleReward(event, rewards, username, multiplier, spawnEggItem) {
    let player = event.server.players.find(p => p.username === username);
    let payload = resolveRewardPayload(rewards, multiplier, spawnEggItem, username);
    rewardPlayer(event, player, 'event', currentEvent.id, payload);
}

/**
 * Picks a random weighted "item" mission and resolves it to a concrete, summonable item ID
 * for an airdrop crate. Tag-based missions (`#namespace:path`) are resolved to a random
 * concrete item from that tag's item list, since a tag itself can't be summoned directly.
 * @returns {{ id: string, mission: object }|undefined} undefined if no item could be resolved
 */
function resolveAirdropItemId() {
    let mission = MathUtils.randomWeightedEntry(getMissionByType('item').filter(it => it.item.includes(':') || it.item.startsWith('#')));
    if (!mission) return undefined;
    if (!mission.item.startsWith('#')) return { id: mission.item, mission: mission };

    let tagItems = Ingredient.of(mission.item).getStackArray();
    if (!tagItems || tagItems.length === 0) return undefined;
    let picked = tagItems[Math.floor(Math.random() * tagItems.length)];
    return { id: picked.id, mission: mission };
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
