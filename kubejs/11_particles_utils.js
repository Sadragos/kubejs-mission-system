/**
 * Spawnt einen Partikeleffekt an der Position eines Spielers.
 * @param {ServerEvent} event
 * @param {string} playerName - Name des Spielers (Zielposition)
 * @param {string} particle - Partikel-Identifier (z.B. "minecraft:heart")
 * @param {number} [amount=100] - Anzahl der Partikel
 * @param {number} [dY=3] - Vertikaler Offset über der Spielerposition
 * @param {number} [spread=0] - Streuradius in alle Richtungen
 */
function summonParticleAtPlayer(event, playerName, particle, amount, dY, spread) {
    dY = dY === undefined ? 3 : dY;
    amount = amount === undefined ? 100 : amount;
    spread = spread === undefined ? 0 : spread;
    event.server.runCommandSilent(`execute at ${playerName} run particle ${particle} ~ ~${dY} ~ ${spread} ${spread} ${spread} 0.1 ${amount}`);
}

/**
 * Spawnt einen Partikeleffekt an einer absoluten Weltposition.
 * @param {ServerEvent} event
 * @param {{ x: number, y: number, z: number }} pos - Zielposition
 * @param {string} particle - Partikel-Identifier (z.B. "minecraft:heart")
 * @param {number} [amount=100] - Anzahl der Partikel
 * @param {number} [dY=3] - Vertikaler Offset über `pos.y`
 * @param {number} [spread=0] - Streuradius in alle Richtungen
 */
function summonParticleAtPosition(event, pos, particle, amount, dY, spread) {
    dY = dY === undefined ? 3 : dY;
    amount = amount === undefined ? 100 : amount;
    spread = spread === undefined ? 0 : spread;
    event.server.runCommandSilent(`particle ${particle} ${pos.x} ${pos.y + dY} ${pos.z} ${spread} ${spread} ${spread} 0.1 ${amount}`);
}
