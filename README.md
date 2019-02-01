# ClientDB.js

A  Minimalistic Interface for IndexedDB with Promises (TypeScript supported)

![](https://img.shields.io/npm/v/clientdb.js.svg?colorB=green&style=for-the-badge) 
![](https://img.shields.io/npm/l/clientdb.js.svg?colorB=blue&style=for-the-badge)

## 1. Introduction

IndexedDB is an in-browser database with slightly more advantages than other in-browser databases. For example more storage space, support more complex data structure. Although it APIs are complex to use.

ClientDB.js is a wrapper for IndexedDB with simple APIs, all requests return a promise.

Features:

- ✅ Basic CRUD (create, read, update, delete) data records
- ✅ Filter data using keys/indices
- ✅ Event subscribers (subscribe event when insert, remove, and update)
- TODO: paging, limit, relationship

## 2. Installation

ClientDB.js is available as npm module (supported TypeScript) and also works with plain Javascript.
Follow one of the instructions below to install ClientDB.js to your project

#### Install as NPM Module

```ssh
$ npm install --save clientdb.js
```

Then import `ClientDB` into your project
```js
import ClientDB from 'clientdb.js';
```

#### Install as In-browser Javascript Library

```js
// replace @x.x.x with current version
// Available through window.ClientDB or just ClientDB
<script src="https://unpkg.com/clientdb.js@0.1.4/dist/ClientDB.js"></script>
```

## 3. How to use:

#### Quickstart example

```js
var stores = [{
    name: "Users",
    // version: 1, // 1 is set by default, increase by 1 when keys or collections need to be updated
    // name: "__default_clientDB",
    // onerror: (err) => {}, // error if cannot open a database instance
    // onsucess: () => {}, // callback when database is successfully opened
    keys: {
        // a {_id: true } field is added and used as primary key
        // keys will be indexed
        // format is { [key name] : isUnique }
        firstName: false,
        lastName: false,
        username: true
    }
}]
var myDB = new ClientDB({ stores });

// Insert
myDB.collect("Users").insert({
    _id: 'your_own_id', // auto 
    firstName: 'Peter',
    lastName: 'Griffin',
    username: 'peter_grif' // is unique
})
.then(({ items, changes}) => {
    
    // items => Array(1) => [{ added record }]
    // changes => { inserted: 1, removed: 0, updated: 0, unchage: 0 }
})
.catch(error => {

    // error => { message }
})
```

#### APIs

```js

// Get collection
ClientDB.collect(collectionName: string) : ClientStore;

// Delete the whole database
ClientDB.destroy() : Promise<IResult>;

// Get a record
ClientStore.filter(query: Object) : Promise<IResult>;

// Insert record/s into a collection
ClientStore.insert(record: Array<Object> | Object) : Promise<IResult>;

// Update a record in a collection
ClientStore.update(id: string, changes: Object) : Promise<IResult>;

// Remove record/s ids from a collection
ClientStore.remove(ids: Array<string> | string) : Promise<IResult>;

// Remove all records
ClientStore.removeAllRecords() : Promise<IResult>;

```

#### Event subscriber API

```js

// Get collection
ClientStore.subscribe(
    eventName: string, 
    callback: (eventName: string, changes: { items: Array<Object>, changes: ChangesInterface }) : void);
```

#### Types

```js
// Data record interface
type IRecord = { [key: string]: any };

// Error interface, received when an operation failed
type IError = { property: string, message: string };

// Changes interface, received as part of any CRUD operation result
// to signal data changed in the database
type ChangesInterface = {
  removed: number, 
  inserted: number, 
  unchange: number, 
  update: number
};

// CRUD result interface, received when performing any CRUD operation
type IResult = {
  items: Array<IRecord>,
  error?: Array<IError>,
  changes?: ChangesInterface
}
```

#### TODO APIs

- improve `ClientStore.remove` by using allow using filter

## 4. Build module

In case you want to rebuild the library to use on your project, choose one of the following options for your project.

Clone the project, open Terminal (on MacOS or any relative console) and navigate to
the repository folder and run the command:

### 4.a. Build as a NPM module

```sh
$ npm run build
```

The module will be build into `./src`

### 4.b. Build for browser

```sh
$ npm run build-js
```

The library will be build into `./dist`. You can include into `<script>` tag


## 5. Tests

_Note: I found current test libraries are tedious to setup. So I wrote a pretty simple and straight forward
in-browser test class. (Test class might not suitable for large scale project)_

### 5.1. Install dependencies

Before running tests, install `http-server` globally. (More information about [http-server](https://github.com/indexzero/http-server#readme))

```ssh
$  npm install http-server -g
```

### 5.2. Clone project

Clone or download this project to your computer, then navigate to the project
directory.

### 5.3. Run test

From the root project, run below command. It will start a http server. Navigate to http://127.0.0.1:8080/tests to see the results. 

_Note: Be aware of browser cache when you update tests_

```ssh
$ npm run test-browser
```