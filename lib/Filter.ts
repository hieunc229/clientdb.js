import parseQuery, { IObjectQuery } from "./utils/queryParser";

type IFilter = {
  queries: { [key: string]: any };
  openDB: (callback: (db: IDBDatabase, onComplete: Function) => void) => void;
  collection: string;
};

export default class Filter {
  openDB: (callback: (db: IDBDatabase, onComplete: Function) => any) => any;
  queries: Array<IObjectQuery>;
  m_max = -1;
  m_page = -1;
  orders: Array<string> = [];
  collection: string;

  constructor(opts: IFilter) {
    this.openDB = opts.openDB;
    this.queries = parseQuery(opts.queries);
    this.collection = opts.collection;
  }

  _openCursor(
    index: string,
    objectStore: IDBObjectStore,
    keyRange: IDBKeyRange
  ): Promise<any> {
    return new Promise((resolve: Function, reject: Function) => {
      let request = objectStore.index(index).openCursor(keyRange);
      var results: {
        errors: { [key: string]: any }[];
        items: { [key: string]: any }[];
      } = {
        errors: [],
        items: []
      };
      request.onsuccess = (ev: any) => {
        var cursor = ev.target.result;
        if (cursor) {
          results.items.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = (ev: any) => {
        var cursor = ev.target.result;
        if (cursor) {
          results.errors.push(cursor.value);
          cursor.continue();
        } else {
          reject(results);
        }
      };
    });
  }

  // Iterate throw cursor with multiple key ranges
  // Usage for example filter with multiple condition
  _openCursorMultipleRange(
    index: string,
    objectStore: IDBObjectStore,
    keyRanges: Array<IDBKeyRange>,
    reducer: (records: Array<any>, record: any) => any
  ): Promise<any> {
    function resolver(resolve: (out: any) => any, reject: (error: any) => any) {
      var results: Array<any> = [];
      var i: number = 0,
        numOfKeyRanges = keyRanges.length;

      function complete() {
        resolve(results);
      }

      function iterateSuccess(record: any) {
        if (i === numOfKeyRanges) complete();
        results = reducer(results, record);
      }

      function iterateError(err: any) {
        console.error(err);
      }

      keyRanges.forEach(keyRange => {
        let request = objectStore.index(index).openCursor(keyRange);
        request.onsuccess = (ev: any) => iterateSuccess(ev.target.result);
        request.onerror = (ev: any) => iterateError(ev);
      });
    }

    return new Promise(resolver);
  }

  sort(): Filter {
    this.orders = Array.prototype.slice.call(arguments);
    return this;
  }

  max(max: number): Filter {
    this.m_max = max;
    return this;
  }

  paging(page: number, max: number): Filter {
    this.m_page = page;
    this.m_max = max;
    return this;
  }

  run(): Promise<{}> {
    let _ = this;

    return new Promise((resolve: Function, reject: Function) => {
      this.openDB((db, onComplete) => {
        let results: Array<any> = [];
        let errors: Array<any> = [];
        let transaction = db.transaction(_.collection, "readonly");

        transaction.oncomplete = ev => {
          var seen = new Array(results.length);
          var items = new Array(results.length);
          var uniqueCount = 0;

          results.forEach(item => {
            if (seen.indexOf(item._id) == -1) {
              items[uniqueCount] = item;
              seen[uniqueCount++] = item.key;
            }
          });

          items.splice(uniqueCount);
          resolve({ items, errors });
          onComplete();
        };
        transaction.onerror = ev => {
          reject(errors);
          onComplete();
        };
        transaction.onabort = ev => {
          console.error("Transaction aborted");
          onComplete();
        }

        let objectStore = transaction.objectStore(_.collection);

        _.queries.forEach(q => {
          var keyRange: IDBKeyRange;
          if (q.eq) {
            keyRange = IDBKeyRange.only(q.eq);
          } else if (q.range) {
            keyRange = IDBKeyRange.bound(q.range.from, q.range.to);
          } else if (q.gt) {
            keyRange = IDBKeyRange.upperBound(q.gt, false);
          } else if (q.gte) {
            keyRange = IDBKeyRange.upperBound(q.gt, true);
          } else if (q.lt) {
            keyRange = IDBKeyRange.lowerBound(q.lt, false);
          } else if (q.lte) {
            keyRange = IDBKeyRange.lowerBound(q.lte, true);
          } else {
            debugger;
            throw Error(`Unable to parse ${q}`);
          }

          _._openCursor(q.property, objectStore, keyRange)
            .then(result => {
              if (Array.isArray(result.items)) {
                results = results.concat(result.items);
              } else {
                results.push(result.items);
              }
            })
            .catch(error => {
              errors.push({
                property: q.property,
                message: error.message
              });
            });
        });
      });
    });
  }
}
