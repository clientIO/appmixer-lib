'use strict';
const request = require('request');
const Promise = require('bluebird');
const RouterMap = require('./RouterMap').RouterMap;
const fs = require('fs');
const url = require('url');

var out = {
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
 * @param response
 * @param {Object} body
 * @returns {*}
 */
function processError(error, response, body) {

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
 * @param response
 * @param {?Object} body
 * @returns {{error: *, body: ?Object}}
 */
function processResponse(error, response, body) {

    error = processError(error, response, body);
    if (error) {
        body = null;
    }

    var ret = {
        error: error,
        body: body
    };

    if (response && response.statusCode) {
        ret.statusCode = response.statusCode;
    }

    return ret;
}

/**
 * @param {string} filePath
 * @returns {?Object}
 */
function loadLocalRoutesConfiguration(filePath) {

    try {
        var file = fs.readFileSync(filePath, 'utf8');
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
var ApiDriver = function(config) {

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

    if (typeof config.transformResponseBody !== 'function') {
        config.transformResponseBody = basicTransformResponseBody;
    }

    this.promSend = Promise.promisify(this.send, { context: this, multiArgs: true });
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

    var customFn = this.config.customImplementationsModule[routeConfig.rawConfig.customImplementation];
    var promCustomFn = Promise.promisify(customFn);

    if (typeof customFn !== 'function') {
        throw new Error(
            'Couldn\'t find "' + routeConfig.rawConfig.customImplementation +
            '" in custom implementation module. Route: ' + routeConfig.fullName
        );
    }

    return (function(data, done) {

        data = data || {};
        // promisify this.send with binding to this
        var routeJson = this.routesMap.getRouteJson(routeConfig.fullName, data);

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
        var routeJson = this.routesMap.getRouteJson(routeConfig.fullName, data);

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

    var fn = (routeConfig.rawConfig.customImplementation) ?
        this.createCustomFunction(routeConfig) :
        this.createGeneratedFunction(routeConfig);

    // build hierarchy, if needed
    var item;
    var active = this;
    var hierarchy = routeConfig.namespaceSequence;
    for (var i = 0; i < hierarchy.length; i++) {
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

    var requestJson = {
        method: routeJson.method,
        uri: this.config.baseUrl + routeJson.uri,
        json: sendParams.json,
        qs: routeJson.qs || sendParams.qs,
        formData: routeJson.formData || sendParams.formData,
        body: routeJson.body || sendParams.body,
        headers: routeJson.headers,
        auth: routeJson.auth
    };

    if (this.config.token) {
        requestJson.auth = {
            bearer: this.config.token
        };
    }

    request(requestJson, (function(error, response, body) {

        if (error || ([200, 201, 302].indexOf(response.statusCode) === -1)) {
            safeCallback(done, processResponse(error, response, body));
            return;
        }

        if (response.statusCode === 302 && response.headers.location) {
            let parsed = url.parse(response.headers.location);
            this.config.baseUrl = parsed.protocol + '//' + parsed.host;
            routeJson.uri = parsed.path;
            return this.send(routeFullName, routeJson, sendParams, done);
        }

        try {
            if (typeof body === 'string') {
                body = this.config.transformResponseBody(body);
            }
        } catch (parseError) {
            safeCallback(done, processResponse(parseError, response, body));
            return;
        }

        var responseJson = processResponse(error, response, body);

        safeCallback(done, responseJson);

        if (this.config.verbose) {
            out.info(routeFullName + ' successfully done.\nsendParams:\t', JSON.stringify(sendParams || {}));
            out.info('response code: ' + response.statusCode);
            out.info(JSON.stringify(body, null, '\t'));
        }
    }).bind(this));
};

/**
 * @param {?string} token
 */
ApiDriver.prototype.setAccessToken = function(token) {

    this.config.token = token;
};

/**
 * @param {string} url
 */
ApiDriver.prototype.setBaseUrl = function(url) {

    this.config.baseUrl = url;
};

module.exports = ApiDriver;
