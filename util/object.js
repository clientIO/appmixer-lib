'use strict';
const check = require('check-types');

/**
 * Set object property by path.
 * @param {Object} obj
 * @param {string} path
 * @param {*} value
 * @param {string} [delimiter] - / by default
 * @return {Object}
 * @throws Error
 */
module.exports.setByPath = function(obj, path, value, delimiter) {

    check.assert.object(obj, 'Invalid obj param.');
    check.assert.string(path, 'Invalid path param.');

    delimiter = delimiter || '/';

    path = path.replace(/\.\[/g, delimiter);
    path = path.replace(/\[/g, delimiter);
    path = path.replace(/\]/g, '');

    var keys = path.split(delimiter);
    var diver = obj;
    var i = 0;

    if (path.indexOf(delimiter) > -1) {

        for (var len = keys.length; i < len - 1; i++) {
            // diver creates an empty object if there is no nested object under such a key.
            // This means that one can populate an empty nested object with setByPath().
            diver = diver[keys[i]] || (diver[keys[i]] = {});
        }
        diver[keys[len - 1]] = value;
    } else {
        obj[path] = value;
    }
    return obj;
};

/**
 * Get object property by path.
 * @param {Object} obj
 * @param {string} path
 * @param {string} [delimiter] - / by default
 * @return {*}
 * @throws Error
 */
module.exports.getByPath = function(obj, path, delimiter) {

    check.assert.object(obj, 'Invalid obj param.');
    check.assert.string(path, 'Invalid path param.');

    delimiter = delimiter || '/';

    path = path.replace(/\.\[/g, delimiter);
    path = path.replace(/\[/g, delimiter);
    path = path.replace(/\]/g, '');

    var keys = path.split(delimiter);
    var key;

    while (keys.length) {
        key = keys.shift();
        if (Object(obj) === obj && key in obj) {
            obj = obj[key];
        } else {
            return undefined;
        }
    }
    return obj;
};

/**
 * Delete object property at path.
 * @param {Object} obj
 * @param {string} path
 * @param {string} [delimiter] - / by default
 * @return {Object}
 * @throws Error
 */
module.exports.deleteAtPath = function(obj, path, delimiter) {

    check.assert.object(obj, 'Invalid obj param.');
    check.assert.string(path, 'Invalid path param.');

    delimiter = delimiter || '/';

    path = path.replace(/\.\[/g, delimiter);
    path = path.replace(/\[/g, delimiter);
    path = path.replace(/\]/g, '');

    path = path.split(delimiter);
    let current = obj;
    let key = path[0];
    let found = true;
    for (let i = 0; i < path.length - 1; i++) {
        key = path[i];
        if (typeof current == 'object') {
            current = current[key];
        } else {
            found = false;
            break;
        }
    }

    if (found) {
        key = path.pop();
        if (Array.isArray(current)) {
            current.splice( key, 1 );
        } else {
            if (typeof current == 'object') {
                delete current[key];
            }
        }
    }
    return obj;
};
