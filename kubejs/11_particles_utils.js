function summonParticleAtPlayer(event, playerName, particle, amount, dY, spread) {
    dY = dY === undefined ? 3 : dY;
    amount = amount === undefined ? 100 : amount;
    spread = spread === undefined ? 0 : spread;
    event.server.runCommandSilent(`execute at ${playerName} run particle ${particle} ~ ~${dY} ~ ${spread} ${spread} ${spread} 0.1 ${amount}`);
}

function summonParticleAtPosition(event, pos, particle, amount, dY, spread) {
    dY = dY === undefined ? 3 : dY;
    amount = amount === undefined ? 100 : amount;
    spread = spread === undefined ? 0 : spread;
    event.server.runCommandSilent(`particle ${particle} ${pos.x} ${pos.y + dY} ${pos.z} ${spread} ${spread} ${spread} 0.1 ${amount}`);
}