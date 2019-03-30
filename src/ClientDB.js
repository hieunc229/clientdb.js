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
        /**
         * Open database to perform any transaction
         *
         * @returns {void}
         */
        this.isOpening = false;
        this.open = (callback) => {
            if (this.db)
                callback(this.db);
            var fired = false;
            this.eventManager.subscribe("open", {
                callback: () => {
                    if (!fired) {
                        // @ts-ignore
                        callback(this.db);
                        fired = true;
                    }
                },
                once: true
            });
            if (!this.isOpening) {
                let { name, version, onerror, onsuccess } = this.options;
                var request = indexedDB.open(name || defaultName, version);
                this.request = request;
                request.onerror = onerror;
                request.onsuccess = (ev) => {
                    this.isOpening = false;
                    onsuccess(ev.target.result);
                };
                request.onupgradeneeded = this.onupgradeneeded;
            }
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
            let db = ev.target.result;
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
            this.db = db;
        };
        this.options = Object.assign({
            allowUpdate: false,
            name: defaultName,
            version: 1,
            onerror: this._handleOpenFail.bind(this),
            onsuccess: this._handleOpenSuccess.bind(this)
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
    /**
     * Erorr handler when indexedDB cannot open database
     *
     * @returns {void}
     */
    _handleOpenFail(ev) {
        console.error(ev.errorCode, "Unable to open database");
    }
    _handleOpenSuccess(db) {
        this.db = db;
        this.options.version = db.version;
        this.request = undefined;
        this.eventManager.fire("open", null);
    }
    /**
     * Setup structure based on user-predefined layout
     *
     * @returns {void}
     */
    _handleStructureInitiate(ev) {
        if (!ev.target)
            return;
        var db = ev.target.result;
        if (this.options.stores) {
            this.options.stores.forEach((store) => {
                let objStore;
                if (!db.objectStoreNames.contains(store.name)) {
                    objStore = db.createObjectStore(store.name, {
                        keyPath: store.primaryKey || `_id`
                    });
                }
                else {
                    objStore = ev.target.transaction.objectStore(store.name);
                }
                Object.keys(store.keys).forEach((key) => {
                    if (!objStore.indexNames.contains(key)) {
                        objStore.createIndex(key, key, { unique: store.keys[key].unique });
                    }
                });
            });
        }
    }
    removeStore(storeName) {
        var _ = this;
        return new Promise((resolve, reject) => {
            _.open(db => {
                let { name, version } = _.options;
                var request = indexedDB.open(name || defaultName, version + 1);
                request.onerror = function (ev) {
                    reject(request.error);
                };
                request.onsuccess = (ev) => {
                    db = ev.target.result;
                    delete this.stores[storeName];
                    resolve(db);
                };
                request.onupgradeneeded = function (ev) {
                    db.deleteObjectStore(storeName);
                };
            });
        });
    }
    createStore(storeName, keys) {
        var _ = this;
        return new Promise((resolve, reject) => {
            let existStoreInfo = _.options.stores.find(store => store.name === storeName);
            _.open(db => {
                var request = indexedDB.open(db.name, db.version + 1);
                request.onerror = function (ev) {
                    reject(request.error);
                };
                request.onsuccess = (ev) => {
                    _.db = ev.target.result;
                    this.stores[storeName] = new ClientStore_1.default(storeName, this.open.bind(this));
                    resolve(db);
                };
                request.onupgradeneeded = function (ev) {
                    let objStore = db.createObjectStore(storeName, {
                        keyPath: existStoreInfo.primaryKey || "_id"
                    });
                    Object.keys(keys).forEach((key) => {
                        objStore.createIndex(key, key, { unique: keys[key].unique });
                    });
                };
            });
        });
    }
    updateKeys(storeName, keys) {
        var _ = this;
        if (this.db) {
            this.db.close();
        }
        return new Promise((resolve, reject) => {
            _.open(db => {
                var request = indexedDB.open(db.name, db.version + 1);
                request.onerror = function (ev) {
                    reject({ message: request.error });
                };
                request.onsuccess = (ev) => {
                    _.db = ev.target.result;
                    resolve(_.db);
                };
                request.onupgradeneeded = function (ev) {
                    let objStore = ev.target.transaction.objectStore(storeName);
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
