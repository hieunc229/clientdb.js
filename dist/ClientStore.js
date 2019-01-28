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
                let transaction = db.transaction([_vars.ref], "readwrite");
                let objStore = transaction.objectStore(_vars.ref);
                data.forEach(item => {
                    objStore.add(item);
                });
                transaction.oncomplete = (ev) => resolve(ev);
                transaction.onerror = (ev) => reject(ev);
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
                let id;
                data.forEach((item) => {
                    if ((id = typeof item == "string" ? item
                        : typeof item == "object" && "_id" in item ? item._id
                            : false)) {
                        objStore.delete(id);
                    }
                    else {
                        throw Error(`Unable to delete ${item}`);
                    }
                });
                transaction.oncomplete = (ev) => resolve(ev);
                transaction.onerror = (ev) => reject(ev);
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
}
exports.default = ClientStore;
