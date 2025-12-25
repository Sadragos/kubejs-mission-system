function getPlayerProgress(player, missionType) {
    let stats = player.getStats();

    let playtime = stats.getPlayTime();
    let kills = stats.getMobKills();

    let playtimePercent = Math.max(Math.min(1, playtime / playTimeTarget), 0.01);
    let killsPercent = Math.max(Math.min(1, kills / mobKillsTarget), 0.01);

    if (missionType === 'kill') return killsPercent;
    return playtimePercent;
}

function playSoundAtPlayer(event, target, sound) {
    event.server.runCommandSilent(`execute at ${target} run playsound ${sound} player @a ~ ~ ~ 1 1`);
}