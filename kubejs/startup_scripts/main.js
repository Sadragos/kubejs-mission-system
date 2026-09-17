StartupEvents.registry('item', event => {
    event.create('coin');
    event.create('coin_stack');
    event.create('coin_pouch');
    event.create('mission_scroll').tooltip(Text.translate('kubejs.item.mission_scroll.tooltip'));
    event.create('mission');
});
