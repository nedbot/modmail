import type { Message } from "discord.js";
import { Command } from "discord-akairo";
import { InitCommand, normalizeMessage, Thread } from "#lib";

@InitCommand("reply", {
  aliases: ["reply", "r"],
  args: [
    {
      id: "content",
      match: "rest"
    }
  ]
})
export default class Reply extends Command {
  public async exec(message: Message, args: Args) {
    const thread = await Thread.fromThreadChannelID(
      this.client,
      message.channel.id
    );

    if (thread) {
      const { attachments } = normalizeMessage(message);

      if (!args.content && !attachments.length)
        return message.channel.send("You must provide something to send.");

      await thread.createModeratorInteraction(message.author, {
        authorID: message.author.id,
        content: args.content ?? "",
        attachments
      });
    }
  }
}

interface Args {
  content?: string;
}
