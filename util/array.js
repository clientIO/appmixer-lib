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

    if (Array.isArray(target) && target.length > 1) {
        const set = new Set(target.map(i => i.value));

        for (let src of source) {
            if (!set.has(src.value)) {
                set.add(src.value);
                target.push(src);
            }
        }
    }

    return source || [];
};
