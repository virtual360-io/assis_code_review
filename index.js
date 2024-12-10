const core = require("@actions/core");
const github = require("@actions/github");

async function run() {
  try {
    const token = core.getInput("github-token");
    const apiUrl = core.getInput("api-url");
    const apiToken = core.getInput("api-token");

    const octokit = github.getOctokit(token);
    const context = github.context;

    // Get PR diff
    const { data: diff } = await octokit.rest.pulls.get({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: context.payload.pull_request.number,
      mediaType: {
        format: "diff",
      },
    });

    // Filter for ruby/html/erb/css/js files
    const filteredDiff = diff
      .split("\n")
      .filter((line) => {
        return line.match(/\.(rb|html|erb|css|js)$/);
      })
      .join("\n");

    // Send to API
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        diff: filteredDiff,
        user: {
          email: context.payload.sender.email,
          login: context.payload.sender.login,
        },
        portal: {
          database: process.env.DATABASE_NAME,
        },
        assistant_source: {
          context: "github_action",
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`API call failed with status ${response.status}`);
    }

    const data = await response.json();
    core.setOutput("assis-answer", data);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
