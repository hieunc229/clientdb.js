import EventSubscriber from "./utils/subscriber";
import Filter from './Filter';
declare type IRecord = {
    [key: string]: any;
};
declare type IError = {
    property: string;
    message: string;
};
declare type IResult = {
    items: Array<IRecord>;
    error?: Array<IError>;
    changes?: {
        inserted: number;
        deleted: number;
        updated: number;
        unchange: number;
    };
};
export default class ClientStore {
    openDB: (callback: (db: IDBDatabase) => any) => any;
    ref: string;
    eventManager: EventSubscriber;
    constructor(name: string, openDB: (callback: (db: IDBDatabase) => any) => any);
    insert(record: Array<Object> | Object): Promise<IResult>;
    remove(record: Array<{}> | Object | string): Promise<IResult>;
    update(id: string, changes: Object): Promise<IResult>;
    openCursor(callback: (cursor: any) => any): void;
    filter(queries: {
        [key: string]: any;
    }): Filter;
    get(key: any): Promise<any>;
    removeAllRecords(): Promise<IResult>;
    /**
     * Event subscriber
     */
    subscribe(eventName: "insert" | "remove" | "update" | "changes" | "removeAll", callback: (event: string, changes: Array<object>) => void): void;
}
export {};
