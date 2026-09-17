const ScoreboardUtils = {
    /**
     * Creates a scoreboard objective and sets its display slot.
     * @param {Internal.MinecraftServer} server
     * @param {string} id internal objective name
     * @param {string} title display name shown in-game
     * @param {string} display display slot (default: 'sidebar')
     */
    initBoard: (server, id, title, display) => {
        display = display ?? 'sidebar'
        server.runCommandSilent(`scoreboard objectives add ${id} dummy "${title}"`);
        server.runCommandSilent(`scoreboard objectives setdisplay ${display} ${id}`);
    },
    /**
     * Sets a player's score on the given objective.
     * @param {Internal.MinecraftServer} server
     * @param {string} boardId internal objective name
     * @param {string} playername player name or fake player
     * @param {number} score value to set
     */
    setScore: (server, boardId, playername, score) => {
        server.runCommandSilent(`scoreboard players set ${playername} ${boardId} ${score}`);
    },
    /**
     * Removes a scoreboard objective entirely.
     * @param {Internal.MinecraftServer} server
     * @param {string} boardId internal objective name to remove
     */
    removeScoreboard: (server, boardId) => {
        server.runCommandSilent(`scoreboard objectives remove ${boardId}`);
    }
};
