import { jest } from "@jest/globals";
// @ts-ignore
import pg from "pg";
import { ServerClient } from "../src/client.js";
import { Catalog, Login, Grant } from "../src/model.js";

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

    describe("#createLogin", () => {
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
        await obj.createLogin(login);
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
        await obj.createLogin(login);
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
});
