import { expect } from "chai";
import { describe, it } from "mocha";
import * as sinon from "sinon";
import { EventManagerError } from "../../src/lib/EventManagerError";
import { LOGGER, setLogger } from "../../src/lib/logger";
describe("RabbitMQ Event Manager, Logger", () => {
  let sandbox: sinon.SinonSandbox;
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    setLogger(null);
  });
  afterEach(() => {
    sandbox.restore();
  });

  it(`Should throw error if logger not initialized`, () => {
    /** given */
    /** when */
    try {
      LOGGER.log("error", "demo");
    } catch (err) {
      /** then */
      expect(err).to.be.an.instanceOf(EventManagerError);
      expect(err.message).to.contains("Logger has not been inititialized");
      expect(err.cause).to.equal(undefined);
    }
  });
});
