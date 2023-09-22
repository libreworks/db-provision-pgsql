import { jest } from "@jest/globals";
// @ts-ignore
import pg from "pg";
import { ServerClient } from "../src/client.js";

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
        expect(() => new ServerClient(client)).toThrowError({
          name: "Error",
          message: "The Client must connect to the postgres database",
        });
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
  });
});
