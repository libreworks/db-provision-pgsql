import { jest } from "@jest/globals";
// @ts-ignore
import pg from "pg";
import { ServerClient, DatabaseClient } from "../src/client.js";
import { Catalog, Login, Grant, Role, Schema } from "../src/model.js";

describe("client", () => {
  describe("ServerClient", () => {
    let client: pg.Client;

    beforeEach(() => {
      client = new pg.Client({ database: "postgres" });
    });

    afterEach(() => {
      // @ts-ignore
      client = undefined;
    });

    describe("#constructor", () => {
      test("throws an exception", () => {
        client.database = "nothing";
        expect(() => new ServerClient(client)).toThrow(
          expect.objectContaining({
            name: "Error",
            message: "The Client must connect to the postgres database",
          }),
        );
      });
    });

    describe("#databaseExists", () => {
      test("works as expected for no rows", async () => {
        const obj = new ServerClient(client);
        const spy = jest.spyOn(client, "query");
        spy.mockImplementation(() => {
          return {};
        });
        const exists = await obj.databaseExists("FooBar");
        expect(exists).toBeFalsy();
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith({
          text: "SELECT COUNT(*) FROM pg_catalog.pg_database WHERE datname = $1",
          values: ["FooBar"],
          rowMode: "array",
        });
        spy.mockRestore();
      });

      test("works as expected for rows", async () => {
        const obj = new ServerClient(client);
        const spy = jest.spyOn(client, "query");
        spy.mockImplementation(() => {
          return { rows: [[1]] };
        });
        const exists = await obj.databaseExists("FooBar");
        expect(exists).toBeTruthy();
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith({
          text: "SELECT COUNT(*) FROM pg_catalog.pg_database WHERE datname = $1",
          values: ["FooBar"],
          rowMode: "array",
        });
        spy.mockRestore();
      });
    });

    describe("#roleExists", () => {
      test("works as expected for no rows", async () => {
        const obj = new ServerClient(client);
        const spy = jest.spyOn(client, "query");
        spy.mockImplementation(() => {
          return {};
        });
        const username = "BARfoo";
        const exists = await obj.roleExists(username);
        expect(exists).toBeFalsy();
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith({
          text: "SELECT COUNT(*) FROM pg_catalog.pg_roles WHERE rolname = $1",
          values: [username],
          rowMode: "array",
        });
        spy.mockRestore();
      });

      test("works as expected for rows", async () => {
        const obj = new ServerClient(client);
        const spy = jest.spyOn(client, "query");
        spy.mockImplementation(() => {
          return { rows: [[1]] };
        });
        const username = "BARfoo";
        const exists = await obj.roleExists(username);
        expect(exists).toBeTruthy();
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith({
          text: "SELECT COUNT(*) FROM pg_catalog.pg_roles WHERE rolname = $1",
          values: [username],
          rowMode: "array",
        });
        spy.mockRestore();
      });
    });

    describe("#createDatabase", () => {
      let catalog: Catalog;

      beforeEach(() => {
        catalog = new Catalog("foobar");
      });

      afterEach(() => {
        // @ts-ignore
        catalog = undefined;
      });

      test("exits early when database exists", async () => {
        const obj = new ServerClient(client);
        const spy = jest.spyOn(obj, "databaseExists");
        spy.mockImplementation(() => Promise.resolve(true));
        const spy2 = jest.spyOn(client, "query");
        spy2.mockImplementation(() => {
          return {};
        });
        await obj.createDatabase(catalog);
        expect(spy2).not.toHaveBeenCalled();
        spy.mockRestore();
        spy2.mockRestore();
      });

      test("behaves as expected when database does not exist", async () => {
        const obj = new ServerClient(client);
        const spy = jest.spyOn(obj, "databaseExists");
        spy.mockImplementation(() => Promise.resolve(false));
        const spy2 = jest.spyOn(client, "query");
        spy2.mockImplementation(() => {
          return {};
        });
        await obj.createDatabase(catalog);
        expect(spy2).toHaveBeenCalledTimes(1);
        expect(spy2).toHaveBeenCalledWith(catalog.toSql());
        spy.mockRestore();
        spy2.mockRestore();
      });
    });

    describe("#createRole", () => {
      let login: Login;

      beforeEach(() => {
        login = new Login("foobar", "password");
      });

      afterEach(() => {
        // @ts-ignore
        login = undefined;
      });

      test("exits early when login exists", async () => {
        const obj = new ServerClient(client);
        const spy = jest.spyOn(obj, "roleExists");
        spy.mockImplementation(() => Promise.resolve(true));
        const spy2 = jest.spyOn(client, "query");
        spy2.mockImplementation(() => {
          return {};
        });
        await obj.createRole(login);
        expect(spy2).not.toHaveBeenCalled();
        spy.mockRestore();
        spy2.mockRestore();
      });

      test("behaves as expected when login does not exist", async () => {
        const obj = new ServerClient(client);
        const spy = jest.spyOn(obj, "roleExists");
        spy.mockImplementation(() => Promise.resolve(false));
        const spy2 = jest.spyOn(client, "query");
        spy2.mockImplementation(() => {
          return {};
        });
        await obj.createRole(login);
        expect(spy2).toHaveBeenCalledTimes(1);
        expect(spy2).toHaveBeenCalledWith(login.toSql());
        spy.mockRestore();
        spy2.mockRestore();
      });
    });

    describe("#createGrant", () => {
      let catalog: Catalog;
      let login: Login;
      let grant: Grant;

      beforeEach(() => {
        login = new Login("foobar", "password");
        catalog = new Catalog("foobar");
        grant = catalog.grant(login, "CONNECT", "TEMP");
      });

      afterEach(() => {
        // @ts-ignore
        login = undefined;
        // @ts-ignore
        catalog = undefined;
        // @ts-ignore
        grant = undefined;
      });

      test("behaves as expected when login does not exist", async () => {
        const obj = new ServerClient(client);
        const spy = jest.spyOn(client, "query");
        spy.mockImplementation(() => {
          return {};
        });
        await obj.createGrant(grant);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith(grant.toSql());
        spy.mockRestore();
      });
    });
  });

  describe("DatabaseClient", () => {
    let client: pg.Client;
    let schema: Schema;

    beforeEach(() => {
      client = new pg.Client({ database: "postgres" });
      const catalog = new Catalog("foobar");
      const owner = new Login("superuser", "foobar");
      schema = catalog.createSchema("username", owner);
    });

    afterEach(() => {
      // @ts-ignore
      client = undefined;
      // @ts-ignore
      schema = undefined;
    });

    describe("#createAdminGrants", () => {
      let adminRole: Role;

      beforeEach(() => {
        adminRole = new Role("admins");
      });

      afterEach(() => {
        // @ts-ignore
        adminRole = undefined;
      });

      test("behaves as expected with no admins", async () => {
        const obj = new DatabaseClient(client);
        const spy = jest.spyOn(client, "query");
        spy.mockImplementation(() => {
          return {};
        });
        const admins: Login[] = [];
        const results = await obj.createAdminGrants(schema, adminRole, admins);
        expect(spy).not.toHaveBeenCalled();
        expect(results).toStrictEqual([]);
        spy.mockRestore();
      });

      test("behaves as expected", async () => {
        const obj = new DatabaseClient(client);
        const spy = jest.spyOn(client, "query");
        spy.mockImplementation(() => {
          return {};
        });
        const admins = [new Login("foo", "bar")];
        const results = await obj.createAdminGrants(schema, adminRole, admins);
        expect(spy).toHaveBeenCalledTimes(8);
        expect(results.map((v) => v.toSql())).toStrictEqual([
          'GRANT USAGE ON SCHEMA "username" TO "admins"',
          'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA "username" TO "admins"',
          'GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA "username" TO "admins"',
          'GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA "username" TO "admins"',
          'ALTER DEFAULT PRIVILEGES FOR USER "superuser" IN SCHEMA "username" GRANT ALL PRIVILEGES ON TABLES TO "admins"',
          'ALTER DEFAULT PRIVILEGES FOR USER "superuser" IN SCHEMA "username" GRANT ALL PRIVILEGES ON SEQUENCES TO "admins"',
          'ALTER DEFAULT PRIVILEGES FOR USER "superuser" IN SCHEMA "username" GRANT ALL PRIVILEGES ON ROUTINES TO "admins"',
          'GRANT "admins" TO "foo"',
        ]);
        spy.mockRestore();
      });
    });

    describe("#createReaderGrants", () => {
      let readerRole: Role;

      beforeEach(() => {
        readerRole = new Role("readers");
      });

      afterEach(() => {
        // @ts-ignore
        readerRole = undefined;
      });

      test("behaves as expected with no admins", async () => {
        const obj = new DatabaseClient(client);
        const spy = jest.spyOn(client, "query");
        spy.mockImplementation(() => {
          return {};
        });
        const logins: Login[] = [];
        const results = await obj.createReaderGrants(
          schema,
          readerRole,
          logins,
        );
        expect(spy).not.toHaveBeenCalled();
        expect(results).toStrictEqual([]);
        spy.mockRestore();
      });

      test("behaves as expected", async () => {
        const obj = new DatabaseClient(client);
        const spy = jest.spyOn(client, "query");
        spy.mockImplementation(() => {
          return {};
        });
        const logins = [new Login("foo", "bar")];
        const results = await obj.createReaderGrants(
          schema,
          readerRole,
          logins,
        );
        expect(spy).toHaveBeenCalledTimes(6);
        expect(results.map((v) => v.toSql())).toStrictEqual([
          'GRANT USAGE ON SCHEMA "username" TO "readers"',
          'GRANT SELECT ON ALL TABLES IN SCHEMA "username" TO "readers"',
          'GRANT SELECT ON ALL SEQUENCES IN SCHEMA "username" TO "readers"',
          'ALTER DEFAULT PRIVILEGES FOR USER "superuser" IN SCHEMA "username" GRANT SELECT ON TABLES TO "readers"',
          'ALTER DEFAULT PRIVILEGES FOR USER "superuser" IN SCHEMA "username" GRANT SELECT ON SEQUENCES TO "readers"',
          'GRANT "readers" TO "foo"',
        ]);
        spy.mockRestore();
      });
    });
  });
});
