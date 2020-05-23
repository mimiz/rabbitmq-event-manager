import axios from 'axios';

/**
 * helper function to delete all
 */
export async function clean(amqpUrl: string) {
  let amqpHttp = amqpUrl.replace('amqp://', 'https://');
  let vhost = amqpHttp.substr(amqpHttp.lastIndexOf('/') + 1);
  const httpUrl = amqpHttp.substr(0, amqpHttp.lastIndexOf('/'));
  let url = `${httpUrl}/api`;
  if (amqpUrl.includes('localhost')) {
    amqpHttp = amqpUrl.replace('amqp://', 'http://');
    vhost = '%2F';
    // httpUrl = amqpHttp.substr(0, amqpHttp.lastIndexOf('/'));
    url = `${amqpHttp}:15672/api`;
  }
  const { data: queues } = await axios.get(`${url}/queues`);
  for (const queue of queues) {
    const deleteUrl = `${url}/queues/${vhost}/${queue.name}`;
    try {
      await axios.delete(`${deleteUrl}`);
    } catch (err) {
      throw err;
    }
  }
}
