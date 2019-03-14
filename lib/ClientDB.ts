import ClientStore from "./ClientStore";

const defaultName = "__clientdb_default";

type Props = {
  name?: string;
  version?: number;
  stores: Array<any>;
  onerror?: (event: any) => void;
  onsuccess?: (event: any) => void;
};

/**
 * Implementation of ClientDB in TypeScript
 */
export default class ClientDB {
  db: any;
  ref: any;
  stores: { [name: string]: ClientStore } = {};
  options: Props;

  /**
   * Initiate ClientDB instance, setup and start indexedDB
   *
   * @returns {ClientDB}
   */
  constructor(options: Props) {
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
  _handleOpenFail(ev: any): void {
    console.error(ev.errorCode, "Unable to open database");
  }

  /**
   * Success handler when indexedDB open database successfully
   *
   * @returns {void}
   */
  _handleOpenSuccess(ev: any): void {
    this.db = ev.target.result;
  }

  /**
   * Setup structure based on user-predefined layout
   *
   * @returns {void}
   */
  _handleStructureInitiate(ev: any) {
    if (!ev.target) return;

    var db: IDBDatabase = ev.target.result;

    if (this.options.stores) {
      this.options.stores.forEach(
        (store: { name: string; keys: { [key: string]: boolean } }) => {
          let objStore: IDBObjectStore;
          if (!db.objectStoreNames.contains(store.name)) {
            objStore = db.createObjectStore(store.name, { keyPath: `_id` });
          } else {
            objStore = ev.target.transaction.objectStore(store.name);
          }

          Object.keys(store.keys).forEach((key: string) => {
            if (!objStore.indexNames.contains(key)) {
              objStore.createIndex(key, key, { unique: store.keys[key] });
            }
            // TODO: deleteIndex
          });
        }
      );
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

    this.options.stores.forEach((ss: { name: string }) => {
      this.stores[ss.name] = new ClientStore(ss.name, this.open.bind(this));
    });
    return this;
  }

  /**
   * Open database to perform any transaction
   *
   * @returns {void}
   */
  open(callback: (database: IDBDatabase) => any): void {
    let { name, version, onerror } = this.options;

    var request = indexedDB.open(name || defaultName, version);
    onerror && (request.onerror = onerror);
    request.onsuccess = (ev: any) => {
      callback(request.result);
    };
    this.ref = request;
  }

  /**
   * Select a collection to perform a transaction
   *
   * @returns {ClientStore}
   */
  collect(name: string): ClientStore {
    return this.stores[name]; //new ClientStore(name, this.open.bind(this));
  }

  /**
   * Remove database completely
   *
   * @returns {void}
   */
  destroy(): void {
    indexedDB.deleteDatabase(this.options.name || defaultName);
  }
}
