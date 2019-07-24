import { expect } from 'chai';
import { describe, it } from 'mocha';
import * as sinon from 'sinon';
import * as adapter from '../../src/adapter';
import { createLogger } from '../../src/lib/logger';

describe('RabbitMQ Event Manager, consume Event max retries', () => {
  let sandbox: sinon.SinonSandbox;
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    createLogger({ transportMode: 'mute' });
  });
  afterEach(() => {
    sandbox.restore();
  });

  it(`Should nack a message that has been retried too many times`, done => {
    // https://github.com/mimiz/rabbitmq-event-manager/issues/7
    /** given */
    const channel = {
      consume: sandbox.stub(),
      nack: sandbox.stub(),
    };

    const listener = async () => {
      return false;
    };
    const message = createMessage('guid-guid-guid');
    const options = { maxNumberOfMessagesRetries: 3 };
    /** when */
    // We need to send 10 messages
    const promises = [];
    for (let i = 0; i < options.maxNumberOfMessagesRetries; i++) {
      promises.push(createPromiseForFirstCalls(message, channel, listener, options));
    }
    Promise.all(promises)
      .then(() => {
        channel.consume.callsArgWith(1, message);
        adapter
          .consume(channel as any, 'QUEUE', listener, options as any)
          .then(() => {
            done(new Error('Should not resolved'));
          })
          .catch(() => {
            try {
              expect(channel.nack.callCount).to.equal(options.maxNumberOfMessagesRetries + 1);
              for (let i = 0; i < options.maxNumberOfMessagesRetries; i++) {
                expect(channel.nack.getCall(i).calledWith(message)).to.equal(true, `Call ${i} should have been called whithout parameters`);
              }
              expect(channel.nack.lastCall.calledWith(message, false, false)).to.equal(
                true,
                `Last Call should have been called whith (message, false, false) for not being requeued`
              );
              done();
            } catch (errAssert) {
              done(errAssert);
            }
          });
      })
      .catch(err => {
        done(err);
      });
  });
});

async function createPromiseForFirstCalls(message: any, channel: any, listener: any, options: any) {
  return new Promise((resolve, reject) => {
    channel.consume.callsArgWith(1, message);
    adapter.consume(channel as any, 'QUEUE', listener, options as any).catch(err => {
      if (err.message === 'Listener of event returned not true, so requeue message.') {
        resolve();
      } else {
        reject(err);
      }
    });
  });
}
function createMessage(guid: string) {
  return {
    fields: {
      deliveryTag: 1, // The message was sent first, then it's requeued, so deliveryTag should not increment
      redelivered: true, //
    },
    content: {
      toString() {
        return JSON.stringify({
          _metas: { guid },
        });
      },
    },
  };
}
