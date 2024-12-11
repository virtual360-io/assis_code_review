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

    const question =
      " You a Ruby Full Stack Developer CTO. You should review this change and give a 0 to 10 grate to it. If you give a 0, it means that this code is not good, not performact, insecure, and with bad variable names. 1 to 9 it means that code is not ready for production, 9 is better than 1. 10 means that this code is ready to go to production, with good variable names, good performance, and secure, and have automate tests, dont need do be perfect. Dont use Documentation to give your grate. Please, give tip to improve to 10. If you think the code needs more automated tests, please, suggest the tests that you think are necessary. You use Minitest to test your Ruby code.\n\n" +
      filteredDiff;

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
