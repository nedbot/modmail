import type {
  Command,
  CommandOptions,
  Listener,
  ListenerOptions
} from "discord-akairo";
import type { Constructable } from "discord.js";

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