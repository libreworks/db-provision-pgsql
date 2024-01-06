import pg from "pg";
import { Catalog, DefaultPrivileges, Grant, Role, Schema } from "./model.js";

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
   * @param role - The login to create
   * @returns A Promise that resolves when the operation completes
   */
  public async createRole(role: Role) {
    const exists = await this.roleExists(role.name);
    if (exists) {
      return;
    }

    await this.#client.query(role.toSql());
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

/**
 * A connection to a named database on a PostegreSQL server.
 */
export class DatabaseClient {
  readonly #client: pg.Client;

  /**
   * Creates a new DatabaseClient.
   *
   * @param client - The pg Client instance
   */
  public constructor(client: pg.Client) {
    this.#client = client;
  }

  /**
   * Configures roles and privileges for admin usage of a schema.
   *
   * @param schema - The schema where the permissions apply
   * @param adminRole - The role to which permission should be granted
   * @param admins - The roles to receive membership in the admin role
   * @returns A Promise that resolves to the new grants and default privileges
   */
  public async createAdminGrants(
    schema: Schema,
    adminRole: Role,
    admins: Role[],
  ) {
    if (admins.length === 0) {
      return [];
    }

    let defaults: DefaultPrivileges[] = [
      schema.setDefaultTablePrivileges(adminRole, "ALL PRIVILEGES"),
      schema.setDefaultSequencePrivileges(adminRole, "ALL PRIVILEGES"),
      schema.setDefaultRoutinePrivileges(adminRole, "ALL PRIVILEGES"),
    ];
    if (schema.owner) {
      defaults = defaults.map((v) => v.forCreator(schema.owner!));
    }

    const statements: (Grant | DefaultPrivileges)[] = [
      schema.grant(adminRole, "USAGE"),
      schema.allTables().grant(adminRole, "ALL PRIVILEGES"),
      schema.allSequences().grant(adminRole, "ALL PRIVILEGES"),
      schema.allRoutines().grant(adminRole, "ALL PRIVILEGES"),
      ...defaults,
      ...admins.map((login) => adminRole.assignTo(login)),
    ];

    for (const statement of statements) {
      await this.#client.query(statement.toSql());
    }

    return statements;
  }

  /**
   * Configures roles and privileges for read-only usage of a schema.
   *
   * @param schema - The schema where the permissions apply
   * @param readerRole - The role to which permission should be granted
   * @param readers - The roles to receive membership in the reader role
   * @returns A Promise that resolves to the new grants and default privileges
   */
  public async createReaderGrants(
    schema: Schema,
    readerRole: Role,
    readers: Role[],
  ) {
    if (readers.length === 0) {
      return [];
    }

    let defaults: DefaultPrivileges[] = [
      schema.setDefaultTablePrivileges(readerRole, "SELECT"),
      schema.setDefaultSequencePrivileges(readerRole, "SELECT"),
    ];
    if (schema.owner) {
      defaults = defaults.map((v) => v.forCreator(schema.owner!));
    }

    const statements: (Grant | DefaultPrivileges)[] = [
      schema.grant(readerRole, "USAGE"),
      schema.allTables().grant(readerRole, "SELECT"),
      schema.allSequences().grant(readerRole, "SELECT"),
      ...defaults,
      ...readers.map((login) => readerRole.assignTo(login)),
    ];

    for (const statement of statements) {
      await this.#client.query(statement.toSql());
    }

    return statements;
  }
}
