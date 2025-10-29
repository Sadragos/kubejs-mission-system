// priority: 0

//----- CONSTANTS ------
const coinItem = 'kubejs:coin';
const missionItem = 'kubejs:mission';
const missionToken = 'kubejs:mission_scroll';

const typeRegEx = /§lAuftrag:§r (.+?) §6\d+x .+§r/
const nameRegEx = /§lAuftrag:§r .+? §6\d+x (.+)§r/
const coinsRegex = /Belohnung: §6(\d+) Coins/
const itemRegex = /Item: (.+)/
const erstelltRegex = /Erstellt: (.+)/
const playerRegex = /Von: (.+)/
//----------------------

//----- MISSION TYPES -----
const MISSION_TYPE_ITEM = {
    id: 'item', 
    text: 'Sammle', 
    hint: (itemData) => `Du kannst diesen Auftrag erfüllen, indem du ${itemData.name} im Inventar hast und mit dem Auftrag-Item rechtsklickst.`,
    rightClickHandler: (event, itemData) => {}
};

const MISSION_TYPES = [MISSION_TYPE_ITEM];
const ALL_MISSIONS = [];
// ----------------------

/**
 * Erhalte neue Mission
 */
ItemEvents.rightClicked(missionToken, event => {
    event.item.count = event.item.count - 1;
    const mission = getRandomMission();
    giveMissionItem(event, mission.item, mission.name, randomInt(mission.min, mission.max), randomInt(mission.minCoins, mission.maxCoins), new Date(), event.player.username);
})

/**
 * Item-Mission wird abgegeben
 */
ItemEvents.rightClicked(missionItem, event => {
    const stack = event.getItem();
    const data = getItemInfo(stack);
    console.log(global.get('myMission'));


    const player = event.player;
    const playerName = player.username;
    

    const need = data.currentDamage;
    const item = Item.of(data.item);
    const have = player.inventory.count(item);

    if (have === 0) {
        player.tell(`§cDu hast kein ${data.name}!`);
        event.cancel();
    }

    const take = Math.min(have, need);
    
    removeFromInventory(player, item, take);


    const remaining = data.currentDamage - take;
    if (remaining > 0) {
        player.tell(`§aDu hast §6${take}x ${data.name}§a abgegeben! Du brauchst noch ${remaining} um den Auftrag zu erledigen!`);
        stack.setDamage(remaining);
        event.cancel();
    } else {
        player.tell(`§aDu hast §6${take}x ${data.name}§a abgegeben! Der Auftrag ist damit abgeschlossen und du erhälst deine §6${data.coins} Coins§a Belohnung!`);
        stack.setDamage(0);
        stack.count = 0;
        event.server.runCommandSilent(`execute at ${playerName} run summon minecraft:item ~ ~ ~ {Item:{id:"${coinItem}",count:${data.coins}}}`);
        event.server.runCommandSilent(`execute at ${playerName} run particle supplementaries:confetti ~ ~3 ~ 0 0 0 0.1 100`);
        event.server.runCommandSilent(`tellraw @a[name=!${playerName}] "${playerName} §ahat den Auftrag §6${data.maxDamage}x ${data.name}§a erledigt und §6${data.coins} Coins§a kassiert!"`);
    }
});



// ------------------ HELPER FUNCTIONS ------------------

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function removeFromInventory(player, searchItem, amount) {
    const inv = player.inventory;
    let remaining = amount;
    const size = inv.getContainerSize();

    for (let i = 0; i < size && remaining > 0; i++) {
        let invItem = inv.getItem(i);
        if (invItem.is(searchItem)) {
            const take = Math.min(remaining, invItem.count);
            invItem.count -= take;
            remaining -= take;
        }
    }
    return amount - remaining;
}

function giveMissionItem(event, item, name, amount, reward, erstellt, username) {
    event.server.runCommandSilent(`give ${event.player.username} kubejs:mission[custom_name='["",{"text":"${generateTitle(name, amount)}","italic":false}]',lore=['["",{"text":"${generateLore(reward, erstellt, item, name, username)}","italic":false}]'],damage=${amount},max_damage=${amount},max_stack_size=1]`);
}

function generateTitle(name, amount) {
    return `§lAuftrag:§r Sammle §6${amount}x ${name}§r`;
}

