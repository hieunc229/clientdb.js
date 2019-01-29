import { createElement } from './utils.js';
import defaultConfig from './defaultConfig.js';

export default class TestDecor {

    constructor(opts) {

        var containerSelector = (opts && opts.containerSelector) ? 
            opts.containerSelector : defaultConfig.containerSelector;

        this.containerEl = document.querySelector(containerSelector);
        this._pass = this._pass.bind(this);
        this._failed = this._failed.bind(this);
        this._assert = this._assert.bind(this);

        this.report = this.report.bind(this);
        this.it = this.it.bind(this);

        this.count = 0;
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
        condition ? this._pass(message, opts) : this._failed(message, opts);
    }

    _pass(message, opts) {
        this._appendContent(message, 'deco__passed', opts)
    }

    _failed(message, opts) {
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

    report() {
        let totalPassed = this.containerEl.querySelectorAll(".deco__passed").length;
        let totalFailed = this.containerEl.querySelectorAll(".deco__failed").length;
        
        let children = [];

        totalPassed !== 0 && children.push(createElement('span', { 
            innerText: `${totalPassed} passed`,
            style: `flex: ${totalPassed}`,
            className: 'bg__pos'
        }));

        totalFailed !== 0 && children.push(createElement('span', { 
            innerText: `${totalFailed} failed`,
            style: `flex: ${totalFailed}`,
            className: 'bg__neg'
        }));

        this.containerEl.appendChild(createElement("div", {
            className: 'deco__report',
            children: children
        }));
    }
}