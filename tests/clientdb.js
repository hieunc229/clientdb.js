var assert = require("assert");
var webdriver = require("selenium-webdriver");
var ClientDB = require("../dist").default;

describe("indexedDB is available", function() {
    it("available", function () {
        assert.ok(window.ClientDB);
    })
})