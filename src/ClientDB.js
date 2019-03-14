"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ClientStore_1 = __importDefault(require("./ClientStore"));
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
        var name = defaultName;
        var version = 1;
        var onerror = this._handleOpenFail.bind(this);
        var onsuccess = this._handleOpenSuccess.bind(this);
        if (options) {
            options.name && (name = options.name);
            options.version && (version = options.version);
            options.onerror && (onerror = options.onerror);
            options.onsuccess && (onsuccess = options.onsuccess);
        }
        this.options = {
            name,
            version,
            onerror,
            onsuccess,
            stores: options.stores
        };
        this._init();
    }
    /**
     * Erorr handler when indexedDB cannot open database
     *
     * @returns {void}
     */
    _handleOpenFail(ev) {
        console.error(ev.errorCode, "Unable to open database");
    }
    /**
     * Success handler when indexedDB open database successfully
     *
     * @returns {void}
     */
    _handleOpenSuccess(ev) {
        this.db = ev.target.result;
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
                    objStore = db.createObjectStore(store.name, { keyPath: `_id` });
                }
                else {
                    objStore = ev.target.transaction.objectStore(store.name);
                }
                Object.keys(store.keys).forEach((key) => {
                    if (!objStore.indexNames.contains(key)) {
                        objStore.createIndex(key, key, { unique: store.keys[key] });
                    }
                    // TODO: deleteIndex
                });
            });
        }
    }
    /**
     * First open indexedDB instance, restructure layout if needed
     * To update layout, increment `version` property when create database by 1 (and must be an int)
     *
     * @returns {void}
     */
    _init() {
        let { name, version, onerror, stores } = this.options;
        var request = indexedDB.open(name || defaultName, version);
        onerror && (request.onerror = onerror);
        request.onsuccess = this._handleOpenSuccess.bind(this);
        stores &&
            (request.onupgradeneeded = this._handleStructureInitiate.bind(this));
        this.options.stores.forEach((ss) => {
            this.stores[ss.name] = new ClientStore_1.default(ss.name, this.open.bind(this));
        });
        return this;
    }
    /**
     * Open database to perform any transaction
     *
     * @returns {void}
     */
    open(callback) {
        let { name, version, onerror } = this.options;
        var request = indexedDB.open(name || defaultName, version);
        onerror && (request.onerror = onerror);
        request.onsuccess = (ev) => {
            callback(request.result);
        };
        this.ref = request;
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
