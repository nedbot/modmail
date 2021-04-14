import type { Message } from "discord.js";
import { Command } from "discord-akairo";
import { InitCommand, Thread } from "#lib";

@InitCommand("unsuspend", {
  aliases: ["unsuspend"]
})
export default class Suspend extends Command {
  public async exec(message: Message) {
    const thread = await Thread.fromThreadChannelID(
      this.client,
      message.channel.id
    );

    if (thread) {
      await thread
        .unsuspend()
        .then(() => message.channel.send("👍"))
        .catch((e) => message.channel.send(e.message));
    }
  }
}
