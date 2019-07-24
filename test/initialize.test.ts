import { expect } from 'chai';
import { describe, it } from 'mocha';
import * as sinon from 'sinon';
import * as adapter from '../src/adapter';
import EventManager from '../src/index';
import { EventManagerError } from '../src/lib/EventManagerError';
describe('RabbitMQ Event Manager, Initialize Manager  ', () => {
  let sandbox: sinon.SinonSandbox;
  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });
  afterEach(() => {
    sandbox.restore();
  });

  it(`Should be able to initialize Manager `, async () => {
    /** given */
    const stubCreateChannel = sandbox.stub(adapter, 'createChannel');
    const stubCreateExchange = sandbox.stub(adapter, 'createExchange');
    const stubCreateQueue = sandbox.stub(adapter, 'createQueue');
    const eventManager = new EventManager();
    /** when */
    await eventManager.initialize();
    /** then */
    expect(stubCreateChannel.called).to.equal(true);
    expect(stubCreateExchange.calledTwice).to.equal(true);
    expect(stubCreateQueue.calledTwice).to.equal(true);
  });

  it(`Should throws if error to initialize Manager `, async () => {
    /** given */
    const stubCreateChannel = sandbox.stub(adapter, 'createChannel');
    const stubCreateExchange = sandbox.stub(adapter, 'createExchange');
    const stubCreateQueue = sandbox.stub(adapter, 'createQueue');
    const rootCauseError = new Error('Root Cause');
    stubCreateQueue.onSecondCall().throws(rootCauseError);
    const eventManager = new EventManager();
    /** when */
    try {
      await eventManager.initialize();
    } catch (err) {
      /** then */
      expect(err).to.be.an.instanceOf(EventManagerError);
      expect(err.cause).to.equal(rootCauseError);
      expect(stubCreateChannel.called).to.equal(true);
      expect(stubCreateExchange.calledTwice).to.equal(true);
      expect(stubCreateQueue.calledTwice).to.equal(true);
    }
  });
});
