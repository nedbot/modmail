import type { Message } from "discord.js";
import { Command } from "discord-akairo";
import { InitCommand, Thread } from "#lib";

@InitCommand("markread", {
  aliases: ["markread", "answered"]
})
export default class Markread extends Command {
  public async exec(message: Message) {
    const thread = await Thread.fromThreadChannelID(
      this.client,
      message.channel.id
    );

    if (thread) {
      await thread.markAsAnswered();
      await message.channel.send("👍");
    }
  }
}
