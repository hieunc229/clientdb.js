# ClientDB.js

A Reactive and Minimalistic Interface for IndexedDB with Promises (TypeScript supported)

![](https://img.shields.io/npm/v/clientdb.js.svg?colorB=green&style=for-the-badge) 
![](https://img.shields.io/npm/l/clientdb.js.svg?colorB=blue&style=for-the-badge)

Table of contents:

- [Introduction](#introduction)
- [Quickstart](#quickstart)
- [Installation](#installation)

More on Wiki page:

- [API References](https://github.com/hieunc229/clientdb.js/wiki/3.-API-References)
- [Build and Tests](https://github.com/hieunc229/clientdb.js/wiki/2.-Install,-Build-&-Tests#build-module)

## 1. Introduction

IndexedDB is an in-browser database with slightly more advantages than other in-browser databases. For example more storage space, support more complex data structure. Although it APIs are complex to use.

ClientDB.js is a wrapper for IndexedDB with simple APIs, all requests return a promise.

Features:

- ✅ Basic CRUD (create, read, update, delete) data records backed by sophisticated [IndexedDB](https://en.wikipedia.org/wiki/Indexed_Database_API)
- ✅ Filter data using keys/indices
- ✅ Event subscribers (subscribe event when insert, remove, and update)
- TODO: paging, limit, relationship


## 2. Quickstart

```js
var stores = [{
    name: "Users",
    keys: {
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

## 3. Installation

ClientDB.js is available as npm module (supported TypeScript) and also works with plain Javascript.
Follow one of the instructions below to install ClientDB.js to your project

#### Install as NPM Module

```console
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

---

You can find [API References](https://github.com/hieunc229/clientdb.js/wiki/3.-API-References), [Build and Tests](https://github.com/hieunc229/clientdb.js/wiki/2.-Install,-Build-&-Tests#build-module) section on [ClientDB.js Wiki Page](https://github.com/hieunc229/clientdb.js/wiki). And feel free to [create an issue](https://github.com/hieunc229/clientdb.js/issues/new)
related to this project or need any help.