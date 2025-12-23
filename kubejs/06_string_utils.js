function capitalizeFirstLetter(val) {
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

function validateItem(searchItem, validateItemList) {
    let options = validateItemList.split(',');
    for (let i = 0; i < options.length; i++) {
        if(options[i].startsWith('!')) {
            if (searchItem === options[i].substring(1)) return true;
        } else if (searchItem.indexOf(options[i]) !== -1) return true;
    }
    return false;
}

function nameFromItem(item) {
    const base = item.indexOf(':') === -1 ? item : item.split(':')[1];
    return base.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

const roman = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];