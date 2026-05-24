import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseOptions, validateCoreVersion, loadCoreModule, createCardHandlers, validateCardOptions } from "./core.js";
import { Octokit } from "octokit";
import { getInput, info, setOutput } from "@actions/core";
import {getConfig} from "@stats-organization/github-readme-stats-core"

const run = async () => {
  const card = "pin";
  const optionsUser = getInput("user", { required: true });
  const optionsInput = getInput("options") || "";
  const outputPathInput = getInput("path") || "output";
  const coreVersion = validateCoreVersion(getInput("core_version") || "");
  
  const safePattern = /^[-\w/.,]+$/;
  if (optionsUser && !safePattern.test(optionsUser)) {
      throw "Username contains unsafe characters";
  }

  const config = getConfig()

  const octokit = new Octokit({ 
    auth: config.pats[0].value,
  });

  const data = await octokit.paginate("GET /users/{owner}/repos", {
    owner: optionsUser,
    per_page: 100,
    headers: {
      "x-github-api-version": "2026-03-10",
    },
  });
  console.log(`${data.length} repositories were returned`)

  data.forEach(async (repo) => {
    console.log(repo.name)
  

  const optionsRepo = repo.name

  const coreModule = await loadCoreModule(coreVersion);

  // Map of card types to their respective API handlers.
  const cardHandlers = createCardHandlers(coreModule);
  const handler = cardHandlers[card];
  if (!handler) {
    throw new Error(`Unsupported card type: ${card}`);
  }

  const query = parseOptions(optionsInput);
  query["repo"] = optionsRepo;
  query["username"] = optionsUser;

  validateCardOptions(card, query, process.env.GITHUB_REPOSITORY_OWNER);

  const outputPathValue =
    path.join(outputPathInput, optionsUser, `${optionsRepo}.svg`);
  const outputPath = path.resolve(process.cwd(), outputPathValue);
  await mkdir(path.dirname(outputPath), { recursive: true });

  const svg = (await handler(query))?.content;
  if (!svg) {
    throw new Error("Card renderer returned empty output.");
  }

  await writeFile(outputPath, svg, "utf8");
  info(`Wrote ${outputPath}`);
  setOutput("path", outputPathValue);

})

};

run()
// .catch((error) => {
//   setFailed(error instanceof Error ? error.message : String(error));
// });