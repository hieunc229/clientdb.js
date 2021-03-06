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
  __openConnections = 0;
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
        onerror: this._handleOpenFail,
        onsuccess: this._handleOpenSuccess
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
  _handleOpenFail = (ev: any) => {
    console.error(ev.errorCode, "Unable to open database");
    this.request = undefined;
  };

  /**
   * Success handler when indexedDB open database successfully
   *
   * @returns {void}
   */
  request: any;
  _handleOpenSuccess = (db: IDBDatabase) => {
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
  _handleStructureInitiate = (ev: any) => {
    if (!ev.target) return;

    var db: IDBDatabase = ev.target.result;
    if (this.options.stores) {
      var transaction = ev.target.transaction;
      transaction.oncomplete = () => {
        db.close();
      };
      this.options.stores.forEach((store: StoreProps) => {
        let objStore: IDBObjectStore;
        if (!db.objectStoreNames.contains(store.name)) {
          objStore = db.createObjectStore(store.name, {
            keyPath: store.primaryKey || `_id`
          });
        } else {
          objStore = transaction.objectStore(store.name);
        }

        Object.keys(store.keys).forEach((key: string) => {
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
  isOpening = false;

  closeConnection = () => {
    this.__openConnections--;
    if (this.__openConnections === 0 && this.db) {
      this.db.close();
      this.db = undefined;
    }
  };

  open = (callback: (db: IDBDatabase, onComplete: Function) => any): void => {
    var fired = false;
    this.__openConnections++;

    if (this.db) {
      callback(this.db, this.closeConnection);
    } else {
      let _ = this;
      this.eventManager.subscribe("open", {
        callback: (name: string, opts: { db: IDBDatabase }) => {
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
        let version =
          this.options.version > 1 ? this.options.version : undefined;

        var request = indexedDB.open(name || defaultName, version);
        this.request = request;
        request.onerror = function(ev) {
          onerror({ message: request.error });
        };
        request.onsuccess = (ev: any) => {
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

  removeStore(storeName: string) {
    var _ = this;
    return new Promise((resolve, reject) => {
      _.open((db, onComplete) => {
        let { name, version } = _.options;
        var request = indexedDB.open(name || defaultName, version + 1);
        this.request = request;
        request.onerror = function(ev) {
          reject(request.error);
          onComplete();
        };
        request.onsuccess = (ev: any) => {
          ev.target.result.close();
          delete this.stores[storeName];
          resolve();
          onComplete();
        };
        request.onupgradeneeded = function(ev) {
          db.deleteObjectStore(storeName);
          onComplete();
        };
      });
    });
  }

  createStore(storeName: string, keys: IKeys): Promise<any> {
    var _ = this;
    return new Promise((resolve, reject) => {
      // let existStoreInfo = _.options.stores.find(
      //   store => store.name === storeName
      // );
      _.open((db, onComplete) => {
        var request = indexedDB.open(db.name, db.version + 1);
        this.request = request;
        request.onerror = function(ev) {
          reject(request.error);
          onComplete();
        };

        request.onblocked = ev => {
          db.close();
          console.log("Request blocked");
        };

        request.onsuccess = (ev: any) => {
          ev.target.result.close();
          this.stores[storeName] = new ClientStore(
            storeName,
            this.open.bind(this)
          );
          _.options.version = ev.target.result.version;
          resolve();
          onComplete();
        };

        request.onupgradeneeded = function(ev) {
          let objStore = request.result.createObjectStore(storeName, {
            keyPath: "_id"
          });

          if (keys) {
            Object.keys(keys).forEach((key: string) => {
              objStore.createIndex(key, key, { unique: keys[key].unique });
            });
          }
          onComplete();
        };
      });
    });
  }

  // Update store indexes
  updateKeys = (storeName: string, keys: IKeys): Promise<any> => {
    var _ = this;
    return new Promise((resolve, reject) => {
      var request = indexedDB.open(_.options.name, _.options.version + 1);
      _.request = request;

      request.onerror = function(ev) {
        reject({ message: request.error });
      };

      request.onblocked = ev => {
        console.warn("Operation is blocked");
      };

      request.onsuccess = (ev: any) => {
        var version = ev.target.result.version;
        this.options.version = version;
        resolve({ version });
        ev.target.result.close();
      };

      request.onupgradeneeded = function(ev: any) {
        var transaction = ev.target.transaction;
        let objStore = transaction.objectStore(storeName);
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
    }); // end new Promise
  };

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
    let db: IDBDatabase = ev.target.result;
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
    let db = this.request.result;
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

    db.onversionchange = () => {
      db.close();
    };
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
