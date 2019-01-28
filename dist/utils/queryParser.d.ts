export declare type IObjectQuery = {
    property: string;
    relate?: string;
    range?: {
        from: any;
        to: any;
    };
    eq?: any;
    gt?: any;
    lt?: any;
    lte?: any;
    gte?: any;
};
export default function parseQuery(query: {
    [key: string]: any;
}): Array<IObjectQuery>;
