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
                    source.player.tell(Text.translate('kubejs.command.no_event').color('red'));
                } else {
                    currentEvent.stopEvent(source);
                }
                ScoreboardUtils.removeScoreboard(source.server, 'my_mission_scores');
                break;
            default:
                source.player.tell(Text.translate('kubejs.command.invalid').color('red'));
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
            source.player.tell(Text.translate('kubejs.command.player_not_found', playerName).color('red'));
            return 1;
        }

        const name = player.username;

        let totalPulled = 0, totalDone = 0;
        const lines = [Text.translate('kubejs.command.stats.mission_header', name).color('gold')];

        for (const type of Object.keys(MISSION_TYPE_GOALS)) {
            let pulled = getMissionPulled(player, type);
            let done = getMissionDoneCount(player, type);
            let progress = (getPlayerProgress(player, type) * 100).toFixed(1);
            let pullPercent = pulled > 0 ? ((done / pulled) * 100).toFixed(1) : "0.0";
            let typeLabel = Text.translate(MISSION_TYPES.find(t => t.id === type)?.labelKey ?? type);
            lines.push(Text.translate('kubejs.command.stats.type_line', typeLabel, done, pulled, pullPercent, progress));
            totalPulled += pulled;
            totalDone += done;
        }

        let totalPercent = totalPulled > 0 ? ((totalDone / totalPulled) * 100).toFixed(1) : "0.0";
        lines.push(Text.translate('kubejs.command.stats.total_line', totalDone, totalPulled, totalPercent));

        let cursed = getMissionPulled(player, "cursed");
        if (cursed > 0) {
            let cursedPercent = ((cursed / (cursed + totalPulled)) * 100).toFixed(1);
            lines.push(Text.translate('kubejs.command.stats.cursed_line', cursed, cursedPercent));
        }

        let totalEvents = 0;
        lines.push(Text.translate('kubejs.command.stats.event_header', name).color('gold'));
        for (const ev of ALL_QUICK_EVENTS.filter(e => e.showInStat)) {
            let done = getEventDone(player, ev.id);
            lines.push(Text.translate('kubejs.command.stats.event_line', Text.translate(ev.nameKey), done));
            totalEvents += done;
        }
        lines.push(Text.translate('kubejs.command.stats.event_total_line', totalEvents));

        source.player.tell(TextUtils.join(Text.of('\n'), lines));


        return 1;
    }
});
