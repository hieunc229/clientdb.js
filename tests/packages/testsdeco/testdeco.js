import { createElement } from './utils.js';
import defaultConfig from './defaultConfig.js';

export default class TestDecor {

    constructor(opts) {

        var containerSelector = (opts && opts.containerSelector) ? 
            opts.containerSelector : defaultConfig.containerSelector;
        this._initContainers.bind(this)(containerSelector);

        this._pass = this._pass.bind(this);
        this._failed = this._failed.bind(this);
        this._assert = this._assert.bind(this);

        this.it = this.it.bind(this);

        this.passedCount = 0;
        this.failedCount = 0;
        this.totalCount = 0;
    }

    _initContainers(mainContainer) {

        var mainContainerEl = document.querySelector(mainContainer);
        var resultContainer = createElement("div", {
            className: "deco__results"
        });
        mainContainerEl.appendChild(resultContainer);
        this.containerEl = resultContainer;

        // Result container

        var passedEl = createElement('span', {
            className: 'bg__pos',
            style: `flex: 0; padding: 0`
        });
        this.passedEl = passedEl;

        var failedEl = createElement('span', {
            className: 'bg__neg',
            style: `flex: 0; padding: 0`
        });
        this.failedEl = failedEl;

        var totalEl = createElement('span', {
            className: 'deco__report_title',
            innerText: '0 tests'
        });
        this.totalEl = totalEl;

        var resultEl = createElement("div", {
            className: 'deco__report_results',
            children: [passedEl, failedEl]
        })

        mainContainerEl.appendChild(createElement("div", {
            className: 'deco__report',
            children: [totalEl, resultEl]
        }));
    }

    describe(message, callback) {
        var child = this._appendContent(null, "deco__section");
        child.appendChild(createElement("div", { innerText: message, className: 'section__title' }));
        callback({
            it: (message, callback) => {
                this.it(message, callback, child);
            }
        })
    }

    it(message, callback, container) {
        this.count++;
        callback({
            assert: (condition, description) => {
                 this._assert(condition, message, { container: container, description: description });
            }
        })
    }

    _assert(condition, message, opts) {
        this.totalCount++;
        this.totalEl.innerText = `Total: ${this.totalCount} tests`;
        condition ? this._pass(message, opts) : this._failed(message, opts);
    }

    _pass(message, opts) {
        this.passedCount++;
        this.passedEl.innerText = `${this.passedCount} passed`;
        this.passedEl.style = `flex: ${this.passedCount}`;
        this._appendContent(message, 'deco__passed', opts)
    }

    _failed(message, opts) {
        this.failedCount++;
        this.passedEl.innerText = `${this.failedCount} failed`;
        this.failedEl.style = `flex: ${this.failedCount}`;
        this._appendContent(message, 'deco__failed', opts)
    }

    _appendContent(message, className, opts) {
        var container = this.containerEl;
        var description;

        if (opts) {

            if (opts.container)
                container = opts.container;

            if (opts.description)
                description = opts.description;
        }

        let child = createElement("div", { innerText: message, className });

        if (description) {
            child.appendChild(createElement('span', { innerText: description, className: 'deco__desc' }));
        }

        container.appendChild(child);
        return child;
    }
}