import { expect } from "chai";
import { describe, it } from "mocha";
import * as sinon from "sinon";
import * as adapter from "../src/adapter";
import EventManager from "../src/index";
import { IEventManagerOptions } from "../src/lib/interfaces";
describe("RabbitMQ Event Manager, Listening events ", () => {
  let sandbox: sinon.SinonSandbox;
  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });
  afterEach(() => {
    sandbox.restore();
  });

  it(`Should create a channel to be able to listen a event`, done => {
    /** given */
    const createChannelStub = sandbox.stub(adapter, "createChannel");
    const createExchangeStub = sandbox.stub(adapter, "createExchange");
    const createQueueStub = sandbox.stub(adapter, "createQueue");
    const consumeStub = sandbox.stub(adapter, "consume");
    consumeStub.callsArg(2); // Call the listener

    const eventManager = new EventManager();

    /** when */

    eventManager.on("event_name_listen", payload => {
      /** then */
      try {
        expect(createChannelStub.called).to.equal(true);
        expect(createExchangeStub.called).to.equal(true);
        expect(createQueueStub.called).to.equal(true);
        expect(consumeStub.called).to.equal(true);
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  it(`Should create exchange when listening an event`, done => {
    /** given */
    const createChannelStub = sandbox.stub(adapter, "createChannel");
    const createExchangeStub = sandbox.stub(adapter, "createExchange");
    const createQueueStub = sandbox.stub(adapter, "createQueue");
    const consumeStub = sandbox.stub(adapter, "consume");
    consumeStub.callsArg(2); // Call the listener

    const eventManager = new EventManager();

    /** when */

    eventManager.on("event_name_listen", payload => {
      /** then */
      try {
        expect(createExchangeStub.args[0][1]).to.equal("event_name_listen");
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  it(`Should create queue bound to exchange when listening an event`, done => {
    /** given */
    const createChannelStub = sandbox.stub(adapter, "createChannel");
    const createExchangeStub = sandbox.stub(adapter, "createExchange");
    createExchangeStub.resolves("event_name_listen");
    const createQueueStub = sandbox.stub(adapter, "createQueue");
    const consumeStub = sandbox.stub(adapter, "consume");
    consumeStub.callsArg(2); // Call the listener

    const eventManager = new EventManager();

    /** when */

    eventManager.on("event_name_listen", payload => {
      /** then */
      try {
        expect(createQueueStub.args[0][1]).to.equal(
          "application::event_name_listen"
        );
        expect(createQueueStub.args[0][2]).to.equal("event_name_listen");
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  it.skip(`Should call nack if rejected `, async () => {
    /** given */

    /** when */

    /** then */
    expect(true).to.not.equal(false);
  });

  it.skip(`Should be able to "init" rabbitmq, creating exhange and queues`, async () => {
    /** given */

    /** when */

    /** then */
    expect(true).to.not.equal(false);
  });
});
