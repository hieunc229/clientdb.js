export default class EventSubscriber {
  events: any = {
    change: []
  };

  getEvents() {
    return this.events;
  }

  // Subscribe a trigger to an event
  subscribe(eventName: string, trigger: { callback: Function, id? : string }, override = false) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }

    if (override) {
      const index = this.events.find((ev: any) => ev.id === trigger.id);
      if (index !== -1) {
        this.events[eventName].splice(index, 1);
      }
    }

    this.events[eventName].push(trigger);
  }

  // Trigger all subscribers of an event
  fire(eventName: string, changed: any) {
    const triggers = this.events[eventName];
    if (triggers && triggers.length) {
      triggers.forEach((trigger: any) => {
        if (trigger.callback) {
          trigger.callback({ changed });
        }
      });
    }

    // Trigger a event fire subscriber
    this.triggerOnChangeEvent({
      event: eventName,
      changed
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
  //   - "changed": any item that was passed through the "itemCreated" event trigger
  onChange(callback: Function) {
    this.events.change.push(callback);
  }
}
