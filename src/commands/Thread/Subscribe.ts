import type { Message } from "discord.js";
import { Command } from "discord-akairo";
import { InitCommand, Thread } from "#lib";

@InitCommand("subscribe", {
  aliases: ["subscribe", "listen", "alert", "sub"]
})
export default class Subscribe extends Command {
  public async exec(message: Message) {
    const thread = await Thread.fromThreadChannelID(
      this.client,
      message.channel.id
    );

    if (thread) {
      if (thread.subscriptions.includes(message.author.id))
        return message.channel.send(
          "You are already subscribed to messages in this thread."
        );
      await thread.subscribe(message.author.id);
      await message.channel.send("👍");
    }
  }
}
