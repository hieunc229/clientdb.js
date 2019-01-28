import EventSubscriber from "./utils/subscriber";
import Filter from './Filter';
export default class ClientStore {
    openDB: (callback: (db: IDBDatabase) => any) => any;
    ref: string;
    eventManager: EventSubscriber;
    constructor(name: string, openDB: (callback: (db: IDBDatabase) => any) => any);
    insert(record: Array<Object> | Object): Promise<any>;
    remove(record: Array<{}> | Object | string): Promise<any>;
    update(id: string, changes: Object): Promise<{}>;
    openCursor(callback: (cursor: any) => any): void;
    filter(queries: {
        [key: string]: any;
    }): Filter;
}
