"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const queryParser_1 = __importDefault(require("./utils/queryParser"));
class Filter {
    constructor(opts) {
        this.m_max = -1;
        this.m_page = -1;
        this.orders = [];
        this.openDB = opts.openDB;
        this.queries = queryParser_1.default(opts.queries);
        this.collection = opts.collection;
    }
    _openCursor(index, objectStore, keyRange) {
        return new Promise((resolve, reject) => {
            let request = objectStore.index(index).openCursor(keyRange);
            var results = {
                errors: [],
                items: []
            };
            request.onsuccess = (ev) => {
                var cursor = ev.target.result;
                if (cursor) {
                    results.items.push(cursor.value);
                    cursor.continue();
                }
                else {
                    resolve(results);
                }
            };
            request.onerror = (ev) => {
                var cursor = ev.target.result;
                if (cursor) {
                    results.errors.push(cursor.value);
                    cursor.continue();
                }
                else {
                    reject(results);
                }
            };
        });
    }
    // Iterate throw cursor with multiple key ranges
    // Usage for example filter with multiple condition
    _openCursorMultipleRange(index, objectStore, keyRanges, reducer) {
        function resolver(resolve, reject) {
            var results = [];
            var i = 0, numOfKeyRanges = keyRanges.length;
            function complete() {
                resolve(results);
            }
            function iterateSuccess(record) {
                if (i === numOfKeyRanges)
                    complete();
                results = reducer(results, record);
            }
            function iterateError(err) {
                console.error(err);
            }
            keyRanges.forEach(keyRange => {
                let request = objectStore.index(index).openCursor(keyRange);
                request.onsuccess = (ev) => iterateSuccess(ev.target.result);
                request.onerror = (ev) => iterateError(ev);
            });
        }
        return new Promise(resolver);
    }
    sort() {
        this.orders = Array.prototype.slice.call(arguments);
        return this;
    }
    max(max) {
        this.m_max = max;
        return this;
    }
    paging(page, max) {
        this.m_page = page;
        this.m_max = max;
        return this;
    }
    run() {
        let _ = this;
        return new Promise((resolve, reject) => {
            this.openDB((db, onComplete) => {
                let results = [];
                let errors = [];
                let transaction = db.transaction(_.collection, "readonly");
                transaction.oncomplete = ev => {
                    var seen = new Array(results.length);
                    var items = new Array(results.length);
                    var uniqueCount = 0;
                    results.forEach(item => {
                        if (seen.indexOf(item._id) == -1) {
                            items[uniqueCount] = item;
                            seen[uniqueCount++] = item.key;
                        }
                    });
                    items.splice(uniqueCount);
                    resolve({ items, errors });
                    onComplete();
                };
                transaction.onerror = ev => {
                    reject(errors);
                    onComplete();
                };
                transaction.onabort = ev => {
                    console.error("Transaction aborted");
                    onComplete();
                };
                let objectStore = transaction.objectStore(_.collection);
                _.queries.forEach(q => {
                    var keyRange;
                    if (q.eq) {
                        keyRange = IDBKeyRange.only(q.eq);
                    }
                    else if (q.range) {
                        keyRange = IDBKeyRange.bound(q.range.from, q.range.to);
                    }
                    else if (q.gt) {
                        keyRange = IDBKeyRange.upperBound(q.gt, false);
                    }
                    else if (q.gte) {
                        keyRange = IDBKeyRange.upperBound(q.gt, true);
                    }
                    else if (q.lt) {
                        keyRange = IDBKeyRange.lowerBound(q.lt, false);
                    }
                    else if (q.lte) {
                        keyRange = IDBKeyRange.lowerBound(q.lte, true);
                    }
                    else {
                        debugger;
                        throw Error(`Unable to parse ${q}`);
                    }
                    _._openCursor(q.property, objectStore, keyRange)
                        .then(result => {
                        if (Array.isArray(result.items)) {
                            results = results.concat(result.items);
                        }
                        else {
                            results.push(result.items);
                        }
                    })
                        .catch(error => {
                        errors.push({
                            property: q.property,
                            message: error.message
                        });
                    });
                });
            });
        });
    }
}
exports.default = Filter;
