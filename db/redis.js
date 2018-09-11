'use strict';
const Promise = require('bluebird');
const redis = Promise.promisifyAll(require('redis'));
const check = require('check-types');
const fs = require('fs');

let client = null;

module.exports.client = function() {

    if (client === null) {
        throw new Error('Redis DB not connected!');
    }
    return client;
};

/**
 * Connect to Redis DB.
 * @param {Object} connection
 * @param {string} connection.uri
 * @param {string} connection.caPath
 * @param {boolean} connection.useSSL
 * @return {Promise}
 */
module.exports.connect = async function(connection) {

    if (client !== null) {
        return client;
    }

    check.assert.object(connection, 'Invalid connection object.');
    if (connection.uri) {
        check.assert.string(connection.uri, 'Invalid connection.uri');
    }

    const options = {};
    if (connection.useSSL) {
        options.tls = {
            // Necessary only if the server uses the self-signed certificate
            ca: [fs.readFileSync(connection.caPath)]
        };
    }

    client = connection.uri ? redis.createClient(connection.uri, options) : redis.createClient();
    return client;
};
