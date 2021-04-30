import { AkairoClient, CommandHandler, ListenerHandler } from "discord-akairo";
import type { Thread } from "@prisma/client";
import { Database } from "./Database";
import { join } from "path";
import { CategoryChannel } from "discord.js";

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
   * Resolves the in-progress category parent channel
   * @returns The in-progress category patent channel
   */
  public get inProgressCategory() {
    const { channels } = this.inboxGuild;
    const category = channels.cache.get(process.env.IN_PROGRESS_CATEGORY_ID!);
    if (!category) return undefined;
    if (!(category instanceof CategoryChannel))
      throw new Error("In Progress category must be a category.");
    return category;
  }

  /**
   * Resolves the suspended category parent channel
   * @returns The suspended category patent channel
   */
  public get suspendedCategory() {
    const { channels } = this.inboxGuild;
    const category = channels.cache.get(process.env.SUSPENDED_CATEGORY_ID!);
    if (!category) return undefined;
    if (!(category instanceof CategoryChannel))
      throw new Error("Suspended category must be a category.");
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
    readonly inProgressCategory?: CategoryChannel;
    readonly suspendedCategory?: CategoryChannel;
    fetchUserMailLogs(userID: string): Promise<Thread[]>;
  }
}
