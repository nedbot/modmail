import { Thread as ThreadJSON } from "@prisma/client";
import type { Client } from "discord.js";

export class Thread {
  public client!: Client;

  public id: number = 0;
  public userID?: string;
  public channelID: string | null = null;

  public constructor(client: Client, threadJSON?: ThreadJSON) {
    Reflect.defineProperty(this, "client", { value: client });

    if (threadJSON) this._patch(threadJSON);
  }

  /**
   * Instantiates a thread from a raw object
   * @param client The client handling this thread
   * @param threadJSON The raw thread object
   * @returns An instance of a Thread
   */
  public static fromJSON(client: Client, threadJSON: ThreadJSON) {
    return new Thread(client, threadJSON);
  }

  /**
   * Instantiates a thread from its unique id
   * @param client The client handling this thread
   * @param threadID The thread id
   * @returns An instance of a Thread
   */
  public static async fromID(client: Client, threadID: number) {
    const thread = await client.db.client.thread.findFirst({
      where: {
        id: threadID
      }
    });

    return thread ? Thread.fromJSON(client, thread) : null;
  }

  /**
   * Instantiates a thread from its unique channel id
   * @param client The client handling this thread
   * @param channelID The thread channel id
   * @returns An instance of a Thread
   */
  public static async fromThreadChannelID(client: Client, channelID: string) {
    const thread = await client.db.client.thread.findFirst({
      where: {
        channel_id: channelID
      }
    });

    return thread ? Thread.fromJSON(client, thread) : null;
  }

  /**
   * Patches a raw thread object onto this Thread
   * @param threadJSON The raw thread object
   */
  private _patch(threadJSON: ThreadJSON) {
    this.id = threadJSON.id;
    this.channelID = threadJSON.channel_id;
    this.userID = threadJSON.user_id;
  }
}
