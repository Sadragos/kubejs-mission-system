const MISSION_TYPE_ITEM = {
    id: 'item',
    labelKey: 'kubejs.mission.type.item',
    color: 'green',
    weight: 13,
    hint: (target) => Text.translate('kubejs.mission.hint.item', target),
    rightClickHandler: (event, dataItem, stack) => {
        let player = event.player;
        let need = dataItem.currentDamage;
        let target = resolveTargetName(dataItem.typeId, dataItem.item, dataItem.name);

        let take = ItemUtils.removeFromInventory(player, dataItem.item, need);

        let remaining = dataItem.currentDamage - take;
        if (remaining > 0) {
            player.tell(Text.translate('kubejs.mission.item.progress', TextUtils.colored(take), target, TextUtils.colored(remaining)).color('green'));
            stack.setDamage(remaining);
            ParticleUtils.summonParticleAtPlayer(event.server, player.username, 'minecraft:totem_of_undying', 20, 3, 0.1, 0.1, 0.1);
            event.cancel();
        } else {
            player.tell(Text.translate('kubejs.mission.item.delivered_all', TextUtils.colored(take), target).color('green'));
            stack.count = 0;
            finishMission(event, player, dataItem);
        }
    }
};

const MISSION_TYPE_KILL = {
    id: 'kill',
    labelKey: 'kubejs.mission.type.kill',
    color: 'dark_red',
    weight: 8,
    hint: (target) => Text.translate('kubejs.mission.hint.kill', target),
    rightClickHandler: (event, dataItem, stack) => {
        let player = event.player;
        let need = dataItem.currentDamage;
        let target = resolveTargetName(dataItem.typeId, dataItem.item, dataItem.name);
        player.tell(Text.translate('kubejs.mission.kill.remaining', TextUtils.colored(need), target).color('red'));

        if (need === 0) {
            player.tell(Text.translate('kubejs.mission.kill.done', target).color('green'));
            stack.count = 0;
            finishMission(event, player, dataItem);
        }
    }
};

const MISSION_TYPE_JOUNREY = {
    id: 'journey',
    labelKey: 'kubejs.mission.type.journey',
    color: 'aqua',
    weight: 2,
    hint: (target, item) => Text.translate('kubejs.mission.hint.journey', item),
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
            player.tell(Text.translate('kubejs.mission.journey.arrived').color('green'));
            stack.count = 0;
            finishMission(event, player, dataItem);
        } else {
            event.server.runCommandSilent(`jm waypoint delete "${dataItem.name}" ${player.username}`);
            event.server.runCommandSilent(`jm waypoint temp create "${dataItem.name}" minecraft:overworld ${targetPos.x} 64 ${targetPos.z} gold ${player.username}`);
            player.tell(Text.translate('kubejs.mission.journey.remaining', TextUtils.colored(dist)).color('red'));
        }
    }
};

const MISSION_TYPE_MISSIONS = {
    id: 'missions',
    labelKey: 'kubejs.mission.type.missions',
    color: 'yellow',
    weight: 1,
    hint: (target) => Text.translate('kubejs.mission.hint.missions', target),
    rightClickHandler: (event, dataItem, stack) => {
        let player = event.player;
        let need = dataItem.currentDamage;
        player.tell(Text.translate('kubejs.mission.missions.remaining', TextUtils.colored(need)).color('red'));

        if (need === 0) {
            player.tell(Text.translate('kubejs.mission.missions.done').color('green'));
            stack.count = 0;
            finishMission(event, player, dataItem);
        }
    }
};

const MISSION_TYPES = [MISSION_TYPE_JOUNREY, MISSION_TYPE_ITEM, MISSION_TYPE_KILL, MISSION_TYPE_MISSIONS];

