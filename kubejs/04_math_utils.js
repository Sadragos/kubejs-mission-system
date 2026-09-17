const MathUtils = {
    /**
     * Generates a random integer. Min/Max are inclusive.
     * @param {number} min smallest possible value
     * @param {number} max largest possible value
     */
    randomInt: (min, max) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    /**
     * Generates a random integer, that is adjusted by the given percentage. Min/Max are inclusive.
     * @param {number} min smallest possible value at percentage = 1
     * @param {number} max largest possible value at percentage = 1
     * @param {number} percentage the percentage, with wich min and max should be adjusted
     * @param {number} minGap the minimum difference between min and max after adjusting
     * @param {number} absoluteMin lower bound applied after percentage scaling
     */
    randomIntAdjusted: (min, max, percentage, minGap, absoluteMin) => {
        percentage = percentage ?? 1;
        minGap = minGap ?? 1;
        let adjustedMin = Math.floor(min * percentage);
        if (absoluteMin != null) adjustedMin = Math.max(adjustedMin, absoluteMin);
        let adjustedMax = Math.max(Math.floor(max * percentage), adjustedMin + minGap);
        return MathUtils.randomInt(adjustedMin, adjustedMax);
    },
    /**
     * Generates a random number. Min/Max are inclusive
     * @param {number} min smallest possible value
     * @param {number} max largest possible value
     */
    randomFloat: (min, max) => {
        return Math.random() * (max - min) + min;
    },
    /**
     * Returns a random element from a weighted array.
     * @param {Array} arr the array to pick from
     * @param {string} weightKey the property name used as weight (default: 'weight')
     */
    randomWeightedEntry: (arr, weightKey) => {
        weightKey = weightKey ?? 'weight';
        let total = arr.reduce((sum, entry) => sum + entry[weightKey], 0);
        let roll = MathUtils.randomFloat(0, total);
        for (let i = 0; i < arr.length; i++) {
            roll -= arr[i][weightKey];
            if (roll <= 0) return arr[i];
        }
        return arr[arr.length - 1];
    }
};
