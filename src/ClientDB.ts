import ClientStore from "./ClientStore";

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
  options: any;
  db: any;
  stores: Array<any> = [];
  ref: any;

  /**
   * Initiate ClientDB instance, setup and start indexedDB
   * 
   * @returns {ClientDB}
   */
  constructor(options: Props) {
    var name = "__clientdb_default";
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
  _handleOpenFail(ev: any) : void {
    console.error(ev.errorCode, "Unable to open database");
  }

  /**
   * Success handler when indexedDB open database successfully
   * 
   * @returns {void}
   */
  _handleOpenSuccess(ev: any) : void {
    this.db = ev.target.result;
  }

  /**
   * Setup structure based on user-predefined layout
   * 
   * @returns {void}
   */
  _handleStructureInitiate(ev: any) {
    var db = ev.target.result;

    if (this.options.stores) {
      this.options.stores.forEach(
        (store: { name: string; keys: { [key: string]: boolean } }) => {
          let objStore = db.createObjectStore(store.name, { keyPath: `_id` });

          Object.keys(store.keys).forEach((key: string) => {
            objStore.createIndex(key, key, { unique: store.keys[key] });
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

    var request = indexedDB.open(name, version);
    request.onerror = onerror;
    request.onsuccess = this._handleOpenSuccess.bind(this);
    stores &&
      (request.onupgradeneeded = this._handleStructureInitiate.bind(this));

    return this;
  }

  /**
   * Open database to perform any transaction
   * 
   * @returns {void}
   */
  open(callback: (database: IDBDatabase) => any) : void {
    let { name, version, onerror } = this.options;

    var request = indexedDB.open(name, version);
    request.onerror = onerror;
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
  collect(name: string) : ClientStore {
    return new ClientStore(name, this.open.bind(this));
  }
}
