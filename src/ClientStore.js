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
            _.openDB((db, onComplete) => {
                var transaction = db.transaction(_.ref, "readwrite");
                var objStore = transaction.objectStore(_.ref);
                var errors = [];
                var completedRequest = 0;
                data.forEach(item => {
                    var request = objStore.add(item);
                    request.onerror = ev => {
                        errors.push(request.error);
                    };
                    request.onsuccess = ev => {
                        completedRequest++;
                    };
                });
                transaction.oncomplete = (ev) => {
                    var eventData = {
                        errors: errors,
                        items: data,
                        changes: {
                            inserted: completedRequest,
                            updated: 0,
                            removed: 0,
                            unchange: data.length - completedRequest
                        }
                    };
                    _.eventManager.fire("insert", eventData);
                    resolve(eventData);
                    onComplete();
                };
                transaction.onerror = (ev) => {
                    reject({
                        errors: errors,
                        items: data,
                        message: transaction.error,
                        changes: {
                            inserted: completedRequest,
                            updated: 0,
                            removed: 0,
                            unchange: data.length - completedRequest
                        }
                    });
                    onComplete();
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
            _.openDB((db, onComplete) => {
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
                    onComplete();
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
            _.openDB((db, onComplete) => {
                let transaction = db.transaction([_.ref], "readwrite");
                var objStore = transaction.objectStore(_.ref);
                let request = objStore.get(id);
                transaction.oncomplete = ev => {
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
                    onComplete();
                };
                transaction.onerror = ev => {
                    reject({
                        error: request.error
                    });
                    onComplete();
                };
                request.onsuccess = function (event) {
                    // Get the old value that we want to update
                    var data = event.target.result;
                    if (data) {
                        Object.assign(data, changes);
                        // Put this updated object back into the database.
                        var requestUpdate = objStore.put(data);
                        requestUpdate.onerror = (ev) => reject(ev);
                        requestUpdate.onsuccess = (ev) => { };
                    }
                };
            });
        });
    }
    //TODO: return as promise
    openCursor() {
        let _ = this;
        return new Promise((resolve, reject) => {
            _.openDB((db, onComplete) => {
                var transaction = db.transaction(_.ref, "readonly");
                var request = transaction.objectStore(_.ref).openCursor();
                transaction.oncomplete = ev => {
                    onComplete();
                };
                transaction.onerror = ev => {
                    reject({ message: request.error });
                    onComplete();
                };
                request.onsuccess = (ev) => {
                    resolve({ cursor: ev.target.result, db, onComplete });
                };
                request.onerror = ev => {
                    reject({ message: request.error });
                };
            });
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
        let _ = this;
        return new Promise((resolve, reject) => {
            _.openDB((db, onComplete) => {
                var transaction = db.transaction(_.ref, "readonly");
                var objectStore = transaction.objectStore(_.ref);
                var request = objectStore.getAll();
                transaction.oncomplete = ev => {
                    onComplete();
                };
                transaction.onerror = ev => {
                    onComplete();
                };
                request.onsuccess = (ev) => {
                    let result = ev.target.result;
                    resolve(result);
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
        let _ = this;
        return new Promise((resolve, reject) => {
            _.openDB((db, onComplete) => {
                var transaction = db.transaction(_.ref, "readonly");
                var objectStore = transaction.objectStore(_.ref);
                var request = objectStore.get(key);
                transaction.oncomplete = ev => {
                    onComplete();
                };
                request.onsuccess = (ev) => {
                    let result = ev.target.result;
                    resolve(result);
                };
                request.onerror = (err) => {
                    reject({
                        message: request.error
                    });
                };
            });
        });
    }
    getAll(keys) {
        let _ = this;
        return new Promise((resolve, reject) => {
            _.openDB((db, onComplete) => {
                var transaction = db.transaction(_.ref, "readonly");
                var objectStore = transaction.objectStore(_.ref);
                var request = objectStore.openCursor();
                transaction.oncomplete = ev => {
                    onComplete();
                };
                var results = [];
                var cursor;
                request.onsuccess = (ev) => {
                    cursor = ev.target.result;
                    if (cursor) {
                        if (keys.indexOf(cursor.key) !== -1) {
                            results.push(cursor.value);
                        }
                        cursor.continue();
                    }
                    else {
                        resolve(results);
                    }
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
        let _ = this;
        return new Promise((resolve, reject) => {
            _.openDB((db, onComplete) => {
                var transaction = db.transaction(_.ref, "readwrite");
                var objStore = transaction.objectStore(_.ref);
                var totalItems = objStore.count();
                var request = objStore.clear();
                transaction.oncomplete = ev => {
                    onComplete();
                };
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
                    _.eventManager.fire("remove", eventData);
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
