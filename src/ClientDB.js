"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ClientStore_1 = __importDefault(require("./ClientStore"));
const subscriber_1 = __importDefault(require("./utils/subscriber"));
const defaultName = "__clientdb_default";
/**
 * Implementation of ClientDB in TypeScript
 */
class ClientDB {
    /**
     * Initiate ClientDB instance, setup and start indexedDB
     *
     * @returns {ClientDB}
     */
    constructor(options) {
        this.stores = {};
        this.__openConnections = 0;
        /**
         * Erorr handler when indexedDB cannot open database
         *
         * @returns {void}
         */
        this._handleOpenFail = (ev) => {
            console.error(ev.errorCode, "Unable to open database");
            this.request = undefined;
        };
        this._handleOpenSuccess = (db) => {
            this.options.version = db.version;
            this.db = db;
            this.request = undefined;
            this.eventManager.fire("open", { db });
        };
        /**
         * Setup structure based on user-predefined layout
         *
         * @returns {void}
         */
        this._handleStructureInitiate = (ev) => {
            if (!ev.target)
                return;
            var db = ev.target.result;
            if (this.options.stores) {
                var transaction = ev.target.transaction;
                transaction.oncomplete = () => {
                    db.close();
                };
                this.options.stores.forEach((store) => {
                    let objStore;
                    if (!db.objectStoreNames.contains(store.name)) {
                        objStore = db.createObjectStore(store.name, {
                            keyPath: store.primaryKey || `_id`
                        });
                    }
                    else {
                        objStore = transaction.objectStore(store.name);
                    }
                    Object.keys(store.keys).forEach((key) => {
                        if (!objStore.indexNames.contains(key)) {
                            objStore.createIndex(key, key, { unique: store.keys[key].unique });
                        }
                    });
                });
            }
        };
        /**
         * Open database to perform any transaction
         *
         * @returns {void}
         */
        this.isOpening = false;
        this.closeConnection = () => {
            this.__openConnections--;
            if (this.__openConnections === 0 && this.db) {
                this.db.close();
                this.db = undefined;
            }
        };
        this.open = (callback) => {
            var fired = false;
            this.__openConnections++;
            if (this.db) {
                callback(this.db, this.closeConnection);
            }
            else {
                let _ = this;
                this.eventManager.subscribe("open", {
                    callback: (name, opts) => {
                        if (!fired) {
                            // @ts-ignore
                            _.db = opts.db;
                            callback(_.db, this.closeConnection);
                            fired = true;
                        }
                    },
                    once: true
                });
                if (!this.isOpening) {
                    let { name, onerror, onsuccess } = this.options;
                    let version = this.options.version > 1 ? this.options.version : undefined;
                    var request = indexedDB.open(name || defaultName, version);
                    this.request = request;
                    request.onerror = function (ev) {
                        onerror({ message: request.error });
                    };
                    request.onsuccess = (ev) => {
                        this.isOpening = false;
                        let db = ev.target.result;
                        onsuccess(db);
                        ev.target.result.onversionchange = () => {
                            db.close();
                        };
                    };
                    request.onupgradeneeded = this.onupgradeneeded;
                    request.onblocked = ev => {
                        console.warn("Open DB blocked");
                    };
                }
            }
        };
        // Update store indexes
        this.updateKeys = (storeName, keys) => {
            var _ = this;
            return new Promise((resolve, reject) => {
                var request = indexedDB.open(_.options.name, _.options.version + 1);
                _.request = request;
                request.onerror = function (ev) {
                    reject({ message: request.error });
                };
                request.onblocked = ev => {
                    console.warn("Operation is blocked");
                };
                request.onsuccess = (ev) => {
                    var version = ev.target.result.version;
                    this.options.version = version;
                    resolve({ version });
                    ev.target.result.close();
                };
                request.onupgradeneeded = function (ev) {
                    var transaction = ev.target.transaction;
                    let objStore = transaction.objectStore(storeName);
                    if (!objStore) {
                        reject({
                            message: `Collection ${storeName} not exists, use ".createStore(storeName, keys)" instead`
                        });
                    }
                    let currentIndexes = Array.from(objStore.indexNames);
                    currentIndexes.forEach((prop) => {
                        if (!keys[prop]) {
                            objStore.deleteIndex(prop);
                        }
                    });
                    Object.keys(keys).forEach((prop) => {
                        if (!objStore.indexNames.contains(prop)) {
                            objStore.createIndex(prop, prop, { unique: keys[prop].unique });
                        }
                    });
                };
            }); // end new Promise
        };
        this.onerror = (ev) => {
            this.options.onerror(this.request.error);
        };
        this.upgrade = () => {
            let ur = indexedDB.open(this.options.name, this.options.version + 1);
            this.request = ur;
            ur.onerror = this.onerror;
            ur.onsuccess = this.onsuccess;
            ur.onupgradeneeded = this.onupgradeneeded;
        };
        this.onsuccess = (ev) => {
            let db = ev.target.result;
            this.request = undefined;
            if (!this.options.allowUpdate) {
                this.options.allowUpdate = false;
                this.options.onsuccess(db);
                return;
            }
            db.close();
            let newKeys = this.options.stores;
            let upgradeNeeded = false;
            newKeys.some(prop => {
                if (db.objectStoreNames[prop] === undefined) {
                    upgradeNeeded = true;
                    return true;
                }
                return false;
            });
            if (!upgradeNeeded) {
                upgradeNeeded = newKeys.length != db.objectStoreNames.length;
            }
            if (upgradeNeeded) {
                this.upgrade();
            }
        };
        this.onupgradeneeded = (ev) => {
            let db = this.request.result;
            let newKeys = this.options.stores;
            let oldKeys = Array.from(db.objectStoreNames);
            if (db.version === 1) {
                newKeys.forEach(store => {
                    let objStore = db.createObjectStore(store.name, {
                        keyPath: store.primaryKey || "_id"
                    });
                    Object.keys(store.keys).forEach((key) => {
                        if (!objStore.indexNames.contains(key)) {
                            objStore.createIndex(key, key, { unique: store.keys[key].unique });
                        }
                    });
                });
            }
            else {
                newKeys.forEach(store => {
                    if (oldKeys.find(item => store.name === item)) {
                        let objStore = db.createObjectStore(store.name, {
                            keyPath: store.primaryKey || "_id"
                        });
                        Object.keys(store.keys).forEach((key) => {
                            if (!objStore.indexNames.contains(key)) {
                                objStore.createIndex(key, key, {
                                    unique: store.keys[key].unique
                                });
                            }
                        });
                    }
                });
                oldKeys.forEach(prop => {
                    if (newKeys.indexOf(prop) === -1) {
                        db.deleteObjectStore(prop);
                    }
                });
            }
            db.onversionchange = () => {
                db.close();
            };
        };
        this.options = Object.assign({
            allowUpdate: false,
            name: defaultName,
            version: 1,
            onerror: this._handleOpenFail,
            onsuccess: this._handleOpenSuccess
        }, options);
        this.options.stores.forEach((ss) => {
            this.stores[ss.name] = new ClientStore_1.default(ss.name, this.open.bind(this));
        });
        this.eventManager = new subscriber_1.default();
        var request = indexedDB.open(this.options.name);
        this.request = request;
        request.onerror = this.onerror;
        request.onsuccess = this.onsuccess;
        request.onupgradeneeded = this.onupgradeneeded;
    }
    removeStore(storeName) {
        var _ = this;
        return new Promise((resolve, reject) => {
            _.open((db, onComplete) => {
                let { name, version } = _.options;
                var request = indexedDB.open(name || defaultName, version + 1);
                this.request = request;
                request.onerror = function (ev) {
                    reject(request.error);
                    onComplete();
                };
                request.onsuccess = (ev) => {
                    ev.target.result.close();
                    delete this.stores[storeName];
                    resolve();
                    onComplete();
                };
                request.onupgradeneeded = function (ev) {
                    db.deleteObjectStore(storeName);
                    onComplete();
                };
            });
        });
    }
    createStore(storeName, keys) {
        var _ = this;
        return new Promise((resolve, reject) => {
            // let existStoreInfo = _.options.stores.find(
            //   store => store.name === storeName
            // );
            _.open((db, onComplete) => {
                var request = indexedDB.open(db.name, db.version + 1);
                this.request = request;
                request.onerror = function (ev) {
                    reject(request.error);
                    onComplete();
                };
                request.onblocked = ev => {
                    db.close();
                    console.log("Request blocked");
                };
                request.onsuccess = (ev) => {
                    ev.target.result.close();
                    this.stores[storeName] = new ClientStore_1.default(storeName, this.open.bind(this));
                    _.options.version = ev.target.result.version;
                    resolve();
                    onComplete();
                };
                request.onupgradeneeded = function (ev) {
                    let objStore = request.result.createObjectStore(storeName, {
                        keyPath: "_id"
                    });
                    if (keys) {
                        Object.keys(keys).forEach((key) => {
                            objStore.createIndex(key, key, { unique: keys[key].unique });
                        });
                    }
                    onComplete();
                };
            });
        });
    }
    /**
     * Select a collection to perform a transaction
     *
     * @returns {ClientStore}
     */
    collect(name) {
        return this.stores[name]; //new ClientStore(name, this.open.bind(this));
    }
    /**
     * Remove database completely
     *
     * @returns {void}
     */
    destroy() {
        indexedDB.deleteDatabase(this.options.name || defaultName);
    }
}
exports.default = ClientDB;
