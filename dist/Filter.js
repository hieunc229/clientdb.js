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
            request.onsuccess = (ev) => resolve(ev.target.result);
            request.onerror = (ev) => reject(ev);
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
        let _vars = this;
        return new Promise((resolve, reject) => {
            let completedTransaction = 0, maxTransaction = _vars.queries.length;
            let results = [];
            let errors = [];
            function transactionComplete() {
                var seen = new Array(results.length);
                var items = new Array(results.length);
                var uniqueCount = 0;
                results.forEach(item => {
                    if (seen.indexOf(item.key) == -1) {
                        items[uniqueCount] = item;
                        seen[uniqueCount++] = item.key;
                    }
                });
                items.splice(uniqueCount);
                resolve({ items, errors });
            }
            function transactionSuccess(result) {
                if (Array.isArray(result)) {
                    results = results.concat(result);
                }
                else {
                    results.push(result);
                }
                completedTransaction++;
                if (completedTransaction === maxTransaction) {
                    transactionComplete();
                }
            }
            function transactionError(err) {
                completedTransaction++;
                errors.push(err);
            }
            this.openDB((db) => {
                let objectStore = db
                    .transaction(_vars.collection, "readonly")
                    .objectStore(_vars.collection);
                _vars.queries.forEach(q => {
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
                    _vars._openCursor(q.property, objectStore, keyRange)
                        .then(rs => transactionSuccess(rs.value))
                        .catch(error => {
                        transactionError({
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
