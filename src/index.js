#!/usr/bin/env node

const fs = require("fs");
const color = require("ansi-colors");
const inquirer = require("inquirer");
const { resolve } = require("path");
const shell = require("shelljs");
const loading = require("loading-cli");

fs.readdir(process.cwd(), (err, files) => {
  if (files.length > 0) {
    console.log(color.red(`[Failed] Folder "${process.cwd()}" is not empty !`));
  } else {
    inquirer
      .prompt([
        {
          type: "input",
          name: "name",
          message: "Project name",
          validate: (value) => {
            return value != "";
          },
        },
        {
          type: "input",
          name: "outDir",
          message: "Output dir",
          default: "dist",
        },
        {
          type: "list",
          name: "git",
          message: "Init git",
          choices: ["yes", "no"],
        },
        {
          type: "list",
          name: "advanced",
          message: "Advanced config",
          choices: ["yes", "no"],
        },
      ])
      .then((answers) => {
        if (answers.advanced == "yes") {
          inquirer
            .prompt([
              {
                type: "list",
                name: "module",
                message: "Module type",
                choices: ["CommonJS", "ES6"],
              },
              {
                type: "list",
                name: "strict",
                message: "Strict mode",
                choices: ["yes", "no"],
              },
              {
                type: "list",
                name: "prettier",
                message: "Use Prettier",
                choices: ["yes", "no"],
              },
              {
                type: "list",
                name: "eslint",
                message: "Use ESLint",
                choices: ["yes", "no"],
              },
              {
                type: "list",
                name: "jest",
                message: "Install Jest",
                default: "no",
                choices: ["yes", "no"],
              },
            ])
            .then((advanced) => {
              generateProject(answers, advanced);
            })
            .catch((err) => {
              console.log(color.red(`[Failed] ${err}`));
            });
        } else {
          generateProject(answers, {
            module: "CommonJS",
            strict: "yes",
            prettier: "yes",
            eslint: "yes",
            jest: "no",
          });
        }
      })
      .catch((err) => {
        console.log(color.red(`[Failed] ${err}`));
      });
  }
});

function generateProject(basic, options) {
  const packages = ["typescript"];
  const build = ["tsc"];
  const dir = basic.outDir.replace(/\\/g, "/").replace(/\/$/, "");
  const projectSettings = {
    name: basic.name.replace(/ /g, "-").toLowerCase(),
    version: "1.0.0",
    description: "",
    main: `${dir}/index.js`,
    types: `${dir}/index.d.ts`,
    scripts: {
      build: "tsc",
      prepare: "tsc && npm run lint && npm run format",
    },
    files: [`${dir}/**/*`],
    author: "",
    license: "ISC",
  };
  if (basic.git == "yes") {
    projectSettings.repository = {
      type: "git",
      url: "",
    };
    fs.writeFileSync(resolve("./.gitignore"), `node_modules\n${dir}`, {
      encoding: "utf-8",
    });
  }
  if (options.jest == "yes") {
    projectSettings.scripts.test = "jest --config jestconfig.json";
    packages.push("jest");
  }
  if (options.eslint == "yes") {
    projectSettings.scripts.lint = "eslint . --ext .ts";
    packages.push(
      "eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin"
    );
    build.push("npm run lint");
  }
  if (options.prettier == "yes") {
    projectSettings.scripts.format = `prettier --write "${dir}/**/*.ts" "${dir}/**/*.js"`;
    packages.push("prettier");
    build.push("npm run format");
  }
  projectSettings.scripts.prepare = build.join(" && ");
  try {
    fs.writeFileSync(
      resolve("./package.json"),
      JSON.stringify(projectSettings, null, "\t"),
      {
        encoding: "utf-8",
      }
    );
    fs.writeFileSync(
      resolve("./tsconfig.json"),
      JSON.stringify(
        {
          compilerOptions: {
            target: "ES6",
            module: options.module,
            declaration: true,
            outDir: dir,
            esModuleInterop: true,
            strict: options.strict == "yes",
          },
          include: ["src/**/*", "tests/**/*"],
          exclude: ["node_modules", "**/__tests__/*"],
        },
        null,
        "\t"
      ),
      {
        encoding: "utf-8",
      }
    );
    if (options.prettier == "yes") {
      fs.writeFileSync(
        resolve("./.prettierrc"),
        JSON.stringify(
          {
            printWidth: 120,
            trailingComma: "all",
            singleQuote: true,
          },
          null,
          "\t"
        ),
        { encoding: "utf-8" }
      );
    }
    if (options.eslint == "yes") {
      fs.writeFileSync(
        resolve("./.eslintrc"),
        JSON.stringify(
          {
            root: true,
            parser: "@typescript-eslint/parser",
            plugins: ["@typescript-eslint"],
            extends: [
              "eslint:recommended",
              "plugin:@typescript-eslint/eslint-recommended",
              "plugin:@typescript-eslint/recommended",
            ],
          },
          null,
          "\t"
        ),
        { encoding: "utf-8" }
      );
      fs.writeFileSync(resolve("./.eslintignore"), `node_modules\n${dir}`, {
        encoding: "utf-8",
      });
    }
    if (options.jest == "yes") {
      fs.writeFileSync(
        resolve("jestconfig.json"),
        JSON.stringify(
          {
            transform: {
              "^.+\\.(t|j)sx?$": "ts-jest",
            },
            testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$",
            moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
          },
          null,
          "\t"
        ),
        { encoding: "utf-8" }
      );
      fs.mkdirSync(resolve("./tests"));
      fs.writeFileSync(resolve("./tests/test.ts"), "");
    }
    fs.mkdirSync(resolve(dir));
    fs.mkdirSync(resolve("./src"));
    fs.writeFileSync(
      resolve("./src/index.ts"),
      'console.log("Hello world!");',
      { encoding: "utf-8" }
    );
    console.log(color.green(`> Files created.`));
    const load = loading({
      text: color.green(`Installing dependencies`),
      interval: 200,
      color: "green",
      frames: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
    });
    load.start();
    shell.exec(
      `npm i --save-dev ${packages.join(" ")}${
        basic.git == "yes" ? " && git init" : ""
      }`,
      { silent: true },
      (code) => {
        load.stop();
        if (code != 0)
          return console.log(
            color.red(`[Failed] Error when installing dependencies !`)
          );
        console.log(
          color.green(`[Success] Project created successfully. Happy coding!`)
        );
      }
    );
  } catch (ex) {
    console.log(color.red(`[Failed] ${ex}`));
  }
}
