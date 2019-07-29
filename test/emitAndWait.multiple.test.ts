import axios from 'axios';
import { expect } from 'chai';
import { describe, it } from 'mocha';
import * as sinon from 'sinon';
import EventManager from '../src';
import { pause } from '../src/lib/helper';
import { IEventManagerOptions } from '../src/lib/interfaces';

describe('RabbitMQ Event Manager, emit then wait response from multiple services', () => {
  let AMQP_URL: string;
  let sandbox: sinon.SinonSandbox;
  let eventManagers: EventManager[];
  let baseOptions: Partial<IEventManagerOptions>;
  beforeEach(async function() {
    // Connect to CloudAMQP
    if (!process.env.AMQP_URL) {
      this.skip();
      throw new Error('Should define process.env.AMQP_URL');
    }
    AMQP_URL = process.env.AMQP_URL;
    await clean(AMQP_URL);
    baseOptions = {
      url: AMQP_URL,
      logLevel: 'info',
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
    console.log('add1 : ', add1);
    const add2 = await emA.emitAndWait('add', { a: 3, b: 3 });
    console.log('add2 : ', add2);
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
    console.log('multiply : ', multiply);
    const divide = await emA.emitAndWait('calculate', { operation: 'divide', a: 3, b: 3 });
    console.log('divide : ', divide);
    await pause(500);
    /** then */
    expect(multiply.result).to.equal(126);
    expect(divide.result).to.equal(1);
  });
}).timeout(45000);

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
      // tslint:disable-next-line: no-console
      console.log(`${queue.name} was deleted`);
    } catch (err) {
      throw err;
    }
  }
}
