'use strict';
const check = require('check-types');
const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;
const ObjectID = mongodb.ObjectID;
const Promise = require('bluebird');
const fs = require('fs');

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
 * @param {string} connection.host
 * @param {number} connection.port
 * @param {string} connection.dbName
 * @return {Promise}
 */
module.exports.connect = async function(connection) {

    if (db !== null) {
        return db;
    }

    check.assert.object(connection, 'Invalid connection object.');
    if (connection.uri) {
        check.assert.string(connection.uri, 'Invalid connection.uri');
    } else {
        check.assert.string(connection.host, 'Invalid connection.host.');
        check.assert.number(connection.port, 'Invalid connection.port.');
        check.assert.string(connection.dbName, 'Invalid connection.dbName.');
    }

    let uri = connection.uri || 'mongodb://' + connection.host + ':' + connection.port + '/' + connection.dbName;

    let options = {
        promiseLibrary: Promise
    };

    // file to cert
    if (connection.sslCAPath) {
        let certFileBuf = fs.readFileSync(connection.sslCAPath);
        Object.assign(options, uri.includes('replicaSet') ?
            {
                replSet: {
                    sslCA: certFileBuf
                }
            } :
            {
                server: {
                    sslCA: certFileBuf
                }
            }
        );
    }

    db = await MongoClient.connect(uri, options);
    return db;
};
