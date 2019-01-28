import ClientStore from "./ClientStore";
declare type Props = {
    name?: string;
    version?: number;
    stores: Array<any>;
    onerror?: (event: any) => void;
    onsuccess?: (event: any) => void;
};
/**
 * Implementation of ClientDB in TypeScript
 */
export default class ClientDB {
    options: any;
    db: any;
    stores: Array<any>;
    ref: any;
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
    _handleOpenSuccess(ev: any): void;
    /**
     * Setup structure based on user-predefined layout
     *
     * @returns {void}
     */
    _handleStructureInitiate(ev: any): void;
    /**
     * First open indexedDB instance, restructure layout if needed
     * To update layout, increment `version` property when create database by 1 (and must be an int)
     *
     * @returns {void}
     */
    _init(): this;
    /**
     * Open database to perform any transaction
     *
     * @returns {void}
     */
    open(callback: (database: IDBDatabase) => any): void;
    /**
     * Select a collection to perform a transaction
     *
     * @returns {ClientStore}
     */
    collect(name: string): ClientStore;
}
export {};
