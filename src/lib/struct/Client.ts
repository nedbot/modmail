import { AkairoClient, CommandHandler, ListenerHandler } from "discord-akairo";
import { Database } from "./Database";
import { join } from "path";

export class Client extends AkairoClient {
  public commandHandler = new CommandHandler(this, {
    directory: join(process.cwd(), "dist", "commands"),
    prefix: process.env.PREFIX ?? "?"
  });

  public listenerHandler = new ListenerHandler(this, {
    directory: join(process.cwd(), "dist", "events")
  });

  public db = new Database();

  async login() {
    this.listenerHandler.setEmitters({
      commandHandler: this.commandHandler,
      listenerHandler: this.listenerHandler
    });

    this.commandHandler.useListenerHandler(this.listenerHandler);
    this.commandHandler.loadAll();
    this.listenerHandler.loadAll();

    await this.db.init();
    return super.login();
  }
}

declare module "discord.js" {
  export interface Client {
    readonly db: Database;
  }
}
