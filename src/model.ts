import { escapeIdentifier, escapeLiteral } from "./escape.js";

/**
 * An object capable of producing a SQL statement.
 */
export interface Executable {
  /**
   * Produces a SQL statement that creates this object.
   *
   * @returns The SQL statement
   */
  toSql(): string;
}

/**
 * A named database object.
 */
export abstract class Named {
  readonly #name: string;

  /**
   * Creates a new Named.
   *
   * @param name - The object name
   */
  public constructor(name: string) {
    this.#name = name;
  }

  /**
   * Gets the name of this database object.
   *
   * @returns The name of this database object
   */
  public get name(): string {
    return this.#name;
  }
}

/**
 * A PostgreSQL role.
 */
export class Role extends Named {
  /**
   * Assigns this role to another role (or login).
   *
   * @param member - The grantee
   * @returns The new Membership object
   */
  public assignTo(member: Role): Membership {
    return new Membership(this, member);
  }

  public toSql(): string {
    return `CREATE ROLE ${escapeIdentifier(this.name)}`;
  }
}

/**
 * A definition of access privileges.
 */
export class Grant implements Executable {
  readonly #entitlement: string;
  readonly #grantee: Role;

  /**
   * Creates a new Grant.
   *
   * @param grantee - The role to receive the entitlement
   * @param entitlement - The role or privilege given to the grantee
   */
  public constructor(grantee: Role, entitlement: string) {
    this.#grantee = grantee;
    this.#entitlement = entitlement;
  }

  /**
   * Gets the role or privilege given to the grantee.
   *
   * @returns The grant entitlement
   */
  public get entitlement(): string {
    return this.#entitlement;
  }

  /**
   * Gets the role being given entitlement.
   *
   * @returns The role receiving the grant
   */
  public get grantee(): Role {
    return this.#grantee;
  }

  public toSql(): string {
    const grantee = escapeIdentifier(this.#grantee.name);
    return `GRANT ${this.entitlement} TO ${grantee}`;
  }
}

/**
 * An assignment of a role to another role.
 */
export class Membership extends Grant {
  readonly #group: Role;

  /**
   * Creates a new Membership.
   *
   * @param group - The role to grant
   * @param member - The grantee
   */
  public constructor(group: Role, member: Role) {
    super(member, escapeIdentifier(group.name));
    this.#group = group;
  }

  public get group(): Role {
    return this.#group;
  }
}

/**
 * A PostgreSQL user login.
 */
export class Login extends Role {
  readonly #password: string;

  /**
   * Creates a new Login.
   *
   * @param username - The login username
   * @param password - The login password
   */
  public constructor(username: string, password: string) {
    super(username);
    this.#password = password;
  }

  /**
   * An alias for .name
   *
   * @returns The username
   */
  public get username(): string {
    return this.name;
  }

  /**
   * Gets the login password.
   *
   * @returns The login password
   */
  public get password() {
    return this.#password;
  }

  public toSql(): string {
    const username = escapeIdentifier(this.name);
    const password = escapeLiteral(this.#password);
    return `CREATE USER ${username} WITH PASSWORD ${password}`;
  }
}

/**
 * An assignment of privileges on a securable object (e.g. schema, table).
 */
export class Privileges extends Grant {
  readonly #target: string;
  readonly #privileges: string[];

  /**
   * Creates a new Privileges object.
   *
   * @param grantee - The role to receive the privileges
   * @param target - The named resource for which the privileges apply
   * @param privileges - The privileges to grant
   */
  public constructor(grantee: Role, target: string, ...privileges: string[]) {
    super(grantee, `${privileges.join(", ")} ON ${target}`);
    this.#target = target;
    this.#privileges = [...privileges];
  }

  /**
   * @returns The privileges being granted
   */
  public get privileges(): string[] {
    return [...this.#privileges];
  }

  /**
   * @returns The named database object for which the privileges apply
   */
  public get target(): string {
    return this.#target;
  }
}

/**
 * A database object that supports privileges.
 */
export class Securable extends Named {
  readonly #qualifier: string;

