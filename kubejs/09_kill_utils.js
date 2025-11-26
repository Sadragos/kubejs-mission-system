function isAnyValidKill(mob) {
    return getMissionByType('kill').some(mission => validateItem(mob, mission.item))
}

function isValidKill(mob, target) {
    const entityName = mob.type.toString().toLowerCase();
    if (target === undefined || target === '*') return isAnyValidKill(entityName);
    return validateItem(entityName, target);
}