'use strict';
const Promise = require('bluebird');
const check = require('check-types');

/**
 * This is a variation of classic Promise.all function. Where Promise.all is fail fast -
 * when the first promise fails, the rest is not executed.
 * In this case all promises are executed and result array is returned.
 * @param {Array} promises
 * @return {Promise<*>}
 * @throws Error
 */
module.exports.allNoErr = async promises => {

    if (!Array.isArray(promises)) {
        throw new Error('Promises is not an array.');
    }
    return Promise.all(promises.map(promise => promise.catch(e => e)));
};

/**
 * Similar to the previous function. But in this case when one of the promises fail error
 * is thrown. The first error found will be throws. So it's like classic Promise.all but
 * all promises are finished.
 * @param {Array} promises
 * @return {Promise<*>}
 * @throws Error
 */
module.exports.all = async promises => {

    if (!Array.isArray(promises)) {
        throw new Error('Promises is not an array.');
    }
    return Promise.all(promises.map(promise => promise.catch(e => e)))
        .then(results => {
            for (let result of results) {
                if (result instanceof Error) {
                    throw result;
                }
            }
            return results;
        });
};

/**
 * Like Promise.map but again - let all promises finish and then throw an error if one of
 * the promises failed. Return result of each promise in an array otherwise.
 * @param {Object} object
 * @param {function} callback
 * @return {Promise<Array>}
 * @throws Error
 */
module.exports.mapKeys = async (object, callback) => {

    check.assert.object(object, 'Invalid object.');
    check.assert.function(callback, 'Invalid callback function');

    let results = [];
    return Promise.map(Object.keys(object), async key => {
        return Promise.resolve(callback(key)).reflect();
    }).each(inspection => {
        if (!inspection.isFulfilled()) {
            throw inspection.reason();
        }
        results.push(inspection.value());
    }).then(() => {
        return results;
    });
};

/**
 * Like Promise.map but again - let all promises finish and then throw an error if one of
 * the promises failed. Return result of each promise in an array otherwise.
 * @param {Object} object
 * @param {function} callback
 * @return {Promise<Array>}
 * @throws Error
 */
module.exports.mapProperties = async (object, callback) => {

    check.assert.object(object, 'Invalid object.');
    check.assert.function(callback, 'Invalid callback function');

    let results = [];
    return Promise.map(Object.keys(object), async key => {
        return Promise.resolve(callback(object[key], key)).reflect();
    }).each(inspection => {
        if (!inspection.isFulfilled()) {
            throw inspection.reason();
        }
        results.push(inspection.value());
    }).then(() => {
        return results;
    });
};
