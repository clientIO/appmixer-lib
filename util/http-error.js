'use strict';
const Boom = require('boom');

let HttpError = {

    /**
     * @param {Object|string} err
     * @return {Object}
     * @public
     */
    badRequest: function(err) {

        return HttpError.processError(Boom.badRequest, err);
    },

    /**
     * Wrapper for Boom tooManyRequests method.
     * @param {Object|string} [err]
     * @return {Object}
     * @public
     */
    tooManyRequests: function(err) {

        return HttpError.processError(Boom.tooManyRequests, err);
    },

    /**
     * Wrapper for Boom notFound method.
     * @param {Object|string} [err]
     * @return {Object}
     * @public
     */
    notFound: function(err) {

        return HttpError.processError(Boom.notFound, err);
    },

    /**
     * Wrapper for Boom forbidden method.
     * @param {Object|string} [err]
     * @return {Object}
     * @public
     */
    forbidden: function(err) {

        return HttpError.processError(Boom.forbidden, err);
    },

    /**
     * Wrapper for Boom methodNotAllowed method.
     * @param {Object|string} [err]
     * @return {Object}
     * @public
     */
    methodNotAllowed: function(err) {

        return HttpError.processError(Boom.methodNotAllowed, err);
    },

    /**
     * This is used in routes. When the err argument is already Http error (contains
     * statusCode) just return it. WHen it is anything else, wrap it using HttpError.badRequest
     * method.
     * @return {Object}
     * @returns {HttpError}
     * @public
     */
    returnHttpError: function(err) {

        if (typeof err === 'object' && err.output && err.output.statusCode) {
            return err;
        }
        return HttpError.badRequest(err);
    },

    /**
     * Object is usually given to the public methods, HttpError will check it and get
     * the message out of it.
     * @param {function} boomError
     * @param {Object|string} [err]
     * @public
     */
    processError: function(boomError, err) {

        if (typeof err === 'object' && err.message) {
            let error = boomError(err.message, err.error);
            // It seems Boom is not the ideal error formatter for m2m.
            // It's designed for formatting errors for client. It strips details from payload to hide detailed
            // information on client side.
            // http://stackoverflow.com/questions/27463322/hapi-does-not-return-data-attribute-from-boom-error
            error.output.payload.details = error.data;
            return error;
        } else if (typeof err === 'object' && !err.message && err.data) {
            // there are services (trello) returning errors without message but with
            // data
            let error = boomError(err.data, err.error);
            error.output.payload.details = error.data;
            return error;
        } else if (typeof err === 'object' && err.error) {
            // there are services (slack) returning errors with nothing but error property
            return boomError(err.error);
        } else {
            return boomError(err);
        }
    }
};

module.exports = HttpError;
