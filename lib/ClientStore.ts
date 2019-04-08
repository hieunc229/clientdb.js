import EventSubscriber from "./utils/subscriber";
import Filter from "./Filter";

type IRecord = { [key: string]: any };
type IError = { property: string; message: string };
type ChangesInterface = {
  removed: number;
  inserted: number;
  unchange: number;
  update: number;
};
type IResult = {
  items: Array<IRecord>;
  error?: Array<IError>;
  changes?: ChangesInterface;
};

export default class ClientStore {
  openDB: (callback: (db: IDBDatabase, onComplete: Function) => any) => any;
  ref: string;
  eventManager: EventSubscriber;

  constructor(
    name: string,
    openDB: (callback: (db: IDBDatabase, onComplete: Function) => any) => any
  ) {
    this.openDB = openDB;
    this.ref = name;
    this.eventManager = new EventSubscriber();
  }

  insert(record: Array<Object> | Object): Promise<IResult> {
    let data = Array.isArray(record) ? record : [record];
    var _ = this;

    return new Promise((resolve: Function, reject: Function) => {
      _.openDB((db: IDBDatabase, onComplete) => {
        var transaction = db.transaction(_.ref, "readwrite");
        var objStore = transaction.objectStore(_.ref);
        var latestRequest: IDBRequest;
        data.forEach(item => {
          latestRequest = objStore.add(item);
        });
        transaction.oncomplete = (ev: any) => {
          var eventData = {
            items: data,
            changes: {
              inserted: data.length,
              updated: 0,
              removed: 0,
              unchange: 0
            }
          };
          _.eventManager.fire("insert", eventData);
          resolve(eventData);
          onComplete();
        };
        transaction.onerror = (ev: Event) => {
          reject({
            items: data,
            message: transaction.error
          });
        };
      });
    });
  }

  remove(
    record: Array<{ _id: string }> | { _id: string } | string
  ): Promise<IResult> {
    let data: any[] = [];

    // transform input into an array of id only
    if (Array.isArray(record)) {
      data = record.map(item => {
        return typeof item === "string" ? item : item._id;
      });
    } else {
      if (typeof record === "string") {
        data = [record];
      } else {
        data = [record._id];
      }
    }
    Array.isArray(record) ? record : [record];
    let _ = this;

    return new Promise((resolve: Function, reject: Function) => {
      _.openDB((db: IDBDatabase, onComplete) => {
        let transaction = db.transaction([_.ref], "readwrite");
        let objStore = transaction.objectStore(_.ref);
        let id, lastRequest: IDBRequest;

        data.forEach((id: string) => {
          lastRequest = objStore.delete(id);
        });

        transaction.oncomplete = (ev: any) => {
          const eventData = {
            items: data,
            changes: {
              inserted: 0,
              updated: 0,
              removed: data.length,
              unchange: 0
            }
          };
          _.eventManager.fire("remove", eventData);
          resolve(eventData);
          onComplete();
        };
        transaction.onerror = (ev: Event) => {
          reject({
            items: data,
            message: lastRequest.error
          });
        };
      });
    });
  }

  update(id: string, changes: Object): Promise<IResult> {
    let _ = this;
    return new Promise((resolve: Function, reject: Function) => {
      _.openDB((db: IDBDatabase, onComplete) => {
        let transaction = db.transaction([_.ref], "readwrite");
        let objStore = transaction.objectStore(_.ref);
        let request = objStore.get(id);

        request.onsuccess = function(event: any) {
          // Get the old value that we want to update
          var data = event.target.result;

          if (data) {
            Object.assign(data, changes);

            // Put this updated object back into the database.
            var requestUpdate = objStore.put(data);
            requestUpdate.onerror = (ev: any) => reject(ev);

            requestUpdate.onsuccess = (ev: any) => {
              var eventData = {
                items: [{ id, changes }],
                changes: {
                  updated: 1,
                  inserted: 0,
                  removed: 0,
                  unchange: 0
                }
              };
              _.eventManager.fire("update", eventData);

              resolve(eventData);
              onComplete();
            };
          } else {
            reject({ message: `Record "${id}" not existed` });
          }
        };
        request.onerror = (ev: any) => {
          reject(request.error);
        };
      });
    });
  }

