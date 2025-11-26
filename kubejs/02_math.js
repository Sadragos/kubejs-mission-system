function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getWeightedRandomItem(list) {
    let totalWeight = list.reduce((acc, item) => acc + item.weight, 0);
    let random = Math.random() * totalWeight;
    let currentWeight = 0;
    for (let item of list) {
        currentWeight += item.weight;
        if (random < currentWeight) {
            return item;
        }
    }
    return null;
}