  /**
   * Creates a new Securable.
   *
   * @param qualifier - A prefix for the object (e.g. "SCHEMA")
   * @param name - The object name
   */
  public constructor(qualifier: string, name: string) {
    super(name);
    this.#qualifier = qualifier;
  }

  /**
   * Formats this object for use in a GRANT statement.
   *
   * @returns This object name for use in a GRANT statement
   */
  public get grantName(): string {
    return `${this.#qualifier} ${escapeIdentifier(this.name)}`;
  }

  /**
   * Assigns privileges for this object to a role.
   *
   * @param grantee - The role to receive the privileges
   * @param privileges - The privileges to grant
   * @returns The grant statement
   */
  public grant(grantee: Role, ...privileges: string[]): Privileges {
    return new Privileges(grantee, this.grantName, ...privileges);
  }
}

/**
 * A modification to the default privileges used when objects are created.
 */
export class DefaultPrivileges implements Executable {
  readonly #privileges: Privileges;
  readonly #creator?: Role;
  readonly #schema?: Schema;

  /**
   * Creates a new AlterDefaultPrivileges.
   *
   * @param privileges - The privileges to define
   * @param creator - Optional, the role doing the creating
   * @param schema - Optional, The schema in which the privileges apply
   */
  public constructor(privileges: Privileges, creator?: Role, schema?: Schema) {
    this.#privileges = privileges;
    this.#creator = creator;
    this.#schema = schema;
  }

  /**
   * @returns The default privileges applied
   */
  public get privileges(): Privileges {
    return this.#privileges;
  }

  /**
   * @returns The role whose creations use the default privileges
   */
  public get creator(): Role | undefined {
    return this.#creator;
  }

  /**
   * @returns The schema in which the privileges apply
   */
  public get schema(): Schema | undefined {
    return this.#schema;
  }

