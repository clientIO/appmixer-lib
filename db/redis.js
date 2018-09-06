'use strict';

const Promise = require('bluebird');
const redis = Promise.promisifyAll(require('redis'));
const check = require('check-types');
const fs = require('fs');

const SINGLETON_NAME = 'appmixer-lib.db.redis.client';
const singletons = require('../util/singletons');

module.exports.client = function() {

    const client = singletons.get(SINGLETON_NAME);
    if (!client) {
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

    let client = singletons.get(SINGLETON_NAME);
    if (client) {
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
    singletons.set(SINGLETON_NAME, client);
    return client;
};
