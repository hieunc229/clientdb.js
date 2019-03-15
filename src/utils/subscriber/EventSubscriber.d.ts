export default class EventSubscriber {
    events: any;
    getEvents(): any;
    subscribe(eventName: string, trigger: {
        callback: Function;
        id?: string;
    }, override?: boolean): void;
    fire(eventName: string, changes: any): void;
    triggerOnChangeEvent: (eventMeta: any) => void;
    onChange(callback: (rs?: any) => void): void;
}
