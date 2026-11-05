import { typescript, github, javascript, ReleasableCommits } from "projen";

const projectUrl = "https://github.com/libreworks/db-provision-pgsql";

const project = new typescript.TypeScriptProject({
  name: "db-provision-pgsql",
  description:
    "Provisions a PostgreSQL database and schema with logins and grants",
  keywords: [
    "database",
    "postgresql",
    "login",
    "grant",
    "authentication",
    "authorization",
  ],

  authorName: "LibreWorks Contributors",
  authorUrl: `${projectUrl}/contributors`,
  authorOrganization: true,
  license: "MIT",

  repository: `${projectUrl}.git`,
  homepage: "https://libreworks.github.io/db-provision-pgsql/",
  bugsUrl: `${projectUrl}/issues`,

  deps: ["pg"],
  devDeps: ["@jest/globals", "@types/pg"],

  minNodeVersion: "18.0.0",
  workflowNodeVersion: "24",
  tsconfig: {
    compilerOptions: {
      moduleResolution: javascript.TypeScriptModuleResolution.NODE16,
      module: "node16",
      lib: ["DOM", "ES2022"],
      target: "es2022",
    },
  },

  projenrcTs: true,
  prettier: true,
  codeCov: true,
  docgen: true,

  packageManager: javascript.NodePackageManager.YARN_CLASSIC,
  runner: typescript.TypeScriptRunner.tsx(),
  jestOptions: {
    jestConfig: {
      extensionsToTreatAsEsm: [".ts"],
      moduleNameMapper: {
        "^(\\.{1,2}/.*)\\.js$": "$1",
      },
    },
  },
  tsJestOptions: {
    transformPattern: "^.+\\.ts$",
    transformOptions: {
      useESM: true,
    },
  },

  majorVersion: 0,
  defaultReleaseBranch: "main",
  githubOptions: {
    projenCredentials: github.GithubCredentials.fromApp({}),
    pullRequestLintOptions: {
      semanticTitleOptions: { types: ["feat", "fix", "chore", "docs"] },
    },
  },
  autoApproveOptions: {
    // Anyone with write access to this repository can have auto-approval.
    allowedUsernames: [],
  },
  depsUpgradeOptions: {
    workflowOptions: {
      labels: ["auto-approve"],
      schedule: javascript.UpgradeDependenciesSchedule.WEEKLY,
    },
  },

  releasableCommits: ReleasableCommits.featuresAndFixes(),
  releaseToNpm: true,
  npmTrustedPublishing: true,
  packageName: "@libreworks/db-provision-pgsql",
  npmAccess: javascript.NpmAccess.PUBLIC,
});

project.npmignore?.exclude("docs");

project.addFields({ type: "module", private: false });
project.testTask.env("NODE_OPTIONS", "--experimental-vm-modules");

project.synth();
