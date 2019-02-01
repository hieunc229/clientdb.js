"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class EventSubscriber {
    constructor() {
        this.events = {
            change: []
        };
        // Trigger all the subscribers in "anyEventFiredSubscribers"
        this.triggerOnChangeEvent = (eventMeta) => {
            this.events.change.forEach((trigger) => {
                trigger.callback(eventMeta);
            });
        };
    }
    getEvents() {
        return this.events;
    }
    // Subscribe a trigger to an event
    subscribe(eventName, trigger, override = false) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        if (override) {
            const index = this.events.find((ev) => ev.id === trigger.id);
            if (index !== -1) {
                this.events[eventName].splice(index, 1);
            }
        }
        this.events[eventName].push(trigger);
    }
    // Trigger all subscribers of an event
    fire(eventName, changed) {
        const triggers = this.events[eventName];
        if (triggers && triggers.length) {
            triggers.forEach((trigger) => {
                if (trigger.callback) {
                    trigger.callback(eventName, changed);
                }
            });
        }
        // Trigger a event fire subscriber
        this.triggerOnChangeEvent({
            event: eventName,
            changed
        });
    }
    // Subscribe to "anyEventFiredSubscribers" subscriber
    // Explain:
    //   Let say we subscribed using this func, and trigger a "itemCreated" event
    //   - "event": event name that was fired ("itemCreated")
    //   - "changed": any item that was passed through the "itemCreated" event trigger
    onChange(callback) {
        this.events.change.push(callback);
    }
}
exports.default = EventSubscriber;