// Neue Mission würfeln
ItemEvents.rightClicked(MISSION_TOKEN, event => {
    try {

        if (Math.random() < CURSE_CHANCE && !currentEvent) {
            event.server.tell(Text.translate('kubejs.mission.cursed.warning', TextUtils.colored(event.player.username)).color('red'));
            unlucky = true;
            startEvent(event, HUNT_EVENT.id, true);
            ParticleUtils.summonParticleAtPlayer(event.server, '@a', 'minecraft:ash', 100, 3, 0.2, 0.2, 0.2);
            SoundUtils.playSoundAtPlayer(event.server, '@a', 'minecraft:item.totem.use');
            increaseMissionPulled(event.player, 'cursed');
        } else {
            let mission = getRandomMission(event.player);
            let playerProgress = getPlayerProgress(event.player, mission.type, true);
            let eggChance = 0;
            if (mission.type === MISSION_TYPE_KILL.id) {
                let baseEggChance = mission.eggChance || FALLBACK_EGG_CHANCE;
                if (baseEggChance > -1) {
                    eggChance = baseEggChance * MathUtils.randomFloat(MISSION_EGG_CHANCE_MULTIPLIER_MIN, MISSION_EGG_CHANCE_MULTIPLIER_MAX);
                }
            }
            let missionNr = getMissionsPulledTotal(event.player) + 1;
            giveMissionItem(
                event,
                mission.type,
                mission.item,
                mission.name,
                Math.max(1, MathUtils.randomIntAdjusted(mission.min, mission.max, playerProgress)),
                MathUtils.randomIntAdjusted(mission.minCoins, mission.maxCoins, playerProgress, 1, MathUtils.randomInt(COIN_REWARD_MINMIN, COIN_REWARD_MINMAX)),
                new Date(),
                event.player.username,
                playerProgress,
                eggChance,
                missionNr
            );
            SoundUtils.playSoundAtPlayer(event.server, event.player.username, 'minecraft:item.book.page_turn');
            increaseMissionPulled(event.player, mission.type);
        }
        event.item.shrink(1);
    } catch (e) {
        event.player.tell(Text.translate('kubejs.mission.error.generate_failed').color('red'));
        console.log(e);
        if (e && e.stack) console.log(e.stack);
    }
})

// Mission abgeben
ItemEvents.rightClicked(MISSION_ITEM, event => {
    let stack = event.getItem();
    let data = parseMissionInfo(stack);
    let offhand = event.player.offHandItem;
    if (offhand && IdUtils.idMatches(offhand.id, COIN_ITEM) && offhand.count >= MISSION_SWAP_FEE) {
        offhand.count = offhand.count - MISSION_SWAP_FEE;
        stack.count = 0;
        let target = resolveTargetName(data.typeId, data.item, data.name);
        event.player.tell(Text.translate('kubejs.mission.swap.success', TextUtils.colored(MISSION_SWAP_FEE), target).color('green'));
        event.player.give(Item.of(MISSION_TOKEN, 1));
    } else {
        data.type.rightClickHandler(event, data, stack);
    }
});

EntityEvents.death(event => {
    if (!event.source?.player?.username) return;

    let player = event.source.player;
    let inventory = player.inventory;
    let searchItem = Item.of(MISSION_ITEM);

    for (let i = 0; i < inventory.getContainerSize(); i++) {
        let item = inventory.getItem(i);
        if (item.is(searchItem)) {
            let data = parseMissionInfo(item);
            if (data.type.id === MISSION_TYPE_KILL.id && isValidKill(event.entity, data.item)) {
                let target = resolveTargetName(data.typeId, data.item, data.name);
                ParticleUtils.summonParticleAtPosition(event.server, event.entity.position(), 'minecraft:totem_of_undying', 20, 1, 0.1, 0.1, 0.1);
                if (data.currentDamage === 1) {
                    player.tell(Text.translate('kubejs.mission.kill.final', TextUtils.colored(data.maxDamage), target).color('green'));
                    finishMission(event, player, data);
                    item.count = 0;
                } else {
                    data.currentDamage--;
                    item.setDamage(data.currentDamage);
                    player.tell(Text.translate('kubejs.mission.kill.progress_update', buildMissionTitle(data.type, target, data.maxDamage), TextUtils.colored(data.currentDamage)).color('green'));
                }
            }
        }
    }
});

