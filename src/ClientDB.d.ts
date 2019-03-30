import ClientStore from "./ClientStore";
import EventSubscriber from "./utils/subscriber";
declare type Props = {
    name?: string;
    stores: StoreProps[];
    onerror?: (event: any) => void;
    onsuccess?: (event: any) => void;
    allowUpdate?: boolean;
};
declare type IKeys = {
    [name: string]: {
        unique: boolean;
        type: "number" | "string" | "ref" | "boolean";
    };
};
declare type StoreProps = {
    name: string;
    primaryKey?: string;
    keys: IKeys;
};
/**
 * Implementation of ClientDB in TypeScript
 */
export default class ClientDB {
    db?: IDBDatabase;
    ref: any;
    stores: {
        [name: string]: ClientStore;
    };
    options: {
        name: string;
        version: number;
        stores: Array<any>;
        onerror: (event: any) => void;
        onsuccess: (event: any) => void;
        allowUpdate?: boolean;
    };
    eventManager: EventSubscriber;
    /**
     * Initiate ClientDB instance, setup and start indexedDB
     *
     * @returns {ClientDB}
     */
    constructor(options: Props);
    /**
     * Erorr handler when indexedDB cannot open database
     *
     * @returns {void}
     */
    _handleOpenFail(ev: any): void;
    /**
     * Success handler when indexedDB open database successfully
     *
     * @returns {void}
     */
    request: any;
    _handleOpenSuccess(db: IDBDatabase): void;
    /**
     * Setup structure based on user-predefined layout
     *
     * @returns {void}
     */
    _handleStructureInitiate(ev: any): void;
    /**
     * Open database to perform any transaction
     *
     * @returns {void}
     */
    isOpening: boolean;
    open: (callback: (database: IDBDatabase) => any) => void;
    removeStore(storeName: string): Promise<{}>;
    createStore(storeName: string, keys: IKeys): Promise<{}>;
    updateKeys(storeName: string, keys: IKeys): Promise<any>;
    onerror: (ev: any) => void;
    upgrade: () => void;
    onsuccess: (ev: any) => void;
    onupgradeneeded: (ev: any) => void;
    /**
     * Select a collection to perform a transaction
     *
     * @returns {ClientStore}
     */
    collect(name: string): ClientStore;
    /**
     * Remove database completely
     *
     * @returns {void}
     */
    destroy(): void;
}
export {};
