import { expect } from 'chai';
import { describe, it } from 'mocha';
import * as sinon from 'sinon';
import * as adapter from '../../src/adapter';
import { createLogger } from '../../src/lib/logger';
describe('RabbitMQ Event Manager > Adapter > createExchange', () => {
  let sandbox: sinon.SinonSandbox;
  beforeEach(async () => {
    await adapter.disconnect();
    sandbox = sinon.createSandbox();
    createLogger({ transportMode: 'mute' });
  });
  afterEach(async () => {
    sandbox.restore();
  });

  it(`Should be able to create an exchange on rabbitMQ`, async () => {
    /** given */
    const exName = 'event_name';
    const channel = {
      close: sandbox.stub(),
      assertExchange: sandbox.stub().resolves(exName),
    };
    const alternateExchange = null;
    const options = undefined;

    /** when */
    const exchange = await adapter.createExchange(channel as any, exName, alternateExchange, options);
    /** then */
    expect(exchange).to.equal(exName);
  });

  it(`Should able to create an exchange 'fanout' on rabbitMQ with the name of the event`, async () => {
    /** given */
    const exName = 'event_name';
    const channel = {
      close: sandbox.stub(),
      assertExchange: sandbox.stub().resolves(exName),
    };
    const alternateExchange = null;
    const options = undefined;

    /** when */
    const exchange = await adapter.createExchange(channel as any, exName, alternateExchange, options);
    /** then */
    expect(channel.assertExchange.args[0][0]).to.equal(exName);
    expect(channel.assertExchange.args[0][1]).to.equal('fanout');
  });

  it(`Should able to create an exchang with options`, async () => {
    /** given */
    const exName = 'event_name';
    const channel = {
      close: sandbox.stub(),
      assertExchange: sandbox.stub().resolves(exName),
    };
    /** when */
    const exchange = await adapter.createExchange(channel as any, exName);
    /** then */
    expect(channel.assertExchange.args[0][2]).to.eql({
      durable: true,
      autoDelete: false,
    });
  });

  it(`Should able to create an exchang with alternate Exhange`, async () => {
    /** given */
    const exName = 'event_name';
    const channel = {
      close: sandbox.stub(),
      assertExchange: sandbox.stub().resolves(exName),
    };
    const alternateExchange = 'my-alternate-exchange';
    /** when */
    const exchange = await adapter.createExchange(channel as any, exName, alternateExchange);
    /** then */
    expect(channel.assertExchange.args[0][2]).to.eql({
      durable: true,
      autoDelete: false,
      alternateExchange,
    });
  });
});
