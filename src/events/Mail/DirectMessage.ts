import type { Message } from "discord.js";
import { Listener } from "discord-akairo";
import { InitListener, Thread } from "#lib";
import { ThreadMessageType } from ".prisma/client";

@InitListener("directMessage", {
  event: "message",
  emitter: "client"
})
export default class DirectMessage extends Listener {
  public async exec(message: Message) {
    if (message.guild || message.author.bot) return;

    const thread = await new Thread(this.client, message.author.id).ensure();
    await thread.createThreadMessage(ThreadMessageType.THREAD_USER, message);
  }
}
