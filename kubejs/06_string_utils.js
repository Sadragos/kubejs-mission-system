function capitalizeFirstLetter(val) {
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

function validateItem(searchItem, validateItemList) {
    let options = validateItemList.split(',');
    for (let i = 0; i < options.length; i++) {
        if (searchItem.indexOf(options[i]) !== -1) return true;
    }
    return false;
}