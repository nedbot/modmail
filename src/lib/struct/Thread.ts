import {
  Constants,
  NormalizedMessage,
  normalizeMessage,
  parseEmbedTypeToString
} from "#lib";
import {
  Thread as ThreadJSON,
  ThreadStatus,
  InteractionType
} from "@prisma/client";
import { Client, TextChannel, Message, User, MessageEmbed } from "discord.js";

export class Thread {
  public client!: Client;

  public id: number = 0;
  public userID: string;
  public status: ThreadStatus = ThreadStatus.OPEN;
  public channelID: string | null = null;
  public subscriptions: string[] = [];

  private _user?: User;

  public constructor(client: Client, userID: string, threadJSON?: ThreadJSON) {
    Reflect.defineProperty(this, "client", { value: client });
    if (threadJSON) this._patch(threadJSON);
    this.userID = userID;
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
   * @param manual Whether this thread is ensured by mods
   * @returns This thread
   */
  public async ensure(manual: boolean = false) {
    const openThread = await this._fetchOpenThread();
    if (!openThread) return this._create(manual);

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
   * Suspends a thread
   * @returns The suspended thread
   */
  public async suspend() {
    if (this.status === ThreadStatus.SUSPENDED) return this;

    this.status = ThreadStatus.SUSPENDED;

    await this.client.db.client.thread.update({
      where: {
        id: this.id
      },
      data: {
        status: ThreadStatus.SUSPENDED
      }
    });

    if (this.mailChannel?.manageable && this.client.suspendedCategory)
      await this.mailChannel.setParent(this.client.suspendedCategory);

    return this;
  }

  /**
   * Unsuspends a thread
   * @returns The open thread
   */
  public async unsuspend() {
    if (this.status !== ThreadStatus.SUSPENDED) return this;

    const openThread = await this._fetchOpenThread();
    if (openThread) throw new Error("Close the user's open thread first.");

    this.status = ThreadStatus.OPEN;

    await this.client.db.client.thread.update({
      where: {
        id: this.id
      },
      data: {
        status: ThreadStatus.OPEN
      }
    });

    if (this.mailChannel?.manageable && this.client.pendingCategory)
      await this.mailChannel.setParent(this.client.pendingCategory);

    this.status = "OPEN";

    return this;
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
        status: ThreadStatus.CLOSED,
        closed_at: new Date()
      }
    });

    if (this.mailChannel?.deletable) await this.mailChannel.delete();

