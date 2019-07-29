import { expect } from 'chai';
import { describe, it } from 'mocha';
import * as sinon from 'sinon';
import * as adapter from '../src/adapter';
import EventManager from '../src/index';
import { EventManagerError } from '../src/lib/EventManagerError';
describe('RabbitMQ Event Manager, Listening events ', () => {
  let sandbox: sinon.SinonSandbox;
  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });
  afterEach(() => {
    sandbox.restore();
  });

  it(`Should create a channel to be able to listen a event`, done => {
    /** given */
    const createChannelStub = sandbox.stub(adapter, 'createChannel');
    const createExchangeStub = sandbox.stub(adapter, 'createExchange');
    const createQueueStub = sandbox.stub(adapter, 'createQueue');
    const consumeStub = sandbox.stub(adapter, 'consume');
    consumeStub.callsArg(2); // Call the listener

    const eventManager = new EventManager();

    /** when */

    eventManager.on('event_name_listen', async payload => {
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
    const createChannelStub = sandbox.stub(adapter, 'createChannel');
    const createExchangeStub = sandbox.stub(adapter, 'createExchange');
    const createQueueStub = sandbox.stub(adapter, 'createQueue');
    const consumeStub = sandbox.stub(adapter, 'consume');
    consumeStub.callsArg(2); // Call the listener

    const eventManager = new EventManager();

    /** when */

    eventManager.on('event_name_listen', async payload => {
      /** then */
      try {
        expect(createExchangeStub.args[0][1]).to.equal('event_name_listen');
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  it(`Should create queue bound to exchange when listening an event`, done => {
    /** given */
    const createChannelStub = sandbox.stub(adapter, 'createChannel');
    const createExchangeStub = sandbox.stub(adapter, 'createExchange');
    createExchangeStub.resolves('event_name_listen');
    const createQueueStub = sandbox.stub(adapter, 'createQueue');
    const consumeStub = sandbox.stub(adapter, 'consume');
    consumeStub.callsArg(2); // Call the listener

    const eventManager = new EventManager();

    /** when */

    eventManager.on('event_name_listen', async payload => {
      /** then */
      try {
        expect(createQueueStub.args[0][1]).to.equal('application::event_name_listen');
        expect(createQueueStub.args[0][2]).to.equal('event_name_listen');
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  it(`Should throw an error if something went wrong while listening`, done => {
    /** given */
    const createChannelStub = sandbox.stub(adapter, 'createChannel');
    const rootCauseError = new Error('Unable to Create Channel');
    createChannelStub.throws(rootCauseError);
    const eventManager = new EventManager();
    const payloadHandler = sandbox.stub().callsFake(() => {
      done();
    });

    /** When */
    eventManager.on('event_name_listen', payloadHandler).catch((err: EventManagerError) => {
      /** then */
      expect(err).to.be.an.instanceOf(EventManagerError);
      expect(err.message).to.equal(`Unable to listen event event_name_listen`);
      expect(err.cause).to.equal(rootCauseError);
      expect(payloadHandler.called).to.equal(false);
      done();
    });
  });

  it('Should be able to define some specific options to the queue when listening', done => {
    /** given */
    const createChannelStub = sandbox.stub(adapter, 'createChannel');
    const createExchangeStub = sandbox.stub(adapter, 'createExchange');
    createExchangeStub.resolves('event_name_listen');
    const createQueueStub = sandbox.stub(adapter, 'createQueue');
    const consumeStub = sandbox.stub(adapter, 'consume');
    consumeStub.callsArg(2); // Call the listener

    const eventManager = new EventManager();

    const specificOptions = { ttl: 444 };
    /** when */

    eventManager.on(
      'event_name_listen',
      async payload => {
        /** then */
        try {
          expect(createQueueStub.args[0][1]).to.equal('application::event_name_listen');
          expect(createQueueStub.args[0][2]).to.equal('event_name_listen');
          expect(createQueueStub.args[0][3]).to.have.property('messageTtl');
          if (createQueueStub.args[0][3]) {
            expect(createQueueStub.args[0][3].messageTtl).to.equal(specificOptions.ttl);
          }
          done();
        } catch (e) {
          done(e);
        }
      },
      specificOptions
    );
  });
});
