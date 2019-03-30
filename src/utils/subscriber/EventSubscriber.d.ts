declare type Trigger = {
    callback: Function;
    id?: string;
    once?: boolean;
};
declare type EventList = {
    [name: string]: Trigger[];
};
export default class EventSubscriber {
    events: EventList;
    getEvents(): EventList;
    subscribe(eventName: string, trigger: Trigger, override?: boolean): void;
    fire(eventName: string, changes: any): void;
    triggerOnChangeEvent: (eventMeta: any) => void;
    onChange(callback: (rs?: any) => void): void;
}
export {};
