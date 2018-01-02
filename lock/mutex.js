'use strict';
const Promise = require('bluebird');

/**
 * Mutex.
 */
class Mutex {

    /**
     * Constructor
     * @constructor
     */
    constructor() {

        this.counter = 0;
        this.waitingPromises = [];
    }

    /**
     * Lock the mutex.
     * @return {Promise}
     */
    lock() {

        return ++this.counter === 1 ?
            Promise.resolve() :
            new Promise(resolve => {
                this.waitingPromises.push(resolve);
            });
    }

    /**
     * Release the mutex.
     */
    release() {

        let waiting = this.waitingPromises.shift();
        if (waiting) {
            waiting();
        }
        this.counter = this.counter > 0 ? --this.counter : 0;
    }
}

module.exports = Mutex;
