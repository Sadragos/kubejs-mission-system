const { readFileSync, writeFileSync, mkdirSync, copyFileSync } = require('fs');
const { parse } = require('path');
const seedrandom = require('seedrandom');

/**
 * give @a acacia_button[custom_name='["",{"text":"Mission:","bold":true,"italic":false},{"text":" ","italic":false},{"text":"64x Birch Plank","italic":false,"color":"gold"}]',lore=['["",{"text":"Die Abendheurergilde benötigt möglichst bald ","italic":false},{"text":"64x Birch Plank","italic":false,"color":"gold"},{"text":". Als Belohnung erhälst du ","italic":false},{"text":"8-12 Coins","italic":false,"color":"gold"},{"text":"!","italic":false}]']]
 */
const chapterGroupId = "60F280BAC7EAC29D";
const missionItem = 'kubejs:mission';
const rewardItem = 'kubejs:coin';

console.log('Rading Missions CSV...');
const missions = parseCSV("missions/Missions.csv").map(p => {
    p.coin_base = 6;
    p.coin_bonus = 4;
    p.missionId = generateId(p.item);
    p.book = {
        components: { 
            "minecraft:custom_name": `{\"extra\":[{\"bold\":true,\"italic\":false,\"text\":\"Mission:\"},{\"italic\":false,\"text\":\" \"},{\"color\":\"gold\",\"italic\":false,\"text\":\"${getMissionTitle(p.amount, p.name)}\"}],\"text\":\"\"}`, 
            "minecraft:lore": [`{\"extra\":[{\"italic\":false,\"text\":\"§5Die §6${p.group}§5 benötigt möglichst bald §6${p.amount}x ${p.name}§5!\n\n§8§oUm diesen Quest anzunehmen muss dieses Buch in den FTB-Quests im Kapitel ${p.group} abgegeben werden.\"}],\"text\":\"\"}`] },
        count: 1,
        id: missionItem
    }

    p.icon = p.icon || p.item;
    return p
});

console.log(`Found ${missions.length} Missions`);


console.log('Generating Mission Books...')
const quest_tokens = {
    id: '00177B8D95AD8F35',
    loot_size: 1,
    order_index: 5,
    rewards: missions.map(mission => {
        const miss = {
            auto: "invisible",
            ignore_reward_blocking: true,
            item: mission.book,
            type: "item",
            weight: parseFloat(mission.weight || 1),
            title: getMissionTitle(mission.amount, mission.name)
        };
        miss.icon = mission.icon;
        return miss;
    }),
    title: "Auftragsbücher",
    hide_tooltip: true,
    icon: missionItem
};
writeSNBT("reward_tables", "quest_tokens.snbt", quest_tokens);



// Chapters für die Verschiedenen Cetegories erzeugen
console.log('Organizing Missions into Chapters...')
const chapters = {};
missions.forEach(mission => {
    if (!chapters[mission.group]) chapters[mission.group] = {
        name: mission.group,
        gridSize: 1,
        missions: []
    };
    chapters[mission.group].missions.push(mission);
});

