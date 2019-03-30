/* ===============================================================
//
//  Copyright by Ambi Studio 2018
//  Licensed under the Apache License, Version 2.0 (the "License");
//  (Please find "LICENSE" file attached for license details)
//============================================================= */

type Trigger = { callback: Function; id?: string; once?: boolean };
type EventList = {
  [name: string]: Trigger[];
};
export default class EventSubscriber {
  events: EventList = {
    change: []
  };

  getEvents() {
    return this.events;
  }

  // Subscribe a trigger to an event
  subscribe(eventName: string, trigger: Trigger, override = false) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }

    if (override) {
      var index = -1;
      this.events[eventName].find((ev: any, i: number) => {
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
  fire(eventName: string, changes: any) {
    const triggers = this.events[eventName];
    if (triggers && triggers.length) {
      triggers.forEach((trigger: any, i: number) => {
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

  // Trigger all the subscribers in "anyEventFiredSubscribers"
  triggerOnChangeEvent = (eventMeta: any) => {
    this.events.change.forEach((trigger: any) => {
      trigger.callback(eventMeta);
    });
  };

  // Subscribe to "anyEventFiredSubscribers" subscriber
  // Explain:
  //   Let say we subscribed using this func, and trigger a "itemCreated" event
  //   - "event": event name that was fired ("itemCreated")
  //   - "changes": any item that was passed through the "itemCreated" event trigger
  onChange(callback: (rs?: any) => void) {
    this.events.change.push({ callback });
  }
}
