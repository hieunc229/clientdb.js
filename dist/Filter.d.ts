import { IObjectQuery } from "./utils/queryParser";
declare type IFilter = {
    queries: {
        [key: string]: any;
    };
    openDB: (callback: (db: IDBDatabase) => void) => void;
    collection: string;
};
export default class Filter {
    openDB: (callback: (db: IDBDatabase) => any) => any;
    queries: Array<IObjectQuery>;
    m_max: number;
    m_page: number;
    orders: Array<string>;
    collection: string;
    constructor(opts: IFilter);
    _openCursor(index: string, objectStore: IDBObjectStore, keyRange: IDBKeyRange): Promise<any>;
    _openCursorMultipleRange(index: string, objectStore: IDBObjectStore, keyRanges: Array<IDBKeyRange>, reducer: (records: Array<any>, record: any) => any): Promise<any>;
    sort(): Filter;
    max(max: number): Filter;
    paging(page: number, max: number): Filter;
    run(): Promise<{}>;
}
export {};
