import { expect } from "chai";
import { describe, it } from "mocha";
import * as sinon from "sinon";
import { EventManagerError } from "../../src/lib/EventManagerError";
describe("RabbitMQ Event Manager, EventManagerError  ", () => {
  let sandbox: sinon.SinonSandbox;
  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });
  afterEach(() => {
    sandbox.restore();
  });

  it(`Should be able to throw a default error`, () => {
    /** given */

    /** when */
    try {
      throw new EventManagerError();
    } catch (err) {
      /** then */
      expect(err.message).to.contains("An error occured");
      expect(err.cause).to.equal(undefined);
    }
  });

  it(`Should be able to define an error message`, () => {
    /** given */

    /** when */
    try {
      throw new EventManagerError("new message");
    } catch (err) {
      /** then */
      expect(err.message).to.contains("new message");
      expect(err.cause).to.equal(undefined);
    }
  });

  it(`Should be able to define an root error`, () => {
    /** given */
    const rootError = new Error("My Root Error");
    /** when */
    try {
      throw new EventManagerError("new message", rootError);
    } catch (err) {
      /** then */
      expect(err.message).to.contains("new message");
      expect(err.cause).to.equal(rootError);
    }
  });
});
