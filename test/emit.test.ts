import { expect } from "chai";
import { describe, it } from "mocha";
import * as sinon from "sinon";
import * as adapter from "../src/adapter";
import EventManager from "../src/index";
import { IEventManagerOptions } from "../src/lib/interfaces";
import { EventManagerError } from "../src/lib/EventManagerError";
describe("RabbitMQ Event Manager, emitting events ", () => {
  let sandbox: sinon.SinonSandbox;
  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });
  afterEach(() => {
    sandbox.restore();
  });

  it(`Should create a channel to RabbitMq when emitting`, async () => {
    /** given */
    const createChannelStub = sandbox.stub(adapter, "createChannel");
    const createExchangeStub = sandbox.stub(adapter, "createExchange");
    const publishStub = sandbox.stub(adapter, "publish");
    const options = { url: "amqp://my.server.url" };
    const eventManager = new EventManager(options);
    /** when */
    await eventManager.emit("event_name", {});

    /** then */
    expect(createChannelStub.called).to.equal(true);
    expect(createChannelStub.args[0][0]).to.equal(options.url);
    expect(createExchangeStub.called).to.equal(true);
    expect(publishStub.called).to.equal(true);
  });

  it(`Should create an exchange with the name of the event`, async () => {
    /** given */
    // Create a "channel" reference, to be sure it's the one passed to
    // create the exchange
    const channel = sandbox.stub();
    const createChannelStub = sandbox.stub(adapter, "createChannel");
    createChannelStub.resolves(channel as any);

    const createExchangeStub = sandbox.stub(adapter, "createExchange");
    const publishStub = sandbox.stub(adapter, "publish");
    const options = { url: "amqp://my.server.url" };
    const eventManager = new EventManager(options);
    /** when */
    await eventManager.emit("event_name", {});

    /** then */

    expect(createExchangeStub.args[0][0]).to.equal(channel);
    expect(createExchangeStub.args[0][1]).to.equal("event_name");
  });

  it(`Should add metas to the payload`, async () => {
    /** given */
    sandbox.stub(adapter, "createChannel");

    const createExchangeStub = sandbox.stub(adapter, "createExchange");
    const publishStub = sandbox.stub(adapter, "publish");
    const options = { url: "amqp://my.server.url" };
    const eventManager = new EventManager(options);
    /** when */
    await eventManager.emit("event_name", {});

    /** then */
    expect(publishStub.args[0][1]).to.equal("event_name");
    expect(publishStub.args[0][2]).to.have.property("_metas");
  });

  it(`Should have metas to the payload`, async () => {
    /** given */
    sandbox.stub(adapter, "createChannel");

    const createExchangeStub = sandbox.stub(adapter, "createExchange");
    const publishStub = sandbox.stub(adapter, "publish");
    const options = { url: "amqp://my.server.url" };
    const eventManager = new EventManager(options);
    /** when */
    await eventManager.emit("event_name", {});

    /** then */
    const metas = publishStub.args[0][2]._metas;
    expect(metas).to.have.property("guid");
    expect(metas).to.have.property("timestamp");
    expect(metas).to.have.property("application");
    expect(metas).to.have.property("name");
  });
  it(`Should contain the name of app and the event name in the metas paylaod`, async () => {
    /** given */
    sandbox.stub(adapter, "createChannel");
    sandbox.stub(adapter, "createExchange");
    const publishStub = sandbox.stub(adapter, "publish");
    const options = {
      url: "amqp://my.server.url",
      application: "myApp"
    };
    const eventManager = new EventManager(options);
    /** when */
    await eventManager.emit("event_name", {});

    /** then */
    const metas = publishStub.args[0][2]._metas;

    if (metas && metas.name) {
      expect(metas.name).to.equal("event_name");
    } else {
      expect(metas).to.have.property("name");
    }
    if (metas && metas.application) {
      expect(metas.application).to.equal("myApp");
    } else {
      expect(metas).to.have.property("application");
    }
  });
  it(`Should be able to add metas values the payload`, async () => {
    /** given */
    sandbox.stub(adapter, "createChannel");

    const createExchangeStub = sandbox.stub(adapter, "createExchange");
    const publishStub = sandbox.stub(adapter, "publish");
    const options: Partial<IEventManagerOptions> = {
      url: "amqp://my.server.url",
      metas: metas => {
        return {
          ...metas,
          other: "OtherValue"
        };
      }
    };
    const eventManager = new EventManager(options);
    /** when */
    await eventManager.emit("event_name", {});

    /** then */
    const metas = publishStub.args[0][2]._metas;

    if (metas && metas.other) {
      expect(metas.other).to.equal("OtherValue");
    } else {
      expect(metas).to.have.property("other");
    }
  });

  it(`Should be able to remove metas from payload`, async () => {
    /** given */
    sandbox.stub(adapter, "createChannel");
    sandbox.stub(adapter, "createExchange");
    const publishStub = sandbox.stub(adapter, "publish");
    const options: Partial<IEventManagerOptions> = {
      url: "amqp://my.server.url",
      metas: false
    };
    const eventManager = new EventManager(options);
    /** when */
    await eventManager.emit("event_name", {});

    /** then */
    expect(publishStub.args[0][2]).to.not.have.property("_metas");
  });

  it(`Should throws Error wirt root cause when error while emiting`, done => {
    /** given */
    const createChannelStub = sandbox.stub(adapter, "createChannel");
    const rootCauseError = new Error("Unable to Create Channel");
    createChannelStub.throws(rootCauseError);

    const eventManager = new EventManager();
    /** when */
    eventManager
      .emit("event_name", {})
      .then(() => {
        done(new Error("Should not resolve emitter"));
      })
      .catch(err => {
        /** then */
        expect(err).to.be.an.instanceOf(EventManagerError);
        expect(err.message).to.equal(`Unable to emit event event_name`);
        expect(err.cause).to.equal(rootCauseError);
        done();
      });
  });
});
