import { Message, MessageEmbed } from "discord.js";
import { Command } from "discord-akairo";
import { Constants, InitCommand } from "#lib";

@InitCommand("snippet", {
  aliases: ["snippet", "snippets"],
  args: [
    {
      id: "subcommand",
      type: "string"
    },
    {
      id: "name",
      type: "string"
    },
    {
      id: "content",
      match: "rest"
    }
  ]
})
export default class Snippet extends Command {
  public async exec(message: Message, args: Args) {
    if (!args.subcommand) args.subcommand = "view";

    switch (args.subcommand) {
      case "view":
        return this._view(message, args.name);
      case "create":
        if (!args.name)
          return message.channel.send(
            "You must specify a name for the snippet!"
          );
        if (!args.content)
          return message.channel.send(
            "You must specify the content for the snippet!"
          );
        return this._create(message, args.name, args.content);
      case "delete":
        if (!args.name)
          return message.channel.send(
            "You must specify the name of the snippet!"
          );
        return this._delete(message, args.name);
      case "update":
        if (!args.name)
          return message.channel.send(
            "You must specify the name of the snippet!"
          );
        if (!args.content)
          return message.channel.send(
            "You must specify the content for the snippet!"
          );
        return this._update(message, args.name, args.content);
      default:
        return message.channel.send(
          "Subcommand must be either `view`, `create`, `delete` or `update`"
        );
    }
  }

  private async _view(message: Message, name?: string) {
    if (name) {
      const snippet = await this.client.db.client.snippet.findFirst({
        where: {
          name
        }
      });

      if (!snippet)
        return message.channel.send("Cannot find a snippet with that name!");

      const embed = new MessageEmbed()
        .setColor(Constants.Colors.Primary)
        .setTitle(snippet.name)
        .setDescription(snippet.content);

      return message.channel.send(embed);
    }

    const snippets = await this.client.db.client.snippet.findMany();

    const embed = new MessageEmbed()
      .setColor(Constants.Colors.Primary)
      .setTitle(`Snippets [${snippets.length}]`)
      .setDescription(snippets.map((x) => `**\`${x.name}\`**`).join(", "));

    return message.channel.send(embed);
  }

  private async _create(message: Message, name: string, content: string) {
    const existing = await this._findSnippet(name);
    if (existing)
      return message.channel.send("Snippet with that name already exists!");

    if (name.length > 50)
      return message.channel.send(
        "Snippet name must be less than 50 characters long."
      );

    await this.client.db.client.snippet.create({
      data: {
        name,
        content
      }
    });

    return message.channel.send(
      `Successfully created the snippet \`${name}\`.`
    );
  }

  private async _delete(message: Message, name: string) {
    const existing = await this._findSnippet(name);
    if (!existing) return message.channel.send("Snippet does not exist!");

    await this.client.db.client.snippet.delete({
      where: {
        name
      }
    });

    return message.channel.send(`Successfully delete the snippet \`${name}\`.`);
  }

  private async _update(message: Message, name: string, content: string) {
    const existing = await this._findSnippet(name);
    if (!existing) return message.channel.send("Snippet does not exist!");

    await this.client.db.client.snippet.update({
      where: {
        name
      },
      data: {
        content
      }
    });

    return message.channel.send(
      `Successfully updated the snippet \`${name}\`.`
    );
  }

  private _findSnippet(name: string) {
    return this.client.db.client.snippet.findFirst({
      where: {
        name
      }
    });
  }
}

interface Args {
  subcommand?: string;
  name?: string;
  content?: string;
}
