// priority: 0

//----- CONSTANTS ------
const coinItem = 'kubejs:coin';
const missionItem = 'kubejs:mission';
const missionToken = 'kubejs:mission_scroll';

const typeRegEx = /Auftrag: (.+?) §6\d+x .+§r/
const nameRegEx = /Auftrag: .+? §6\d+x (.+)§r/
const coinsRegex = /Belohnung: §6(\d+) Coins/
const itemRegex = /Ziel: (.+)/
const erstelltRegex = /Erstellt: (.+)/
const playerRegex = /Von: (.+)/
//----------------------

//----- MISSION TYPES -----
const MISSION_TYPE_ITEM = {
    id: 'item',
    text: '§aSende§r',
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
            finishItem(event, player, dataItem);
        }
    }
};

const MISSION_TYPE_KILL = {
    id: 'kill',
    text: '§4Töte§r',
    hint: (name) => `Du kannst diesen Auftrag erfüllen, indem dieses Auftrag-Item im Inventar hast, während du ${name} tötest.`,
    rightClickHandler: (event, dataItem, stack) => {
        let player = event.player;
        let need = dataItem.currentDamage;
        player.tell(`§cDir fehlen noch §6${need}x ${dataItem.name}§c.`);

        if (remaining === 0) {
            player.tell(`§aDu hast alle benötigten §6${dataItem.name}§a umgebracht!`);
            stack.count = 0;
            finishItem(event, player, dataItem);
        }
    }
};

const MISSION_TYPES = [MISSION_TYPE_ITEM, MISSION_TYPE_KILL];
const ALL_MISSIONS = [];
// ----------------------

/**
 * Erhalte neue Mission
 */
ItemEvents.rightClicked(missionToken, event => {
    try {
        let mission = getRandomMission();
        giveMissionItem(event, mission.type, mission.item, mission.name, randomInt(mission.min, mission.max), randomInt(mission.minCoins, mission.maxCoins), new Date(), event.player.username);
        event.item.count = event.item.count - 1;
    } catch (e) {
        console.log(e, JSON.stringify(mission));
        event.player.tell(`§cEs konnte keine Mission erzeugt werden! Versuch es nochmal.`);
    }
})

/**
 * Item-Mission wird abgegeben
 */
ItemEvents.rightClicked(missionItem, event => {
    let stack = event.getItem();
    let data = getItemInfo(stack);
    console.log(data);

    data.type.rightClickHandler(event, data, stack);
});

// -------------------- Event Handling --------------------
EntityEvents.death(event => {
    if (!event.source?.player?.username) return;

    let died = event.entity.type.toString().toLowerCase();
    let player = event.source.player;
    let inventory = player.inventory;
    let searchItem = Item.of(missionItem);

    for (let i = 0; i < inventory.getContainerSize(); i++) {
        let item = inventory.getItem(i);
        if (item.is(searchItem)) {
            let data = getItemInfo(item);
            if (data.type.id === MISSION_TYPE_KILL.id && died.indexOf(data.item) !== -1) {
                if (data.currentDamage === 1) {
                    player.tell(`§aDu hast den letzten Kill für den Auftrag §6${data.maxDamage}x ${data.name}§a ausgeführt!`);
                    finishItem(event, player, data);
                    item.count = 0;
                } else {
                    data.currentDamage--;
                    item.setDamage(data.currentDamage);
                    player.tell(`§a${generateTitle(data.type.id, data.name, data.maxDamage)}§a - verbleibend: §6${data.currentDamage}§a.`);
                }
            }
        }
    }
});



// ------------------ HELPER FUNCTIONS ------------------

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function removeFromInventory(player, searchItem, amount) {
    let inv = player.inventory;
    let remaining = amount;
    let size = inv.getContainerSize();
    

    for (let i = 0; i < size && remaining > 0; i++) {
        let invItem = inv.getItem(i);
        if (invItem.id.indexOf(searchItem) !== -1) {
            let take = Math.min(remaining, invItem.count);
            invItem.count -= take;
            remaining -= take;
        }
    }
    return amount - remaining;
}

function giveMissionItem(event, type, item, name, amount, reward, erstellt, username) {
    event.server.runCommandSilent(`give ${event.player.username} kubejs:mission[custom_name='["",{"text":"${generateTitle(type, name, amount)}","italic":false}]',lore=['["",{"text":"${generateLore(type, reward, erstellt, item, name, username)}","italic":false}]'],damage=${amount},max_damage=${amount},max_stack_size=1]`);
}

function generateTitle(type, name, amount) {
    let missionType = MISSION_TYPES.find(missionType => missionType.id === type);
    return `Auftrag: ${missionType.text} §6${amount}x ${name}§r`;
}

function generateLore(type, coins, erstellt, item, name, playername) {
    let missionType = MISSION_TYPES.find(missionType => missionType.id === type);
    let hint = missionType.hint(name);
    return `Belohnung: §6${coins} Coins§7\n\n${hint}\n\n§7Ziel: ${item}\nErstellt: ${erstellt.toISOString()}\nVon: ${playername}`;
}

function finishItem(event, player, data) {
    let playerName = player.username;
    player.tell(`§aDer Auftrag ist abgeschlossen und du erhälst deine §6${data.coins} Coins§a Belohnung!`)
    event.server.runCommandSilent(`execute at ${playerName} run summon minecraft:item ~ ~ ~ {Item:{id:"${coinItem}",count:${data.coins}}}`);
    event.server.runCommandSilent(`execute at ${playerName} run particle supplementaries:confetti ~ ~3 ~ 0 0 0 0.1 100`);
    event.server.runCommandSilent(`tellraw @a[name=!${playerName}] "${playerName} §ahat den Auftrag §6${data.maxDamage}x ${data.name}§a erledigt und §6${data.coins} Coins§a kassiert!"`);
}

function getItemInfo(itemStack) {
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

    return {
        typeId: typeId,
        type: missionType,
        coins: coins,
        name: name,
        item: item,
        erstellt: erstellt,
        player: player,
        maxDamage: maxDamage,
        currentDamage: currentDamage
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

function getRandomMission() {
    return getWeightedRandomItem(ALL_MISSIONS);
}
// ------------------ ALL MISSIONS ------------------

