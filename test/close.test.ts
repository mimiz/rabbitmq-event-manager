import { expect } from 'chai';
import { describe, it } from 'mocha';
import * as sinon from 'sinon';
import * as adapter from '../src/adapter';
import EventManager from '../src/index';
describe('RabbitMQ Event Manager, Close Manager  ', () => {
  let sandbox: sinon.SinonSandbox;
  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });
  afterEach(() => {
    sandbox.restore();
  });

  it(`Should be able to close Manager `, async () => {
    /** given */
    const stubDisconnect = sandbox.stub(adapter, 'disconnect');
    const eventManager = new EventManager();
    /** when */
    await eventManager.close();
    /** then */
    expect(stubDisconnect.called).to.equal(true);
  });
});
