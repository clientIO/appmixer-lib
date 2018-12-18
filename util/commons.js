'use strict';
const request = require('request');
const contentTypeUtil = require('content-type');
const urlUtil = require('url');
const moment = require('moment');

function createPathItem(key, path, delimiter = '.') {

    const value = (path ? path + delimiter : '') + key;
    return { label: value, value };
}

function getPathsFromJson(json, parentPath, outArray = [], delimiter = '.') {

    for (let key in json) {
        let value = json[key];
        let item = createPathItem(key, parentPath);

        outArray.push(item);

        if (typeof value === 'object') {
            getPathsFromJson(value, parentPath ? parentPath + delimiter + key : key, outArray);
        } else {
            item.data = value;
        }
    }

    return outArray;
}

function getByPath(obj, path, delim) {

    if (typeof path === 'undefined') {
        return obj;
    }
    delim = delim || '.';
    path = path.replace(/\.\[/g, delim);
    path = path.replace(/\[/g, delim);
    path = path.replace(/\]/g, '');
    var keys = path.split(delim);
    var key;

    while (keys.length) {
        key = keys.shift();
        if (Object(obj) === obj && key in obj) {
            obj = obj[key];
        } else {
            return undefined;
        }
    }
    return obj;
}

// http request helpers

/**
 * Converts header property 'content-type' value to more readable json.
 * @param  {string} value
 * @return {{ type: string, parameters: Object }}
 */
function parseContentType(value) {

    try {
        return contentTypeUtil.parse(value);
    } catch (error) {
        return { type: undefined };
    }
}

/**
 * Callback which processes http response in such way, the result should be sent through our messanging system.
 * @param  {function} resolve
 * @param  {function} reject
 * @param  {?Error} error
 * @param  {Object} response
 * @param  {string|Object|Buffer} body
 * @return {Object}
 */
function processResponse(resolve, reject, error, response, body) {

    if (error) {
        reject(error);
        return;
    }

    const json = response.toJSON();
    const contentType = parseContentType(json.headers['content-type']);
    json.headers['content-type'] = contentType;

    if (Buffer.isBuffer(body)) {
        json.body = body.toString('base64');
    }

    if (contentType.type && contentType.type.toLowerCase() === 'application/json') {
        try {
            json.body = JSON.parse(json.body);
        } catch (parseErr) {
            // noop;
        }
    }

    resolve(json);
}

/**
 * Builds options for request
 * @param  {Object} options
 * @return {{ options: Object, errors: Array.<Error> }}
 */
function buildRequestOptions(options) {

    let errors = [];
    try {
        var url = urlUtil.parse(options.url);
    } catch (error) {
        errors.push(new Error('Message property \'url\' parse error. ' + error.message));
    }

    try {
        var headers = typeof options.headers == 'string' ? JSON.parse(options.headers) : options.headers;
    } catch (error) {
        errors.push(new Error('Message property \'headers\' parse error. ' + error.message));
    }

    let body = options.body;
    if (options.bodyBase64Encode && body) {
        try {
            body = Buffer.from(body, 'base64');
        } catch (error) {
            errors.push(new Error('Message property \'body\' parse base64 error. ' + error.message));
        }
    }

    let encoding = options.responseEncoding;

    let json = {
        url,
        headers,
        body,
        encoding
    };

    if (typeof body == 'object') {
        json.json = true;
    }

    return { options: json, errors };
}

/**
 * Return true if the string passed as the only argument can be converted into a number.
 * @param {string} text Any text.
 * @return {boolean}
 */
function isNumber(text) {

    return !isNaN(Number(text));
}

/**
 * Convert text to number.
 * @param {string} text Any text.
 * @return {number}
 */
function toNumber(text) {

    return Number(text);
}

/**
 * Return true if the string passed as the only argument can be converted into a date.
 * @param {string} text Any text.
 * @return {boolean}
 */
function isDate(text) {

    return moment(text).isValid();
}

/**
 * Return true if the first date is before the second date.
 * @param {string} a Date represented as string.
 * @param {string} b Date represented as string.
 * @return {boolean}
 */
function isDateBefore(a, b) {

    return moment(a).isBefore(moment(b));
}

/**
 * Return true if the first date is after the second date.
 * @param {string} a Date represented as string.
 * @param {string} b Date represented as string.
 * @return {boolean}
 */
function isDateAfter(a, b) {

    return moment(a).isAfter(moment(b));
}

/**
 * Return true if the first date is the same as the second date.
 * @param {string} a Date represented as string.
 * @param {string} b Date represented as string.
 * @return {boolean}
 */
function isDateSame(a, b) {

    return moment(a).isSame(moment(b));
}

/**
 * Promisified http request.
 * @param  {string} method - POST, DELETE, PUT, GET
 * @param  {{
 *   url: String,
 *   body: String,
 *   bodyBase64Encode: Boolean,
 *   headers: String,
 *   responseEncoding: String
 * }} json options
 * @return {Promise}
 */
function requestPromisified(method, json) {

    let { options, errors } = buildRequestOptions(json);
    return new Promise((resolve, reject) => {

        if (errors.length > 0) {
            // log all errors
            return reject(JSON.stringify(errors, null, '\t'));
        }
        options.method = method;
        request(options, processResponse.bind(null, resolve, reject));
    });
}

/**
 * This is used in NewXXX component types to get array of new items by comparing all
 * downloaded (through API) items against collection of already known (processed) items.
 * @param {Set} knownItems
 * @param {Array} currentItems
 * @param {Array} newItems
 * @param item
 * @param getId
 */
function processItem(knownItems, currentItems, newItems, getId, item) {

    if (knownItems && !knownItems.has(getId(item))) {
        newItems.push(item);
    }

    currentItems.push(getId(item));
}

module.exports = {
    getPathsFromJson,
    getByPath,
    request: requestPromisified,
    isNumber,
    toNumber,
    isDate,
    isDateBefore,
    isDateAfter,
    isDateSame,
    processItem
};
