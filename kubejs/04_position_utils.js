
function toMapPosition(name, pos, dimension) {
    let date = formatDateTime(new Date());
    return `[name:"${name} (${date})", x:${pos.x}, y:${pos.y}, z:${pos.z}, dim:${dimension}]`;
}

function toChatPosition(pos, includeY) {
    if (includeY) return `[${pos.x}, ${pos.z}, Höhe ${pos.y}]`;
    return `[${pos.x}, ${pos.z}]`;
}

function generateSummonPos(player) {
    let posX = player.blockPosition().x;
    let posZ = player.blockPosition().z;
    let offsetPos = randomPositionOffset({ x: posX, z: posZ, y: 280 }, 0, missionSummonMaxPlayerDist);
    let summonX = offsetPos.x;
    let summonZ = offsetPos.z;
    let summonY = 280;
    return { x: summonX, z: summonZ, y: summonY };
}

function randomPositionOffset(position, minDistance, maxDistance) {
    let offsetX = Math.floor((Math.random() - 0.5) * 2 * (maxDistance - minDistance) + minDistance);
    let offsetZ = Math.floor((Math.random() - 0.5) * 2 * (maxDistance - minDistance) + minDistance);
    return { x: position.x + offsetX, z: position.z + offsetZ, y: position.y };
}

function getDistance(pos1, pos2) {
    return Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2) + Math.pow(pos1.z - pos2.z, 2));
}

function markPosition(event, summonPos, waypointName) {
    event.server.runCommandSilent(`particle minecraft:campfire_signal_smoke ${summonPos.x} ${summonPos.y} ${summonPos.z} 0 400 0 0 500 force`);
    event.server.runCommandSilent(`particle minecraft:totem_of_undying ${summonPos.x} ${summonPos.y} ${summonPos.z} 0 400 0 0 1000 force`);
    if (waypointName !== undefined) {
        event.server.runCommandSilent(`jm waypoint delete "${waypointName}" @a`);
        event.server.runCommandSilent(`jm waypoint temp create "${waypointName}" minecraft:overworld ${summonPos.x} 64 ${summonPos.z} green @a`);
    }
}