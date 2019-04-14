import * as amqp from "amqplib";
import { expect } from "chai";
import { describe, it } from "mocha";
import * as sinon from "sinon";
import * as adapter from "../../src/adapter";
import { EventManagerError } from "../../src/lib/EventManagerError";
import { createLogger } from "../../src/lib/logger";
describe("RabbitMQ Event Manager > Adapter > createChannel", () => {
  let sandbox: sinon.SinonSandbox;
  beforeEach(async () => {
    await adapter.disconnect();
    sandbox = sinon.createSandbox();
    createLogger({ transportMode: "mute" });
  });
  afterEach(async () => {
    sandbox.restore();
  });

  it(`Should be able to create a channel on rabbitMQ`, async () => {
    /** given */
    const url = "amqp://url";
    const expectedChannel = {
      close: sandbox.stub()
    };
    const connection = {
      createConfirmChannel: sandbox.stub().resolves(expectedChannel)
    };
    sandbox.stub(amqp, "connect").resolves(connection as any);
    /** when */
    const channel = await adapter.createChannel(url);
    /** then */
    expect(channel).to.equal(expectedChannel);
  });

  it(`Should throws of error while creating channel on rabbitMQ`, async () => {
    /** given */
    const url = "amqp://url";
    const rootCauseError = new Error("AAA Error creating confirm channel");
    const connection = {
      createConfirmChannel: sandbox.stub().rejects(rootCauseError)
    };
    sandbox.stub(amqp, "connect").resolves(connection as any);
    /** when */
    try {
      await adapter.createChannel(url);
    } catch (err) {
      /** then */
      expect(err).to.be.an.instanceOf(EventManagerError);
      expect(err.cause).to.equal(rootCauseError);
    }
  });
});
