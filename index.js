const core = require("@actions/core");
const github = require("@actions/github");

module.exports = {
  getPRDiff,
  filterPRDiff,
  callAgent,
};

async function callAgent(apiUrl, apiToken, input, context) {
  // Send to API
  console.log("Calling Agent...");
  const repo_url = `https://github.com/${context.repo.owner}/${context.repo.repo}/pull/${context.payload.pull_request.number}`;
  body = {
    input: input,
    session_code: null,
    user: {
      email: "github.actions@v360.io",
      first_name: "GitHub",
      last_name: "Actions",
      role: "v360",
    },
    agent_source: {
      database: null,
      url: repo_url,
      context: "github_action",
      client_name: null,
    }
  }
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${apiToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`API call failed with status ${response.status}`);
  }
  const data = await response.json();
  code_review = data["output"];

  return code_review;
}

async function getPRDiff(octokit, context) {
  const { data: diff } = await octokit.rest.pulls.get({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: context.payload.pull_request.number,
    mediaType: {
      format: "diff",
    },
  });

  return diff;
}

function filterPRDiff(diff) {
  const filteredDiff = diff
    .split("diff --git ")
    .slice(1) // Skip the first empty element
    .filter((fileDiff) => {
      // Check if the file extension matches our criteria
      return fileDiff.match(/\.(rb|html|erb|css|js|py)\s/);
    })
    .join("diff --git "); // Rejoin with the diff header

  return filteredDiff;
}

async function run() {
  try {
    const token = core.getInput("github-token");
    const apiUrl = core.getInput("api-url");
    const apiToken = core.getInput("api-token");

    const octokit = github.getOctokit(token);
    const context = github.context;

    const diff = await getPRDiff(octokit, context);
    console.log("Diff: \n\n", diff);

    const filteredDiff = filterPRDiff(diff);
    console.log("Filtered diff: \n\n", filteredDiff);

    const input = filteredDiff;
    const code_review = await callAgent(apiUrl, apiToken, input, context);
    console.log("Code review: \n\n", code_review);

    core.setOutput("assis-answer", code_review);
    await octokit.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: context.payload.pull_request.number,
      body: code_review,
    });
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
