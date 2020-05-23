# Contributing / development guide

## How to propose changes

1. Fork the project on github
2. Clone on your local machine
3. Create a branch
4. Make your changes locall`
5. Push on your repo
6. Create a pull request

## Development

1. Clone the project
2. Get dependencies : `yarn`
3. Create a docker instance : `docker run -d --hostname my-rabbit --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management`
4. Run the tests : `RABBITMQ_URL=amqp://localhost yarn test`

## Reset all queues and everything for rabbitmq

If you are using a docker container for your developmentt environment, maybe you will need to reset everything in RabbitMQ :

1. Go "inside" the container

```
docker exec -it rabbitmq
```

2. Reset :

```
rabbitmqctl stop_app
rabbitmqctl reset
rabbitmqctl start_app
```

or on a single line

```
rabbitmqctl stop_app && rabbitmqctl reset && rabbitmqctl start_app
```

## Push to Github

As `yarn test` is executed before push, and as some tests needs a RabbitMQ server.
We need to set an environment variable : `export AMQP_URL=amqp://admin:password@localhost` for the tests to run.

## Tag and Publish
