ServerEvents.commandRegistry((event) => {
    const { commands: Commands, arguments: Arguments } = event;
    event.register(
        Commands.literal("missions")
            .then(
                Commands.literal("abort")
                    .requires((source) => source.hasPermission(2))
                    .executes((ctx) =>
                        runWithAction(ctx.source, "abort"),
                    ),
            )
            .then(
                Commands.literal("start")
                    .requires((source) => source.hasPermission(2))
                    .then(
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
            ),
    );

    event.register(
        Commands.literal("missions")
            .then(
                Commands.literal("stats")
                    .executes((ctx) => {
                        return runStats(ctx.source, null);
                    })
                    .then(
                        Commands.argument("player", Arguments.STRING.create(event))
                            .requires((source) => source.hasPermission(2))
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
                ScoreboardUtils.removeScoreboard(source.server, 'my_mission_scores');
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

        let totalPulled = 0, totalDone = 0;
        const lines = [`§6--- Missionen Statistik: ${name} ---`];

        for (const type of Object.keys(MISSION_TYPE_GOALS)) {
            let pulled = getMissionPulled(player, type);
            let done = getMissionDoneCount(player, type);
            let progress = (getPlayerProgress(player, type) * 100).toFixed(1);
            let pullPercent = pulled > 0 ? ((done / pulled) * 100).toFixed(1) : "0.0";
            let typeName = (MISSION_TYPES.find(t => t.id === type)?.text ?? type).replace(/§./g, '');
            lines.push(`§8[§6${typeName}§8] §7Erledigt: §a${done} §7/ §f${pulled} §7(§e${pullPercent}%§7) §8| §7Fortschritt: §e${progress}%`);
            totalPulled += pulled;
            totalDone += done;
        }

        let totalPercent = totalPulled > 0 ? ((totalDone / totalPulled) * 100).toFixed(1) : "0.0";
        lines.push(`§8[§6Gesamt§8] §7Erledigt: §a${totalDone} §7/ §f${totalPulled} §7(§e${totalPercent}%§7)`);

        let cursed = getMissionPulled(player, "cursed");
        if (cursed > 0) {
            let cursedPercent = ((cursed / (cursed + totalPulled)) * 100).toFixed(1);
            lines.push(`§8[§5Verflucht§8] §7Gezogen: §a${cursed} §8| §7Anteil: §e${cursedPercent}%`);
        }

        let totalEvents = 0;
        lines.push(`§6--- Events Statistik: ${name} ---`);
        for (const ev of ALL_QUICK_EVENTS.filter(e => e.showInStat)) {
            let done = getEventDone(player, ev.id);
            lines.push(`§8[§6${ev.name}§8]§a${done}`);
            totalEvents += done;
        }
        lines.push(`§8[§6Gesamt§8] §a${totalEvents}`);

        source.player.tell(lines.join('\n'));


        return 1;
    }
});
