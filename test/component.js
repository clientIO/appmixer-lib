'use strict';
const expect = require('chai').expect;
const componentUtils = require('../util/component');

// some helpers
function generateLoremIpsumList(offset, length) {

    const lorem = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' +
        'Maecenas tristique congue pharetra. Cras pharetra varius diam, quis ' +
        'euismod dolor elementum vestibulum. Quisque ornare dignissim enim, ' +
        'sed ornare est suscipit et. Suspendisse sodales lorem quis quam suscipit ' +
        'convallis id a dolor. Mauris efficitur lacinia eros, ut malesuada augue consectetur eu.';
    const loremArr = lorem.split(' ');

    const list = [];
    for (let i = 0; i < length; i++) {
        list.push({
            _id: i,
            tag: loremArr[i + offset],
            flag: loremArr[6][i % loremArr[6].length],
            tstamp: new Date()
        });
    }

    return list;
}

function clone(list) {
    return JSON.parse(JSON.stringify(list));
}

describe('component utils', () => {

    const LIST_SIZE = 8;

    // define some testing objects
    const listPhase1 = generateLoremIpsumList(0, LIST_SIZE);

    let listPhase2 = clone(listPhase1);

    listPhase2[1].tag = 'changedTag';
    listPhase2[3].tag = 'anotherChangedTag';
    listPhase2[4].tstamp = `${new Date()}`;
    // remove first and last item
    listPhase2.pop();
    listPhase2.shift();
    // add new one
    listPhase2.push({
        _id: 666,
        tag: 'noTag',
        flag: 'x',
        tstamp: new Date()
    });

    let state = [];

    describe('createMappingFunctionFromCSV', () => {

        it('should map one item to another using CSV white/black list', () => {

            const original = {
                item: {
                    list: [
                        { tag: 'foo' },
                        { tag: 'bar' },
                        { tag: 'baz' }
                    ],
                    id: {
                        uid: 42,
                        tstamp: new Date()
                    }
                },
                almostEvil: 665,
                evil: 666
            };
            const mappingCsv = 'evil, item, -item.id.tstamp, -item.list.[2]';
            const expected = {
                item: {
                    list: [
                        { tag: 'foo' },
                        { tag: 'bar' }
                    ],
                    id: {
                        uid: 42
                    }
                },
                evil: 666
            };

            const mappingFunction = componentUtils.createMappingFunctionFromCSV(mappingCsv);

            expect(mappingFunction).to.be.a('function');

            const result = mappingFunction(original);

            expect(result).to.deep.equal(expected);

        });
    });

    describe('checkListForChanges', () => {

        it('should build new state and find 8 new items', () => {

            const {
                changes,
                newState
            } = componentUtils.checkListForChanges(listPhase1, state, '_id',
                {
                    // omit timestamp
                    mappingFunction: ({ _id, tag, flag }) => ({ _id, tag, flag }),
                    includeOldData: true
                });

            // new state should contain all items
            expect(newState.length).to.equal(LIST_SIZE);
            // expect 8 changes, all to be of state 'new'
            expect(changes.filter(ch => ch.state === 'new').length).to.equal(LIST_SIZE);

            state = newState;
        });

        it('should find 2 new, 2 changed and 1 removed item', () => {

            const {
                changes,
                newState
            } = componentUtils.checkListForChanges(listPhase2, state, '_id',
                {
                    // omit timestamp
                    mappingFunction: ({ _id, tag, flag }) => ({ _id, tag, flag }),
                    includeOldData: true
                });

            // test changes
            const expected = [[1, 'changed'], [3, 'changed'], [666, 'new'], [0, 'removed'], [7, 'removed']];
            // compare to expectation
            const result = changes.filter((ch, i) => {
                if (ch.state !== expected[i][1]) {
                    // if state does not match = error, filter out
                    return false;
                }
                if (ch.state === 'removed') {
                    return ch.oldItem._id === expected[i][0];
                }
                return ch.item['_id'] === expected[i][0];
            });
            expect(result.length).to.equal(expected.length);

            // test state
            // do we have items from the list in new state?
            const filteredState = newState.filter(([id], i) => id === listPhase2[i]._id);

            expect(filteredState.length).to.equal(listPhase2.length);

            state = newState;
        });
    });
});
