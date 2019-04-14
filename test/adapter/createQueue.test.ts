import { expect } from "chai";
import { describe, it } from "mocha";
import * as sinon from "sinon";
import * as adapter from "../../src/adapter";
import { createLogger } from "../../src/lib/logger";
describe("RabbitMQ Event Manager > Adapter > createQueue", () => {
  let sandbox: sinon.SinonSandbox;
  beforeEach(async () => {
    await adapter.disconnect();
    sandbox = sinon.createSandbox();
    createLogger({ transportMode: "mute" });
  });
  afterEach(async () => {
    sandbox.restore();
  });

  it(`Should be able to create a queue on rabbitMQ`, async () => {
    /** given */
    const queueName = "my-queue";
    const channel = {
      close: sandbox.stub(),
      assertQueue: sandbox.stub().resolves(),
      bindQueue: sandbox.stub().resolves(),
      prefetch: sandbox.stub().resolves()
    };
    const exName = "my-exchange";

    /** when */
    const queue = await adapter.createQueue(channel as any, queueName, exName);
    /** then */
    expect(queue).to.equal(queueName);
  });

  it(`Queue should be durable, without autoDelete`, async () => {
    /** given */
    const queueName = "my-queue";
    const channel = {
      close: sandbox.stub(),
      assertQueue: sandbox.stub().resolves(),
      bindQueue: sandbox.stub().resolves(),
      prefetch: sandbox.stub().resolves()
    };
    const exName = "my-exchange";

    /** when */
    await adapter.createQueue(channel as any, queueName, exName);
    /** then */
    const args = channel.assertQueue.args[0];
    expect(args[0]).to.equal(queueName);
    expect(args[1]).to.eql({
      durable: true,
      autoDelete: false
    });
  });

  it(`Queue should be bind to exhange`, async () => {
    /** given */
    const queueName = "my-queue";
    const channel = {
      close: sandbox.stub(),
      assertQueue: sandbox.stub().resolves(),
      bindQueue: sandbox.stub().resolves(),
      prefetch: sandbox.stub().resolves()
    };
    const exName = "my-exchange";

    /** when */
    await adapter.createQueue(channel as any, queueName, exName);
    /** then */
    const args = channel.bindQueue.args[0];
    expect(args[0]).to.equal(queueName);
    expect(args[1]).to.equal(exName);
    expect(args[2]).to.equal("");
  });

  it(`Queue should manage one message at a time`, async () => {
    /** given */
    const queueName = "my-queue";
    const channel = {
      close: sandbox.stub(),
      assertQueue: sandbox.stub().resolves(),
      bindQueue: sandbox.stub().resolves(),
      prefetch: sandbox.stub().resolves()
    };
    const exName = "my-exchange";

    /** when */
    await adapter.createQueue(channel as any, queueName, exName);
    /** then */
    const args = channel.prefetch.args[0];
    expect(args[0]).to.equal(1);
  });
});
