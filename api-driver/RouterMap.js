'use strict';
const RouteConfig = require('./RouteConfig');

/**
 * Router map.
 * @constructor
 */
const RouterMap = function() {
    this.routesMap = {};
    this.onRouteConfigCreated = null;
};

module.exports.RouterMap = RouterMap;

/**
 * Initialize router map.
 * @param {Object} configuration
 */
RouterMap.prototype.initialize = function(configuration) {

    if (typeof configuration !== 'object') {
        throw new Error('Bad type of RouterMap configuration');
    }

    this.onRouteConfigCreated = configuration.onRouteConfigCreated;
    this.configuration = configuration.routes;

    let item;
    let hasCreateCallback = typeof this.onRouteConfigCreated === 'function';

    for (let key in this.configuration) {
        if (this.configuration.hasOwnProperty(key)) {
            item = this.configuration[key];
            let routeConfig = new RouteConfig(key, item);
            if (hasCreateCallback) {
                this.onRouteConfigCreated(routeConfig);
            }
            this.routesMap[key] = routeConfig;
        }
    }
};

/**
 * Get route JSON.
 * @param {string} name
 * @param {Object} parameters
 * @returns {null}
 */
RouterMap.prototype.getRouteJson = function(name, parameters) {

    let routeConfig = this.routesMap[name];
    return routeConfig ? routeConfig.getJson(parameters) : null;
};
