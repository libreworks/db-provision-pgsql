import {
  Named,
  Role,
  Grant,
  Membership,
  Login,
  Privileges,
  Securable,
  Catalog,
  Schema,
} from "../src/model.js";

class NamedImpl extends Named {}

describe("model", () => {
  describe("Named", () => {
    describe("#constructor", () => {
      test("works as expected", () => {
        const name = "foobar";
        const obj = new NamedImpl(name);
        expect(obj.name).toBe(name);
      });
    });
  });

  describe("Role", () => {
    describe("#constructor", () => {
      test("works as expected", () => {
        const name = "foobar";
        const obj = new Role(name);
        expect(obj.name).toBe(name);
      });
    });

    describe("#assignTo", () => {
      test("works as expected", () => {
        const name = "foobar";
        const obj = new Role(name);
        const to = new Role("barfoo");
        const actual = obj.assignTo(to);
        expect(actual).toBeInstanceOf(Membership);
        expect(actual.grantee).toBe(to);
        expect(actual.group).toBe(obj);
      });
    });

    describe("#toSql", () => {
      test("produces correct SQL", () => {
        const name = "my_role";
        const obj = new Role(name);
        expect(obj.toSql()).toBe(`CREATE ROLE ${name}`);
      });
    });
  });

  describe("Grant", () => {
    describe("#constructor", () => {
      test("works as expected", () => {
        const grantee = new Role("grantee");
        const entitlement = "FOOBAR";
        const obj = new Grant(grantee, entitlement);
        expect(obj.entitlement).toBe(entitlement);
        expect(obj.grantee).toBe(grantee);
      });
    });

    describe("#toSql", () => {
      test("produces correct SQL", () => {
        const grantee = new Role("grantee");
        const entitlement = "FOOBAR";
        const obj = new Grant(grantee, entitlement);
        const sql = obj.toSql();
        expect(sql).toBe(`GRANT ${entitlement} TO ${grantee.name}`);
      });
    });
  });

  describe("Membership", () => {
    describe("#constructor", () => {
      test("works as expected", () => {
        const group = new Role("foo");
        const member = new Role("bar");
        const obj = new Membership(group, member);
        expect(obj.grantee).toBe(member);
        expect(obj.group).toBe(group);
        expect(obj.entitlement).toBe(group.name);
      });
    });

    describe("#toSql", () => {
      test("produces correct SQL", () => {
        const group = new Role("foo");
        const member = new Role("bar");
        const obj = new Membership(group, member);
        const sql = obj.toSql();
        expect(sql).toBe(`GRANT ${group.name} TO ${member.name}`);
      });
    });
  });

  describe("Login", () => {
    describe("#constructor", () => {
      test("works as expected", () => {
        const username = "foobar";
        const password = "hunter2";
        const obj = new Login(username, password);
        expect(obj.username).toBe(username);
        expect(obj.password).toBe(password);
        expect(obj.name).toBe(username);
      });
    });

    describe("#toSql", () => {
      test("produces correct SQL", () => {
        const username = "foobar";
        const password = "hunter2";
        const obj = new Login(username, password);
        const sql = obj.toSql();
        expect(sql).toBe(`CREATE USER ${username} WITH PASSWORD '${password}'`);
      });
    });
  });

  describe("Privileges", () => {
    describe("#constructor", () => {
      test("works as expected", () => {
        const grantee = new Role("foobar");
        const target = "DATABASE whatever";
        const privileges = ["CONNECT", "TEMP"];
        const obj = new Privileges(grantee, target, ...privileges);
        expect(obj.grantee).toBe(grantee);
        expect(obj.privileges).toStrictEqual(privileges);
        expect(obj.target).toBe(target);
      });
    });

    describe("#toSql", () => {
      test("produces correct SQL", () => {
        const grantee = new Role("foobar");
        const target = "DATABASE whatever";
        const privileges = ["CONNECT", "TEMP"];
        const obj = new Privileges(grantee, target, ...privileges);
        const sql = obj.toSql();
        expect(sql).toBe(
          `GRANT ${privileges.join(", ")} ON ${target} TO ${grantee.name}`,
        );
      });
    });
  });

  describe("Securable", () => {
    describe("#constructor", () => {
      test("works as expected", () => {
        const name = "foobar";
        const qualifier = "DATABASE";
        const obj = new Securable(qualifier, name);
        expect(obj.grantName).toBe(`${qualifier} ${name}`);
        expect(obj.name).toBe(name);
      });
    });

    describe("#grant", () => {
      test("works as expected", () => {
        const grantee = new Role("barfoo");
        const name = "foobar";
        const qualifier = "DATABASE";
        const obj = new Securable(qualifier, name);
        const privileges = ["CONNECT", "TEMPORARY"];
        const actual = obj.grant(grantee, ...privileges);
        expect(actual).toBeInstanceOf(Privileges);
        expect(actual.grantee).toBe(grantee);
        expect(actual.privileges).toStrictEqual(privileges);
        expect(actual.target).toBe(`${qualifier} ${name}`);
      });
    });
  });

  describe("Catalog", () => {
    describe("#constructor", () => {
      test("works as expected with defaults", () => {
        const name = "foobar";
        const obj = new Catalog(name);
        expect(obj.name).toBe(name);
        expect(obj.encoding).toBe("UTF8");
        expect(obj.locale).toBeUndefined();
      });

      test("works as expected with all arguments", () => {
        const name = "foobar";
        const encoding = "SQL_ASCII";
        const locale = "en_US.UTF8";
        const obj = new Catalog(name, encoding, locale);
        expect(obj.name).toBe(name);
        expect(obj.encoding).toBe(encoding);
        expect(obj.locale).toBe(locale);
      });
    });

    describe("#createSchema", () => {
      test("works as expected", () => {
        const obj = new Catalog("whatever");
        const name = "foobar";
        const owner = new Role("barfoo");
        const actual = obj.createSchema(name, owner);
        expect(actual).toBeInstanceOf(Schema);
        expect(actual.name).toBe(name);
        expect(actual.owner).toBe(owner);
      });
    });

    describe("#grant", () => {
      test("works as expected", () => {
        const name = "foobar";
        const obj = new Catalog(name);
        const grantee = new Role("barfoo");
        const actual = obj.grant(grantee, "CONNECT");
        expect(actual.target).toBe(obj.grantName);
      });
    });

    describe("#toSql", () => {
      test("produces correct SQL with defaults", () => {
        const name = "foobar";
        const obj = new Catalog(name);
        const sql = obj.toSql();
        expect(sql).toBe(`CREATE DATABASE ${name} ENCODING 'UTF8'`);
      });

      test("produces correct SQL with all arguments", () => {
        const name = "foobar";
        const encoding = "SQL_ASCII";
        const locale = "en_US.UTF8";
        const obj = new Catalog(name, encoding, locale);
        const sql = obj.toSql();
        expect(sql).toBe(
          `CREATE DATABASE ${name} ENCODING '${encoding}' LC_COLLATE '${locale}' LC_CTYPE '${locale}'`,
        );
      });
    });
  });

  describe("Schema", () => {
    describe("#constructor", () => {
      test("works as expected with defaults", () => {
        const catalog = new Catalog("whatever");
        const name = "my_user";
        const obj = new Schema(catalog, name);
        expect(obj.name).toBe(name);
        expect(obj.owner).toBeUndefined();
        expect(obj.catalog).toBe(catalog);
      });

      test("works as expected with all arguments", () => {
        const catalog = new Catalog("whatever");
        const name = "my_user";
        const owner = new Role("owner");
        const obj = new Schema(catalog, name, owner);
        expect(obj.name).toBe(name);
        expect(obj.owner).toBe(owner);
        expect(obj.catalog).toBe(catalog);
      });
    });

    describe("#grant", () => {
      test("works as expected", () => {
        const name = "foobar";
        const catalog = new Catalog("whatever");
        const obj = new Schema(catalog, name);
        const grantee = new Role("barfoo");
        const actual = obj.grant(grantee, "USAGE");
        expect(actual.target).toBe(obj.grantName);
      });
    });

    describe("#allSequences", () => {
      test("works as expected", () => {
        const catalog = new Catalog("whatever");
        const name = "my_schema";
        const obj = new Schema(catalog, name);
        const actual = obj.allSequences();
        expect(actual).toBeInstanceOf(Securable);
        expect(actual.grantName).toBe(`ALL SEQUENCES IN ${obj.grantName}`);
      });
    });

    describe("#allTables", () => {
      test("works as expected", () => {
        const catalog = new Catalog("whatever");
        const name = "my_schema";
        const obj = new Schema(catalog, name);
        const actual = obj.allTables();
        expect(actual).toBeInstanceOf(Securable);
        expect(actual.grantName).toBe(`ALL TABLES IN ${obj.grantName}`);
      });
    });

    describe("#allRoutines", () => {
      test("works as expected", () => {
        const catalog = new Catalog("whatever");
        const name = "my_schema";
        const obj = new Schema(catalog, name);
        const actual = obj.allRoutines();
        expect(actual).toBeInstanceOf(Securable);
        expect(actual.grantName).toBe(`ALL ROUTINES IN ${obj.grantName}`);
      });
    });

    describe("#toSql", () => {
      test("produces correct SQL with defaults", () => {
        const catalog = new Catalog("whatever");
        const name = "my_user";
        const obj = new Schema(catalog, name);
        const sql = obj.toSql();
        expect(sql).toBe(`CREATE SCHEMA IF NOT EXISTS ${name}`);
      });

      test("produces correct SQL with all arguments", () => {
        const catalog = new Catalog("whatever");
        const name = "my_user";
        const owner = new Role("owner");
        const obj = new Schema(catalog, name, owner);
        const sql = obj.toSql();
        expect(sql).toBe(
          `CREATE SCHEMA IF NOT EXISTS ${name} AUTHORIZATION ${owner.name}`,
        );
      });
    });
  });
});
