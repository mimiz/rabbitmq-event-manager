import { expect } from "chai";
import { describe, it } from "mocha";
import EventManager from "../src/index";
describe("RabbitMQ Event Manager", () => {
  it("should be able to send an event", () => {
    // GIVEN
    const eventManager = new EventManager();
    // WHEN
    eventManager.emit("event_name", {});
    // THEN
  });
});
