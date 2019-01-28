import ClientStore from "./ClientStore";

type Props = {
  name: string;
  version: number;
  stores?: Array<any>;
  onerror: (event: any) => void;
};

export default class ClientDB {
  options: Props;
  db: any;
  stores: Array<any> = [];
  ref: any;

  constructor(options: Props) {
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

  _handleOpenFail(ev: any) {
    console.error(ev.errorCode, "Unable to open database");
  }

  _handleOpenSuccess(ev: any) {
    this.db = ev.target.result;
  }

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

  _init() {
    let { name, version, onerror, stores } = this.options;
    
    var request = indexedDB.open(name, version);
    request.onerror = onerror;
    request.onsuccess = this._handleOpenSuccess.bind(this);
    stores && (request.onupgradeneeded = this._handleStructureInitiate.bind(this));

    return this;
  }

  open(callback: (database: IDBDatabase) => any) {
    let { name, version, onerror } = this.options;

    var request = indexedDB.open(name, version);
    request.onerror = onerror;
    request.onsuccess = (ev: any) => {
      callback(request.result);
    };
    this.ref = request;
  }

  collect(name: string) {
    return new ClientStore(name, this.open.bind(this));
  }
}
