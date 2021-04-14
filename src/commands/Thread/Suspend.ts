import type { Message } from "discord.js";
import { Command } from "discord-akairo";
import { InitCommand, Thread } from "#lib";

@InitCommand("suspend", {
  aliases: ["suspend"]
})
export default class Suspend extends Command {
  public async exec(message: Message) {
    const thread = await Thread.fromThreadChannelID(
      this.client,
      message.channel.id
    );

    if (thread) {
      await thread.suspend();
      await message.channel.send("👍");
    }
  }
}
