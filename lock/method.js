'use strict';
const Promise = require('bluebird');
const check = require('check-types');

/**
 * This class provides func to execute function only once (when called multiple times from
 * various resources) and return the same result to all callers.
 */
class Method {

    constructor() {

        this.inProgress = false;
        this.callbacks = [];
    }

    /**
     * @param {function} func
     * @return {Promise<void>}
     * @public
     */
    async call(func) {

        check.assert.function(func, 'Invalid function.');

        if (this.inProgress) {
            return new Promise((resolve, reject) => {
                this.callbacks.push({ resolve, reject });
            });
        }

        try {
            this.inProgress = true;
            const result = await func();
            this.inProgress = false;
            while (this.callbacks.length > 0) {
                this.callbacks.pop().resolve(result);
            }
            return result;
        } catch (err) {
            this.inProgress = false;
            while (this.callbacks.length > 0) {
                this.callbacks.pop().reject(err);
            }
        }
    }
}

module.exports = Method;
