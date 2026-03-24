/**
 * Initialisiert das Scoreboard-Objective mit dem gegebenen Titel.
 * Im Multiplayer-Modus wird zusätzlich ein GESAMT-Eintrag auf 0 gesetzt,
 * um die Gesamtpunktzahl aller Spieler anzuzeigen.
 * @param {ServerEvent} event
 * @param {string} title - Anzeigename des Scoreboards
 * @param {boolean} isMultiplayer - Ob ein GESAMT-Eintrag erstellt werden soll
 */
function initScoreboard(event, title, isMultiplayer) {
    event.server.runCommandSilent(`scoreboard objectives add ${HUNT_SCOREBOARD_NAME} dummy "${title}"`);
    event.server.runCommandSilent(`scoreboard objectives setdisplay sidebar my_mission_scores`);
    if (isMultiplayer) event.server.runCommandSilent(`scoreboard players set GESAMT ${HUNT_SCOREBOARD_NAME} 0`);
}

/**
 * Setzt den Punktestand eines bestimmten Spielers auf der Sidebar.
 * @param {ServerEvent} event
 * @param {string} playername - Name des Spielers
 * @param {number} score - Zu setzender Punktestand
 */
function setScore(event, playername, score) {
    event.server.runCommandSilent(`scoreboard players set ${playername} my_mission_scores ${score}`);
}

/**
 * Entfernt das Scoreboard-Objective vollständig vom Server.
 * @param {ServerEvent} event
 */
function removeScoreboard(event) {
    event.server.runCommandSilent(`scoreboard objectives remove my_mission_scores`);
}
