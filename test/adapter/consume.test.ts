import { expect } from 'chai';
import { describe, it } from 'mocha';
import * as sinon from 'sinon';
import * as adapter from '../../src/adapter';
import { createLogger } from '../../src/lib/logger';

describe('RabbitMQ Event Manager, consume Event', () => {
  let sandbox: sinon.SinonSandbox;
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    createLogger({ transportMode: 'mute' });
  });
  afterEach(() => {
    sandbox.restore();
  });
  it(`Should not accept a not defined message`, done => {
    /** given */

    const channel = {
      consume: sandbox.stub(),
    };
    channel.consume.callsArgWith(1, null);
    const listener = () => {
      throw new Error('Should not be called');
    };
    const options = {};
    /** when */
    adapter
      .consume(channel as any, 'QUEUE', listener, options as any)
      .then(() => {
        done(new Error('Should not be resolved'));
      })
      .catch(err => {
        expect(err.message).to.contains('Message received is null');
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
      nack: sandbox.stub(),
    };
    channel.consume.callsArgWith(1, message);
    const listener = () => {
      throw new Error('Should not be called');
    };
    const options = {};
    /** when */
    adapter
      .consume(channel as any, 'QUEUE', listener, options as any)
      .then(() => {
        done(new Error('Should not be resolved'));
      })
      .catch(err => {
        expect(err.message).to.contains('Error Parsing message');
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
      nack: sandbox.stub(),
    };
    channel.consume.callsArgWith(1, message);
    const listener = () => {
      throw new Error('Should not be called');
    };
    const options = {};
    /** when */
    adapter
      .consume(channel as any, 'QUEUE', listener, options as any)
      .then(() => {
        done(new Error('Should not be resolved'));
      })
      .catch(err => {
        expect(channel.nack.calledOnceWith(message, false, false)).to.equal(true);
        done();
      });
    /** then */
    expect(true).to.not.equal(false);
  });

  it(`Should nack message, if listener rejects,`, done => {
    /** given */
    const message = {
      fields: {
        deliveryTag: 1,
      },
      content: {
        toString() {
          return JSON.stringify({
            _metas: { guid: 'guid' },
          });
        },
      },
    };

    const channel = {
      consume: sandbox.stub(),
      nack: sandbox.stub(),
    };
    channel.consume.callsArgWith(1, message);
    const listener = async () => {
      throw new Error('Message is rejected');
    };
    const options = { maxNumberOfMessagesRetries: 10 };
    /** when */
    adapter
      .consume(channel as any, 'QUEUE', listener, options as any)
      .then(() => {
        done(new Error('Should not be resolved'));
      })
      .catch(err => {
        expect(err.message).to.contains('Listener throws Error');
        expect(channel.nack.calledOnceWith(message, false, false)).to.equal(true);
        done();
      });
    /** then */
    expect(true).to.not.equal(false);
  });

  it(`Should reject if message is nil`, done => {
    /** given */

    const channel = {
      consume: sandbox.stub(),
      ack: sandbox.stub(),
    };
    channel.consume.callsArgWith(1, null);
    const listener = async () => {
      /** */
    };
    const options = { maxNumberOfMessagesRetries: 10 };
    /** when */
    adapter
      .consume(channel as any, 'QUEUE', listener, options as any)
      .then(() => {
        /** then */
        done(new Error('Should not be resolved'));
      })
      .catch(err => {
        expect(err.message).to.contains('Message received is null or not defined');
        done();
      });
  });

  it(`Should reject if error calling rabbitmq`, done => {
    /** given */
    const message = {
      fields: {
        deliveryTag: 1,
      },
      content: {
        toString() {
          return JSON.stringify({
            _metas: { guid: 'guid' },
          });
        },
      },
    };
    const channel = {
      consume: sandbox.stub(),
    };
    channel.consume.throws(new Error('Error Throwing'));
    const listener = async () => {
      /** */
    };
    const options = { maxNumberOfMessagesRetries: 10 };
    /** when */
    adapter
      .consume(channel as any, 'QUEUE', listener, options as any)
      .then(() => {
        /** then */
        done(new Error('Should not be resolved'));
      })
      .catch(err => {
        expect(err.message).to.contains('Error Consuming queue');
        done();
      });
  });

  it(`Should ack message if listener resolves true`, done => {
    /** given */
    const message = {
      fields: {
        deliveryTag: 1,
      },
      content: {
        toString() {
          return JSON.stringify({
            _metas: { guid: 'guid' },
          });
        },
      },
    };
    const channel = {
      consume: sandbox.stub(),
      ack: sandbox.stub(),
    };
    channel.consume.callsArgWith(1, message);
    const listener = async () => {
      return;
    };
    const options = { maxNumberOfMessagesRetries: 10 };
    /** when */
    adapter
      .consume(channel as any, 'QUEUE', listener, options as any)
      .then(() => {
        /** then */
        expect(channel.ack.called).to.equal(true);
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  it(`Should ack message if listener resolves nothing (undefined)`, done => {
    /** given */
    const message = {
      fields: {
        deliveryTag: 1,
      },
      content: {
        toString() {
          return JSON.stringify({
            _metas: { guid: 'guid' },
          });
        },
      },
    };
    const channel = {
      consume: sandbox.stub(),
      ack: sandbox.stub(),
    };
    channel.consume.callsArgWith(1, message);
    const listener = async () => {
      /** return void */
    };
    const options = { maxNumberOfMessagesRetries: 10 };
    /** when */
    adapter
      .consume(channel as any, 'QUEUE', listener, options as any)
      .then(() => {
        /** then */
        expect(channel.ack.called).to.equal(true);
        done();
      })
      .catch((err: any) => {
        done(err);
      });
  });

  it(`Should ack message, event if deliveryTag > 10 (ISSUE #7)`, done => {
    // https://github.com/mimiz/rabbitmq-event-manager/issues/7
    /** given */
    const message = {
      fields: {
        deliveryTag: 11,
      },
      content: {
        toString() {
          return JSON.stringify({
            _metas: { guid: 'guid' },
          });
        },
      },
    };

    const channel = {
      consume: sandbox.stub(),
      nack: sandbox.stub(),
      ack: sandbox.stub(),
    };
    channel.consume.callsArgWith(1, message);
    const listener = () => {
      return Promise.resolve();
    };
    const options = { maxNumberOfMessagesRetries: 10 };
    /** when */
    adapter
      .consume(channel as any, 'QUEUE', listener, options as any)
      .then(() => {
        expect(channel.nack.called).to.equal(false);
        expect(channel.ack.called).to.equal(true);
        done();
      })
      .catch(err => {
        done(err);
      });
  });
});
