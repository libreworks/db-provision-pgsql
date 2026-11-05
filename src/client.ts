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

  /**
   * Grants membership in a role to each of the given roles.
   *
   * Role memberships apply to the entire server, not to a single database. The
   * connected user must have `ADMIN OPTION` on the role, such as the
   * `CREATEROLE` user that created it.
   *
   * @param role - The role in which membership is granted
   * @param members - The roles to receive membership
   * @returns A Promise that resolves to the new memberships
   */
  public async createMemberships(role: Role, members: Role[]) {
    const memberships = members.map((member) => role.assignTo(member));
    for (const membership of memberships) {
      await this.createGrant(membership);
    }
    return memberships;
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
   * Configures privileges for admin usage of a schema.
   *
   * The connected user must be the schema owner. This method doesn't grant
   * membership in the admin role; use {@link ServerClient.createMemberships}
   * for that.
   *
   * @param schema - The schema where the permissions apply
   * @param adminRole - The role to which permission should be granted
   * @returns A Promise that resolves to the new grants and default privileges
   */
  public async createAdminGrants(schema: Schema, adminRole: Role) {
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
    ];

    for (const statement of statements) {
      await this.#client.query(statement.toSql());
    }

    return statements;
  }

  /**
   * Configures privileges for read-only usage of a schema.
   *
   * The connected user must be the schema owner. This method doesn't grant
   * membership in the reader role; use {@link ServerClient.createMemberships}
   * for that.
   *
   * @param schema - The schema where the permissions apply
   * @param readerRole - The role to which permission should be granted
   * @returns A Promise that resolves to the new grants and default privileges
   */
  public async createReaderGrants(schema: Schema, readerRole: Role) {
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
    ];

    for (const statement of statements) {
      await this.#client.query(statement.toSql());
    }

    return statements;
  }
}
