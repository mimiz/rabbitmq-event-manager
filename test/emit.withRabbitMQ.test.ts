import axios from 'axios';
import { expect } from 'chai';
import { describe, it } from 'mocha';
import * as sinon from 'sinon';
import EventManager from '../src';
import { IEventManagerOptions, IEventPayload } from '../src/lib/interfaces';

describe('RabbitMQ Event Manager, emit and listen events ', () => {
  let sandbox: sinon.SinonSandbox;
  let eventManager: EventManager;
  beforeEach(async function() {
    // Connect to CloudAMQP
    const AMQP_URL = process.env.AMQP_URL;
    if (!AMQP_URL) {
      this.skip();
      throw new Error('Should define process.env.AMQP_URL');
    }
    await clean(AMQP_URL);
    const options: Partial<IEventManagerOptions> = {
      url: AMQP_URL,
      logLevel: 'error',
      application: 'unittest',
    };
    eventManager = new EventManager(options);
    await eventManager.initialize();
    sandbox = sinon.createSandbox();
  });
  afterEach(async () => {
    await eventManager.close();
    sandbox.restore();
  });

  it('Should be able to emit and listen and event', done => {
    /** given */
    const payload = {
      a: 43,
      b: 57,
    };

    eventManager.on('add', async (payload: IEventPayload) => {
      /** then */
      try {
        expect(payload.a).to.equal(payload.a);
        expect(payload.b).to.equal(payload.b);
        done();
      } catch (err) {
        done(err);
      }
    });
    /** when */
    setTimeout(async () => {
      eventManager.emit('add', payload);
    }, 100);
  });

  it('Should be able to emit and listen and event without a promise', done => {
    /** given */
    const payload = {
      a: 43,
      b: 57,
    };

    eventManager.on('add', (payload: IEventPayload) => {
      /** then */
      try {
        expect(payload.a).to.equal(payload.a);
        expect(payload.b).to.equal(payload.b);
        done();
      } catch (err) {
        done(err);
      }
    });
    /** when */
    setTimeout(async () => {
      eventManager.emit('add', payload);
    }, 100);
  });
});

/**
 * helper function to delete all
 */
async function clean(amqpUrl: string) {
  const amqpHttp = amqpUrl.replace('amqp://', 'https://');
  const vhost = amqpHttp.substr(amqpHttp.lastIndexOf('/') + 1);
  const httpUrl = amqpHttp.substr(0, amqpHttp.lastIndexOf('/'));
  const url = `${httpUrl}/api`;

  const { data: queues } = await axios.get(`${url}/queues`);
  for (const queue of queues) {
    const deleteUrl = `${url}/queues/${vhost}/${queue.name}`;
    try {
      await axios.delete(`${deleteUrl}`);
    } catch (err) {
      throw err;
    }
  }
}
