import type { Client, TextChannel, Message } from "discord.js";
import { Thread as ThreadJSON, ThreadStatus } from "@prisma/client";
import { normalizeMessage } from "#lib";

export class Thread {
  public client!: Client;

  public id: number = 0;
  public userID: string;
  public status: ThreadStatus = ThreadStatus.OPEN;
  public channelID: string | null = null;

  public constructor(client: Client, userID: string, threadJSON?: ThreadJSON) {
    Reflect.defineProperty(this, "client", { value: client });
    this.userID = userID;

    if (threadJSON) this._patch(threadJSON);
  }

  /**
   * Instantiates a thread from a raw object
   * @param client The client handling this thread
   * @param threadJSON The raw thread object
   * @returns An instance of a Thread
   */
  public static fromJSON(client: Client, threadJSON: ThreadJSON) {
    return new Thread(client, threadJSON.user_id, threadJSON);
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
   * Ensures this Thread exists in the database
   * @returns This thread
   */
  public async ensure() {
    const thread = await this._fetchOpenThread();
    if (!thread) return this._create();

    await this.ensureMailChannel();
    // TODO - Ensure user exists as GuildMember
    // TODO - Check if the user is blocked

    return this;
  }

  /**
   * Ensures the mail channel for this Thread exists
   * @returns A text channel
   */
  public async ensureMailChannel() {
    if (this.mailChannel) return this.mailChannel;
    return this._createMailChannel();
  }

  /**
   * Resolves the mail channel assigned to this Thread
   * @returns A text channel
   */
  public get mailChannel() {
    if (!this.channelID) return undefined;
    return <TextChannel>(
      this.client.inboxGuild.channels.cache.get(this.channelID)
    );
  }

  public async addUserMessage(message: Message) {
    const { content, attachments } = normalizeMessage(message);

    await this.client.db.client.threadMessage.create({
      data: {
        content,
        attachments,
        thread: {
          connect: {
            id: this.id
          }
        }
      }
    });
  }

  /**
   * Fetches the open Thread for the user
   * @returns This thread
   */
  private async _fetchOpenThread() {
    const thread = await this.client.db.client.thread.findFirst({
      where: {
        user_id: this.userID,
        status: ThreadStatus.OPEN
      }
    });

    return thread ? this._patch(thread) : null;
  }

  /**
   * Creates the Thread entry
   * @returns The created Thread
   */
  private async _create() {
    await this._createMailChannel();

    const thread = await this.client.db.client.thread.create({
      data: {
        status: ThreadStatus.OPEN,
        channel_id: this.channelID,
        user_id: this.userID
      }
    });

    return this._patch(thread);
  }

  /**
   * Creates the mail channel for this Thread
   * @returns A text channel
   */
  private async _createMailChannel() {
    try {
      const { inboxGuild, pendingCategory } = this.client;
      const channel = await inboxGuild.channels.create(this.userID, {
        parent: pendingCategory,
        position: 0
      });

      this.channelID = channel.id;
      return channel;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  /**
   * Patches a raw thread object onto this Thread
   * @param threadJSON The raw thread object
   */
  private _patch(threadJSON: ThreadJSON) {
    this.id = threadJSON.id;
    this.channelID = threadJSON.channel_id;
    this.userID = threadJSON.user_id;
    return this;
  }
}
