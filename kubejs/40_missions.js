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

        if (need === 0) {
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

// Neue Mission würfeln
ItemEvents.rightClicked(missionToken, event => {
    try {

        if (Math.random() < curseChance) {
            event.server.tell(`§cACHTUNG! §6${event.player.username}§c hat eine verfluchte Mission erwischt! Arbeitet besser zusammen, damit sie nicht fehlschlägt!`);
            unlucky = true;
            if(currentEvent) currentEvent.stopEvent();
            startEvent(event, HUNT_EVENT.id, true);
            event.server.runCommandSilent(`execute at @a run particle minecraft:ash ~ ~3 ~ 0 0 0 0.1 100`);
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

EntityEvents.death(event => {
    if (!event.source?.player?.username) return;

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
            summonRewardItem(event, event.player.username, min, max);
        }
    }, 30000);
});


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

function getMissionByType(type) {
    // TODO Optimieren!
    return ALL_MISSIONS.filter(mission => mission.type === type);
}

function getRandomMission() {
    let missionType = getWeightedRandomItem(MISSION_TYPES);
    let relevantMissions = getMissionByType(missionType.id);
    return getWeightedRandomItem(relevantMissions);
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