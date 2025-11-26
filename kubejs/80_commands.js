ServerEvents.commandRegistry(event => {
    const { commands: Commands, arguments: Arguments } = event
    const SUBCOMMANDS = ['abort', 'start']

    // /mycmd [option]
    event.register(
        Commands.literal('missions') // Name des Befehls
            .requires(source => source.hasPermission(2))
            .then(
                Commands.argument('action', Arguments.STRING.create(event))
                    .suggests((ctx, builder) => {
                        for (const opt of SUBCOMMANDS) builder.suggest(opt)
                        return builder.buildFuture()
                    })
                    .executes(ctx => {
                        const value = Arguments.STRING.getResult(ctx, 'action')
                        return runWithAction(ctx.source, value)
                    })
            )
            .then(
                Commands.literal('start')
                    .then(
                        Commands
                            .argument('type', Arguments.STRING.create(event))
                            .suggests((ctx, builder) => {
                                for (const opt of ALL_QUICK_EVENTS) {
                                    builder.suggest(opt.id)
                                }
                                return builder.buildFuture()
                            })
                            .executes(ctx => {
                                const value = Arguments.STRING.getResult(ctx, 'type')
                                return runStart(ctx.source, value);
                            })
                    )
            )
    )

    function runWithAction(source, option) {
        switch(option) {
            case "abort":
                if(!currentEvent) {
                    source.player.tell('§cNo Event running!')
                } else {
                    currentEvent.stopEvent(source);
                }
            break;
            default:
                source.player.tell('§cInvalid Command!');
        }
        return 1;
    }

    function runStart(source, type) {
        startEvent(source, type);
        return 1;
    }
})