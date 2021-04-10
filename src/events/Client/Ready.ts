import { Listener } from "discord-akairo";
import { InitListener } from "#lib";

@InitListener("ready", {
  event: "ready",
  emitter: "client",
  type: "once"
})
export default class Ready extends Listener {
  public exec() {
    console.log("Logged in as", this.client.user!.tag);
  }
}
