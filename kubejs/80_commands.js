ServerEvents.commandRegistry((event) => {
    const { commands: Commands, arguments: Arguments } = event;
    event.register(
        Commands.literal("missions")
            .requires((source) => source.hasPermission(2))
            .then(
                Commands.literal("abort").executes((ctx) =>
                    runWithAction(ctx.source, "abort"),
                ),
            )
            .then(
                Commands.literal("start").then(
                    Commands.argument("type", Arguments.STRING.create(event))
                        .suggests((ctx, builder) => {
                            for (const opt of ALL_QUICK_EVENTS) {
                                builder.suggest(opt.id);
                            }
                            return builder.buildFuture();
                        })
                        .executes((ctx) => {
                            const value = Arguments.STRING.getResult(ctx, "type");
                            return runStart(ctx.source, value);
                        }),
                ),
            )
            .then(
                Commands.literal("stats")
                    .executes((ctx) => {
                        return runStats(ctx.source, null);
                    })
                    .then(
                        Commands.argument("player", Arguments.STRING.create(event))
                            .requires((source) => source.hasPermission(4))
                            .suggests((ctx, builder) => {
                                ctx.source.server.playerList.players.forEach((p) =>
                                    builder.suggest(p.username),
                                );
                                return builder.buildFuture();
                            })
                            .executes((ctx) => {
                                const name = Arguments.STRING.getResult(ctx, "player");
                                return runStats(ctx.source, name);
                            }),
                    ),
            ),
    );

    function runWithAction(source, option) {
        switch (option) {
            case "abort":
                if (!currentEvent) {
                    source.player.tell("§cNo Event running!");
                } else {
                    currentEvent.stopEvent(source);
                }
                removeScoreboard(source);
                break;
            default:
                source.player.tell("§cInvalid Command!");
        }
        return 1;
    }

    function runStart(source, type) {
        startEvent(source, type);
        return 1;
    }

    function runStats(source, playerName) {
        const player = playerName
            ? source.server.playerList.players.find((p) => p.username === playerName)
            : source.player;

        if (!player) {
            source.player.tell(`§cSpieler "${playerName}" nicht gefunden.`);
            return 1;
        }

        const name = player.username;

        function progressBar(percent, width) {
            const filled = Math.round((percent / 100) * width);
            return "§a" + "█".repeat(filled) + "§8" + "░".repeat(width - filled);
        }

        source.player.tell(`§6--- Missionen Statistik: ${name} ---`);

        let totalPulled = 0,
            totalDone = 0;

        for (const type of Object.keys(MISSION_TYPE_GOALS)) {
            let pulled = getMissionPulled(player, type);
            let done = getMissionDoneCount(player, type);
            let progress = getPlayerProgress(player, type) * 100;
            let pullPercent = pulled > 0 ? ((done / pulled) * 100).toFixed(1) : "0.0";
            source.player.tell(
                `§6${type}§7: §a${done} §7/ §f${pulled} §7(§e${pullPercent}%§7) §8[${progressBar(progress, 10)}§8]`,
            );
            totalPulled += pulled;
            totalDone += done;
        }
        source.player.tell(`§6Gesamt§7: §a${totalDone} §7/ §f${totalPulled}`);

        let cursed = getMissionPulled(player, "cursed");
        if (cursed > 0) {
            let cursedPercent = ((cursed / (cursed + totalPulled)) * 100).toFixed(1);
            source.player.tell(
                `§6Verflucht§7: §a${cursed} §7 => §e${cursedPercent}%§7 `,
            );
        }
        return 1;
    }
});
