'use strict';
const check = require('check-types');
const MongoClient = require('mongodb').MongoClient;
const Promise = require('bluebird');

let db = null;
module.exports.db = function() {

    if (db === null) {
        throw new Error('Mongo DB not connected!');
    }
    return db;
};

/**
 * Connect to Mongo DB.
 * @param {Object} connection
 * @param {string} connection.host
 * @param {number} connection.port
 * @param {string} connection.dbName
 * @return {Promise}
 */
module.exports.connect = function(connection) {

    if (db !== null) {
        return Promise.resolve(db);
    }

    try {
        check.assert.object(connection, 'Invalid connection object.');
        check.assert.string(connection.host, 'Invalid connection.host.');
        check.assert.number(connection.port, 'Invalid connection.port.');
        check.assert.string(connection.dbName, 'Invalid connection.dbName.');
    } catch (error) {
        return Promise.reject(error);
    }

    return new Promise((resolve, reject) => {
        MongoClient.connect(
            'mongodb://' + connection.host + ':' + connection.port + '/' + connection.dbName,
            {
                promiseLibrary: Promise
            },
            (err, connectedDb) => {
                if (err) {
                    return reject(err);
                }
                db = connectedDb;
                resolve(connectedDb);
            });
    });
};
