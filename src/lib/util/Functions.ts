import type {
  Command,
  CommandOptions,
  Listener,
  ListenerOptions
} from "discord-akairo";
import { Constructable, Message } from "discord.js";
import { ThreadEmbedType } from "#lib";

export function createClassDecorator(fn: Function) {
  return fn;
}

/**
 * Applies the command id and options to a command
 * @param id The command id
 * @param options The command options
 */
export function InitCommand<T extends CommandOptions>(id: string, options: T) {
  return createClassDecorator((target: Constructable<Command>) => {
    return class extends target {
      public constructor() {
        super(id, options);
      }
    };
  });
}

/**
 * Applies the listener id and options to a listener
 * @param id The listener id
 * @param options The listener options
 */
export function InitListener(id: string, options: ListenerOptions) {
  return createClassDecorator((target: Constructable<Listener>) => {
    return class extends target {
      public constructor() {
        super(id, options);
      }
    };
  });
}

/**
 * Parses the thread embed type into a color
 * @param type The type of embed
 * @returns The color of the embed
 */
export function parseEmbedTypeToString(type: ThreadEmbedType) {
  switch (type) {
    case ThreadEmbedType.MessageSent:
      return "Message Sent";
    case ThreadEmbedType.MessageFailed:
      return "Message Failed";
    default:
      return "Message Received";
  }
}

/**
 * Normalizes a message into content and attachments
 * @param message The message to normalize
 * @returns The normalized message
 */
export function normalizeMessage(
  message: Message | NormalizedMessage
): NormalizedMessage {
  if (!(message instanceof Message)) return message;

  const attachments = message.attachments.map((attachment) => ({
    name: attachment.name ?? "unknown.png",
    url: attachment.proxyURL
  }));

  return { authorID: message.author.id, content: message.content, attachments };
}

export interface NormalizedMessage {
  readonly authorID: string;
  readonly content: string;
  readonly attachments: ThreadAttachment[];
}

export interface ThreadAttachment {
  readonly name: string;
  readonly url: string;
}
