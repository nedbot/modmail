import { Message, MessageEmbed, User } from "discord.js";
import { Command } from "discord-akairo";
import { InitCommand, Constants } from "#lib";

@InitCommand("mmlogs", {
  aliases: ["mmlogs", "logs"],
  args: [
    {
      id: "user",
      type: "user"
    }
  ]
})
export default class Block extends Command {
  public async exec(message: Message, args: Args) {
    if (!args.user)
      return message.channel.send("You must provide a user to look up!");

    const threads = await this.client.db.client.thread.findMany({
      select: {
        id: true,
        created_at: true,
        closed_at: true
      },
      where: {
        user_id: args.user.id
      },
      orderBy: {
        id: "desc"
      },
      take: 12
    });

    const embed = new MessageEmbed()
      .setColor(Constants.Colors.Primary)
      .setAuthor(
        `Modmail logs for ${args.user.tag}`,
        args.user.displayAvatarURL()
      )
      .setDescription(
        threads.map((thread, i) => {
          const threadID = `Thread #${thread.id}`;
          const created = `Created ${thread.created_at.toLocaleString()}`;
          const closed = thread.closed_at
            ? `Closed ${thread.closed_at.toLocaleString()}`
            : `Ongoing ${new Date().toLocaleString()}`;

          let log = `${threadID} • ${created} • ${closed}`;
          if (i % 2 === 0) return log;
          return `**${log}**`;
        })
      )
      .setFooter("Showing the latest 12 logs.");

    return message.channel.send(embed);
  }
}

interface Args {
  user: User;
}
