import type { Message, User } from "discord.js";
import { Command } from "discord-akairo";
import { InitCommand } from "#lib";

@InitCommand("block", {
  aliases: ["block"],
  args: [
    {
      id: "user",
      type: "user"
    },
    {
      id: "reason",
      match: "rest"
    }
  ]
})
export default class Block extends Command {
  public async exec(message: Message, args: Args) {
    if (!args.user)
      return message.channel.send("You must provide a user to block!");

    const reason = args.reason ?? null;

    await this.client.db.client.user.upsert({
      where: {
        id: args.user.id
      },
      create: {
        id: args.user.id,
        blocked: true,
        blocked_at: new Date(),
        blocked_reason: reason
      },
      update: {
        blocked: true,
        blocked_at: new Date(),
        blocked_reason: reason
      }
    });

    return message.channel.send(`Blocked **${args.user.tag}**`);
  }
}

interface Args {
  user: User;
  reason: string;
}
