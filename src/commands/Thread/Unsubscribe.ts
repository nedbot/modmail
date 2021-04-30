import type { Message } from "discord.js";
import { Command } from "discord-akairo";
import { InitCommand, Thread } from "#lib";

@InitCommand("unsubscribe", {
  aliases: ["unsubscribe", "unlisten", "unalert", "unsub"]
})
export default class Unsubscribe extends Command {
  public async exec(message: Message) {
    const thread = await Thread.fromThreadChannelID(
      this.client,
      message.channel.id
    );

    if (thread) {
      if (!thread.subscriptions.includes(message.author.id))
        return message.channel.send(
          "You are not subscribed to messages in this thread."
        );
      await thread.unsubscribe(message.author.id);
      await message.channel.send("👍");
    }
  }
}