  /**
   * Constrains these defaults to a specific schema.
   *
   * @param schema - The schema in which the privileges apply
   * @returns A copy of this object, constrained to the given schema
   */
  public inSchema(schema: Schema): DefaultPrivileges {
    return new DefaultPrivileges(this.#privileges, this.#creator, schema);
  }

  /**
   * Constrains these defaults to a specific creator.
   *
   * @param creator - The role whose creations use the default privileges
   * @returns A copy of this object, constrained to the given creator
   */
  public forCreator(creator: Role): DefaultPrivileges {
    return new DefaultPrivileges(this.#privileges, creator, this.#schema);
  }

  public toSql(): string {
    const statement = ["ALTER DEFAULT PRIVILEGES"];

    if (this.#creator instanceof Login) {
      statement.push("FOR USER", escapeIdentifier(this.#creator.name));
    } else if (this.#creator instanceof Role) {
      statement.push("FOR ROLE", escapeIdentifier(this.#creator.name));
    }

    if (this.#schema) {
      statement.push("IN", this.#schema.grantName);
    }

    statement.push(this.#privileges.toSql());
    return statement.join(" ");
  }
}

/**
 * A PostgreSQL database.
 */
export class Catalog extends Securable implements Executable {
  readonly #encoding: string;
  readonly #locale?: string;

  /**
   * Creates a new Catalog.
   */
  public constructor(name: string, encoding: string = "UTF8", locale?: string) {
    super("DATABASE", name);
    this.#encoding = encoding;
    this.#locale = locale;
  }

  /**
   * @returns The default encoding for this database
   */
  public get encoding(): string {
    return this.#encoding;
  }

  /**
   * @returns The default locale for this database
   */
  public get locale(): string | undefined {
    return this.#locale;
  }

  /**
   * Creates a new Schema object within this catalog.
   *
   * @param name - The name of the schema
   * @param owner - Optional, the owner of the schema
   * @returns The new schema object
   */
  public createSchema(name: string, owner?: Role): Schema {
    return new Schema(this, name, owner);
  }

  public toSql(): string {
    const name = escapeIdentifier(this.name);
    const encoding = escapeLiteral(this.#encoding);
    let sql = `CREATE DATABASE ${name} ENCODING ${encoding}`;
    if (this.#locale) {
      const locale = escapeLiteral(this.#locale);
      sql += ` LC_COLLATE ${locale} LC_CTYPE ${locale}`;
    }
    return sql;
  }
}

/**
 * A PostgreSQL schema.
 */
export class Schema extends Securable implements Executable {
  readonly #catalog: Catalog;
  readonly #owner?: Role;

  /**
   * Creates a new Schema.
   *
   * @param catalog - The database catalog to which this schema belongs
   * @param name - The name of this schema
   * @param owner - Optional, the owner of this schema
   */
  public constructor(catalog: Catalog, name: string, owner?: Role) {
    super("SCHEMA", name);
    this.#catalog = catalog;
    this.#owner = owner;
  }

  /**
   * @returns The catalog to which this schema belongs.
   */
  public get catalog(): Catalog {
    return this.#catalog;
  }

  /**
   * @returns The owner of this schema, or undefined
   */
  public get owner(): Role | undefined {
    return this.#owner;
  }

  /**
   * @returns A Securable that represents all sequences currently in this schema
   */
  public allSequences(): Securable {
    return new Securable("ALL SEQUENCES IN SCHEMA", this.name);
  }

  /**
   * @returns A Securable that represents all tables currently in this schema
   */
  public allTables(): Securable {
    return new Securable("ALL TABLES IN SCHEMA", this.name);
  }

  /**
   * @returns A Securable that represents all routines currently in this schema
   */
  public allRoutines(): Securable {
    return new Securable("ALL ROUTINES IN SCHEMA", this.name);
  }

  /**
   * Changes the owner of this schema to someone else.
   *
   * @param to - The new owner
   * @returns An executable statement
   */
  public changeOwner(to: Role): Executable {
    const name = escapeIdentifier(this.name);
    const owner = escapeIdentifier(to.name);
    return { toSql: () => `ALTER SCHEMA ${name} OWNER TO ${owner}` };
  }

  /**
   * Sets the default privileges for newly created tables in this schema.
   *
   * @param grantee - The role to receive the privileges
   * @param privileges - The privileges to grant
   */
  public setDefaultTablePrivileges(
    grantee: Role,
    ...privileges: string[]
  ): DefaultPrivileges {
    const defaultPrivs = new Privileges(grantee, "TABLES", ...privileges);
    return new DefaultPrivileges(defaultPrivs, undefined, this);
  }

  /**
   * Sets the default privileges for newly created sequences in this schema.
   *
   * @param grantee - The role to receive the privileges
   * @param privileges - The privileges to grant
   */
  public setDefaultSequencePrivileges(
    grantee: Role,
    ...privileges: string[]
  ): DefaultPrivileges {
    const defaultPrivs = new Privileges(grantee, "SEQUENCES", ...privileges);
    return new DefaultPrivileges(defaultPrivs, undefined, this);
  }

  /**
   * Sets the default privileges for newly created sequences in this schema.
   *
   * @param grantee - The role to receive the privileges
   * @param privileges - The privileges to grant
   */
  public setDefaultRoutinePrivileges(
    grantee: Role,
    ...privileges: string[]
  ): DefaultPrivileges {
    const defaultPrivs = new Privileges(grantee, "ROUTINES", ...privileges);
    return new DefaultPrivileges(defaultPrivs, undefined, this);
  }

  public toSql(): string {
    let sql = `CREATE SCHEMA IF NOT EXISTS ${escapeIdentifier(this.name)}`;
    if (this.#owner) {
      sql += ` AUTHORIZATION ${escapeIdentifier(this.#owner.name)}`;
    }
    return sql;
  }
}