  //TODO: return as promise
  openCursor(callback: (cursor: any, db: IDBDatabase) => any) {
    this.openDB((db, onComplete) => {
      var transaction = db.transaction(this.ref, "readonly");
      transaction.objectStore(this.ref).openCursor().onsuccess = (ev: any) => {
        callback(ev.target.result, db);
      };
    });
  }

  filter(queries: { [key: string]: any }): Filter {
    return new Filter({
      queries,
      openDB: this.openDB.bind(this),
      collection: this.ref
    });
  }

  records(): Promise<any> {
    return new Promise((resolve: Function, reject: Function) => {
      this.openDB((db, onComplete) => {
        var transaction = db.transaction(this.ref, "readonly");
        var objectStore = transaction.objectStore(this.ref);
        var request = objectStore.getAll();

        request.onsuccess = (ev: any) => {
          let result = ev.target.result;

          resolve(result);
          onComplete();
        };

        request.onerror = (err: any) => {
          reject({
            message: request.error
          });
        };
      });
    });
  }

  get(key: any): Promise<any> {
    return new Promise((resolve: Function, reject: Function) => {
      this.openDB((db, onComplete) => {
        var transaction = db.transaction(this.ref, "readonly");
        var objectStore = transaction.objectStore(this.ref);
        var request = objectStore.get(key);

        request.onsuccess = (ev: any) => {
          let result = ev.target.result;

          resolve(result);
          onComplete();
        };

        request.onerror = (err: any) => {
          reject({
            message: request.error
          });
        };
      });
    });
  }

  getAll(keys: string[]): Promise<any> {
    return new Promise((resolve: Function, reject: Function) => {
      this.openDB((db, onComplete) => {
        var transaction = db.transaction(this.ref, "readonly");
        var objectStore = transaction.objectStore(this.ref);
        var request = objectStore.openCursor();

        var results: any[] = [];
        var cursor;
        request.onsuccess = (ev: any) => {
          cursor = ev.target.result;
          if (cursor) {
            if (keys.indexOf(cursor.key) !== -1) {
              results.push(cursor.value);
            }
            cursor.continue();
          } else {
            resolve(results);
            onComplete();
          }
        };

        request.onerror = (err: any) => {
          reject({
            message: request.error
          });
        };
      });
    });
  }

  removeAllRecords(): Promise<IResult> {
    return new Promise((resolve: Function, reject: Function) => {
      this.openDB((db, onComplete) => {
        var objStore = db
          .transaction(this.ref, "readwrite")
          .objectStore(this.ref);
        var totalItems = objStore.count();
        var request = objStore.clear();
        request.onsuccess = (ev: Event) => {
          var eventData = {
            items: [],
            changes: {
              removed: objStore.indexNames.length,
              inserted: 0,
              unchange: 0,
              update: 0
            }
          };
          this.eventManager.fire("remove", eventData);
          resolve(eventData);
          onComplete();
        };

        request.onerror = (ev: Event) => {
          reject({
            items: [],
            message: request.error,
            changes: {
              removed: 0,
              inserted: 0,
              unchange: 0,
              update: totalItems
            }
          });
        };
      });
    });
  }

  /**
   * Event subscriber
   */
  subscribe(
    eventName: "insert" | "remove" | "update" | "changes" | "removeAll",
    callback: (event: string, changes: Array<object>) => void
  ): void {
    this.eventManager.subscribe(eventName, { callback });
  }

  on(
    eventName: "insert" | "remove" | "update" | "changes" | "removeAll",
    callback: (event: string, changes: Array<object>) => void
  ): void {
    this.eventManager.subscribe(eventName, { callback });
  }
}