console.log('Genertaing Mission Chapters...');
Object.values(chapters).forEach(chapter => {
    const dataChapter = generateChapter(chapter.name, "_" + replaceNonAlpha(chapter.name).toLowerCase());
    chapter.dataChapter = dataChapter;
    chapter.gridSize = Math.floor(Math.sqrt(chapter.missions.length));

    chapter.missions.forEach((mission, index) => {
        const row = Math.floor(index / chapter.gridSize);
        const col = index % chapter.gridSize;
        const id = generateId("mission_" + mission.missionId);
        let title = getMissionTitle(mission.amount, mission.name);

        const item = mission.item

        dataChapter.quests.push({
            id,
            rewards: [
                {
                    count: parseInt(mission.coin_base),
                    id: generateId("reward_coins_" + mission.missionId),
                    item: rewardItem,
                    random_bonus: parseInt(mission.coin_bonus),
                    team_reward: true,
                    type: "item"
                },
                {
                    auto: "invisible",
                    command: `/tellraw @a ["",{"selector":"@p "},{"text":" hat den Auftrag ","color":"green"},{"text":"${title}","color":"green","bold":true},{"text":" abgeschlossen.","color":"green"}]`,
                    elevate_perms: true,
                    id: generateId("reward_text_" + mission.missionId),
                    silent: true,
                    team_reward: false,
                    type: "command"
                },
                {
                    auto: "invisible",
                    command: `/execute as @p at @p run summon firework_rocket ~ ~2 ~ {LifeTime:30,FireworksItem:{id:firework_rocket,Count:1,tag:{Fireworks:{Flight:1,Explosions:[{Type:2,Flicker:1,Trail:1,Colors:[I;14602026],FadeColors:[I;11743532]}]}}}}`,
                    elevate_perms: true,
                    id: generateId("reward_firework_" + mission.missionId),
                    silent: true,
                    team_reward: false,
                    type: "command"
                }
            ],
            shape: "square",
            can_repeat: true,
            invisible: true,
            invisible_until_tasks: 1,
            icon: mission.icon,
            tasks: [
                {
                    id: generateId("task_1_" + mission.missionId),
                    item: mission.book,
                    match_components: "strict",
                    type: "item",
                    count: 1,
                    consume_items: false,
                    disable_toast: true,
                    secret: true
                },
                {
                    id: generateId("task_2_" + mission.missionId),
                    item: mission.book,
                    match_components: "strict",
                    type: "item",
                    count: 1,
                    consume_items: true
                },
                {
                    id: generateId("task_3_" + mission.missionId),
                    item: item,
                    type: "item",
                    count: parseInt(mission.amount)
                }
            ],
            icon: {
                id: mission.icon
            },
            x: row,
            y: col
        })


    });
    if (chapter.missions.length > 0 && chapter.name) {
        writeSNBT("chapters", dataChapter.filename + ".snbt", dataChapter);
    }
});
console.table(Object.values(chapters).map(chap => ({
    name: chap.name,
    filename: chap.dataChapter.filename,
    quests: chap.missions.length,
})));
console.log('done');

// Tools -------------------------------------

function getMissionTitle(amount, name) {
    if (amount > 1) {
        return `${amount}x ${name}`;
    } else {
        return name;
    }
}

function generateChapter(title, filename) {
    return {
        always_invisible: false,
        consume_items: true,
        default_hide_dependency_lines: true,
        default_quest_shape: "",
        default_repeatable_quest: true,
        disable_toast: true,
        filename,
        group: chapterGroupId,
        hide_quest_details_until_startable: true,
        hide_quest_until_deps_visible: true,
        hide_quest_until_deps_complete: true,
        id: generateId("c_" + title),
        order_index: 2,
        progression_mode: "linear",
        quest_links: [],
        quests: [],
        require_sequential_tasks: true,
        title
    };
}

function parseCSV(file, missionIdKey) {
    const data = readFileSync(file).toString();
    const lines = data.split('\n');

    const headers = lines[0].split(";");
    const result = [];

    for (let l = 1; l < lines.length; l++) {
        const obj = {};
        const columns = lines[l].split(";");
        if (columns.length !== headers.length) continue;
        columns.forEach((c, i) => {
            obj[headers[i]] = c;
        });
        obj['missionId'] = `mission_${l}`;
        result.push(obj);
    }
    return result;
}

function replaceNonAlpha(string) {
    return string.replace(/[^a-zA-Z]/g, '');
}

function generateId(seed) {
    const rng = seedrandom(seed);
    const randomLong = 9000000000000000 + Math.floor(rng() * 7199254740991);
    const asHex = randomLong.toString(16);
    const asHexWithPadding = asHex.padStart(16, '0').toUpperCase();
    return asHexWithPadding;
}

function writeSNBT(path, filename, data) {
    mkdirSync('out/' + path, { recursive: true });
    writeFileSync('out/' + path + "/" + filename,
        JSON.stringify(data, null, 2)
            .replace(/,\n/g, '\n')
    );
}