    return this;
  }

  /**
   * Marks the thread as answered
   * @returns The thread
   */
  public async markAsAnswered() {
    await this.client.db.client.thread.update({
      where: {
        id: this.id
      },
      data: {
        is_answered: true
      }
    });

    await this.setParent(ThreadParentType.InProgress);

    return this;
  }

  /**
   * Subscribes a user to thread message alerts
   * @param userID The user that subscribed
   * @returns The thread
   */
  public async subscribe(userID: string) {
    if (this.subscriptions.includes(userID)) return this;
    this.subscriptions = [...this.subscriptions, userID];

    await this.client.db.client.thread.update({
      where: {
        id: this.id
      },
      data: {
        subscriptions: this.subscriptions
      }
    });

    return this;
  }

  /**
   * Unsubscribes a user to thread message alerts
   * @param userID The user that unsubscribed
   * @returns The thread
   */
  public async unsubscribe(userID: string) {
    if (!this.subscriptions.includes(userID)) return this;
    this.subscriptions = this.subscriptions.filter((x) => x !== userID);

    await this.client.db.client.thread.update({
      where: {
        id: this.id
      },
      data: {
        subscriptions: this.subscriptions
      }
    });

    return this;
  }

  /**
   * Creates a thread interaction
   * @param type The type of interaction
   * @param message The content of the interaction
   * @param failed Whether the interaction failed
   * @returns The created interaction
   */
  public async createInteraction(
    type: InteractionType,
    message: NormalizedMessage,
    failed: boolean = false
  ) {
    let isAnswered: boolean | null = null;
    if (InteractionType.MODERATOR === type) isAnswered = true;
    if (InteractionType.RECIPIENT === type) isAnswered = false;

    if (isAnswered !== null) {
      await this.client.db.client.thread.update({
        where: {
          id: this.id
        },
        data: {
          is_answered: isAnswered
        }
      });

      if (isAnswered) this.setParent(ThreadParentType.InProgress);
    }

    return this.client.db.client.interaction.create({
      data: {
        type,
        failed,
        content: message.content,
        attachments: <any>message.attachments,
        author_id: message.authorID,
        thread: {
          connect: {
            id: this.id
          }
        }
      }
    });
  }

  /**
   * Creates a moderator interaction
   * @param message The content of the interaction
   * @returns The created interaction
   */
  public async createModeratorInteraction(
    author: User,
    message: InteractionContent
  ) {
    const normalized = normalizeMessage(message);
    const response = await this.sendMessageToRecipient(author, normalized);

    const interaction = await this.createInteraction(
      InteractionType.MODERATOR,
      normalized,
      !response
    );

    await this.sendMessageToChannel(author, normalized, {
      interactionID: interaction.id,
      embedType: response
        ? ThreadEmbedType.MessageSent
        : ThreadEmbedType.MessageFailed,
      success: !!response
    });

    return interaction;
  }

  /**
   * Creates a recipient interaction
   * @param message The content of the interaction
   * @returns The created interaction
   */
  public async createRecipientInteraction(message: InteractionContent) {
    const normalized = normalizeMessage(message);
    const user = await this.ensureUser();
    if (!user) throw new Error("Unable to resolve thread user.");

    const interaction = await this.createInteraction(
      InteractionType.RECIPIENT,
      normalized
    );

    await this.sendMessageToChannel(user, normalized, {
      interactionID: interaction.id,
      embedType: ThreadEmbedType.MessageReceived
    });

    return interaction;
  }

  /**
   * Sends a message to the recipient of the thread
   * @param author The author of the message
   * @param message The contents of the message
   * @returns The message or null if it failed to send
   */
  public async sendMessageToRecipient(
    author: User,
    message: NormalizedMessage
  ) {
    const user = await this.ensureUser();
    if (!user) throw new Error("Unable to resolve thread user.");

    const embed = this._createInteractionEmbed(author, message);

    return user.send(embed).catch(() => null);
  }

  /**
   * Sends a message to the thread channel
   * @param author The author of the message
   * @param message The contents of the message
   * @returns The message or null if it failed to send
   */
  public sendMessageToChannel(
    author: User,
    message: NormalizedMessage,
    options?: InteractionOptions
  ) {
    const embed = this._createInteractionEmbed(author, message);

    let content = "";

    if (options) {
      if (options.embedType === ThreadEmbedType.MessageReceived)
        content = this.subscriptions.map((x) => `<@${x}>`).join(" ");

      const embedType = parseEmbedTypeToString(options.embedType);
      const color = options.success
        ? Constants.Colors.Green
        : Constants.Colors.Red;

      if (options.success !== undefined) embed.setColor(color);

      embed
        .setFooter(`ID: ${options.interactionID} • ${embedType}`)
        .setTimestamp();
    }

    return this.mailChannel ? this.mailChannel.send({ content, embed }) : null;
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
   * @param manual Whether this thread was created by mods
   * @returns The created Thread
   */
  private async _create(manual: boolean = false) {
    await this.ensureUser();

    const user = await this.client.db.client.user.findFirst({
      where: {
        id: this.userID
      }
    });

    if (!manual) {
      if (user?.blocked) {
        const embed = this._createSystemEmbed(
          Constants.Blocked(user.blocked_reason ?? "No reason specified.")
        ).setColor(Constants.Colors.Red);

        await this._user?.send(embed);
        return null;
      }

      const embed = this._createSystemEmbed(Constants.MessageReceived);
      await this._user?.send(embed);
    }

    const channel = await this._createMailChannel(false);
    if (channel) this.channelID = channel.id;

    const thread = await this.client.db.client.thread.create({
      data: {
        status: ThreadStatus.OPEN,
        channel_id: this.channelID,
        user_id: this.userID
      }
    });

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
      const user = await this.ensureUser();
      if (!user) throw new Error("Unable to resolve thread user.");

      const channelName = `${user.username}-${user.discriminator}`;

      const { inboxGuild, pendingCategory } = this.client;
      const channel = await inboxGuild.channels.create(channelName, {
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
   * Sets the parent of the mail channel
   * @param parent The channel parent
   * @returns The mail channel
   */
  private async setParent(parent: ThreadParentType) {
    switch (parent) {
      case ThreadParentType.Pending:
        if (!this.client.pendingCategory?.manageable) return;
        return this.mailChannel?.setParent(this.client.pendingCategory);
      case ThreadParentType.InProgress:
        if (!this.client.inProgressCategory?.manageable) return;
        return this.mailChannel?.setParent(this.client.inProgressCategory);
      case ThreadParentType.Suspended:
        if (!this.client.suspendedCategory?.manageable) return;
        return this.mailChannel?.setParent(this.client.suspendedCategory);
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
    return this.client.db.client.interaction.findMany({
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
    this.subscriptions = threadJSON.subscriptions;
    return this;
  }

  /**
   * Creates an embed for the normalized message
   * @param author The author of the message
   * @param message The contents of the message
   * @returns The embed
   */
  private _createInteractionEmbed(author: User, message: NormalizedMessage) {
    const formattedAttachments = message.attachments
      .map((x) => `**[${x.name}](${x.url})**`)
      .join("\n");

    const embed = new MessageEmbed()
      .setColor(Constants.Colors.Primary)
      .setThumbnail(author.displayAvatarURL({ dynamic: true }))
      .setDescription(`**${author.tag}**\n─────────────\n${message.content}`);

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
  MessageReceived,
  MessageSent,
  MessageFailed
}

export enum ThreadParentType {
  Pending,
  InProgress,
  Suspended
}

export interface InteractionOptions {
  interactionID: number;
  embedType: ThreadEmbedType;
  success?: boolean;
}

export type InteractionContent = Message | NormalizedMessage;
