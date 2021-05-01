import type { Message } from "discord.js";
import { Command } from "discord-akairo";
import { InitCommand, Thread } from "#lib";

@InitCommand("cannedreply", {
  aliases: ["cannedreply", "cr"],
  args: [
    {
      id: "snippet",
      type: "string"
    }
  ]
})
export default class Close extends Command {
  public async exec(message: Message, args: Args) {
    const thread = await Thread.fromThreadChannelID(
      this.client,
      message.channel.id
    );

    if (thread) {
      if (!args.snippet)
        return message.channel.send("Please specify a snippet!");

      const snippet = await this.client.db.client.snippet.findFirst({
        where: {
          name: args.snippet
        }
      });

      if (!snippet)
        return message.channel.send(
          `Cannot find snippet with the name \`${args.snippet}\``
        );

      await thread.createModeratorInteraction(message.author, {
        authorID: message.author.id,
        content: snippet.content,
        attachments: []
      });
    }
  }
}

interface Args {
  snippet?: string;
}
