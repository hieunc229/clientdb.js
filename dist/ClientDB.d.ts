import ClientStore from "./ClientStore";
declare type Props = {
    name: string;
    version: number;
    stores?: Array<any>;
    onerror: (event: any) => void;
};
export default class ClientDB {
    options: Props;
    db: any;
    stores: Array<any>;
    ref: any;
    constructor(options: Props);
    _handleOpenFail(ev: any): void;
    _handleOpenSuccess(ev: any): void;
    _handleStructureInitiate(ev: any): void;
    _init(): this;
    open(callback: (database: IDBDatabase) => any): void;
    collect(name: string): ClientStore;
}
export {};
