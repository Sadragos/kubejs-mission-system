const ParticleUtils = {
    /**
     * Spawns a particle effect at a player's position.
     * @param {Internal.MinecraftServer} server
     * @param {string} playerName target player name
     * @param {string} particle particle identifier (e.g. "minecraft:heart")
     * @param {number} amount number of particles (default: 100)
     * @param {number} dY vertical offset above the player (default: 3)
     * @param {number} spreadX spread radius on the X axis (default: 0)
     * @param {number} spreadY spread radius on the Y axis (default: 0)
     * @param {number} spreadZ spread radius on the Z axis (default: 0)
     */
    summonParticleAtPlayer: (server, playerName, particle, amount, dY, spreadX, spreadY, spreadZ) => {
        amount = amount ?? 100;
        dY = dY ?? 3;
        spreadX = spreadX ?? 0;
        spreadY = spreadY ?? 0;
        spreadZ = spreadZ ?? 0;
        server.runCommandSilent(`execute at ${playerName} run particle ${particle} ~ ~${dY} ~ ${spreadX} ${spreadY} ${spreadZ} 0.1 ${amount}`);
    },
    /**
     * Spawns a particle effect at an absolute world position.
     * @param {Internal.MinecraftServer} server
     * @param {{ x: number, y: number, z: number }} pos target position
     * @param {string} particle particle identifier (e.g. "minecraft:heart")
     * @param {number} amount number of particles (default: 100)
     * @param {number} dY vertical offset above pos.y (default: 0)
     * @param {number} spreadX spread radius on the X axis (default: 0)
     * @param {number} spreadY spread radius on the Y axis (default: 0)
     * @param {number} spreadZ spread radius on the Z axis (default: 0)
     */
    summonParticleAtPosition: (server, pos, particle, amount, dY, spreadX, spreadY, spreadZ) => {
        amount = amount ?? 100;
        dY = dY ?? 0;
        spreadX = spreadX ?? 0;
        spreadY = spreadY ?? 0;
        spreadZ = spreadZ ?? 0;
        server.runCommandSilent(`particle ${particle} ${pos.x} ${pos.y + dY} ${pos.z} ${spreadX} ${spreadY} ${spreadZ} 0.1 ${amount}`);
    }
};

const SoundUtils = {
    /**
     * Plays a sound at a player's position for all players.
     * @param {Internal.MinecraftServer} server
     * @param {string} playerName target player name (used as playback position)
     * @param {string} sound sound identifier (e.g. "minecraft:entity.player.levelup")
     */
    playSoundAtPlayer: (server, playerName, sound) => {
        server.runCommandSilent(`execute at ${playerName} run playsound ${sound} player @a ~ ~ ~ 1 1`);
    }
};
