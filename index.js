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
      .split("diff --git ")
      .slice(1) // Skip the first empty element
      .filter((fileDiff) => {
        // Check if the file extension matches our criteria
        return fileDiff.match(/\.(rb|html|erb|css|js)\s/);
      })
      .join("diff --git "); // Rejoin with the diff header

    console.log("Filtered diff:", filteredDiff);

    const question = core.getInput("assis-prompt") + "\n\n" + filteredDiff;

    // Send to API
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        question: question,
        session_code: null,
        user: {
          email: "ci@github.com",
          first_name: "github",
          last_name: "ci",
          role: "v360",
        },
        portal: {
          database: "githubci",
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
    core.setOutput("assis-answer", data["answer"]);

    await octokit.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: context.payload.pull_request.number,
      body: data["answer"],
    });
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
