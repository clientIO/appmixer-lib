'use strict';
const check = require('check-types');

/**
 * @param {Array} source
 * @param {*} target
 * @return {*|Array}
 * @throws Error
 */
module.exports.addUniqueToArray = function(source, target) {

    check.assert.array(source, 'Invalid source array.');
    check.assert.array(target, 'Invalid target array.');

    const set = new Set(target.map(i => i.value));
    for (let src of source) {
        if (!set.has(src.value)) {
            set.add(src.value);
            target.push(src);
        }
    }
    return target || [];
};