function generateLore(coins, erstellt, item, name, playername) {
    return `Belohnung: §6${coins} Coins§7\n\nDu kannst diesen Auftrag erfüllen, indem du ${name} im Inventar hast und mit dem Auftrag-Item rechtsklickst.\n\n§7Item: ${item}\nErstellt: ${erstellt.toISOString()}\nVon: ${playername}`;
}

function getItemInfo(itemStack) {
    const components = itemStack.getComponents();
    const componentName = components.get('minecraft:custom_name');
    const componentLore = components.get('minecraft:lore');
    const maxDamage = components.get('minecraft:max_damage') + 0;
    const currentDamage = components.get('minecraft:damage') + 0;

    const nameRaw = componentName.getSiblings().get(0).getString();
    const loreRaw = componentLore.styledLines().get(0).getString();


    const nameMatch = nameRaw.match(nameRegEx);
    const name = nameMatch ? nameMatch[1] : nameRaw;

    const coinsMatch = loreRaw.match(coinsRegex);
    const coins = coinsMatch ? coinsMatch[1] : 0;

    const erstelltMatch = loreRaw.match(erstelltRegex);
    const erstellt = erstelltMatch ? new Date(erstelltMatch[1]) : new Date();

    const itemMatch = loreRaw.match(itemRegex);
    const item = itemMatch ? itemMatch[1] : '';

    const playerMatch = loreRaw.match(playerRegex);
    const player = playerMatch ? playerMatch[1] : '';

    const typeMatch = nameRaw.match(typeRegEx);
    const type = typeMatch ? typeMatch[1] : '';
    const missionType = MISSION_TYPES.find(missionType => missionType.text === type);
    const typeId = missionType ? missionType.id : '';

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
    const totalWeight = list.reduce((acc, item) => acc + item.weight, 0);
    const random = Math.random() * totalWeight;
    let currentWeight = 0;
    for (const item of list) {
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

// Missions.csv
ALL_MISSIONS.push({"type":"item","name":"Arkaner Schrott","min":6,"max":6,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Arkane Essenz","min":48,"max":48,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Treibholz","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":30});
ALL_MISSIONS.push({"type":"item","name":"Blechdose","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":30});
ALL_MISSIONS.push({"type":"item","name":"Box","min":6,"max":6,"minCoins":8,"maxCoins":8,"weight":30});
ALL_MISSIONS.push({"type":"item","name":"Schließfach","min":4,"max":4,"minCoins":8,"maxCoins":8,"weight":20});
ALL_MISSIONS.push({"type":"item","name":"Schatztruhe","min":2,"max":2,"minCoins":8,"maxCoins":8,"weight":10});
ALL_MISSIONS.push({"type":"item","name":"Flaschenpost","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":20});
ALL_MISSIONS.push({"type":"item","name":"Algen","min":16,"max":16,"minCoins":8,"maxCoins":8,"weight":30});
ALL_MISSIONS.push({"type":"item","name":"Gräten","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":30});
ALL_MISSIONS.push({"type":"item","name":"Atlantischer Kabeljau","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":25});
ALL_MISSIONS.push({"type":"item","name":"Schwarzfisch","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":25});
ALL_MISSIONS.push({"type":"item","name":"Pazifischer Heilbutt","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":25});
ALL_MISSIONS.push({"type":"item","name":"Atlantischer Heilbutt","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":25});
ALL_MISSIONS.push({"type":"item","name":"Atlantischer Hering","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":25});
ALL_MISSIONS.push({"type":"item","name":"Buckellachs","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":25});
ALL_MISSIONS.push({"type":"item","name":"Pollock","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":25});
ALL_MISSIONS.push({"type":"item","name":"Regenbogenforelle","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":25});
ALL_MISSIONS.push({"type":"item","name":"Boulti","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":25});
ALL_MISSIONS.push({"type":"item","name":"Capitaine","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":25});
ALL_MISSIONS.push({"type":"item","name":"Synodontie","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":25});
ALL_MISSIONS.push({"type":"item","name":"Schwarzbarsch","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":25});
ALL_MISSIONS.push({"type":"item","name":"Bluegill","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":25});
ALL_MISSIONS.push({"type":"item","name":"Bachforelle","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":25});
ALL_MISSIONS.push({"type":"item","name":"Karpfen","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":25});
ALL_MISSIONS.push({"type":"item","name":"Wels","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":25});
ALL_MISSIONS.push({"type":"item","name":"Gar","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":25});
ALL_MISSIONS.push({"type":"item","name":"Elritze","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":25});
ALL_MISSIONS.push({"type":"item","name":"Muskellunge","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":25});
ALL_MISSIONS.push({"type":"item","name":"Barsch","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":25});
ALL_MISSIONS.push({"type":"item","name":"Arapaima","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":25});
ALL_MISSIONS.push({"type":"item","name":"Piranha","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":25});
ALL_MISSIONS.push({"type":"item","name":"Tambaqui","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":25});
ALL_MISSIONS.push({"type":"item","name":"Qualle","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":25});
ALL_MISSIONS.push({"type":"item","name":"Roter Zackenbarsch","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":25});
ALL_MISSIONS.push({"type":"item","name":"Thunfisch","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":25});
ALL_MISSIONS.push({"type":"item","name":"Neptunium Barren","min":2,"max":2,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Maden","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Seelen","min":32,"max":32,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Dunkelstahlbarren","min":3,"max":3,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Dunkelstahlplatte","min":1,"max":1,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Drachenatem","min":32,"max":32,"minCoins":8,"maxCoins":8,"weight":50});
ALL_MISSIONS.push({"type":"item","name":"Hasenfuß","min":4,"max":4,"minCoins":8,"maxCoins":8,"weight":50});
ALL_MISSIONS.push({"type":"item","name":"Echo Scherbe","min":16,"max":16,"minCoins":8,"maxCoins":8,"weight":50});
ALL_MISSIONS.push({"type":"item","name":"Elytra","min":1,"max":1,"minCoins":8,"maxCoins":8,"weight":20});
ALL_MISSIONS.push({"type":"item","name":"Totem der Unsterblichkeit","min":2,"max":2,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Erfahrungsklumpen","min":256,"max":256,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Drachenkopf","min":1,"max":1,"minCoins":8,"maxCoins":8,"weight":50});
ALL_MISSIONS.push({"type":"item","name":"Verottendes Fleisch","min":96,"max":96,"minCoins":8,"maxCoins":8,"weight":150});
ALL_MISSIONS.push({"type":"item","name":"Leder","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Feder","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Knochen","min":128,"max":128,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Prismarinscherbe","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Herz des Meeres","min":1,"max":1,"minCoins":8,"maxCoins":8,"weight":15});
ALL_MISSIONS.push({"type":"item","name":"Nautilusschale","min":1,"max":1,"minCoins":8,"maxCoins":8,"weight":20});
ALL_MISSIONS.push({"type":"item","name":"Schmiedevorlage","min":1,"max":1,"minCoins":8,"maxCoins":8,"weight":20});
ALL_MISSIONS.push({"type":"item","name":"Spinnenauge","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Schulker","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":25});
ALL_MISSIONS.push({"type":"item","name":"Ghastträne","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":25});
ALL_MISSIONS.push({"type":"item","name":"","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Nametag","min":4,"max":4,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Phantomhaut","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":50});
ALL_MISSIONS.push({"type":"item","name":"Nautilusschale","min":2,"max":2,"minCoins":8,"maxCoins":8,"weight":50});
ALL_MISSIONS.push({"type":"item","name":"Eichenstamm","min":512,"max":512,"minCoins":8,"maxCoins":8,"weight":300});
ALL_MISSIONS.push({"type":"item","name":"Fichtenstamm","min":1536,"max":1536,"minCoins":8,"maxCoins":8,"weight":300});
ALL_MISSIONS.push({"type":"item","name":"Birkenstamm","min":512,"max":512,"minCoins":8,"maxCoins":8,"weight":200});
ALL_MISSIONS.push({"type":"item","name":"Tropenbaumstamm","min":1024,"max":1024,"minCoins":8,"maxCoins":8,"weight":250});
ALL_MISSIONS.push({"type":"item","name":"Akazienstamm","min":512,"max":512,"minCoins":8,"maxCoins":8,"weight":200});
ALL_MISSIONS.push({"type":"item","name":"Schwarzeichenstamm","min":1536,"max":1536,"minCoins":8,"maxCoins":8,"weight":150});
ALL_MISSIONS.push({"type":"item","name":"Kirschstamm","min":512,"max":512,"minCoins":8,"maxCoins":8,"weight":150});
ALL_MISSIONS.push({"type":"item","name":"Mangrovenstamm","min":512,"max":512,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Karmesinstiel","min":256,"max":256,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Wirrstiel","min":256,"max":256,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Welle","min":256,"max":256,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Zahnrad","min":256,"max":256,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Großes Zahnrad","min":192,"max":192,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Andesitgehäuse","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Messingrahmen","min":32,"max":32,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Zugrahmen","min":12,"max":12,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Elektronenröhre","min":24,"max":24,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Rosenquartz","min":32,"max":32,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Steinziegel","min":1024,"max":1024,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Eichenleiter","min":512,"max":512,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Fass","min":128,"max":128,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Truhe","min":128,"max":128,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Amboss","min":16,"max":16,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Gerüst","min":256,"max":256,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Werkbank","min":256,"max":256,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Ofen","min":256,"max":256,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Schiene","min":512,"max":512,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Klebriger Kolben","min":256,"max":256,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Werfer","min":192,"max":192,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Beobachter","min":192,"max":192,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Tageslichtsensor","min":128,"max":128,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Getriebe","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Präzisionsgetriebe","min":32,"max":32,"minCoins":8,"maxCoins":8,"weight":40});
ALL_MISSIONS.push({"type":"item","name":"Dampfpfeife","min":24,"max":24,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Propeller","min":24,"max":24,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Rührstab","min":24,"max":24,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Messing Hand","min":16,"max":16,"minCoins":8,"maxCoins":8,"weight":50});
ALL_MISSIONS.push({"type":"item","name":"Control Chip","min":12,"max":12,"minCoins":8,"maxCoins":8,"weight":40});
ALL_MISSIONS.push({"type":"item","name":"Trichter","min":32,"max":32,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Komparator","min":32,"max":32,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Goldene Karotte","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Ofenkartoffel","min":256,"max":256,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Steak","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Gebratenes Schweinefleisch","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Gebratenes Hammelfleisch","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Gebratenes Hühnchen","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Gebratenes Kaninchen","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Gebratener Kabeljau","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Gebratener Lachs","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Brot","min":128,"max":128,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Kekse","min":256,"max":256,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Kürbiskuchen","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Apfel","min":96,"max":96,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Honigapfel","min":16,"max":16,"minCoins":8,"maxCoins":8,"weight":75});
ALL_MISSIONS.push({"type":"item","name":"Rosinenschnecke","min":16,"max":16,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Chorous Frucht","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":50});
ALL_MISSIONS.push({"type":"item","name":"Zucker","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Weizen","min":128,"max":128,"minCoins":8,"maxCoins":8,"weight":200});
ALL_MISSIONS.push({"type":"item","name":"Kürbis","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":200});
ALL_MISSIONS.push({"type":"item","name":"Melone","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":200});
ALL_MISSIONS.push({"type":"item","name":"Gebratene Hammelkoteletts","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Gebratener Speck","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Sushi","min":32,"max":32,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Hamburger","min":16,"max":16,"minCoins":8,"maxCoins":8,"weight":75});
ALL_MISSIONS.push({"type":"item","name":"Gemüsenudeln","min":16,"max":16,"minCoins":8,"maxCoins":8,"weight":50});
ALL_MISSIONS.push({"type":"item","name":"Hirtenkuchen","min":16,"max":16,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Gebratene Reisrollen","min":16,"max":16,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Buttertoast","min":16,"max":16,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Donut","min":16,"max":16,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Fajitas","min":24,"max":24,"minCoins":8,"maxCoins":8,"weight":90});
ALL_MISSIONS.push({"type":"item","name":"Ratatouille","min":12,"max":12,"minCoins":8,"maxCoins":8,"weight":50});
ALL_MISSIONS.push({"type":"item","name":"Spiegelei","min":32,"max":32,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Pizza","min":16,"max":16,"minCoins":8,"maxCoins":8,"weight":75});
ALL_MISSIONS.push({"type":"item","name":"Beef Wellington","min":16,"max":16,"minCoins":8,"maxCoins":8,"weight":60});
ALL_MISSIONS.push({"type":"item","name":"Rote Beete","min":256,"max":256,"minCoins":8,"maxCoins":8,"weight":200});
ALL_MISSIONS.push({"type":"item","name":"Kartoffel","min":256,"max":256,"minCoins":8,"maxCoins":8,"weight":200});
ALL_MISSIONS.push({"type":"item","name":"Karotte","min":256,"max":256,"minCoins":8,"maxCoins":8,"weight":200});
ALL_MISSIONS.push({"type":"item","name":"Orange","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Pfirsisch","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Kuchen","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Grobe Erde","min":256,"max":256,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Farn","min":128,"max":128,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Grass","min":128,"max":128,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Grassblock","min":512,"max":512,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Erde","min":1024,"max":1024,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Azaleenlaub","min":128,"max":128,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Blühendes Azaleenlaub","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Mohn","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Löwenzahn","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Leuchtflechten","min":128,"max":128,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Moosblock","min":512,"max":512,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Moosteppich","min":256,"max":256,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Bemooster Bruchstein","min":256,"max":256,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Bruchstein","min":2048,"max":2048,"minCoins":8,"maxCoins":8,"weight":250});
ALL_MISSIONS.push({"type":"item","name":"Bemooste Steinziegel","min":256,"max":256,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Rissige Steinziegel","min":256,"max":256,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Großes Tropfblad","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Kleines Tropfblatt","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Ranken","min":128,"max":128,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Eichensetzling","min":128,"max":128,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Birkensetzling","min":128,"max":128,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Fichtensetzling","min":128,"max":128,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Tropensetzling","min":128,"max":128,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Akaziensetzling","min":128,"max":128,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Schwarzeichensetzling","min":128,"max":128,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Kirschsetzling","min":256,"max":256,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Mangrovenkeimling","min":256,"max":256,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Eichenlaub","min":256,"max":256,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Birkenlaub","min":256,"max":256,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Fichtenlaub","min":256,"max":256,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Tropenbaumlaub","min":256,"max":256,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Akazienlaub","min":256,"max":256,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Schwarzeichenlaub","min":256,"max":256,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Kirschlaub","min":256,"max":256,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Mangrovenlaub","min":256,"max":256,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Azalee","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Blühende Azalee","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Laterne","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Pilzlicht","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":75});
ALL_MISSIONS.push({"type":"item","name":"Firefly Jar","min":16,"max":16,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Blumentopf","min":32,"max":32,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Fester Schlamm","min":256,"max":256,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Seerosenblatt","min":32,"max":32,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Leuchtfeuer","min":1,"max":1,"minCoins":8,"maxCoins":8,"weight":20});
ALL_MISSIONS.push({"type":"item","name":"Leitstein","min":2,"max":2,"minCoins":8,"maxCoins":8,"weight":20});
ALL_MISSIONS.push({"type":"item","name":"Enderkristall","min":16,"max":16,"minCoins":8,"maxCoins":8,"weight":50});
ALL_MISSIONS.push({"type":"item","name":"Seelenanker","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":50});
ALL_MISSIONS.push({"type":"item","name":"Verzauberungstisch","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":75});
ALL_MISSIONS.push({"type":"item","name":"Buch","min":256,"max":256,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Endertruhe","min":10,"max":10,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Kalibrierter Sculksensor","min":12,"max":12,"minCoins":8,"maxCoins":8,"weight":50});
ALL_MISSIONS.push({"type":"item","name":"TNT","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Fackel","min":512,"max":512,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Kette","min":192,"max":192,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Kerze","min":128,"max":128,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Stein","min":2048,"max":2048,"minCoins":8,"maxCoins":8,"weight":250});
ALL_MISSIONS.push({"type":"item","name":"Tiefenschiefer","min":2048,"max":2048,"minCoins":8,"maxCoins":8,"weight":200});
ALL_MISSIONS.push({"type":"item","name":"Sand","min":2048,"max":2048,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Sandstein","min":1024,"max":1024,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Roter Sand","min":512,"max":512,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Terracotta","min":512,"max":512,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Netherrack","min":2048,"max":2048,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Endstein","min":1024,"max":1024,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Seelensand","min":512,"max":512,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Erde","min":2048,"max":2048,"minCoins":8,"maxCoins":8,"weight":250});
ALL_MISSIONS.push({"type":"item","name":"Schlamm","min":512,"max":512,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Wurzelerde","min":32,"max":32,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Tuffstein","min":512,"max":512,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Andesite","min":1024,"max":1024,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Diorit","min":1024,"max":1024,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Grannit","min":1024,"max":1024,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Basalt","min":2048,"max":2048,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Kies","min":2048,"max":2048,"minCoins":8,"maxCoins":8,"weight":200});
ALL_MISSIONS.push({"type":"item","name":"Kalzit","min":128,"max":128,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Schwarzstein","min":512,"max":512,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Golddurchzogener Schwarzstein","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Grassblock","min":512,"max":512,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Obsidian","min":128,"max":128,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Tropfstesinblock","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Spitzer Tropfstein","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Lehm","min":512,"max":512,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Netherquarz","min":128,"max":128,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Asurin","min":512,"max":512,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Karmesit","min":512,"max":512,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Veridium","min":512,"max":512,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Ockrum","min":512,"max":512,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Kalkstein","min":512,"max":512,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Schlacke","min":512,"max":512,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Scorchia","min":512,"max":512,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Amethystblock","min":512,"max":512,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Antiker Schrott","min":6,"max":6,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Magmablock","min":256,"max":256,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Skulk","min":256,"max":256,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Eisen","min":128,"max":128,"minCoins":8,"maxCoins":8,"weight":350});
ALL_MISSIONS.push({"type":"item","name":"Kupfer","min":192,"max":192,"minCoins":8,"maxCoins":8,"weight":300});
ALL_MISSIONS.push({"type":"item","name":"Gold","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":250});
ALL_MISSIONS.push({"type":"item","name":"Netherit","min":1,"max":1,"minCoins":8,"maxCoins":8,"weight":75});
ALL_MISSIONS.push({"type":"item","name":"Kohle","min":128,"max":128,"minCoins":8,"maxCoins":8,"weight":250});
ALL_MISSIONS.push({"type":"item","name":"Holzkohle","min":128,"max":128,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Diamant","min":16,"max":16,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Smaragd","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Zink","min":128,"max":128,"minCoins":8,"maxCoins":8,"weight":150});
ALL_MISSIONS.push({"type":"item","name":"Redstone","min":128,"max":128,"minCoins":8,"maxCoins":8,"weight":150});
ALL_MISSIONS.push({"type":"item","name":"Lapis","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":150});
ALL_MISSIONS.push({"type":"item","name":"Lederkappe","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Lederjacke","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Lederhose","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Lederstiefel","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Eisenhelm","min":16,"max":16,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Eisenharnisch","min":16,"max":16,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Eisenbeinschutz","min":16,"max":16,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Eisenstiefel","min":16,"max":16,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Goldhelm","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Goldharnisch","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Goldbeinschutz","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Goldstiefel","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Diamanthelm","min":6,"max":6,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Diamantharnisch","min":6,"max":6,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Diamantbeinschutz","min":6,"max":6,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Diamantstiefel","min":6,"max":6,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Eisenspitzhacke","min":16,"max":16,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Eisenaxt","min":16,"max":16,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Eisenhacke","min":16,"max":16,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Eisenschaufel","min":16,"max":16,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Eisenschwert","min":16,"max":16,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Goldspitzhacke","min":12,"max":12,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Goldaxt","min":12,"max":12,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Goldhacke","min":12,"max":12,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Goldschaufel","min":12,"max":12,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Goldschwert","min":12,"max":12,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Diamantspitzhacke","min":6,"max":6,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Diamantaxt","min":6,"max":6,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Diamanthacke","min":6,"max":6,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Diamantschaufel","min":6,"max":6,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Diamantschwert","min":6,"max":6,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Kettenhaube","min":18,"max":18,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Kettenhemd","min":18,"max":18,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Kettenhose","min":18,"max":18,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Kettenstiefel","min":18,"max":18,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Feuerwerksrakete","min":128,"max":128,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Seed of Chaos","min":16,"max":16,"minCoins":8,"maxCoins":8,"weight":75});
ALL_MISSIONS.push({"type":"item","name":"Knochen","min":128,"max":128,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Förderband","min":32,"max":32,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Wither Skelettschädel","min":4,"max":4,"minCoins":8,"maxCoins":8,"weight":75});
ALL_MISSIONS.push({"type":"item","name":"Lohenrute","min":32,"max":32,"minCoins":8,"maxCoins":8,"weight":75});
ALL_MISSIONS.push({"type":"item","name":"Essenz des Ewigen Leben","min":2,"max":2,"minCoins":8,"maxCoins":8,"weight":25});
ALL_MISSIONS.push({"type":"item","name":"Netherwarze","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":75});
ALL_MISSIONS.push({"type":"item","name":"Honigflasche","min":32,"max":32,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Honigwabe","min":32,"max":32,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Warden Carapce","min":1,"max":1,"minCoins":8,"maxCoins":8,"weight":25});
ALL_MISSIONS.push({"type":"item","name":"Geschenk","min":32,"max":32,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Pfeil","min":512,"max":512,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Schild","min":24,"max":24,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Blank Runestone","min":3,"max":3,"minCoins":8,"maxCoins":8,"weight":50});
ALL_MISSIONS.push({"type":"item","name":"Cinder Essence","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":60});
ALL_MISSIONS.push({"type":"item","name":"Drachenhaut","min":2,"max":2,"minCoins":8,"maxCoins":8,"weight":25});
ALL_MISSIONS.push({"type":"item","name":"Fused Bone","min":16,"max":16,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Kürbislaterne","min":32,"max":32,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Meeresgurke","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Endstab","min":16,"max":16,"minCoins":8,"maxCoins":8,"weight":50});
ALL_MISSIONS.push({"type":"item","name":"Fernglas","min":16,"max":16,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Leere Karte","min":32,"max":32,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Nightmare Stalker Skull","min":1,"max":1,"minCoins":8,"maxCoins":8,"weight":50});
ALL_MISSIONS.push({"type":"item","name":"Mahlwerk","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":80});
ALL_MISSIONS.push({"type":"item","name":"Lohenbrenner","min":16,"max":16,"minCoins":8,"maxCoins":8,"weight":75});
ALL_MISSIONS.push({"type":"item","name":"Mechanischer Arm","min":16,"max":16,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Nightmare Stalker Claw","min":2,"max":2,"minCoins":8,"maxCoins":8,"weight":50});
ALL_MISSIONS.push({"type":"item","name":"Phantom Powder","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":75});
ALL_MISSIONS.push({"type":"item","name":"Magmacreme","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Schleimball","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Dark Rod","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Shattered Skull","min":4,"max":4,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Fire Light Dust","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Shilker-Shale","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":50});
ALL_MISSIONS.push({"type":"item","name":"Feder","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Ei","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Spinnennetz","min":16,"max":16,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Bücherregal","min":32,"max":32,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Enderauge","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":50});
ALL_MISSIONS.push({"type":"item","name":"Zielblock","min":32,"max":32,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Ziegelsteine","min":512,"max":512,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Sculk-Katalysator","min":4,"max":4,"minCoins":8,"maxCoins":8,"weight":50});
ALL_MISSIONS.push({"type":"item","name":"Holztor","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":15});
ALL_MISSIONS.push({"type":"item","name":"Eisentor","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":15});
ALL_MISSIONS.push({"type":"item","name":"Plattenhelm","min":4,"max":4,"minCoins":8,"maxCoins":8,"weight":15});
ALL_MISSIONS.push({"type":"item","name":"Plattenpanzer","min":4,"max":4,"minCoins":8,"maxCoins":8,"weight":15});
ALL_MISSIONS.push({"type":"item","name":"Plattenhose","min":4,"max":4,"minCoins":8,"maxCoins":8,"weight":15});
ALL_MISSIONS.push({"type":"item","name":"Toter Busch","min":128,"max":128,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Plattenhelm","min":4,"max":4,"minCoins":8,"maxCoins":8,"weight":15});
ALL_MISSIONS.push({"type":"item","name":"Bambus","min":512,"max":512,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Sporenblüte","min":4,"max":4,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Amethysthaufen","min":32,"max":32,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Lagerfeuer","min":128,"max":128,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Common Ink","min":16,"max":16,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Uncommon Ink","min":12,"max":12,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Rare Ink","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Epic Ink","min":4,"max":4,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Legendary Ink","min":1,"max":1,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Schwarzpulver","min":128,"max":128,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Orb of the Summoner","min":4,"max":4,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Monster Skin","min":32,"max":32,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Fang of the Hound Leader","min":1,"max":1,"minCoins":8,"maxCoins":8,"weight":50});
ALL_MISSIONS.push({"type":"item","name":"Lifestealer Skull","min":1,"max":1,"minCoins":8,"maxCoins":8,"weight":50});
ALL_MISSIONS.push({"type":"item","name":"Spielerkopf","min":1,"max":1,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Lavaeimer","min":24,"max":24,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Glass","min":512,"max":512,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Getöntes Glas","min":128,"max":128,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Messing","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":75});
ALL_MISSIONS.push({"type":"item","name":"Purpur Block","min":256,"max":256,"minCoins":8,"maxCoins":8,"weight":25});
ALL_MISSIONS.push({"type":"item","name":"Röhre","min":256,"max":256,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Skelettschädel","min":1,"max":1,"minCoins":8,"maxCoins":8,"weight":50});
ALL_MISSIONS.push({"type":"item","name":"Creeperschädel","min":1,"max":1,"minCoins":8,"maxCoins":8,"weight":50});
ALL_MISSIONS.push({"type":"item","name":"Leuchttintenbeutel","min":32,"max":32,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Holzaxt","min":2,"max":2,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Diamanttermintenscherbe","min":16,"max":16,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Tarnished Crown","min":4,"max":4,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Mesh Door","min":2,"max":2,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Electrum","min":8,"max":8,"minCoins":8,"maxCoins":8,"weight":75});
ALL_MISSIONS.push({"type":"item","name":"Hogskin","min":16,"max":16,"minCoins":8,"maxCoins":8,"weight":75});
ALL_MISSIONS.push({"type":"item","name":"Korruption","min":16,"max":16,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Wither Rose","min":16,"max":16,"minCoins":8,"maxCoins":8,"weight":50});
ALL_MISSIONS.push({"type":"item","name":"Wither Rose","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":100});
ALL_MISSIONS.push({"type":"item","name":"Pitchfork","min":2,"max":2,"minCoins":8,"maxCoins":8,"weight":75});
ALL_MISSIONS.push({"type":"item","name":"Staff of Magic Arrows","min":2,"max":2,"minCoins":8,"maxCoins":8,"weight":75});
ALL_MISSIONS.push({"type":"item","name":"Soul Crystal","min":4,"max":4,"minCoins":8,"maxCoins":8,"weight":75});
ALL_MISSIONS.push({"type":"item","name":"Soul Dust","min":16,"max":16,"minCoins":8,"maxCoins":8,"weight":75});
ALL_MISSIONS.push({"type":"item","name":"Sculk Bone","min":32,"max":32,"minCoins":8,"maxCoins":8,"weight":75});
ALL_MISSIONS.push({"type":"item","name":"Resonarium","min":32,"max":32,"minCoins":8,"maxCoins":8,"weight":75});
ALL_MISSIONS.push({"type":"item","name":"Bloom Berries","min":256,"max":256,"minCoins":8,"maxCoins":8,"weight":75});
ALL_MISSIONS.push({"type":"item","name":"Echo Sappling","min":128,"max":128,"minCoins":8,"maxCoins":8,"weight":75});
ALL_MISSIONS.push({"type":"item","name":"Sculk Stone","min":2048,"max":2048,"minCoins":8,"maxCoins":8,"weight":75});
ALL_MISSIONS.push({"type":"item","name":"Gloomslate","min":2048,"max":2048,"minCoins":8,"maxCoins":8,"weight":75});
ALL_MISSIONS.push({"type":"item","name":"Sculk Gleam","min":128,"max":128,"minCoins":8,"maxCoins":8,"weight":75});
ALL_MISSIONS.push({"type":"item","name":"Echo Log","min":256,"max":256,"minCoins":8,"maxCoins":8,"weight":75});
ALL_MISSIONS.push({"type":"item","name":"Gloomy Cactus","min":64,"max":64,"minCoins":8,"maxCoins":8,"weight":75});
ALL_MISSIONS.push({"type":"item","name":"Gnawed Bones","min":16,"max":16,"minCoins":8,"maxCoins":8,"weight":100});
