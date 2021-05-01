import type { Message, User } from "discord.js";
import { Command } from "discord-akairo";
import { InitCommand } from "#lib";

@InitCommand("unblock", {
  aliases: ["unblock"],
  args: [
    {
      id: "user",
      type: "user"
    }
  ]
})
export default class Block extends Command {
  public async exec(message: Message, args: Args) {
    if (!args.user)
      return message.channel.send("You must provide a user to unblock!");

    const user = await this.client.db.client.user.findFirst({
      where: {
        id: args.user.id
      }
    });

    if (!user) return message.channel.send("User is not blocked.");

    await this.client.db.client.user.update({
      where: {
        id: args.user.id
      },
      data: {
        blocked: false,
        blocked_at: null,
        blocked_reason: null
      }
    });

    return message.channel.send(`Unblocked **${args.user.tag}**`);
  }
}

interface Args {
  user?: User;
}
