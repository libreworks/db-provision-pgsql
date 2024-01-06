import pg from "pg";

import { Catalog, Grant, Login } from "./model.js";

/**
 * A connection to the "postgres" database on a PostegreSQL server.
 */
export class ServerClient {
  readonly #client: pg.Client;

  /**
   * Creates a new ServerClient.
   *
   * @param client - The pg Client instance
   */
  public constructor(client: pg.Client) {
    if (client.database !== "postgres") {
      throw new Error("The Client must connect to the postgres database");
    }
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
   * Create a new database catalog only if it does not already exist.
   *
   * @param catalog - The database catalog to create
   * @returns A Promise that resolves when the operation completes
   */
  public async createDatabase(catalog: Catalog) {
    const exists = await this.databaseExists(catalog.name);
    if (exists) {
      return;
    }

    await this.#client.query(catalog.toSql());
  }

  /**
   * Tests to see if the user already exists.
   *
   * @param username - The username to test
   * @returns A Promise that resolves to true if the user exists
   */
  public async roleExists(username: string): Promise<boolean> {
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

  /**
   * Create a new login only if it does not already exist.
   *
   * @param login - The login to create
   * @returns A Promise that resolves when the operation completes
   */
  public async createLogin(login: Login) {
    const exists = await this.roleExists(login.name);
    if (exists) {
      return;
    }

    await this.#client.query(login.toSql());
  }

  /**
   * Execute a grant statement.
   *
   * @param grant - The grant to perform
   * @returns A Promise that resolves when the operation completes
   */
  public async createGrant(grant: Grant) {
    await this.#client.query(grant.toSql());
  }
}
