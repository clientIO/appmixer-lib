'use strict';
const Promise = require('bluebird');

function safeAssignFunction(fn, paramName) {

    if (fn && typeof fn == 'function') {
        return fn;
    } else {
        throw new ReferenceError(`Parameter ${paramName} isn't function!`);
    }
}

/**
 * Fetch data callback
 *
 * @callback fetchDataCallback
 * @param {Object} args arguments of fetch callback
 * @param {number} offset of the paging
 * @param {number} count the number of items you want fetch
 * @return {Promise|*} returns Promise or anything
 */

/**
 * This callback will process one chunk (one page) of data from fetchDataCallback
 * @callback processChunkCallback
 * @param {Object|Array} accumulator for the aggregation
 * @param {*} chunk of fetched data
 * @param {number} offset of the data
 * @param {number} count - requested count of items
 * @return {Object|Array} should return new aggregated accumulator
 */

/**
 * This callback will return next offset we want to fetch, -1 if terminate the fetching cycle
 * @callback nextOffsetCallback
 * @param {Object|Array} accumulator for the aggregation
 * @param {*} chunk of fetched data
 * @param {number} offset of the data
 * @param {number} count - requested count of items
 * @return {number} Returns offset of next items page, -1 if we don't want to fetch anything else
 */

/**
 * @description Helper for fetching asynchronous data using paging
 */
class PagingAggregator {

    /**
     * @param {fetchDataCallback} fetchData
     * @param {processChunkCallback} processChunk
     * @param {nextOffsetCallback} nextOffset
     */
    constructor(fetchData, processChunk, nextOffset) {

        fetchData = safeAssignFunction(fetchData, 'fetchData');
        processChunk = safeAssignFunction(processChunk, 'processChunk');
        nextOffset = safeAssignFunction(nextOffset, 'nextOffset');

        function aggregationFetch(args, offset, count, accumulator = []) {

            let fetchPromise;
            try {
                fetchPromise = Promise.resolve(fetchData(args, offset, count));
            } catch (error) {
                fetchPromise = Promise.reject(error);
            }

            return fetchPromise.then(chunk => {
                accumulator = processChunk(accumulator, chunk, offset, count);
                const newOffset = nextOffset(accumulator, chunk, offset, count);

                if (newOffset > -1) {
                    return aggregationFetch(args, newOffset, count, accumulator);
                }

                return accumulator;
            });
        }

        this.fetch = aggregationFetch;
    }
}

module.exports = PagingAggregator;
