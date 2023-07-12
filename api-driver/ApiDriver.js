'use strict';
const axios = require('axios');
const Promise = require('bluebird');
const RouterMap = require('./RouterMap').RouterMap;
const fs = require('fs');
const url = require('url');
const { URL } = require('url');

const out = {
    info: console.log,
    error: console.log
};

/**
 * Helper function callback invocation
 * @param {function} callback
 * @param {?Object} response
 */
function safeCallback(callback, response) {

    if (typeof callback === 'function') {
        callback(response.error, response.body, response.statusCode);
    }
}

/**
 * @param error
 * @param status
 * @param {Object} body
 * @returns {*}
 */
function processError(error, status, body) {

    if (error?.response?.data) {
        return error.response.data;
    }

    if (error) {
        if (typeof error === 'string') {
            try {
                error = JSON.parse(error);
            } catch (dump) {
                // ignore
            }
        }

        return error;
    }

    if (typeof body === 'string') {
        try {
            body = JSON.parse(body);
        } catch (parseError) {
            // unknown content in body, but couldn't decide, if it's error, so return none
            return null;
        }
    }

    return (typeof body === 'object' && body.error) ? body : null;
}

/**
 * @param error
 * @param status
 * @param {?Object} body
 * @returns {{error: *, body: ?Object}}
 */
function processResponse(error, status, body) {

    error = processError(error, status, body);
    if (error) {
        body = null;
    }

    const ret = {
        error: error,
        body: body
    };

    if (status) {
        ret.statusCode = status;
    }

    return ret;
}

/**
 * @param {string} filePath
 * @returns {?Object}
 */
function loadLocalRoutesConfiguration(filePath) {

    try {
        const file = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(file);
    } catch (error) {
        out.error('Routes configuration file error: ' + filePath + '\n' + error.message);
        return null;
    }
}

/**
 * @param {string} body
 * @return {Object}
 */
function basicTransformResponseBody(body) {

    return JSON.parse(body);
}

/**
 * @constructor
 * @param {?Object} config
 */
const ApiDriver = function(config) {

    // defaults
    config = config || {};

    // resolve routes configuration
    switch (typeof config.routesConfiguration) {

        case 'string':
            // we have filename of the routes configuration, so, load it
            config.routesConfiguration = loadLocalRoutesConfiguration(config.routesConfiguration);
            break;

        case 'object':
            // already have config json, do nothing
            break;

        default:
            // no routes, no fun, throw error
            throw new ReferenceError('Routes configuration file not defined');
    }

    // resolve custom implementations module
    switch (typeof config.customImplementationsModule) {

        case 'string':
            // we have filepath of the module, so, try to load it
            config.customImplementationsModule = require(config.customImplementationsModule);
            break;

        case 'object':
            // already have config json, do nothing
            break;

        default:
            // no module, just add empty object
            config.customImplementationsModule = {};
            break;
    }

    config.verbose = !!config.verbose;
    config.multiArgs = !!config.multiArgs;

    if (typeof config.transformResponseBody !== 'function') {
        config.transformResponseBody = basicTransformResponseBody;
    }

    this.promSend = Promise.promisify(this.send, { context: this, multiArgs: config.multiArgs });
    this.config = config;
    this.routesMap = new RouterMap();

    this.routesMap.initialize({
        onRouteConfigCreated: (this.onRouteConfigCreated).bind(this),
        routes: config.routesConfiguration
    });
};

/**
 * @param {RouteConfig} routeConfig
 * @return {function}
 */
ApiDriver.prototype.createCustomFunction = function(routeConfig) {

    const customFn = this.config.customImplementationsModule[routeConfig.rawConfig.customImplementation];
    const promCustomFn = Promise.promisify(customFn);

    if (typeof customFn !== 'function') {
        throw new Error(
            'Couldn\'t find "' + routeConfig.rawConfig.customImplementation +
            '" in custom implementation module. Route: ' + routeConfig.fullName
        );
    }

    return (function(data, done) {

        data = data || {};
        // promisify this.send with binding to this
        const routeJson = this.routesMap.getRouteJson(routeConfig.fullName, data);

        if (typeof done === 'function') {
            // if callback, use callback...
            customFn(routeJson, data, done);
        } else {
            // if not, use promise
            return promCustomFn(routeJson, data);
        }
    }).bind(this);
};

/**
 * @param {RouteConfig} routeConfig
 * @return {function}
 */
ApiDriver.prototype.createGeneratedFunction = function(routeConfig) {

    return (function(data, done) {

        data = data || {};
        const routeJson = this.routesMap.getRouteJson(routeConfig.fullName, data);

        if (typeof done === 'function') {
            // if callback, use callback...
            this.send(routeConfig.fullName, routeJson, data, done);
        } else {
            // if not, use promise
            return this.promSend(routeConfig.fullName, routeJson, data);
        }
    }).bind(this);
};

