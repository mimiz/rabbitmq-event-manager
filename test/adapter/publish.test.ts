import { expect } from 'chai';
import { describe, it } from 'mocha';
import * as sinon from 'sinon';
import * as adapter from '../../src/adapter';
import { createLogger } from '../../src/lib/logger';
describe('RabbitMQ Event Manager > Adapter > publish', () => {
  let sandbox: sinon.SinonSandbox;
  beforeEach(async () => {
    await adapter.disconnect();
    sandbox = sinon.createSandbox();
    createLogger({ transportMode: 'mute' });
  });
  afterEach(async () => {
    sandbox.restore();
  });

  it(`Should be able to publish on rabbitMQ`, async () => {
    /** given */
    const exName = 'my-exchange';
    const channel = {
      publish: sandbox.stub().callsArgWith(4, null),
    };
    const payload = {
      _metas: {
        guid: 'aaa-zzz-eee',
        name: exName,
        application: 'my-producer-application',
        timestamp: Date.now(),
      },
      id: 134,
    };
    const options = {
      application: 'my-producer-application',
    };

    /** when */
    const published = await adapter.publish(channel as any, exName, payload, options as any);
    /** then */
    expect(published).to.equal(true);
  });

  it(`Should return false, if publihed reject`, async () => {
    /** given */
    const exName = 'my-exchange';
    const rootError = new Error('error');
    const channel = {
      publish: sandbox.stub().callsArgWith(4, rootError),
    };
    const payload = {
      _metas: {
        guid: 'aaa-zzz-eee',
        name: exName,
        application: 'my-producer-application',
        timestamp: Date.now(),
      },
      id: 134,
    };
    const options = {
      application: 'my-producer-application',
    };

    /** when */
    try {
      await adapter.publish(channel as any, exName, payload, options as any);
    } catch (err) {
      /** then */
      expect(err).to.equal(rootError);
    }
  });

  it(`Should publish on the exhange`, async () => {
    /** given */
    const exName = 'my-exchange';

    const channel = {
      publish: sandbox.stub().callsArgWith(4, null),
    };
    const payload = {
      _metas: {
        guid: 'aaa-zzz-eee',
        name: exName,
        application: 'my-producer-application',
        timestamp: Date.now(),
      },
      id: 134,
    };
    const options = {
      application: 'my-producer-application',
    };

    /** when */

    await adapter.publish(channel as any, exName, payload, options as any);

    /** Then */
    expect(channel.publish.args[0][0]).to.equal(exName);
  });
});
