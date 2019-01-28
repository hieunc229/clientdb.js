
export type IObjectQuery = {
    property: string;
    relate?: string; // relate collection
    range?: {
        from: any;
        to: any;
    },
    eq?: any,   // equal
    gt?: any;   // greater than
    lt?: any;   // less than
    lte?: any;  // less than or equal
    gte?: any;  // greater than or equal
}

/* Parse user defined query to a native query
** Example 

var parsed = queryParser({
    firstName: "Jonathan",
    age: [20, 50],
    height: {
        gt: 1.8 // metter
    }
})

parsed => {
    firstName: { equal: "Jonathan" },
    age: { range: { start: 20, to: 50 }},
    height: { gt: 1.8 }
}
*/

export default function parseQuery(query: { [key: string]: any }) : Array<IObjectQuery> {

    let rs : Array<IObjectQuery> = [];
    let keys = Object.keys(query);
    let value: any;

    keys.forEach((key: string) => {
        value = query[key];

        switch (typeof value) {
            case "string":
            case "number":
            case "boolean":
                rs.push({
                    property: key,
                    eq: value
                });
                break;

            case "object":

                if (Array.isArray(value)) {
                    // Array
                    rs.push({
                        property: key,
                        range: {
                            from: value[0],
                            to: value[1]
                        }
                    })
                } else {
                    rs.push({ property: key, ...value });
                }

                break;
            default:
                throw Error(`Unable to parse query "${value}"`);
        }

    });

    return rs;
}
