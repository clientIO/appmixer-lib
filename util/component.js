'use strict';
const hasha = require('hasha');
const objectUtil = require('./object');

// some helper functions
function identity(v) { return v; }

function getPropertyByPath(path, obj) {

    return objectUtil.getByPath(obj, path, '.');
}

/**
 * Create mapping function from comma separated path values
 * @param {string|Array} csv
 * @return {function}
 */
function createMappingFunctionFromCSV(csv) {

    const DELIM = '.';
    csv = Array.isArray(csv) ? csv : csv.split(',');

    return json => {

        const item = {};
        const excluded = [];
        for (let path of csv) {
            path = path.trim();
            const exclude = path[0] == '-';
            if (exclude) {
                path = path.substr(1);
                excluded.push(path);
            } else {
                objectUtil.setByPath(item, path, objectUtil.getByPath(json, path, DELIM), DELIM);
            }

        }

        for (let path of excluded) {
            objectUtil.deleteAtPath(item, path, DELIM);
        }

        return item;
    };
}

/**
 * Using previous state compares items of iterable and returns new state and changes
 * @param {Iterable} iterable
 * @param {Map|Array<Array>} previousState
 * @param {string|function(object)} idMapping
 *         if string, then idMapping value is used as path to id in item
 *         if function, idMapping is called on item to retrieve id of that item
 *         !!WARNING!! for components where big load of items is expected, I recommend pass
 *         own mapping function, because the generated one adds bit more of load.
 * @param {?Object=} options
 * @param {boolean} options.includeOldData when true, function includes difference in changed item
 * @param {?function=} options.mappingFunction used to map item from iterable to object, which is used for comparation
 * @param {?function=} options.stringifyFunction used to stringify result of mappingFunction
 * @param {?function=} options.hashFn function for making hash out of item's transformed data
 * @return {{
 *     changes: Array,
 *     newState: Map|Array<Array>
 * }}
 */
function checkListForChanges(iterable, previousState, idMapping, options = {}) {

    if (typeof idMapping == 'string') {
        idMapping = getPropertyByPath.bind(null, idMapping);
    } else if (typeof idMapping != 'function') {
        throw new TypeError(`'idMapping' should be type of 'function' or 'string' but is of '${typeof idMapping}'!`);
    }

    let keepStateAsMap = true;
    if (Array.isArray(previousState)) {
        previousState = new Map(previousState);
        keepStateAsMap = false;
    }

    const {
        includeOldData = false,
        mappingFunction = identity,
        stringifyFunction = JSON.stringify.bind(JSON),
        hashFn = hasha
    } = options;

    let changes = [];
    let newState = new Map(); // id: { hash, ?data }

    for (let origItem of iterable) {
        const id = idMapping(origItem);
        const item = mappingFunction(origItem);
        const hash = hashFn(stringifyFunction(item));

        // store the item to new state
        newState.set(id, {
            hash,
            data: includeOldData ? item : undefined
        });

        let previousItem = previousState.get(id);

        if (!previousItem) {
            // new item
            changes.push({
                item: origItem,
                oldItem: null,
                state: 'new'
            });
        } else if (previousItem.hash === hash) {
            // done with this item, get rid of it
            previousState.delete(id);
        } else { // Bingo! hash has changed!
            // changed item
            changes.push({
                item: origItem,
                oldItem: previousItem.data,
                state: 'changed'
            });
            // done with this item, get rid of it
            previousState.delete(id);
        }
    }

    // at this point, previous state contains only items which were removed
    // so add those
    changes = changes.concat([...previousState.values()]
        .map(state => ({ item: null, oldItem: state.data, state: 'removed' })));

    return {
        changes,
        newState: keepStateAsMap ? newState : [...newState]
    };
}

module.exports = {
    checkListForChanges,
    createMappingFunctionFromCSV
};
