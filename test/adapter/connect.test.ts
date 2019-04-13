import * as amqp from "amqplib";
import { expect } from "chai";
import { describe, it } from "mocha";
import * as sinon from "sinon";
import * as adapter from "../../src/adapter";
import { EventManagerError } from "../../src/lib/EventManagerError";
describe("RabbitMQ Event Manager > Adapter > connect", () => {
  let sandbox: sinon.SinonSandbox;
  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });
  afterEach(async () => {
    await adapter.disconnect();
    sandbox.restore();
  });

  it(`Should be able to connect to RabbitMQ`, async () => {
    /** given */
    const url = "amqp://url";
    const expectedConnection = {
      close: sandbox.stub().resolves(),
      connect: sandbox.stub().resolves()
    };

    sandbox.stub(amqp, "connect").resolves(expectedConnection as any);
    /** when */
    const connection = await adapter.connect(url);
    /** then */
    expect(connection).to.equal(expectedConnection);
  });

  it(`Should throw if error when trying to connect to RabbitMQ`, async () => {
    /** given */
    const url = "amqp://url";
    const rootCauseError = new Error("Connection error");
    sandbox.stub(amqp, "connect").rejects(rootCauseError);
    /** when */
    try {
      await adapter.connect(url);
    } catch (err) {
      /** then */
      expect(err).to.be.an.instanceOf(EventManagerError);
      expect(err.cause).to.equal(rootCauseError);
    }
  });
});
