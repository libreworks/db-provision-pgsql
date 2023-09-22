import pg, { ClientConfig } from "pg";

/**
 * A connection to the "postgres" database on a PostegreSQL server.
 */
export class ServerClient {
  /**
   * Creates a new ServerClient and pg.Client.
   *
   * @param config - Optional, the configuration for the pg.Client instance
   * @returns The new ServerClient instance
   */
  public create(config?: ClientConfig) {
    return new ServerClient(new pg.Client({ ...config, database: "postgres" }));
  }

  readonly #client: pg.Client;

  /**
   * Creates a new ServerClient.
   *
   * @param client - The pg Client instance
   */
  public constructor(client: pg.Client) {
    this.#client = client;
  }

  /**
   * Tests to see if the database already exists.
   *
   * @param name - The database name
   * @returns A Promise that resolves to true if the database exists
   */
  public async databaseExists(name: string): Promise<boolean> {
    const result = await this.#client.query<number[]>({
      text: "SELECT COUNT(*) FROM pg_catalog.pg_database WHERE datname = $1",
      values: [name],
      rowMode: "array",
    });
    if (!result.rows) {
      return false;
    }
    return result.rows.some((r) => r[0] > 0);
  }

  /**
   * Tests to see if the user already exists.
   *
   * @param username - The username to test
   * @returns A Promise that resolves to true if the user exists
   */
  public async userExists(username: string): Promise<boolean> {
    const result = await this.#client.query<number[]>({
      text: "SELECT COUNT(*) FROM pg_catalog.pg_roles WHERE rolname = $1",
      values: [username],
      rowMode: "array",
    });
    if (!result.rows) {
      return false;
    }
    return result.rows.some((r) => r[0] > 0);
  }
}
