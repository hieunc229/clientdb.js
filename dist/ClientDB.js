"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ClientStore_1 = __importDefault(require("./ClientStore"));
class ClientDB {
    constructor(options) {
        this.stores = [];
        var name = "__clientdb_default";
        var version = 1;
        var onerror = this._handleOpenFail.bind(this);
        if (options) {
            options.name && (name = options.name);
            options.version && (version = options.version);
            options.onerror && (onerror = options.onerror);
        }
        this.options = { name, version, onerror, stores: options.stores };
        this._init();
    }
    _handleOpenFail(ev) {
        console.error(ev.errorCode, "Unable to open database");
    }
    _handleOpenSuccess(ev) {
        this.db = ev.target.result;
    }
    _handleStructureInitiate(ev) {
        var db = ev.target.result;
        if (this.options.stores) {
            this.options.stores.forEach((store) => {
                let objStore = db.createObjectStore(store.name, { keyPath: `_id` });
                Object.keys(store.keys).forEach((key) => {
                    objStore.createIndex(key, key, { unique: store.keys[key] });
                });
            });
        }
    }
    _init() {
        let { name, version, onerror, stores } = this.options;
        var request = indexedDB.open(name, version);
        request.onerror = onerror;
        request.onsuccess = this._handleOpenSuccess.bind(this);
        stores && (request.onupgradeneeded = this._handleStructureInitiate.bind(this));
        return this;
    }
    open(callback) {
        let { name, version, onerror } = this.options;
        var request = indexedDB.open(name, version);
        request.onerror = onerror;
        request.onsuccess = (ev) => {
            callback(request.result);
        };
        this.ref = request;
    }
    collect(name) {
        return new ClientStore_1.default(name, this.open.bind(this));
    }
}
exports.default = ClientDB;
