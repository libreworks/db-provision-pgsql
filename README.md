# @libreworks/db-provision-pgsql

[![MIT](https://img.shields.io/github/license/libreworks/db-provision-pgsql)](https://github.com/libreworks/db-provision-pgsql/blob/main/LICENSE)
[![npm](https://img.shields.io/npm/v/@libreworks/db-provision-pgsql)](https://www.npmjs.com/package/@libreworks/db-provision-pgsql)
[![GitHub Workflow Status (branch)](https://img.shields.io/github/workflow/status/libreworks/db-provision-pgsql/release/main?label=release)](https://github.com/libreworks/db-provision-pgsql/actions/workflows/release.yml)
[![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/libreworks/db-provision-pgsql?sort=semver)](https://github.com/libreworks/db-provision-pgsql/releases)
[![codecov](https://codecov.io/gh/libreworks/db-provision-pgsql/branch/main/graph/badge.svg?token=OHTRGNTSPO)](https://codecov.io/gh/libreworks/db-provision-pgsql)

Provision databases and schemas in PostgreSQL along with roles, logins, and grants.

## Installation

```shell
npm install @libreworks/db-provision-pgsql
```

This library conforms to ECMAScript Modules (ESM). You can import this module using ESM or TypeScript syntax.

```TypeScript
import { Catalog } from "@libreworks/db-provision-pgsql";
```

If you're using CommonJS, you must use [dynamic imports](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import) instead.

## Usage

You can use this library to perform initialization of a PostgreSQL database server (version 11 and later). For example, creating databases, schemas, roles, users, and grants.

Here is an example to provision several database objects.

```typescript
import { Login, Role, Catalog } from "@libreworks/db-provision-pgsql";

const username = "example_user";
const password = "🙈";
const owner = new Login(username, password);

const admin = new Role("admin");
const readers = new Role("readers");

const grants = [admin.assignTo(owner)];
const catalog = new Catalog("my_database");
const schema = catalog.createSchema(username, owner);
grants.push(
  catalog.grant(owner, "CONNECT", "TEMP"),
  catalog.grant(readers, "CONNECT", "TEMP"),
  schema.grant(readers, "USAGE"),
  schema.allTables().grant(readers, "SELECT"),
  schema.allSequences().grant(readers, "SELECT"),
  schema.setDefaultTablePrivileges(readers, "SELECT").forCreator(owner),
  schema.setDefaultSequencePrivileges(readers, "SELECT").forCreator(owner)
);

// Display the SQL
const statements = [
  owner,
  admin,
  readers,
  catalog,
  schema,
  ...grants,
].map((v) => v.toSql());
console.log(statements.join(";\n") + ";\n");
```

The above example outputs the following SQL statements:

```sql
CREATE USER "example_user" WITH PASSWORD '🙈';
CREATE ROLE "admin";
CREATE ROLE "readers";
CREATE DATABASE "my_database" ENCODING 'UTF8';
CREATE SCHEMA IF NOT EXISTS "example_user" AUTHORIZATION "example_user";
GRANT "admin" TO "example_user";
GRANT CONNECT, TEMP ON DATABASE "my_database" TO "example_user";
GRANT CONNECT, TEMP ON DATABASE "my_database" TO "readers";
GRANT USAGE ON SCHEMA "example_user" TO "readers";
GRANT SELECT ON ALL TABLES IN SCHEMA "example_user" TO "readers";
GRANT SELECT ON ALL SEQUENCES IN SCHEMA "example_user" TO "readers";
ALTER DEFAULT PRIVILEGES FOR USER "example_user" IN SCHEMA "example_user" GRANT SELECT ON TABLES TO "readers";
ALTER DEFAULT PRIVILEGES FOR USER "example_user" IN SCHEMA "example_user" GRANT SELECT ON SEQUENCES TO "readers";
```

Because all identifiers are quoted, that means the objects will be created using the same character casing as provided. Without double quotes, PostgreSQL creates objects with lowercase identifiers.
