"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const subscriber_1 = __importDefault(require("./utils/subscriber"));
const Filter_1 = __importDefault(require("./Filter"));
class ClientStore {
    constructor(name, openDB) {
        this.openDB = openDB;
        this.ref = name;
        this.eventManager = new subscriber_1.default();
    }
    insert(record) {
        let data = Array.isArray(record) ? record : [record];
        var _vars = this;
        return new Promise((resolve, reject) => {
            _vars.openDB((db) => {
                var transaction = db.transaction(_vars.ref, "readwrite");
                var objStore = transaction.objectStore(_vars.ref);
                var latestRequest;
                data.forEach(item => {
                    latestRequest = objStore.add(item);
                });
                transaction.oncomplete = (ev) => {
                    resolve({
                        items: data,
                        changes: {
                            inserted: data.length,
                            updated: 0,
                            removed: 0,
                            unchange: 0
                        }
                    });
                };
                transaction.onerror = (ev) => {
                    reject({
                        items: data,
                        message: latestRequest.error
                    });
                };
            });
        });
    }
    remove(record) {
        let data = Array.isArray(record) ? record : [record];
        let _vars = this;
        return new Promise((resolve, reject) => {
            _vars.openDB((db) => {
                let transaction = db.transaction([_vars.ref], "readwrite");
                let objStore = transaction.objectStore(_vars.ref);
                let id, lastRequest;
                data.forEach((item) => {
                    if ((id = typeof item == "string" ? item
                        : typeof item == "object" && "_id" in item ? item._id
                            : false)) {
                        lastRequest = objStore.delete(id);
                    }
                    else {
                        throw Error(`Unable to delete ${item}`);
                    }
                });
                transaction.oncomplete = (ev) => {
                    resolve({
                        items: [],
                        changes: {
                            inserted: 0,
                            updated: 0,
                            removed: data.length,
                            unchange: 0
                        }
                    });
                };
                transaction.onerror = (ev) => {
                    reject({
                        items: data,
                        message: lastRequest.error
                    });
                };
            });
        });
    }
    update(id, changes) {
        let _vars = this;
        return new Promise((resolve, reject) => {
            _vars.openDB((db) => {
                let transaction = db.transaction([_vars.ref], "readwrite");
                let objStore = transaction.objectStore(_vars.ref);
                let request = objStore.get(id);
                request.onsuccess = function (event) {
                    // Get the old value that we want to update
                    var data = event.target.result;
                    if (data) {
                        Object.assign(data, changes);
                        // Put this updated object back into the database.
                        var requestUpdate = objStore.put(data);
                        requestUpdate.onerror = (ev) => reject(ev);
                        requestUpdate.onsuccess = (ev) => resolve(ev);
                    }
                    else {
                        reject({ message: `Record "${id}" not existed` });
                    }
                };
                request.onerror = (ev) => reject(ev);
            });
        });
    }
    openCursor(callback) {
        this.openDB(db => {
            var transaction = db.transaction(this.ref, "readonly");
            transaction.objectStore(this.ref).openCursor()
                .onsuccess = (ev) => {
                callback(ev.target.result);
            };
        });
    }
    filter(queries) {
        return new Filter_1.default({
            queries,
            openDB: this.openDB.bind(this),
            collection: this.ref
        });
    }
    get(key) {
        return new Promise((resolve, reject) => {
            this.openDB(db => {
                var transaction = db.transaction(this.ref, "readonly");
                var objectStore = transaction.objectStore(this.ref);
                var request = objectStore.get(key);
                request.onsuccess = (ev) => {
                    resolve(ev.target.result);
                };
                request.onerror = (err) => {
                    reject({
                        message: request.error
                    });
                };
            });
        });
    }
    removeAllRecords() {
        return new Promise((resolve, reject) => {
            this.openDB(db => {
                var objStore = db.transaction(this.ref, 'readwrite').objectStore(this.ref);
                var totalItems = objStore.count();
                var request = objStore.clear();
                request.onsuccess = (ev) => {
                    resolve({
                        items: [],
                        changes: {
                            removed: totalItems,
                            inserted: 0,
                            unchange: 0,
                            update: 0
                        }
                    });
                };
                request.onerror = (ev) => {
                    reject({
                        items: [],
                        message: request.error,
                        changes: {
                            removed: 0,
                            inserted: 0,
                            unchange: 0,
                            update: totalItems
                        }
                    });
                };
            });
        });
    }
}
exports.default = ClientStore;
