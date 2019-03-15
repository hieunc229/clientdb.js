# Event Subscriber

A simple event subscriber/emitter, used for many Vasern libraries.

## Usage

```js
import EventSubscriber from './EventSubscriber';

var ev = new EventSubscriber();

ev.subscribe('change', (change: any) => {
    console.log('change fired', change);
});

ev.fire('change', { message: 'Okkkk' });
```