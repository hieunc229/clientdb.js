import EventSubscriber from "./utils/subscriber";
import Filter from "./Filter";
declare type IRecord = {
    [key: string]: any;
};
declare type IError = {
    property: string;
    message: string;
};
declare type ChangesInterface = {
    removed: number;
    inserted: number;
    unchange: number;
    update: number;
};
declare type IResult = {
    items: Array<IRecord>;
    errors?: Array<IError>;
    changes?: ChangesInterface;
};
export default class ClientStore {
    openDB: (callback: (db: IDBDatabase, onComplete: Function) => any) => any;
    ref: string;
    eventManager: EventSubscriber;
    constructor(name: string, openDB: (callback: (db: IDBDatabase, onComplete: Function) => any) => any);
    insert(record: Array<Object> | Object): Promise<IResult>;
    remove(record: Array<{
        _id: string;
    }> | {
        _id: string;
    } | string): Promise<IResult>;
    update(id: string, changes: Object): Promise<IResult>;
    openCursor(): Promise<{
        cursor: any;
        db: IDBDatabase;
        onComplete: Function;
    }>;
    filter(queries: {
        [key: string]: any;
    }): Filter;
    records(): Promise<any>;
    get(key: any): Promise<any>;
    getAll(keys: string[]): Promise<any>;
    removeAllRecords(): Promise<IResult>;
    /**
     * Event subscriber
     */
    subscribe(eventName: "insert" | "remove" | "update" | "changes" | "removeAll", callback: (event: string, changes: Array<object>) => void): void;
    on(eventName: "insert" | "remove" | "update" | "changes" | "removeAll", callback: (event: string, changes: Array<object>) => void): void;
}
export {};
