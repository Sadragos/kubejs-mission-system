
/**
 * Gibt eine Position im JourneyMap-Waypoint-Format zurück, inklusive aktuellem Datum im Namen.
 * @param {string} name - Name des Waypoints
 * @param {{ x: number, y: number, z: number }} pos - Position
 * @param {string} dimension - Dimensions-ID (z.B. "minecraft:overworld")
 * @returns {string} JourneyMap-kompatibler Waypoint-String
 */
function toMapPosition(name, pos, dimension) {
    let date = formatDateTime(new Date());
    return `[name:"${name} (${date})", x:${pos.x}, y:${pos.y}, z:${pos.z}, dim:${dimension}]`;
}

/**
 * Formatiert eine Position für den Chat-Output.
 * @param {{ x: number, y: number, z: number }} pos - Position
 * @param {boolean} includeY - Ob die Höhe (Y) mit angezeigt werden soll
 * @returns {string}
 */
function toChatPosition(pos, includeY) {
    if (includeY) return `[${pos.x}, ${pos.z}, Höhe ${pos.y}]`;
    return `[${pos.x}, ${pos.z}]`;
}

/**
 * Berechnet eine zufällige Spawn-Position in der Nähe des Spielers.
 * Der Offset liegt im Bereich [0, missionSummonMaxPlayerDist].
 * Die Y-Koordinate ist fest auf 280 gesetzt (über dem Terrain für Luftspawns).
 * @param {Player} player - Der Spieler, um dessen Position gespawnt wird
 * @returns {{ x: number, y: number, z: number }}
 */
function generateSummonPos(player) {
    let posX = player.blockPosition().x;
    let posZ = player.blockPosition().z;
    let offsetPos = randomPositionOffset({ x: posX, z: posZ, y: 280 }, 0, missionSummonMaxPlayerDist);
    let summonX = offsetPos.x;
    let summonZ = offsetPos.z;
    let summonY = 280;
    return { x: summonX, z: summonZ, y: summonY };
}

/**
 * Verschiebt eine Position um einen zufälligen Offset in X und Z.
 * Der Offset liegt im Bereich [minDistance, maxDistance] (positiv oder negativ).
 * Die Y-Koordinate wird unverändert übernommen.
 * @param {{ x: number, y: number, z: number }} position - Ausgangsposition
 * @param {number} minDistance - Minimaler Versatz
 * @param {number} maxDistance - Maximaler Versatz
 * @returns {{ x: number, y: number, z: number }}
 */
function randomPositionOffset(position, minDistance, maxDistance) {
    let offsetX = Math.floor((Math.random() - 0.5) * 2 * (maxDistance - minDistance) + minDistance);
    let offsetZ = Math.floor((Math.random() - 0.5) * 2 * (maxDistance - minDistance) + minDistance);
    return { x: position.x + offsetX, z: position.z + offsetZ, y: position.y };
}

/**
 * Berechnet die euklidische 3D-Distanz zwischen zwei Positionen.
 * @param {{ x: number, y: number, z: number }} pos1
 * @param {{ x: number, y: number, z: number }} pos2
 * @returns {number}
 */
function getDistance(pos1, pos2) {
    return Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2) + Math.pow(pos1.z - pos2.z, 2));
}

/**
 * Markiert eine Position mit Partikeleffekten und setzt optional einen JourneyMap-Waypoint.
 * Ein vorhandener Waypoint mit demselben Namen wird zuerst gelöscht.
 * @param {ServerEvent} event
 * @param {{ x: number, y: number, z: number }} summonPos - Zu markierende Position
 * @param {string|undefined} waypointName - Name des JourneyMap-Waypoints (optional)
 */
function markPosition(event, summonPos, waypointName) {
    event.server.runCommandSilent(`particle minecraft:campfire_signal_smoke ${summonPos.x} ${summonPos.y} ${summonPos.z} 0 400 0 0 500 force`);
    event.server.runCommandSilent(`particle minecraft:totem_of_undying ${summonPos.x} ${summonPos.y} ${summonPos.z} 0 400 0 0 1000 force`);
    if (waypointName !== undefined) {
        event.server.runCommandSilent(`jm waypoint delete "${waypointName}" @a`);
        event.server.runCommandSilent(`jm waypoint temp create "${waypointName}" minecraft:overworld ${summonPos.x} 64 ${summonPos.z} green @a`);
    }
}