/**
 * @param {RouteConfig} routeConfig
 */
ApiDriver.prototype.onRouteConfigCreated = function(routeConfig) {

    const fn = (routeConfig.rawConfig.customImplementation) ?
        this.createCustomFunction(routeConfig) :
        this.createGeneratedFunction(routeConfig);

    // build hierarchy, if needed
    let item;
    let active = this;
    let hierarchy = routeConfig.namespaceSequence;
    for (let i = 0; i < hierarchy.length; i++) {
        item = hierarchy[i];
        active[item] = active[item] || {};
        active = active[item];
    }
    // bind function to the appropriate leaf
    active[routeConfig.name] = fn;
};

/**
 * @param {string} routeFullName
 * @param {Object} routeJson
 * @param {Object} sendParams
 * @param {function} done
 */
ApiDriver.prototype.send = function(routeFullName, routeJson, sendParams, done) {

    if (routeJson == null) {
        throw new Error('Unknown route!');
    }
    if (!routeJson.uri) {
        throw new Error('Missing uri param for route ' + routeFullName);
    }
    if (!routeJson.method) {
        throw new Error('Missing method param for route ' + routeFullName);
    }

    const requestJson = {
        method: routeJson.method,
        // this is to avoid exception if user sets this.config.baseUrl to empty string ''
        url: new URL(routeJson.uri, this.config.baseUrl ? this.config.baseUrl : undefined).toString()
    };

    if (routeJson.formData || sendParams.formData) {
        requestJson.data = routeJson.formData || sendParams.formData;
        requestJson.headers = (routeJson.formData || sendParams.formData).getHeaders();
    }
    if (routeJson.auth) {
        requestJson.auth = routeJson.auth;
    }
    if (routeJson.body || sendParams.body) {
        requestJson.data = routeJson.body || sendParams.body;
    }
    if (routeJson.qs || sendParams.qs) {
        requestJson.params = routeJson.qs || sendParams.qs;
    }
    if (routeJson.headers) {
        requestJson.headers = Object.assign(requestJson.headers || {}, routeJson.headers);
    }
    if (sendParams.headers) {
        requestJson.headers = Object.assign(requestJson.headers || {}, sendParams.headers);
    }
    if (sendParams.json) {
        if (typeof sendParams.json === 'object') {
            requestJson.data = sendParams.json;
        }
        requestJson.json = true;
    }

    if (this.config.token) {
        requestJson.headers = Object.assign(
            requestJson.headers || {}, { 'Authorization': 'Bearer ' + this.config.token });
    }

    axios(requestJson).then(response => {
        if ([200, 201, 202, 302].indexOf(response.status) === -1) {
            safeCallback(done, processResponse(null, response.status, response.data));
            return;
        }

        if (response.status === 302 && response.headers.location) {
            let parsed = url.parse(response.headers.location);
            this.config.baseUrl = parsed.protocol + '//' + parsed.host;
            routeJson.uri = parsed.path;
            return this.send(routeFullName, routeJson, sendParams, done);
        }

        try {
            if (typeof response.data === 'string') {
                response.data = this.config.transformResponseBody(response.data);
            }
        } catch (parseError) {
            // even our own API sometimes returns string instead of JSON (POST /stores for example),
            // in case the response body cannot be parsed, return it as it is
        }

        const responseJson = processResponse(null, response.status, response.data);

        safeCallback(done, responseJson);

        if (this.config.verbose) {
            out.info(routeFullName + ' successfully done.\nsendParams:\t', JSON.stringify(sendParams || {}));
            out.info('response code: ' + response.status);
            out.info(JSON.stringify(response.data, null, '\t'));
        }
    }).catch(error => {
        safeCallback(done, processResponse(error, error?.response?.status, error?.response?.data));
    });
};

/**
 * @param {Object} options - classic request-promise object
 */
ApiDriver.prototype.sendAsync = function(options) {

    return this.promSend(options.uri || '', options, { json: true });
};

/**
 * @param {string} token
 * @return {ApiDriver}
 */
ApiDriver.prototype.setAccessToken = function(token) {

    if (!token) {
        throw new Error('Missing token.');
    }
    this.config.token = token;
    return this;
};

/**
 * Get JWT token.
 * @return {string}
 */
ApiDriver.prototype.getAccessToken = function() {

    return this.config.token;
};

/**
 * @param {string} url
 */
ApiDriver.prototype.setBaseUrl = function(url) {

    this.config.baseUrl = url;
};

/**
 * @return {string}
 */
ApiDriver.prototype.getBaseUrl = function() {

    return this.config.baseUrl;
};

module.exports = ApiDriver;
