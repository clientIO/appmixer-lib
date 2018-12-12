'use strict';

module.exports = {
    apiDriver: require('./api-driver'),
    db: require('./db/db'),
    redis: require('./db/redis'),
    lock: {
        mutex: require('./lock/mutex')
    },
    util: {
        array: require('./util/array'),
        singletons: require('./util/singletons'),
        HttpError: require('./util/http-error'),
        object: require('./util/object'),
        component: require('./util/component'),
        flow: require('./util/flow'),
        PagingAggregator: require('./util/paging-aggregator'),
        promise: require('./util/promise'),
        commons: require('./util/commons')
    }
};
