'use strict';
const check = require('check-types');
const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;
const ObjectID = mongodb.ObjectID;
const Promise = require('bluebird');
const fs = require('fs');
const Logger = require('mongodb').Logger;

let db = null;

module.exports.db = function() {

    if (db === null) {
        throw new Error('Mongo DB not connected!');
    }
    return db;
};

module.exports.ObjectID = ObjectID;

/**
 * Connect to Mongo DB.
 * @param {Object} connection
 * @param {string} connection.uri
 * @param {string} connection.sslCAPath
 * @param {boolean} connection.sslValidate
 * @return {Promise}
 */
module.exports.connect = async function(connection) {

    // Set debug level
    if (process.env.LOG_LEVEL) {
        Logger.setLevel(process.env.LOG_LEVEL.toLowerCase());
    }

    if (db !== null) {
        return db;
    }

    check.assert.object(connection, 'Invalid connection object.');
    check.assert.string(connection.uri, 'Invalid connection.uri');

    let options = {
        promiseLibrary: Promise,
        useNewUrlParser: true
    };

    // file to cert
    if (connection.sslCAPath) {
        options.sslCA = fs.readFileSync(connection.sslCAPath);
        if (connection.hasOwnProperty('sslValidate')) {
            options.sslValidate = connection.sslValidate;
        }
        if (connection.hasOwnProperty('useSSL') && connection.useSSL !== null) {
            options.ssl = connection.useSSL;
        }
    }
    
    console.log('Connecting to Mongo with URI: ' + connection.uri);

    const client = await MongoClient.connect(connection.uri, options);
    db = client.db();
    return db;
};
