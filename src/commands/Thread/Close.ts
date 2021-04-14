import type { Message } from "discord.js";
import { Command } from "discord-akairo";
import { InitCommand, Thread } from "#lib";

@InitCommand("close", {
  aliases: ["close"]
})
export default class Close extends Command {
  public async exec(message: Message) {
    const thread = await Thread.fromThreadChannelID(
      this.client,
      message.channel.id
    );

    if (thread) {
      await message.channel.send("Closing...");
      await thread.close();
    }
  }
}
