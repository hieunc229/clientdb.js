import EventSubscriber from "./utils/subscriber";
import Filter from './Filter';

type IRecord = { [key: string]: any };
type IError = { property: string, message: string };
type IResult = {
  items: Array<IRecord>,
  error?: Array<IError>,
  changes?: {
    inserted: number,
    deleted: number,
    updated: number,
    unchange: number
  }
}

export default class ClientStore {
  openDB: (callback: (db: IDBDatabase) => any) => any;
  ref: string;
  eventManager: EventSubscriber;

  constructor(
    name: string,
    openDB: (callback: (db: IDBDatabase) => any) => any
  ) {
    this.openDB = openDB;
    this.ref = name;
    this.eventManager = new EventSubscriber();
  }

  insert(record: Array<Object> | Object): Promise<IResult> {
    let data = Array.isArray(record) ? record : [record];
    var _vars = this;
    return new Promise((resolve: Function, reject: Function) => {
      
      _vars.openDB((db: IDBDatabase) => {
        let transaction = db.transaction([_vars.ref], "readwrite");
        let objStore = transaction.objectStore(_vars.ref);

        data.forEach(item => {
          objStore.add(item);
        });
        transaction.oncomplete = (ev: any) => resolve(ev);
        transaction.onerror = (ev: any) => reject(ev);
      });
    });
  }

  remove(record: Array<{}> | Object | string) : Promise<IResult> {
    let data = Array.isArray(record) ? record : [record];
    let _vars = this;

    return new Promise((resolve: Function, reject: Function) => {
      _vars.openDB((db: IDBDatabase) => {
        let transaction = db.transaction([_vars.ref], "readwrite");
        let objStore = transaction.objectStore(_vars.ref);
        let id;

        data.forEach((item: any) => {
          if ((id = typeof item == "string" ? item
                : typeof item == "object" && "_id" in item ? item._id
                : false)
          ) {
            objStore.delete(id);
          } else {
            throw Error(`Unable to delete ${item}`);
          }
        });

        transaction.oncomplete = (ev: any) => resolve(ev);
        transaction.onerror = (ev: any) => reject(ev);
      });
    });
  }

  update(id: string, changes: Object) : Promise<IResult> {
    let _vars = this;
    return new Promise((resolve: Function, reject: Function) => {
      _vars.openDB((db: IDBDatabase) => {
        let transaction = db.transaction([_vars.ref], "readwrite");
        let objStore = transaction.objectStore(_vars.ref);
        let request = objStore.get(id);

        request.onsuccess = function(event: any) {
          // Get the old value that we want to update
          var data = event.target.result;

          if (data) {
            Object.assign(data, changes);

            // Put this updated object back into the database.
            var requestUpdate = objStore.put(data);
            requestUpdate.onerror = (ev: any) => reject(ev);
            requestUpdate.onsuccess = (ev: any) => resolve(ev);
          } else {
            reject({ message: `Record "${id}" not existed` })
          }
        };
        request.onerror = (ev: any) => reject(ev);
      });
    });
  }

  openCursor(callback: (cursor: any) => any) {
    this.openDB(db => {
      var transaction = db.transaction(this.ref, "readonly");
      transaction.objectStore(this.ref).openCursor()
      .onsuccess = (ev: any) => {
        callback(ev.target.result);
      }
    })
  }

  filter(queries: { [key: string]: any}) : Filter {
    return new Filter({ 
        queries, 
        openDB: this.openDB.bind(this), 
        collection: this.ref
      });
  }
}
