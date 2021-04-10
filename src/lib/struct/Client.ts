import { AkairoClient, CommandHandler, ListenerHandler } from "discord-akairo";
import { join } from "path";

export class Client extends AkairoClient {
  public commandHandler = new CommandHandler(this, {
    directory: join(process.cwd(), "dist", "commands"),
    prefix: process.env.PREFIX ?? "?"
  });

  public listenerHandler = new ListenerHandler(this, {
    directory: join(process.cwd(), "dist", "events")
  });

  login() {
    this.listenerHandler.setEmitters({
      commandHandler: this.commandHandler,
      listenerHandler: this.listenerHandler
    });

    this.commandHandler.useListenerHandler(this.listenerHandler);
    this.commandHandler.loadAll();
    this.listenerHandler.loadAll();

    return super.login();
  }
}
