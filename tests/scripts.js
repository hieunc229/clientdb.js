// Test class
var deco = new TestDeco();

// 1. Initiate ClientDB instance
var myDB = new ClientDB({
  stores: [
    {
      name: "Users",
      keys: {
        firstName: false,
        lastName: false,
        username: true,
        age: false
      }
    }
  ]
});

// 2. Get Users collection by its .name specified when initiate ClientDB instance (1)
var collect = myDB.collect("Users");

deco.describe("ClientDB.js in-browser tests", ({ it }) => {
  
  it("indexedDB is available", ({ assert }) => {
    assert(indexedDB !== undefined);
  });

  it("ClientDB is initiated", op => {
    op.assert(myDB.collect !== undefined);
  });

  it("Collection is initiate", op => {
    op.assert(collect.insert !== undefined);
  });

  it("All records is removed", async op => {
    collect
      .removeAllRecords()
      .then(op.assert)
      .catch(err => op.asssert(false, err.message));
  });
});

deco.describe("Insert records", ({ it }) => {
  const peterRecord = {
    _id: "peter_griff_" + Date.now(),
    firstName: "Peter",
    lastName: "Griffin",
    username: "thegriffinfat",
    age: 48
  };

  it("Create Peter record", async ({ assert }) => {
    collect
      .insert(peterRecord)
      .then(({ items }) =>
        assert(items && Array.isArray(items) && items.length)
      )
      .catch(err => assert(false, err.message));
  });

  it("Crashed when _id and email is repeated", async ({ assert }) => {
    collect
      .insert(peterRecord)
      .then(res => assert(false, `Inserted: ${res.items.length}`))
      .catch(err => assert(true, err.message));
  });
});

deco.describe("Query record", dop => {
  dop.it("Filter data with existing value", ({ assert }) => {
    collect
      .filter({ firstName: "Peter" })
      .run()
      .then(rs => {
        let items = rs.items;
        let errorMessage = rs.errors.length
          ? rs.errors[0].message
          : "Found firstname =`Peter`";
        assert(items && Array.isArray(items) && items.length, errorMessage);
      })
      .catch(err => {
        assert(false, err.message);
      });
  });

  dop.it("Filter data wit non-existing value", ({ assert }) => {
    collect
      .filter({ firstName: "Pxx" })
      .run()
      .then(rs => {
        let items = rs.items;
        assert(items.length === 0, "Not found firstname =`Pxx`");
      })
      .catch(err => {
        assert(false, err.message);
      });
  });
});

deco.describe("Remove record", dop => {

  dop.it("Fetch data then remove", ({ assert }) => {

    collect.filter({ firstName: "Peter" }).run()
    .then(rs => {
      collect.remove(rs.items[0]._id)
      .then(rs => {
        assert(rs.changes.removed)
      })
      .catch(rs => assert(false, rs.message));
    })
  })

})

//// async functions not applied
deco.report();