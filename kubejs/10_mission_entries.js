const ALL_MISSIONS = [];

function addMission(mission) {
    ALL_MISSIONS.push(correctMissionInit(mission));
}

function correctMissionInit(mission) {
    if (!mission.minCoins) mission.minCoins = FALLBACK_MIN_COINS;
    if (!mission.maxCoins) mission.maxCoins = FALLBACK_MAX_COINS;
    if (!mission.min) mission.min = FALLBACK_MIN_AMOUNT;
    if (!mission.max) mission.max = FALLBACK_MAX_AMOUNT;
    if (!mission.name) mission.name = nameFromItem(mission.item);

    if (mission.type === MISSION_TYPE_KILL.id && mission.eggChance != -1) {
        if (!mission.eggChance) mission.eggChance = FALLBACK_EGG_CHANCE;
        if (!mission.egg) {
            if (mission.item.indexOf(',') === -1 && mission.item.indexOf('*') === -1 && mission.item.indexOf(':') > -1) {
                mission.egg = `${mission.item.replace('!', '')}_spawn_egg`;
            }
        }
    }

    return mission;
}

function correctAllMissions() {
    let killMission = getMissionByType(MISSION_TYPE_KILL.id);
    let relevantKillMission = killMission.filter(mission => mission.eggChance > 0 && mission.egg && mission.item.indexOf('*') === -1 && mission.item.indexOf(',') === -1 && mission.item.indexOf(':') > -1);
    let missionToCorrect = killMission.filter(mission => mission.eggChance > 0 && !mission.egg);
    missionToCorrect.forEach(mission => {
        
        let relevantTargets = relevantKillMission.filter(killMission => mission.item === '*' || validateItem(killMission.item.replace('!', ''), mission.item));
        if (relevantTargets.length > 0) {
            mission.egg = relevantTargets.map(killMission => killMission.egg).join(',');
        }
    });
}