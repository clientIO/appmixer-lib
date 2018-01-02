'use strict';
const assert = require('assert');
const ApiDriver = require('../../ApiDriver');

describe('ApiDriver.RouterMap', function() {

    describe('Tests for ApiDrivers RouterMap', function() {

        it('should create RouterMap and get routeJson', function() {
            var config = {
                'flow.coordinator': {
                    'info': {
                        'description': 'starts the flow',
                        'params': {
                            'flowId': 'id of flow'
                        }
                    },
                    'method': 'POST',
                    'uri': '/flows/{{flowId}}/coordinator'
                }
            };
            var testTable = [
                {
                    routeParams: {
                        flowId: 'flowID_1',
                        json: {
                            hello: 'json',
                            answer: 42
                        }
                    },
                    expectedResult: {
                        'info': {
                            'description': 'starts the flow',
                            'params': {
                                'flowId': 'id of flow'
                            }
                        },
                        'method': 'POST',
                        'uri': '/flows/flowID_1/coordinator'
                    }
                }
            ];

            var apiDriver = new ApiDriver({
                routesConfiguration: config
            });

            var map = apiDriver.routesMap;

            var testItem, result;
            for (var i = testTable.length - 1; i >= 0; i--) {
                testItem = testTable[i];
                result = map.getRouteJson('flow.coordinator', testItem.routeParams);
                assert.deepEqual(result, testItem.expectedResult);
            }
        });
    });
});
