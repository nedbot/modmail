import type { Message, User } from "discord.js";
import { Command } from "discord-akairo";
import { InitCommand, Thread } from "#lib";

@InitCommand("modmail", {
  aliases: ["modmail", "mmchannel", "mm"],
  args: [
    {
      id: "user",
      type: "user"
    }
  ]
})
export default class Modmail extends Command {
  public async exec(message: Message, args: Args) {
    if (!args.user) return message.channel.send("You must specify a user!");
    const thread = await new Thread(this.client, args.user.id).ensure(true);
    return message.channel.send(
      `**${args.user.tag}'s** modmail thread is ${
        thread?.mailChannel ?? "not available"
      }.`
    );
  }
}

interface Args {
  user?: User;
}
