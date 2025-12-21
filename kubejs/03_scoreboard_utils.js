function initScoreboard(event, title, isMultiplayer) {
    event.server.runCommandSilent(`scoreboard objectives add ${HUNT_SCOREBOARD_NAME} dummy "${title}"`);
    event.server.runCommandSilent(`scoreboard objectives setdisplay sidebar ${HUNT_SCOREBOARD_NAME}`);
    if (isMultiplayer) event.server.runCommandSilent(`scoreboard players set GESAMT ${HUNT_SCOREBOARD_NAME} 0`);
}

function setScore(event, playername, score) {
    event.server.runCommandSilent(`scoreboard players set ${playername} ${HUNT_SCOREBOARD_NAME} ${score}`);
}

function removeScoreboard(event) {
    event.server.runCommandSilent(`scoreboard objectives remove ${HUNT_SCOREBOARD_NAME}`);
}
