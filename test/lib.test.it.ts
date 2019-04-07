import { expect } from "chai";
import { describe, it } from "mocha";
import * as adapter from "../src/adapter";
import EventManager from "../src/index";
import { IEventManagerOptions } from "../src/lib/interfaces";

describe("RabbitMQ Event Manager", () => {
  let eventManager: EventManager;
  beforeEach(() => {
    const options: Partial<IEventManagerOptions> = {
      url: "amqp://btbadmin:password@localhost/",
      application: "CONSUMER"
    };
    eventManager = new EventManager(options);
  });
  afterEach(() => {
    eventManager.close();
  });

  it.skip(`Should create a channel to RabbitMq when emitting`, async () => {
    const options = { url: "amqp://btbadmin:password@localhost/" };
    const eventManager = new EventManager(options);
    /** when */
    await eventManager.emit("event_name", {});

    /** then */
    expect(true).to.be.true;
  });

  it(`Should listen event`, done => {
    /** when */

    eventManager.on("MY_EVENT_NAME", async payload => {
      /** then */
      // console.log(payload);
      throw new Error("aaa");
    });

    eventManager.emit("MY_EVENT_NAME", { key: "value" });
    setTimeout(() => {
      done();
    }, 100);
  });
});
