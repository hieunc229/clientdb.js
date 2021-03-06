"use strict";
/* ===============================================================
//
//  Copyright by Ambi Studio 2018
//  Licensed under the Apache License, Version 2.0 (the "License");
//  (Please find "LICENSE" file attached for license details)
//============================================================= */
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
            var index = -1;
            this.events[eventName].find((ev, i) => {
                if (ev.id === trigger.id) {
                    index = i;
                    return true;
                }
                return false;
            });
            if (index !== -1) {
                this.events[eventName].splice(index, 1);
            }
        }
        this.events[eventName].push(trigger);
    }
    // Trigger all subscribers of an event
    fire(eventName, changes) {
        const triggers = this.events[eventName];
        if (triggers && triggers.length) {
            triggers.forEach((trigger, i) => {
                if (trigger.callback) {
                    trigger.callback(eventName, changes);
                }
                if (trigger.once) {
                    triggers.splice(i, 1);
                }
            });
        }
        // Trigger a event fire subscriber
        this.triggerOnChangeEvent({
            event: eventName,
            changes
        });
    }
    // Subscribe to "anyEventFiredSubscribers" subscriber
    // Explain:
    //   Let say we subscribed using this func, and trigger a "itemCreated" event
    //   - "event": event name that was fired ("itemCreated")
    //   - "changes": any item that was passed through the "itemCreated" event trigger
    onChange(callback) {
        this.events.change.push({ callback });
    }
}
exports.default = EventSubscriber;
