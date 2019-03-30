import ClientStore from "./ClientStore";
import EventSubscriber from "./utils/subscriber";

const defaultName = "__clientdb_default";

type Props = {
  name?: string;
  stores: StoreProps[];
  onerror?: (event: any) => void;
  onsuccess?: (event: any) => void;
  allowUpdate?: boolean;
};

type IKeys = {
  [name: string]: {
    unique: boolean;
    type: "number" | "string" | "ref" | "boolean";
  };
};

type StoreProps = { name: string; primaryKey?: string; keys: IKeys };

/**
 * Implementation of ClientDB in TypeScript
 */
export default class ClientDB {
  db?: IDBDatabase;
  ref: any;
  stores: { [name: string]: ClientStore } = {};
  options: {
    name: string;
    version: number;
    stores: Array<any>;
    onerror: (event: any) => void;
    onsuccess: (event: any) => void;
    allowUpdate?: boolean;
  };
  eventManager: EventSubscriber;
  /**
   * Initiate ClientDB instance, setup and start indexedDB
   *
   * @returns {ClientDB}
   */
  constructor(options: Props) {
    this.options = Object.assign(
      {
        allowUpdate: false,
        name: defaultName,
        version: 1,
        onerror: this._handleOpenFail.bind(this),
        onsuccess: this._handleOpenSuccess.bind(this)
      },
      options
    );

    this.options.stores.forEach((ss: { name: string }) => {
      this.stores[ss.name] = new ClientStore(ss.name, this.open.bind(this));
    });
    this.eventManager = new EventSubscriber();

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
  _handleOpenFail(ev: any): void {
    console.error(ev.errorCode, "Unable to open database");
  }

  /**
   * Success handler when indexedDB open database successfully
   *
   * @returns {void}
   */
  request: any;
  _handleOpenSuccess(db: IDBDatabase): void {
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
  _handleStructureInitiate(ev: any) {
    if (!ev.target) return;

    var db: IDBDatabase = ev.target.result;
    if (this.options.stores) {
      this.options.stores.forEach((store: StoreProps) => {
        let objStore: IDBObjectStore;
        if (!db.objectStoreNames.contains(store.name)) {
          objStore = db.createObjectStore(store.name, {
            keyPath: store.primaryKey || `_id`
          });
        } else {
          objStore = ev.target.transaction.objectStore(store.name);
        }

        Object.keys(store.keys).forEach((key: string) => {
          if (!objStore.indexNames.contains(key)) {
            objStore.createIndex(key, key, { unique: store.keys[key].unique });
          }
        });
      });
    }
  }

  /**
   * Open database to perform any transaction
   *
   * @returns {void}
   */
  isOpening = false;

  open = (callback: (database: IDBDatabase) => any): void => {
    if (this.db) callback(this.db);

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
      request.onsuccess = (ev: any) => {
        this.isOpening = false;
        onsuccess(ev.target.result);
      };
      request.onupgradeneeded = this.onupgradeneeded;
    }
  };

  removeStore(storeName: string) {
    var _ = this;
    return new Promise((resolve, reject) => {
      _.open(db => {
        let { name, version } = _.options;
        var request = indexedDB.open(name || defaultName, version + 1);
        request.onerror = function(ev) {
          reject(request.error);
        };
        request.onsuccess = (ev: any) => {
          db = ev.target.result;
          delete this.stores[storeName];
          resolve(db);
        };
        request.onupgradeneeded = function(ev) {
          db.deleteObjectStore(storeName);
        };
      });
    });
  }

  createStore(storeName: string, keys: IKeys) {
    var _ = this;
    return new Promise((resolve, reject) => {
      let existStoreInfo = _.options.stores.find(
        store => store.name === storeName
      );

      _.open(db => {
        var request = indexedDB.open(db.name, db.version + 1);
        request.onerror = function(ev) {
          reject(request.error);
        };

        request.onsuccess = (ev: any) => {
          _.db = ev.target.result;
          this.stores[storeName] = new ClientStore(
            storeName,
            this.open.bind(this)
          );
          resolve(db);
        };

        request.onupgradeneeded = function(ev) {
          let objStore = db.createObjectStore(storeName, {
            keyPath: existStoreInfo.primaryKey || "_id"
          });

          Object.keys(keys).forEach((key: string) => {
            objStore.createIndex(key, key, { unique: keys[key].unique });
          });
        };
      });
    });
  }

  updateKeys(storeName: string, keys: IKeys): Promise<any> {
    var _ = this;
    if (this.db) {
      this.db.close();
    }
    return new Promise((resolve, reject) => {
      _.open(db => {
        var request = indexedDB.open(db.name, db.version + 1);

        request.onerror = function(ev) {
          reject({ message: request.error });
        };

        request.onsuccess = (ev: any) => {
          _.db = ev.target.result;
          resolve(_.db);
        };

        request.onupgradeneeded = function(ev: any) {
          let objStore = ev.target.transaction.objectStore(storeName);
          if (!objStore) {
            reject({
              message: `Collection ${storeName} not exists, use ".createStore(storeName, keys)" instead`
            });
          }
          let currentIndexes = Array.from(objStore.indexNames);

          currentIndexes.forEach((prop: any) => {
            if (!keys[prop]) {
              objStore.deleteIndex(prop);
            }
          });

          Object.keys(keys).forEach((prop: string) => {
            if (!objStore.indexNames.contains(prop)) {
              objStore.createIndex(prop, prop, { unique: keys[prop].unique });
            }
          });
        };
      });
    });
  }

  onerror = (ev: any) => {
    this.options.onerror(this.request.error);
  };

  upgrade = () => {
    let ur = indexedDB.open(this.options.name, this.options.version + 1);
    this.request = ur;
    ur.onerror = this.onerror;
    ur.onsuccess = this.onsuccess;
    ur.onupgradeneeded = this.onupgradeneeded;
  };

  onsuccess = (ev: any) => {
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

  onupgradeneeded = (ev: any) => {
    let db = ev.target.result;

    let newKeys = this.options.stores;
    let oldKeys: string[] = Array.from(db.objectStoreNames);
    if (db.version === 1) {
      newKeys.forEach(store => {
        let objStore = db.createObjectStore(store.name, {
          keyPath: store.primaryKey || "_id"
        });

        Object.keys(store.keys).forEach((key: string) => {
          if (!objStore.indexNames.contains(key)) {
            objStore.createIndex(key, key, { unique: store.keys[key].unique });
          }
        });
      });
    } else {
      newKeys.forEach(store => {
        if (oldKeys.find(item => store.name === item)) {
          let objStore = db.createObjectStore(store.name, {
            keyPath: store.primaryKey || "_id"
          });

          Object.keys(store.keys).forEach((key: string) => {
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
