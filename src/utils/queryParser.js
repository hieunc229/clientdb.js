"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
function parseQuery(query) {
    let rs = [];
    let keys = Object.keys(query);
    let value;
    keys.forEach((key) => {
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
                    });
                }
                else {
                    rs.push(Object.assign({ property: key }, value));
                }
                break;
            default:
                throw Error(`Unable to parse query "${value}"`);
        }
    });
    return rs;
}
exports.default = parseQuery;
