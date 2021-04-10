import { PrismaClient } from "@prisma/client";

export class Database {
  #client?: PrismaClient;

  public async init() {
    try {
      this.#client = new PrismaClient({
        rejectOnNotFound: false
      });

      await this.#client.$connect();
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  }

  public get client() {
    if (!this.#client)
      throw new TypeError("Run the `init` function before using the client.");
    return this.#client;
  }
}
