import { expect } from 'chai';
import { describe, it } from 'mocha';
import { EventManager } from '../src/EventManager.class';
import { IEventManagerOptions } from '../src/lib/interfaces';
import { clean } from './helper';

describe('With RabbitMQ Event Manager, For fixing issue #15', () => {
  let AMQP_URL: string;
  let eventManagers: { [k: string]: EventManager };
  let baseOptions: Partial<IEventManagerOptions>;
  before(async function () {
    // Connect to CloudAMQP
    if (!process.env.AMQP_URL) {
      this.skip();
    }
    AMQP_URL = process.env.AMQP_URL;
    await clean(AMQP_URL);
    // create three event Managers
    baseOptions = {
      url: AMQP_URL,
      logLevel: 'error',
    };

    const em1 = new EventManager({
      ...baseOptions,
      application: 'EM_1',
    });

    const em2 = new EventManager({
      ...baseOptions,
      application: 'EM_2',
    });

    const em3 = new EventManager({
      ...baseOptions,
      application: 'EM_3',
    });
    await em1.initialize();
    eventManagers = { em1, em2, em3 };
  });
  after(async () => {
    for (const em of Object.values(eventManagers)) {
      await em.close();
    }
  });

  it('Should be able to emit and wait for response two instances', async () => {
    /** given */
    await eventManagers.em1.on('MULTIPLY', async payload => {
      return { result: payload.a * payload.b };
    });
    await eventManagers.em2.on('ADD', async payload => {
      return { result: payload.a + payload.b };
    });
    await eventManagers.em3.on('SQUARE', async payload => {
      return { result: payload.a * payload.a };
    });
    /** when */

    const { result: expect1089 } = await eventManagers.em1.emitAndWait('SQUARE', { a: 33 });
    const { result: expect81 } = await eventManagers.em3.emitAndWait('SQUARE', { a: 9 });
    const { result: expect144 } = await eventManagers.em2.emitAndWait('SQUARE', { a: 12 });
    const { result: expect66 } = await eventManagers.em1.emitAndWait('MULTIPLY', { a: 33, b: 2 });
    const { result: expect42 } = await eventManagers.em1.emitAndWait('ADD', { a: 33, b: 9 });
    const { result: expect132 } = await eventManagers.em2.emitAndWait('MULTIPLY', { a: 33, b: 4 });
    const { result: expect39 } = await eventManagers.em2.emitAndWait('ADD', { a: 30, b: 9 });
    const { result: expect6 } = await eventManagers.em3.emitAndWait('MULTIPLY', { a: 3, b: 2 });
    const { result: expect43 } = await eventManagers.em3.emitAndWait('ADD', { a: 21, b: 22 });

    /** then */
    expect(expect1089).to.equal(1089);
    expect(expect66).to.equal(66);
    expect(expect42).to.equal(42);
    expect(expect144).to.equal(144);
    expect(expect132).to.equal(132);
    expect(expect39).to.equal(39);
    expect(expect81).to.equal(81);
    expect(expect6).to.equal(6);
    expect(expect43).to.equal(43);
  });
}).timeout(45000);
