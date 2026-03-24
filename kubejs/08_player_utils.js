/**
 * Berechnet den Fortschritt eines Spielers relativ zum Missionstyp als Prozentwert (0.01–1).
 * - "kill" → Mob-Kills im Verhältnis zu `MOB_KILLS_TARGET`
 * - sonst  → Spielzeit im Verhältnis zu `PLAY_TIME_TARGET`
 * @param {Player} player - Spieler, dessen Stats ausgelesen werden
 * @param {string} missionType - Missionstyp (z.B. "kill")
 * @returns {number} Fortschrittswert zwischen 0.01 und 1
 */
function getPlayerProgress(player, missionType) {
    let stats = player.getStats();

    let playtime = stats.getPlayTime();
    let kills = stats.getMobKills();

    let playtimePercent = Math.max(Math.min(1, playtime / PLAY_TIME_TARGET), 0.01);
    let killsPercent = Math.max(Math.min(1, kills / MOB_KILLS_TARGET), 0.01);

    if (missionType === 'kill') return killsPercent;
    return playtimePercent;
}

/**
 * Spielt einen Sound an der Position eines Spielers für alle Spieler ab.
 * @param {ServerEvent} event
 * @param {string} target - Name des Zielspielers (Abspielposition)
 * @param {string} sound - Sound-Identifier (z.B. "minecraft:entity.player.levelup")
 */
function playSoundAtPlayer(event, target, sound) {
    event.server.runCommandSilent(`execute at ${target} run playsound ${sound} player @a ~ ~ ~ 1 1`);
}
