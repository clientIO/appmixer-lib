'use strict';
// create a unique, global symbol name
const SINGLETONS = Symbol.for('singletons');

// check if the global object has this symbol
// add it if it does not have the symbol, yet
const globalSymbols = Object.getOwnPropertySymbols(global);
if (globalSymbols.indexOf(SINGLETONS) === -1) {
    global[SINGLETONS] = {};
}

// define the singleton API & ensure the API is never changed
module.exports = Object.freeze({
    get(name) {

        return global[SINGLETONS][name];
    },
    set(name, instance) {

        if (!global[SINGLETONS][name]) {
            global[SINGLETONS][name] = instance;
        }

        return global[SINGLETONS][name];
    }
});
