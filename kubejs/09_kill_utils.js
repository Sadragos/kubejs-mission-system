function isAnyValidKill(mob) {
    return getMissionByType('kill').some(mission => validateItem(mob, mission.item))
}

function isValidKill(mob, target) {
    const entityName = mob.type.toString().toLowerCase();
    if (target === undefined || target === '*') return isAnyValidKill(entityName);
    return validateItem(entityName, target);
}

function getMoblist(filter) {
    let killMission = getMissionByType(MISSION_TYPE_KILL.id);
    let relevantKillMission = killMission.filter(mission => mission.item.indexOf('*') === -1 && mission.item.indexOf(',') === -1 && mission.item.indexOf(':') > -1);
    return relevantKillMission.filter(killMission => filter === '*' || validateItem(killMission.item.replace('!', ''), filter));
}