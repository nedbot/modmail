import "module-alias/register";
import "dotenv/config";

import { Client } from "#lib";

const client = new Client();
client.login().catch(console.error);
