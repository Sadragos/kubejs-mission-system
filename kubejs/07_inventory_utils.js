function removeFromInventory(player, searchItem, amount) {
    let inv = player.inventory;
    let remaining = amount;
    let size = inv.getContainerSize();


    for (let i = 0; i < size && remaining > 0; i++) {
        let invItem = inv.getItem(i);
        if (validateItem(invItem.id, searchItem, 'item')) {
            let take = Math.min(remaining, invItem.count);
            invItem.count -= take;
            remaining -= take;
        }
    }
    return amount - remaining;
}