const PositionUtils = {
    /**
     * Formats a position for chat output.
     * @param {{ x: number, y: number, z: number }} pos position
     * @param {boolean} includeY whether to include the Y coordinate
     * @returns {string}
     */
    toChatPosition: (pos, includeY) => {
        if (includeY) return `[${pos.x}, ${pos.z}, Height ${pos.y}]`;
        return `[${pos.x}, ${pos.z}]`;
    },
    /**
     * Calculates a random spawn position near the player.
     * Y is fixed at 280 (above terrain for air spawns).
     * @param {Internal.ServerPlayer} player the player to spawn around
     * @param {number} maxDist maximum offset distance from the player
     * @returns {{ x: number, y: number, z: number }}
     */
    generateSummonPos: (player, maxDist) => {
        let posX = player.blockPosition().x;
        let posZ = player.blockPosition().z;
        let offsetPos = PositionUtils.randomPositionOffset({ x: posX, z: posZ, y: 280 }, 0, maxDist);
        return { x: offsetPos.x, z: offsetPos.z, y: 280 };
    },
    /**
     * Shifts a position by a random offset in X and Z.
     * The offset range is [minDistance, maxDistance] (positive or negative).
     * Y is passed through unchanged.
     * @param {{ x: number, y: number, z: number }} position origin position
     * @param {number} minDistance minimum offset magnitude
     * @param {number} maxDistance maximum offset magnitude
     * @returns {{ x: number, y: number, z: number }}
     */
    randomPositionOffset: (position, minDistance, maxDistance) => {
        let offsetX = Math.floor((Math.random() - 0.5) * 2 * (maxDistance - minDistance) + minDistance);
        let offsetZ = Math.floor((Math.random() - 0.5) * 2 * (maxDistance - minDistance) + minDistance);
        return { x: position.x + offsetX, z: position.z + offsetZ, y: position.y };
    },
    /**
     * Creates a temporary JourneyMap waypoint, replacing any existing one with the same name.
     * @param {Internal.MinecraftServer} server
     * @param {string} name waypoint name
     * @param {{ x: number, y: number, z: number }} pos waypoint position
     * @param {string} target command target selector (default: '@a')
     */
    setWaypoint: (server, name, pos, target) => {
        if (!Platform.isLoaded('journeymap')) return;
        target = target ?? '@a';
        server.runCommandSilent(`jm waypoint delete "${name}" ${target}`);
        server.runCommandSilent(`jm waypoint temp create "${name}" minecraft:overworld ${pos.x} 64 ${pos.z} green ${target}`);
    },
    /**
     * Marks a position with particle effects and optionally sets a JourneyMap waypoint.
     * @param {Internal.MinecraftServer} server
     * @param {{ x: number, y: number, z: number }} summonPos position to mark
     * @param {string|undefined} waypointName JourneyMap waypoint name (optional)
     * @param {string} target command target selector (default: '@a')
     */
    markPosition: (server, summonPos, waypointName, target) => {
        ParticleUtils.summonParticleAtPosition(server, summonPos, 'minecraft:campfire_signal_smoke', 500, 0, 0, 400, 0);
        ParticleUtils.summonParticleAtPosition(server, summonPos, 'minecraft:totem_of_undying', 1000, 0, 0, 400, 0);
        if (waypointName !== undefined) {
            PositionUtils.setWaypoint(server, waypointName, summonPos, target);
        }
    },
    /**
     * Calculates a random position at a fixed distance from the given position.
     * The angle is chosen randomly; Y is passed through unchanged.
     * @param {{ x: number, y: number, z: number }} position origin position
     * @param {number} distance exact distance for the new position
     * @returns {{ x: number, y: number, z: number }}
     */
    randomPositionWithDistance: (position, distance) => {
        let base = { x: Math.floor(position.x), y: Math.floor(position.y), z: Math.floor(position.z) };
        let angle = Math.random() * Math.PI * 2;
        return {
            x: Math.floor(base.x + Math.cos(angle) * distance),
            y: base.y,
            z: Math.floor(base.z + Math.sin(angle) * distance)
        };
    }
};