PlayerEvents.loggedIn(event => {
    setTimeout(() => {
        if (event.player === undefined) return;
        if (!event.server.players.some(p => p.username === event.player.username)) return;

        const player = event.player;

        if (PlayerUtils.firstLogin(player)) {
            PlayerUtils.setLoginDate(player);
            return;
        }

        const days = PlayerUtils.daysSinceLogin(player);
        if (days === 0) return;

        PlayerUtils.setLoginDate(player);
        let greetingKey = DAILY_MESSAGE_KEYS[MathUtils.randomInt(0, DAILY_MESSAGE_KEYS.length - 1)];
        player.tell(Text.translate(greetingKey, player.username).color('green'));
        let count = days === 1 ? 4 : 6;
        rewardPlayer(event, player, 'login', 'login', { items: [{ item: MISSION_TOKEN, amount: count }], worldborder: 16 });
    }, 30000);
});

/**
 * Resolves the display name for a mission's target. Priority: the CSV `name`, if given, is
 * used as a lang key when one matches, otherwise as literal text (see
 * `TextUtils.resolveNameOverride`); if `name` is blank, falls back to the item/mob's own real
 * game name for concrete IDs/tags, or the matching quick event's name for "help with"
 * missions; if even that can't be resolved, falls back to the raw item/mob/event ID.
 * @param {string} typeId mission type ID (e.g. "item", "kill")
 * @param {string} item mission item/mob ID, filter string, event ID or journey position
 * @param {string} name CSV `name` column value
 * @returns {Internal.Component}
 */
function resolveTargetName(typeId, item, name) {
    switch (typeId) {
        case MISSION_TYPE_ITEM.id:
            return TextUtils.itemName(item, name);
        case MISSION_TYPE_KILL.id:
            return TextUtils.entityName(item, name);
        case MISSION_TYPE_MISSIONS.id:
            let override = TextUtils.resolveNameOverride(name);
            if (override) return override;
            let ev = ALL_QUICK_EVENTS.find(e => e.id === item);
            return ev ? Text.translate(ev.nameKey) : Text.literal(item);
        default:
            return TextUtils.resolveNameOverride(name) || Text.literal(item);
    }
}

function giveMissionItem(event, type, item, name, amount, reward, erstellt, username, mod, eggChance, nr) {
    eggChance = eggChance || 0;
    if (type == MISSION_TYPE_JOUNREY.id) {
        item = PositionUtils.toChatPosition(PositionUtils.randomPositionWithDistance(event.player.position(), amount));
    }
    let missionType = MISSION_TYPES.find(mt => mt.id === type);
    let target = resolveTargetName(type, item, name);

    let stack = Item.of(MISSION_ITEM);
    stack.count = 1;
    stack.setDamage(amount);
    stack.setMaxDamage(amount);
    stack.setCustomName(buildMissionTitle(missionType, target, amount));
    stack.setLore(buildMissionLore(missionType, target, reward, erstellt, item, name, username, mod, eggChance, nr));

    let tag = NBT.compoundTag();
    tag.putString('typeId', type);
    tag.putString('item', item);
    tag.putString('name', name || '');
    tag.putInt('coins', reward);
    tag.putLong('created', erstellt.getTime());
    tag.putString('creator', username);
    tag.putDouble('level', mod);
    tag.putDouble('eggChance', eggChance);
    tag.putInt('nr', nr);
    stack.setCustomData(tag);

    event.player.give(stack);
}

function buildMissionTitle(missionType, target, amount) {
    let unit = missionType.id === MISSION_TYPE_JOUNREY.id ? 'm' : 'x';
    let label = Text.translate(missionType.labelKey).color(missionType.color);
    return Text.translate('kubejs.mission.title', label, `${amount}${unit}`, target);
}

