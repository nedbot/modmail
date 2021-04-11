# Modwire

<b>🚧 Work in progress - please do not use in production 🚧</b>

Modmail is a simple communication tool connecting Discord moderators with their members. We are entirely encouraged by [Reddit's Modmail system](https://www.reddit.com/r/help/comments/5vey3n/what_is_modmail_and_how_do_i_send_it/ "What is Modmail?") and are enthusiast about a similar solution for Discord. NedBot Modmail will answer your members' questions in an organised and balanced fashion.

We offer speedy support to get you up and running as soon as possible. Feel free to join our [server](https://invite.nedbot.org/) to get guidance!

### Prerequisites

- Install [NodeJS](https://nodejs.org/) - A JavaScript runtime
- Install [PostgreSQL](https://www.postgresql.org/download/) - To store persistent data
- Install [Yarn](https://classic.yarnpkg.com/en/docs/install/) - A NodeJS package manager

### Setup

You will need to create a copy of the `.env.example` file and call it `.env`.

Configure your `.env` file. Once you've set up your credentials, you'll need to run the following commands in your terminal:

```shell
# Install dependencies
yarn install

# Apply database migrations
yarn migrate:dev

# Build
yarn build
```

### Run

To start the bot, you'll to run the following command in your terminal:

```shell
yarn start
```

### Contribution

- Everyone is welcome to contribute and provide feedback
- Update code by forking this repository, making your changes, and opening a pull request
- Ensure your commits message follow the [Gitmoji](https://gitmoji.dev) format
