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
        var _ = this;
        return new Promise((resolve, reject) => {
            _.openDB((db) => {
                var transaction = db.transaction(_.ref, "readwrite");
                var objStore = transaction.objectStore(_.ref);
                var latestRequest;
                data.forEach(item => {
                    latestRequest = objStore.add(item);
                });
                transaction.oncomplete = (ev) => {
                    var eventData = {
                        items: data,
                        changes: {
                            inserted: data.length,
                            updated: 0,
                            removed: 0,
                            unchange: 0
                        }
                    };
                    _.eventManager.fire("insert", eventData);
                    resolve(eventData);
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
        let data = [];
        // transform input into an array of id only
        if (Array.isArray(record)) {
            data = record.map(item => {
                return typeof item === "string" ? item : item._id;
            });
        }
        else {
            if (typeof record === "string") {
                data = [record];
            }
            else {
                data = [record._id];
            }
        }
        Array.isArray(record) ? record : [record];
        let _ = this;
        return new Promise((resolve, reject) => {
            _.openDB((db) => {
                let transaction = db.transaction([_.ref], "readwrite");
                let objStore = transaction.objectStore(_.ref);
                let id, lastRequest;
                data.forEach((id) => {
                    lastRequest = objStore.delete(id);
                });
                transaction.oncomplete = (ev) => {
                    const eventData = {
                        items: data,
                        changes: {
                            inserted: 0,
                            updated: 0,
                            removed: data.length,
                            unchange: 0
                        }
                    };
                    _.eventManager.fire("remove", eventData);
                    resolve(eventData);
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
        let _ = this;
        return new Promise((resolve, reject) => {
            _.openDB((db) => {
                let transaction = db.transaction([_.ref], "readwrite");
                let objStore = transaction.objectStore(_.ref);
                let request = objStore.get(id);
                request.onsuccess = function (event) {
                    // Get the old value that we want to update
                    var data = event.target.result;
                    if (data) {
                        Object.assign(data, changes);
                        // Put this updated object back into the database.
                        var requestUpdate = objStore.put(data);
                        requestUpdate.onerror = (ev) => reject(ev);
                        requestUpdate.onsuccess = (ev) => {
                            var eventData = {
                                items: [{ id, changes }],
                                changes: {
                                    updated: 1,
                                    inserted: 0,
                                    removed: 0,
                                    unchange: 0
                                }
                            };
                            _.eventManager.fire("update", eventData);
                            resolve(eventData);
                        };
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
            transaction.objectStore(this.ref).openCursor().onsuccess = (ev) => {
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
    records() {
        return new Promise((resolve, reject) => {
            this.openDB(db => {
                var transaction = db.transaction(this.ref, "readonly");
                var objectStore = transaction.objectStore(this.ref);
                var request = objectStore.getAll();
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
                var objStore = db
                    .transaction(this.ref, "readwrite")
                    .objectStore(this.ref);
                var totalItems = objStore.count();
                var request = objStore.clear();
                request.onsuccess = (ev) => {
                    var eventData = {
                        items: [],
                        changes: {
                            removed: objStore.indexNames.length,
                            inserted: 0,
                            unchange: 0,
                            update: 0
                        }
                    };
                    this.eventManager.fire("remove", eventData);
                    resolve(eventData);
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
    /**
     * Event subscriber
     */
    subscribe(eventName, callback) {
        this.eventManager.subscribe(eventName, { callback });
    }
    on(eventName, callback) {
        this.eventManager.subscribe(eventName, { callback });
    }
}
exports.default = ClientStore;
