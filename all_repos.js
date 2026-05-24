import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseOptions, validateCoreVersion, loadCoreModule, createCardHandlers, validateCardOptions } from "./core.js";

import { getInput, info, setOutput } from "@actions/core";

const run = async () => {
  const card = "pin";
  const optionsUser = getInput("user", { required: true });
  const optionsRepo = getInput("repo", { required: true });
  const optionsInput = getInput("options") || "";
  const outputPathInput = getInput("path") || "output";
  const coreVersion = validateCoreVersion(getInput("core_version") || "");

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
};

run()
// .catch((error) => {
//   setFailed(error instanceof Error ? error.message : String(error));
// });