import { expect } from 'chai';
import { describe, it } from 'mocha';
import * as sinon from 'sinon';
import { EventManager } from '../src/EventManager.class';
import { pause } from '../src/lib/helper';
import { IEventManagerOptions } from '../src/lib/interfaces';
import { clean } from './helper';

describe('With RabbitMQ Event Manager, emit then wait response from multiple services', () => {
  let AMQP_URL: string;
  let sandbox: sinon.SinonSandbox;
  let eventManagers: EventManager[];
  let baseOptions: Partial<IEventManagerOptions>;
  beforeEach(async function () {
    // Connect to CloudAMQP
    if (!process.env.AMQP_URL) {
      this.skip();
      throw new Error('Should define process.env.AMQP_URL');
    }
    AMQP_URL = process.env.AMQP_URL;
    await clean(AMQP_URL);
    baseOptions = {
      url: AMQP_URL,
      logLevel: 'error',
      application: 'unittest',
    };

    sandbox = sinon.createSandbox();
  });
  afterEach(async () => {
    for (const em of eventManagers) {
      await em.close();
    }

    sandbox.restore();
  });

  it('Should be able to emit and wait for response two instances', async () => {
    /** given */
    const emA = new EventManager({ ...baseOptions, application: 'A' });
    const emB = new EventManager({ ...baseOptions, application: 'B' });
    eventManagers = [emA, emB]; // For close
    /** when */
    emB.on('add', async payload => {
      return { result: payload.a + payload.b };
    });
    await pause(500);
    const response = await emA.emitAndWait('add', { a: 32, b: 38 });
    await pause(500);
    /** then */
    expect(response.result).to.equal(70);
  });

  it('Should be able to emit and wait for response three instances', async () => {
    /** given */
    const emA = new EventManager({ ...baseOptions, application: 'A' });
    const emB = new EventManager({ ...baseOptions, application: 'B' });
    const emC = new EventManager({ ...baseOptions, application: 'C' });
    await emA.initialize(); // Only one is needed (create DLD and QnQ)
    eventManagers = [emA, emB, emC]; // For close
    /** when */
    emB.on('add', async payload => {
      return { result: payload.a + payload.b };
    });
    emC.on('multiply', async payload => {
      return { result: payload.a * payload.b };
    });
    await pause(500);
    const addResponse = await emA.emitAndWait('add', { a: 42, b: 42 });
    await pause(500);
    const multiplyResponse = await emA.emitAndWait('multiply', { a: addResponse.result, b: 3 });
    await pause(500);
    /** then */
    expect(multiplyResponse.result).to.equal(252);
  });

  it('Should be able to emit and wait for response two times', async () => {
    /** given */
    const emA = new EventManager({ ...baseOptions, application: 'A' });
    const emB = new EventManager({ ...baseOptions, application: 'B' });
    const emC = new EventManager({ ...baseOptions, application: 'C' });

    await emA.initialize(); // Only one is needed (create DLD and QnQ)
    eventManagers = [emA, emB, emC]; // For close
    /** when */
    emB.on('add', async payload => {
      return { result: payload.a + payload.b };
    });

    await pause(500);
    const add1 = await emA.emitAndWait('add', { a: 3, b: 42 });
    const add2 = await emA.emitAndWait('add', { a: 3, b: 3 });
    await pause(500);
    /** then */
    expect(add1.result).to.equal(45);
    expect(add2.result).to.equal(6);
  });

  it('Should be able to emit and wait for response three instances', async () => {
    /** given */
    const emA = new EventManager({ ...baseOptions, application: 'A' });
    const emB = new EventManager({ ...baseOptions, application: 'B' });
    const emC = new EventManager({ ...baseOptions, application: 'C' });
    const emD = new EventManager({ ...baseOptions, application: 'D' });
    await emA.initialize(); // Only one is needed (create DLD and QnQ)
    eventManagers = [emA, emB, emC, emD]; // For close
    /** when */
    emB.on('calculate', async payload => {
      const response = await emB.emitAndWait(payload.operation, { a: payload.a, b: payload.b });
      return { result: response.result };
    });
    emC.on('multiply', async payload => {
      return { result: payload.a * payload.b };
    });
    emD.on('divide', async payload => {
      return { result: payload.a / payload.b };
    });
    await pause(500);
    const multiply = await emA.emitAndWait('calculate', { operation: 'multiply', a: 3, b: 42 });
    const divide = await emA.emitAndWait('calculate', { operation: 'divide', a: 3, b: 3 });
    await pause(500);
    /** then */
    expect(multiply.result).to.equal(126);
    expect(divide.result).to.equal(1);
  });
}).timeout(45000);
