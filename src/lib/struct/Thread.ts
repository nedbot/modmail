import {
  Constants,
  NormalizedMessage,
  ThreadAttachment,
  normalizeMessage,
  parseEmbedTypeToColor,
  parseEmbedTypeToString
} from "#lib";
import {
  Thread as ThreadJSON,
  ThreadStatus,
  ThreadMessageType
} from "@prisma/client";
import { Client, TextChannel, Message, User, MessageEmbed } from "discord.js";

export class Thread {
  public client!: Client;

  public id: number = 0;
  public userID: string;
  public status: ThreadStatus = ThreadStatus.OPEN;
  public channelID: string | null = null;

  private _user?: User;

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
    const openThread = await this._fetchOpenThread();
    if (!openThread) return this._create();

    const channel = await this.ensureMailChannel();
    const channelID = channel?.id ?? null;

    if (this.channelID !== channelID) {
      await this.client.db.client.thread.update({
        where: {
          id: this.id
        },
        data: {
          channel_id: channelID
        }
      });

      this.channelID = channelID;
    }

    // TODO - Check if the user is blocked

    return this;
  }

  /**
   * Ensures the mail channel for this Thread exists
   * @returns A text channel
   */
  public async ensureMailChannel() {
    if (this.mailChannel) return this.mailChannel;
    return this._createMailChannel(true);
  }

  /**
   * Ensures the user for this Thread exists
   * @returns The user for this Thread
   */
  public async ensureUser() {
    if (this._user) return this._user;

    try {
      this._user = await this.client.users.fetch(this.userID);
      return this._user;
    } catch (e) {
      return null;
    }
  }

  /**
   * Closes a thread
   * @returns The closed Thread
   */
  public async close() {
    // TODO - Add scheduled close timer
    if (this.status === ThreadStatus.CLOSED) return this;

    this.status = ThreadStatus.CLOSED;

    await this.client.db.client.thread.update({
      where: {
        id: this.id
      },
      data: {
        status: ThreadStatus.CLOSED
      }
    });

    if (this.mailChannel?.deletable) await this.mailChannel.delete();

    return this;
  }

  /**
   * Creates a thread message
   * @param type The type of message
   * @param message The message to parse
   */
  public async createThreadMessage(
    type: ThreadMessageType,
    message: Message | NormalizedMessage
  ) {
    const { authorID, content, attachments } = normalizeMessage(message);

    const threadMessage = await this.client.db.client.threadMessage.create({
      data: {
        type,
        content,
        attachments: <any>attachments,
        author_id: authorID,
        thread: {
          connect: {
            id: this.id
          }
        }
      }
    });

    await this.ensureUser();

    if (type === ThreadMessageType.MOD_REPLY) {
      const userMessage = await this.sendMessageToUser(
        threadMessage.id,
        content,
        attachments
      );

      await this.sendMessageToChannel(
        threadMessage.id,
        content,
        attachments,
        !!userMessage
      );
    } else {
      await this.sendMessageToChannel(threadMessage.id, content, attachments);
    }

    return threadMessage;
  }

  /**
   * Sends a message to the thread user
   * @param threadMessageID The id of the thread message
   * @param content The content of the thread message
   * @param attachments The attachments of the thread message
   * @returns The message sent to the thread user
   */
  public async sendMessageToUser(
    threadMessageID: number,
    content: string,
    attachments: ThreadAttachment[]
  ) {
    const user = await this.ensureUser();
    if (!user) throw new Error("Unable to resolve thread user.");

    const embed = this._createThreadEmbed(
      ThreadEmbedType.ModReply,
      threadMessageID,
      content,
      attachments
    );

    return user.send(embed).catch(() => false);
  }

  /**
   * Sends a message to the thread channel
   * @param threadMessageID The id of the thread message
   * @param content The content of the thread message
   * @param attachments The attachments of the thread message
   * @param userSuccess The message sent to the thread channel
   * @returns The message sent to the thread channel
   */
  public async sendMessageToChannel(
    threadMessageID: number,
    content: string,
    attachments: ThreadAttachment[],
    userSuccess?: boolean
  ) {
    const channel = await this.ensureMailChannel();
    if (!channel) throw new Error("Unable to resolve thread channel.");

    const embedType =
      userSuccess === undefined
        ? ThreadEmbedType.ThreadMessageReceived
        : userSuccess
        ? ThreadEmbedType.ThreadMessageSent
        : ThreadEmbedType.ThreadMessageFailed;

    const embed = this._createThreadEmbed(
      embedType,
      threadMessageID,
      content,
      attachments
    );

    return channel.send(embed);
  }

  /**
   * Creates a moderator reply on the thread
   * @param moderator The author of the message
   * @param content The content of the message
   * @param attachments The attachments of the message
   */
  public async createModReply(
    moderator: User,
    content: string,
    attachments: ThreadAttachment[]
  ) {
    return this.createThreadMessage(ThreadMessageType.MOD_REPLY, {
      content,
      attachments,
      authorID: moderator.id
    });
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
    const channel = await this._createMailChannel(false);
    if (channel) this.channelID = channel.id;

    await this.ensureUser();

    const thread = await this.client.db.client.thread.create({
      data: {
        status: ThreadStatus.OPEN,
        channel_id: this.channelID,
        user_id: this.userID
      }
    });

    const embed = this._createSystemEmbed(Constants.MessageReceived);
    await this._user?.send(embed);

    this._patch(thread);

    const header = await this._generateHeader();
    await channel?.send(header);

    return this;
  }

  /**
   * Creates the mail channel for this Thread
   * @returns A text channel
   */
  private async _createMailChannel(sendHeader: boolean) {
    try {
      const { inboxGuild, pendingCategory } = this.client;
      const channel = await inboxGuild.channels.create(this.userID, {
        parent: pendingCategory,
        position: 0
      });

      if (sendHeader) {
        const header = await this._generateHeader();
        if (header) await channel.send(header);
      }

      return channel;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  /**
   * Fetches the thread user as a guild member
   * @returns The thread user as a guild member
   */
  private async _fetchMember() {
    try {
      return this.client.rootGuild.members.fetch(this.userID);
    } catch {
      return null;
    }
  }

  /**
   * Generates the header for this Thread
   * @returns The thread header embed
   */
  private async _generateHeader() {
    if (!this.id) throw new Error("Cannot generate header without thread id");

    const user = await this.ensureUser();
    const member = await this._fetchMember();
    const logs = await this.client.fetchUserMailLogs(this.userID);
    const msgs = await this._fetchCurrentMessages();

    const logMessage =
      logs.length - 1
        ? `• User has **${logs.length - 1}** previous log(s).`
        : null;

    const historyMessage = msgs.length
      ? `• The original mail channel was deleted, missing **${msgs.length}** message(s).`
      : null;

    const createdDate = user?.createdAt.toLocaleDateString() ?? "Unknown";
    const joinDate = member?.joinedAt?.toLocaleDateString() ?? "Unknown";

    return new MessageEmbed()
      .setColor(Constants.Colors.Primary)
      .setThumbnail(this.client.user!.displayAvatarURL())
      .setTitle(`Thread #${this.id}`)
      .setDescription(
        [
          `**Username:** ${user?.tag ?? "Unknown"}`,
          `**User ID:** ${this.userID}`,
          `**Nickname:** ${member?.nickname ?? "None"}`,
          `**Created on:** ${createdDate}`,
          `**Joined on:** ${joinDate}`,
          logMessage ?? historyMessage ? "────────────────────" : null,
          logMessage,
          historyMessage
        ].filter(Boolean)
      );
  }

  /**
   * Fetches the current messages sent in this thread
   * @returns The messages sent in this thread
   */
  private _fetchCurrentMessages() {
    return this.client.db.client.threadMessage.findMany({
      where: {
        thread_id: this.id
      }
    });
  }

  /**
   * Patches a raw thread object onto this Thread
   * @param threadJSON The raw thread object
   */
  private _patch(threadJSON: ThreadJSON) {
    this.id = threadJSON.id;
    this.status = threadJSON.status;
    this.channelID = threadJSON.channel_id;
    this.userID = threadJSON.user_id;
    return this;
  }

  /**
   * Creates an embed to format a Thread message
   * @param type The type of embed
   * @param threadMessageID The thread message id
   * @param content The content of the message
   * @param attachments The files of the message
   * @returns The constructed embed message
   */
  private _createThreadEmbed(
    type: ThreadEmbedType,
    threadMessageID: number,
    content: string,
    attachments: ThreadAttachment[]
  ) {
    if (!this._user)
      throw new Error("Cannot create thread embed without a user.");

    const formattedAttachments = attachments
      .map((x) => `**[${x.name}](${x.url})**`)
      .join("\n");

    const embed = new MessageEmbed()
      .setColor(parseEmbedTypeToColor(type))
      .setThumbnail(this._user.displayAvatarURL({ dynamic: true }))
      .setDescription(`**${this._user.tag}**\n─────────────\n${content}`);

    if (type !== ThreadEmbedType.ModReply)
      embed
        .setFooter(`ID: ${threadMessageID} • ${parseEmbedTypeToString(type)}`)
        .setTimestamp();

    if (formattedAttachments)
      embed.addField("__Attachments:__", formattedAttachments);

    return embed;
  }

  /**
   * Creates an embed to format a system message
   * @param content The content of the message
   * @returns The constructed system embed message
   */
  private _createSystemEmbed(content: string) {
    return new MessageEmbed()
      .setColor(Constants.Colors.Primary)
      .setThumbnail(this.client.user!.displayAvatarURL())
      .setDescription(`**System**\n─────────────\n${content}`);
  }
}

export enum ThreadEmbedType {
  ThreadMessageReceived,
  ThreadMessageSent,
  ThreadMessageFailed,
  ModReply
}