function buildMissionLore(missionType, target, coins, erstellt, item, name, playername, mod, eggChance, nr) {
    mod = mod || 1;
    eggChance = eggChance || 0;
    let coinsKey = coins === 1 ? 'kubejs.mission.lore.reward.one' : 'kubejs.mission.lore.reward.other';

    let lines = [
        Text.translate(coinsKey, TextUtils.colored(coins)).color('gray'),
        Text.literal(''),
        missionType.hint(target, item).color('white'),
        Text.literal(''),
        Text.translate('kubejs.mission.lore.target', item).color('gray'),
        Text.translate('kubejs.mission.lore.created', TimeUtils.formatDateISO(erstellt)).color('gray'),
        Text.translate('kubejs.mission.lore.creator', playername).color('gray'),
        Text.translate('kubejs.mission.lore.number', nr).color('gray'),
        Text.translate('kubejs.mission.lore.level', (mod * 100).toFixed(2)).color('gray')
    ];
    if (eggChance > 0) {
        lines.push(Text.translate('kubejs.mission.lore.egg_chance', (eggChance * 100).toFixed(2)).color('gray'));
    }
    return lines;
}

function finishMission(event, player, data) {
    let playerName = player.username;
    let unit = data.type.id === MISSION_TYPE_JOUNREY.id ? 'm' : 'x';
    let target = resolveTargetName(data.typeId, data.item, data.name);
    rewardPlayer(
        event,
        player,
        'mission',
        data.type.id,
        {
            coins: data.coins,
            // xp: data.coins,
            worldborder: data.coins
        }
    );
    let broadcast = Text.translate('kubejs.mission.finish.broadcast', TextUtils.colored(playerName), `${data.maxDamage}${unit}`, target, TextUtils.colored(data.coins)).color('green');
    event.server.players.forEach(p => {
        if (p.username !== playerName) p.tell(broadcast);
    });
}

function parseMissionInfo(itemStack) {
    let components = itemStack.getComponents();
    let maxDamage = components.get('minecraft:max_damage') + 0;
    let currentDamage = components.get('minecraft:damage') + 0;
    let tag = itemStack.getCustomData();

    let typeId = tag.getString('typeId');
    let missionType = MISSION_TYPES.find(missionType => missionType.id === typeId);

    return {
        typeId: typeId,
        type: missionType,
        coins: tag.getInt('coins'),
        name: tag.getString('name'),
        item: tag.getString('item'),
        erstellt: new Date(tag.getLong('created')),
        player: tag.getString('creator'),
        maxDamage: maxDamage,
        currentDamage: currentDamage,
        level: tag.getDouble('level')
    }
}

function getMissionByType(type) {
    return MISSIONS_BY_TYPE[type] || [];
}

function getRandomMission(player) {
    let missionType = MathUtils.randomWeightedEntry(MISSION_TYPES);
    let playerProgress = getPlayerProgress(player, missionType.id, true);
    let relevantMissions = getMissionByType(missionType.id).filter(mission => !mission.minProgress || mission.minProgress <= playerProgress);
    return MathUtils.randomWeightedEntry(relevantMissions);
}

function checkForHelperMission(event, username, type) {
    let player = event.server.players.find(p => p.username === username);
    if (player === undefined) return;
    let inventory = player.inventory;
    let searchItem = Item.of(MISSION_ITEM);

    for (let i = 0; i < inventory.getContainerSize(); i++) {
        let item = inventory.getItem(i);
        if (item.is(searchItem)) {
            let data = parseMissionInfo(item);
            if (data.type.id === MISSION_TYPE_MISSIONS.id && data.item === type) {
                let target = resolveTargetName(data.typeId, data.item, data.name);
                ParticleUtils.summonParticleAtPlayer(event.server, player.username, 'minecraft:totem_of_undying', 20, 3, 0.1, 0.1, 0.1);
                if (data.currentDamage === 1) {
                    player.tell(Text.translate('kubejs.mission.kill.final', TextUtils.colored(data.maxDamage), target).color('green'));
                    finishMission(event, player, data);
                    item.count = 0;
                } else {
                    data.currentDamage--;
                    item.setDamage(data.currentDamage);
                    player.tell(Text.translate('kubejs.mission.kill.progress_update', buildMissionTitle(data.type, target, data.maxDamage), TextUtils.colored(data.currentDamage)).color('green'));
                }
            }
        }
    }
}
