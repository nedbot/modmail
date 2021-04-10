import { AkairoClient, CommandHandler, ListenerHandler } from "discord-akairo";
import type { Thread } from "@prisma/client";
import { CategoryChannel } from "discord.js";
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

  public async login() {
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

  /**
   * Resolves the root guild
   * @returns The root guild
   */
  public get rootGuild() {
    const guild = this.guilds.cache.get(process.env.ROOT_SERVER_ID!);
    if (!guild) throw new Error("Failed to resolve root server.");
    return guild;
  }

  /**
   * Resolves the inbox guild
   * @returns The inbox guild
   */
  public get inboxGuild() {
    const guild = this.guilds.cache.get(process.env.INBOX_SERVER_ID!);
    if (!guild) return this.rootGuild;
    return guild;
  }

  /**
   * Resolves the pending category parent channel
   * @returns The pending category patent channel
   */
  public get pendingCategory() {
    const { channels } = this.inboxGuild;
    const category = channels.cache.get(process.env.PENDING_CATEGORY_ID!);
    if (!category) return undefined;
    if (!(category instanceof CategoryChannel))
      throw new Error("Pending category must be a category.");
    return category;
  }

  /**
   * Fetches the mail logs for a user
   * @param userID The user to query
   * @returns The existing mail logs
   */
  public fetchUserMailLogs(userID: string) {
    return this.db.client.thread.findMany({
      where: {
        user_id: userID
      }
    });
  }
}

declare module "discord.js" {
  export interface Client {
    readonly db: Database;
    readonly rootGuild: Guild;
    readonly inboxGuild: Guild;
    readonly pendingCategory?: CategoryChannel;
    fetchUserMailLogs(userID: string): Promise<Thread[]>;
  }
}
