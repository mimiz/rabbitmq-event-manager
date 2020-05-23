import { expect } from 'chai';
import { describe, it } from 'mocha';
import * as sinon from 'sinon';
import { EventManager } from '../src/EventManager.class';
import { IEventManagerOptions, IEventPayload } from '../src/lib/interfaces';
import { clean } from './helper';

describe('With RabbitMQ Event Manager, emit and listen events ', () => {
  let sandbox: sinon.SinonSandbox;
  let eventManager: EventManager;
  beforeEach(async function () {
    // Connect to CloudAMQP
    const AMQP_URL = process.env.AMQP_URL;
    if (!AMQP_URL) {
      this.skip();
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
