import { expect } from 'chai';
import { describe, it } from 'mocha';
import * as sinon from 'sinon';
import { EventManager } from '../src/EventManager.class';
import { pause } from '../src/lib/helper';
import { IEventManagerOptions, IEventPayload } from '../src/lib/interfaces';
import { clean } from './helper';

describe('With RabbitMQ Event Manager, emit then wait response events ', () => {
  let sandbox: sinon.SinonSandbox;
  let eventManager: EventManager;
  beforeEach(async function () {
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

  it('Should be able to emit and wait for response one instance', async () => {
    /** given */
    const initialPayload = {
      name: 'my super name',
      a: 43,
      b: 57,
    };
    const eventName = 'add';
    const responseEventName = 'add.response';

    /** when */
    eventManager.on(eventName, async (payload: IEventPayload) => {
      return { newKey: 'New-Key', result: payload.a + payload.b };
    });
    // ust wait a little bit the queue is created
    await pause(1000);
    // We emit event and wait for other
    const responsePayload = await eventManager.emitAndWait(eventName, initialPayload, responseEventName, { emitAndWaitTimeout: 10000 });
    /** then */
    await pause(1000);
    // Check mocks

    // Check result
    expect(responsePayload.newKey).to.equal('New-Key');
    expect(responsePayload.result).to.equal(100);
  });

  it('Should be able to emit and wait for response one instance two times', async () => {
    /** given */
    const payload1 = {
      a: 43,
      b: 57,
    };
    const payload2 = {
      a: 44,
      b: 66,
    };
    const eventName = 'add';

    /** when */
    eventManager.on(eventName, async (payload: IEventPayload) => {
      return { result: payload.a + payload.b };
    });
    // ust wait a little bit the queue is created
    await pause(1000);
    // We emit event and wait for other
    const responsePayload1 = await eventManager.emitAndWait(eventName, payload1);
    const responsePayload2 = await eventManager.emitAndWait(eventName, payload2);
    /** then */
    await pause(1000);
    // Check mocks

    // Check result
    expect(responsePayload1.result).to.equal(100);
    expect(responsePayload2.result).to.equal(110);
  });
});
