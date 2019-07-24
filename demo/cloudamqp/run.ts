import EventManager from '../../src/index';
const server = process.env.RABBITMQ_URL;

const eventManagerProducer = new EventManager({
  url: server,
  application: 'Producer',
  logLevel: 'debug',
  logPrefix: 'PRODUCER',
});

const eventManagerConsumer = new EventManager({
  url: server,
  application: 'Consumer',
  logLevel: 'debug',
  logPrefix: 'CONSUMER',
});

eventManagerProducer
  .initialize()
  .then(async () => {
    // Initialize consumer
    consumer();
    await pause(1000);
    // Send some events
    emitter();
  })
  .catch(err => {
    console.error(err);
    const help = `
------
Did you configure your RabbitMQ URL ?: 

RABBITMQ_URL= amqp://uservhost:PASS@bullfrog.rmq.cloudamqp.com/uservhost yarn demo:cloudamqp


Start and try again
`;
    console.error(help);
    process.exit(1);
  });

async function pause(n: number) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, n);
  });
}
/** Send an event every seconds, after 20 seconds, will stop and send stop  */
function emitter() {
  const payload = {
    user: {
      id: 1,
      first: 'Remi',
    },
  };
  eventManagerProducer.emit('PRODUCER.EVENT', { ...payload, action: 'ACK' });
  eventManagerProducer.emit('PRODUCER.EVENT', { ...payload, action: 'FLUSH' });
  eventManagerProducer.emit('PRODUCER.EVENT', {
    ...payload,
    action: 'REQUEUE',
  });
  eventManagerProducer.emit('PRODUCER.NO_APP_BOUND', { ...payload });
}

function consumer() {
  eventManagerConsumer.on('PRODUCER.EVENT', async (payload: any) => {
    console.log('message received', payload);
    switch (payload.action) {
      case 'FLUSH':
        throw new Error('Flush Message');
      case 'REQUEUE':
        return false;
      case 'ACK':
      default:
        return true;
    }
  });
}

async function closeAll() {
  await eventManagerConsumer.close();
  await eventManagerProducer.close();
  console.log('You should have 2 messages in the DEAD_LETTER_QUEUE');
  console.log('You should have 1 messages in the QUEUE_NO_QUEUE');
  process.exit(0);
}
setTimeout(async () => {
  await closeAll();
}, 10000);
