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
    return `CREATE ROLE ${this.name}`;
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
    return `GRANT ${this.entitlement} TO ${this.#grantee.name}`;
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
    super(member, group.name);
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
    return `CREATE USER ${this.name} WITH PASSWORD '${this.#password}'`;
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
    return `${this.#qualifier} ${this.name}`;
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
    let sql = `CREATE DATABASE ${this.name} ENCODING '${this.#encoding}'`;
    if (this.#locale) {
      sql += ` LC_COLLATE '${this.#locale}' LC_CTYPE '${this.#locale}'`;
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
    return new Securable("ALL SEQUENCES IN", this.grantName);
  }

  /**
   * @returns A Securable that represents all tables currently in this schema
   */
  public allTables(): Securable {
    return new Securable("ALL TABLES IN", this.grantName);
  }

  /**
   * @returns A Securable that represents all routines currently in this schema
   */
  public allRoutines(): Securable {
    return new Securable("ALL ROUTINES IN", this.grantName);
  }

  public toSql(): string {
    let sql = `CREATE SCHEMA IF NOT EXISTS ${this.name}`;
    if (this.#owner) {
      sql += ` AUTHORIZATION ${this.#owner.name}`;
    }
    return sql;
  }
}
