'use strict';
const check = require('check-types');
const Readable = require('stream').Readable;
const Promise = require('bluebird');

/**
 * Simple wrapper around node streams.
 */
class Stream {

    /**
     * @param {string} string
     * @return {Stream}
     * @throws Error
     */
    static createReadStreamFromString(string) {

        check.assert.string(string, 'Missing input string.');
        let s = new Readable();
        s.push(string);
        s.push(null);
        return s;
    }

    /**
     * @param buffer
     * @return {Stream}
     */
    static createReadStreamFromBuffer(buffer) {

        let s = new Readable();
        s.push(buffer);
        s.push(null);
        return s;
    }

    /**
     * @param {*} what
     * @return {boolean}
     */
    static isStream(what) {

        return what instanceof Readable;
    }

    /**
     * This method reads stream into string, this method affects stream param - once read
     * it won't return anything when trying to read again.
     * @param {Stream} stream
     * @return {Promise<string>}
     * @throws Error
     */
    static async readStreamToString(stream) {

        check.assert.instance(stream, Readable, 'Invalid file stream.');

        let fileContent = '';
        return new Promise((resolve, reject) => {
            stream.on('data', data => {
                fileContent += data.toString();
            });
            stream.on('end', () => {
                resolve(fileContent);
            });
            stream.on('error', err => {
                reject(err);
            });
        });
    }
}

module.exports = Stream;
