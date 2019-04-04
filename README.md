# RabbitMQ Event Manager

A Node Event Manager using RabbitMQ to exchange events.

Exchanges and Queues are automatically created.

## Basic Example

* **Consumer**
```js
const EventManager = require('rabbitmq-event-manager');
const myEventManager = new EventManager({url:'amqp://localhost'}, appName:'CONSUMER');
myEventManager.on('MY_EVENT_NAME', async (payload)=>{
    console.log(payload);
    return true;
});
```

* **Producer**
```js
const EventManager = require('rabbitmq-event-manager');
const myEventManager = new EventManager({url:'amqp://localhost', appName:'PRODUCER_1'});

myEventManager.emit('MY_EVENT_NAME', payload);
```

This will create the following elements in RabbitMQ : 

* An Exchange of type **fanout** named : `PRODUCER_1.MY_EVENT_NAME`
* One Queues `CONSUMER::PRODUCER_1.MY_EVENT_NAME` bound to the Exchange `PRODUCER_1.MY_EVENT_NAME`

If a new Consumer is created and listen the same event : 

```js
const EventManager = require('rabbitmq-event-manager');
const myEventManager = new EventManager({url:'amqp://localhost'}, appName:'OTHER_CONSUMER');
myEventManager.on('MY_EVENT_NAME', async (payload)=>{
    console.log(payload);
    return true;
});
```

It will add a queue `OTHER_CONSUMER::PRODUCER_1.MY_EVENT_NAME` bound to the Exchange `PRODUCER_1.MY_EVENT_NAME`.

## Options

Name | Type | Default | Description
---- | ---- | ---- | ---- 
url | String | `amqp://localhost` | The connection URL of the RabbitMQ Server
appName | String | - | The name of the application (used for naming exchanges and queues).
metas | boolean or (function) | true | Weither or not to add `_metas` infirmations in the event, If a function this returned value, will become the  `_metas` object (see <Metas Informations>) 
deadLetterExchangeName | String | `DEAD_LETTER_EXCHANGE` | TODO
deadLetterQueueName | String | `DEAD_LETTER_QUEUE` | TODO
deadLetterExchangeName | String | `NO_QUEUE_EXCHANGE` | TODO
deadLetterQueueName | String | `QUEUE_NO_QUEUE` | TODO
ttl | Number | `86400000` (24h) | TODO
maxNumberOfMessagesRetries | Numbner | `100` | TODO

## Metas Informations

By defaut, some metas data are added to the payload : 

* guid : A unique id generated, to be able to debug for example, or for following the event.
* timestamp : A number of milliseconds elapsed since January 1, 1970 00:00:00 UTC. (`Date.now()`)
* name : A string which is the name of the emitted event.

So if your payload is : 

```json
{
    userId:42
}
```

With Metas data it will be : 

```json
{
    _metas:{
        guid: '465e008c-d37f-4e31-b494-023e6d187946',
        name: 'MY_EVENT_NAME',
        timestamp: 1519211809934
    },
    userId:42
}
```

You can remove that meta information by settings the option value "metas" to false.

You can also override the metas generation by setting a function as *metas* options value (on the emitter side only, as the event is generated there).

### With no metas

```js
const EventManager = require('rabbitmq-event-manager');
const myEventManagerWithNoMetas = new EventManager({
    url: 'amqp://localhost', 
    appName: 'PRODUCER_1',
    metas: false,
});
const payload = { userId:42 };
myEventManagerWithNoMetas.emit('MY_EVENT_NAME', payload);
// Payload will be 
// {
//    userId:42
// }
```

### Override Metas
```js
const EventManager = require('rabbitmq-event-manager');
const myEventManagerOverrideMetas = new EventManager({
    url: 'amqp://localhost', 
    appName: 'PRODUCER_1',
    metas: (sourceMetas) => {
        // sourceMetas contains the default metaa
        return {
            ...sourceMetas, 
            otherProperty:'MyValue'
        };
    },
});
const payload = { userId:42 };
myEventManagerOverrideMetas.emit('MY_EVENT_NAME', payload);
// Payload will be 
// {
//    _metas: {
//        guid : '465e008c-d37f-4e31-b494-023e6d187947'
//        name: 'MY_EVENT_NAME',
//        timestamp: 1519211809934,
//        otherProperty:'MyValue'
//    }
//    userId:42
// }
```

## DEAD LETTER QUEUE

From the RabbitMQ documenation, the [Dead Letter Exchange](https://www.rabbitmq.com/dlx.html) is a RabbitMQ Exchange, that is attached to a queue. And message in that queue can be _"dead-lettered"_ if the queue reach its *length limit*, or, if the messages has *expired* (TTL) and also if the message is *negatively acknowledged* with requeue option set to false.

By default, The Exchange `DEAD_LETTER_EXCHANGE` (and its bound queue `DEAD_LETTER_QUEUE`) is automatically created and attached to all queues.

The names of the queue and the exchange can be changed by setting the options properties.

See <Acknowledge / N-Acknowledge> to see how to send an event to the *Dead Letter Exchange* 

> :warning: Be carefull, if you change the names of the `DEAD_LETTER_EXCHANGE` and the `DEAD_LETTER_QUEUE`, remember that you will have to do it for all producers and all consumers, as they will all use the same RabbitMQ server.

## QUEUE NO QUEUE 

When an _Event Exchange_ is created, an exchange `NO_QUEUE_EXCHANGE` is created and a queue named `QUEUE_NO_QUEUE` is created and bound to it.

When an event is emitted to the _Event Exchange_ if the exchange has no queue bounded to it, all the messages are routed to the `NO_QUEUE_EXCHANGE`

The names of the queue and the exchange can be changed by setting the options properties.

> :warning: Be carefull, if you change the names of the `DEAD_LETTER_EXCHANGE` and the `DEAD_LETTER_QUEUE`, remember that you will have to do it for all producers and all consumers, as they will all use the same RabbitMQ server.


## Acknowledge / N-Acknowledge

```js
const {EventManager} = require('rabbitmq-event-manager');
const myEventManager = new EventManager({url:'amqp://localhost'}, appName:'OTHER_CONSUMER');
myEventManager.on('MY_EVENT_NAME', async (payload)=>{
    return true; // the message will be acknoledge
});
```


```js
const {EventManager, DoNotRetryError} = require('rabbitmq-event-manager');
const myEventManager = new EventManager({url:'amqp://localhost'}, appName:'OTHER_CONSUMER');
myEventManager.on('MY_EVENT_NAME', async (payload)=>{
    throw new DoNotRetryError('The message is malformed');
});
```

```js
const {EventManager, RetryLaterError} = require('rabbitmq-event-manager');
const myEventManager = new EventManager({url:'amqp://localhost'}, appName:'OTHER_CONSUMER');
myEventManager.on('MY_EVENT_NAME', async (payload)=>{
    throw new RetryLaterError('The message is malformed', 300); // In seconds
});
```