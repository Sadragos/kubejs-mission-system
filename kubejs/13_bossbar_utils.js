const BossbarUtils = {
    /**
     * Creates a bossbar, makes it visible to all players and sets its initial value to max.
     * @param {Internal.MinecraftServer} server
     * @param {string} id internal bossbar name
     * @param {string} title display text (may contain legacy § color codes)
     * @param {string} [color] bossbar color (default: 'blue')
     * @param {number} [max] maximum value (default: 100)
     */
    initBar: (server, id, title, color, max) => {
        color = color ?? 'blue';
        max = Math.max(1, Math.round(max ?? 100));
        server.runCommandSilent(`bossbar add ${id} "${title}"`);
        server.runCommandSilent(`bossbar set ${id} color ${color}`);
        server.runCommandSilent(`bossbar set ${id} max ${max}`);
        server.runCommandSilent(`bossbar set ${id} value ${max}`);
        server.runCommandSilent(`bossbar set ${id} players @a`);
        server.runCommandSilent(`bossbar set ${id} visible true`);
    },
    /**
     * Updates the display text of a bossbar.
     * @param {Internal.MinecraftServer} server
     * @param {string} id
     * @param {string} title display text (may contain legacy § color codes)
     */
    setName: (server, id, title) => {
        server.runCommandSilent(`bossbar set ${id} name "${title}"`);
    },
    /**
     * Updates the current value shown on a bossbar.
     * @param {Internal.MinecraftServer} server
     * @param {string} id
     * @param {number} value
     */
    setValue: (server, id, value) => {
        server.runCommandSilent(`bossbar set ${id} value ${Math.max(0, Math.round(value))}`);
    },
    /**
     * Removes a bossbar entirely.
     * @param {Internal.MinecraftServer} server
     * @param {string} id
     */
    removeBar: (server, id) => {
        server.runCommandSilent(`bossbar remove ${id}`);
    }
};
