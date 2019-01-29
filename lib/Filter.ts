import parseQuery, { IObjectQuery } from "./utils/queryParser";

type IFilter = {
  queries: { [key: string]: any };
  openDB: (callback: (db: IDBDatabase) => void) => void;
  collection: string;
};

export default class Filter {
  openDB: (callback: (db: IDBDatabase) => any) => any;
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
      request.onsuccess = (ev: any) => resolve(ev.target.result);
      request.onerror = (ev: any) => reject(ev);
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
    let _vars = this;
    
    return new Promise((resolve: Function, reject: Function) => {
      let completedTransaction = 0, maxTransaction = _vars.queries.length;
      let results : Array<any> = [];
      let errors: Array<any> = [];

      function transactionComplete() {
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
      }

      function transactionSuccess(result: any) {

        if (Array.isArray(result)) {
          results = results.concat(result)
        } else {
          results.push(result);
        }

        completedTransaction++;
        if (completedTransaction === maxTransaction) {
          transactionComplete();
        }
      }

      function transactionError(err: any) {
        completedTransaction++;
        errors.push(err);
      }

      this.openDB((db: IDBDatabase) => {

        let objectStore = db
          .transaction(_vars.collection, "readonly")
          .objectStore(_vars.collection);

        _vars.queries.forEach(q => {
          var keyRange: IDBKeyRange;
          if (q.eq) { 
            keyRange = IDBKeyRange.only(q.eq);
          } else if (q.range) {
            keyRange = IDBKeyRange.bound(q.range.from, q.range.to);
          } else if (q.gt) {
            keyRange = IDBKeyRange.upperBound(q.gt, false )
          } else if (q.gte) {
            keyRange = IDBKeyRange.upperBound(q.gt, true);
          } else if (q.lt) {
            keyRange = IDBKeyRange.lowerBound(q.lt, false )
          } else if (q.lte) {
            keyRange = IDBKeyRange.lowerBound(q.lte, true);
          } else {
            debugger
            throw Error(`Unable to parse ${q}`);
          }

          _vars._openCursor(q.property, objectStore, keyRange)
          .then(rs => transactionSuccess(rs.value))
          .catch(error => {
            transactionError({
              property: q.property,
              message: error.message
            })
          });
        });
      });
    });
  }
}
