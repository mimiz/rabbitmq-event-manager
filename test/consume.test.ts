import { Channel } from "amqplib";
import { expect } from "chai";
import { describe, it } from "mocha";
import * as sinon from "sinon";
import * as adapter from "../src/adapter";
import EventManager from "../src/index";
import { IEventManagerOptions } from "../src/lib/interfaces";
describe("RabbitMQ Event Manager, consume Event", () => {
  let sandbox: sinon.SinonSandbox;
  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });
  afterEach(() => {
    sandbox.restore();
  });
  it(`Should not accept a not defined message`, done => {
    /** given */

    const channel = {
      consume: sandbox.stub()
    };
    channel.consume.callsArgWith(1, null);
    const listener = () => {
      throw new Error("Should not be called");
    };
    const options = {};
    /** when */
    adapter
      .consume(channel as any, "QUEUE", listener, options as any)
      .then(() => {
        done(new Error("Should not be resolved"));
      })
      .catch(err => {
        expect(err.message).to.contains("Message received is null");
        done();
      });
    /** then */
    expect(true).to.not.equal(false);
  });

  it(`Should not accept message that can not be json parsed`, done => {
    /** given */
    const message = 1; // not json parsable
    const channel = {
      consume: sandbox.stub(),
      nack: sandbox.stub()
    };
    channel.consume.callsArgWith(1, message);
    const listener = () => {
      throw new Error("Should not be called");
    };
    const options = {};
    /** when */
    adapter
      .consume(channel as any, "QUEUE", listener, options as any)
      .then(() => {
        done(new Error("Should not be resolved"));
      })
      .catch(err => {
        expect(err.message).to.contains("Error Parsing message");
        done();
      });
    /** then */
    expect(true).to.not.equal(false);
  });

  it(`Should nack message, and not requeue, that can not be json parsed`, done => {
    /** given */
    const message = 1; // not json parsable
    const channel = {
      consume: sandbox.stub(),
      nack: sandbox.stub()
    };
    channel.consume.callsArgWith(1, message);
    const listener = () => {
      throw new Error("Should not be called");
    };
    const options = {};
    /** when */
    adapter
      .consume(channel as any, "QUEUE", listener, options as any)
      .then(() => {
        done(new Error("Should not be resolved"));
      })
      .catch(err => {
        expect(channel.nack.calledOnceWith(message, false, false)).to.equal(
          true
        );
        done();
      });
    /** then */
    expect(true).to.not.equal(false);
  });

  it(`Should nack message, tryied too many time`, done => {
    /** given */
    const message = {
      fields: {
        deliveryTag: 11
      },
      content: {
        toString() {
          return JSON.stringify({
            _metas: { guid: "guid" }
          });
        }
      }
    };

    const channel = {
      consume: sandbox.stub(),
      nack: sandbox.stub()
    };
    channel.consume.callsArgWith(1, message);
    const listener = () => {
      throw new Error("Should not be called");
    };
    const options = { maxNumberOfMessagesRetries: 10 };
    /** when */
    adapter
      .consume(channel as any, "QUEUE", listener, options as any)
      .then(() => {
        done(new Error("Should not be resolved"));
      })
      .catch(err => {
        expect(err.message).to.contains("has been retried more than");
        expect(channel.nack.calledOnceWith(message, false, false)).to.equal(
          true
        );
        done();
      });
    /** then */
    expect(true).to.not.equal(false);
  });

  it(`Should nack message, if listener rejects,`, done => {
    /** given */
    const message = {
      fields: {
        deliveryTag: 1
      },
      content: {
        toString() {
          return JSON.stringify({
            _metas: { guid: "guid" }
          });
        }
      }
    };

    const channel = {
      consume: sandbox.stub(),
      nack: sandbox.stub()
    };
    channel.consume.callsArgWith(1, message);
    const listener = async () => {
      throw new Error("Message is rejected");
    };
    const options = { maxNumberOfMessagesRetries: 10 };
    /** when */
    adapter
      .consume(channel as any, "QUEUE", listener, options as any)
      .then(() => {
        done(new Error("Should not be resolved"));
      })
      .catch(err => {
        expect(err.message).to.contains("Listener throws Error");
        expect(channel.nack.calledOnceWith(message, false, false)).to.equal(
          true
        );
        done();
      });
    /** then */
    expect(true).to.not.equal(false);
  });
});
