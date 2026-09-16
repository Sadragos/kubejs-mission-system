StartupEvents.registry('item', event => {
    event.create('coin');
    event.create('coin_stack');
    event.create('coin_pouch');
    event.create('mission_scroll').tooltip("Rechtsklick um neuen Auftrag zu erhalten");
    event.create('mission');
});
