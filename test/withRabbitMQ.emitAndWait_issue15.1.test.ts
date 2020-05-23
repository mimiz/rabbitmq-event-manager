import { expect } from 'chai';
import { describe, it } from 'mocha';
import { EventManager } from '../src/EventManager.class';
import { clean } from './helper';

describe('With RabbitMQ Event Manager, For fixing issue #15', () => {
  let AMQP_URL: string;
  const eventManagers: { [k: string]: EventManager } = {};
  before(async function () {
    // Connect to CloudAMQP
    if (!process.env.AMQP_URL) {
      this.skip();
    }
    AMQP_URL = process.env.AMQP_URL;
    await clean(AMQP_URL);
  });
  after(async () => {
    for (const em of Object.values(eventManagers)) {
      await em.close();
    }
  });

  it('Should be able to emit and wait for response two instances', async () => {
    /** given */
    const eventManager = new EventManager({
      url: process.env.AMQP_URL,
      application: 'dummy-test',
    });
    eventManagers.em = eventManager;
    await eventManager.initialize(); // For creating the DLX and Alternate
    await eventManager.on('MULTIPLY', p => {
      return { result: p.a * p.b };
    });
    /** when */
    const results = [];
    for (let i = 0; i < 100; i++) {
      const { result } = await eventManager.emitAndWait('MULTIPLY', { a: 4, b: i });
      // console.log(`i : ${i} : ${result}`);
      results[i] = result;
    }

    /** then */
    results.forEach((r, index) => {
      expect(r).to.equal(4 * index);
    });
  });
}).timeout(45000);
