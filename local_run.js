// Simple test for PR diff fetching (lines 13-21)
// Testing: https://github.com/virtual360-io/llm_data_analyst/pull/363
// Requires: GitHub token (private repo)

// Load environment variables from .env file
require('dotenv').config();

// Import functions from index.js
const { getPRDiff, filterPRDiff, callAgent } = require('./index.js');

function saveDiff(diff) {
    const fs = require('fs');
    const path = require('path');
    const tmpFilePath = path.join(__dirname, 'tmp/pr_diff.diff');
    fs.writeFileSync(tmpFilePath, diff, 'utf8');
    console.log(`📝 Diff saved to ${tmpFilePath}`);
}

function getToken() {
    const token = process.env.GITHUB_TOKEN || process.env.INPUT_GITHUB_TOKEN;
    if (!token) {
        console.error('✗ Error: GITHUB_TOKEN environment variable is required for private repos');
        console.error('\nUsage options:');
        console.error('  1. Create a .env file with: GITHUB_TOKEN=ghp_your_token');
        console.error('  2. Or set environment variable: GITHUB_TOKEN="ghp_your_token" node test-diff.js');
        console.error('  3. Or use: INPUT_GITHUB_TOKEN="ghp_your_token" node test-diff.js');
        process.exit(1);
    }
    return token;
}

function getContext() {
    return {
        repo: {
            owner: 'virtual360-io',
            repo: 'llm_data_analyst',
        },
        payload: {
            pull_request: {
                number: 363,
            },
        },
    };
}

async function getOctokit() {
    const token = getToken();
    const octokitModule = await import('@octokit/rest');
    Octokit = octokitModule.Octokit;
    return new Octokit({ auth: token });
}

function saveCodeReview(code_review) {
    const fs = require('fs');
    const path = require('path');
    const tmpFilePath = path.join(__dirname, 'tmp/code_review.md');
    fs.writeFileSync(tmpFilePath, code_review, 'utf8');
    console.log(`📝 Code review saved to ${tmpFilePath}`);
}

async function testPRDiff() {
    const context = getContext();
    const octokit = await getOctokit();
    const diff = await getPRDiff(octokit, context);
    const filteredDiff = filterPRDiff(diff);

    const totalFiles = diff.split("diff --git ").length - 1;
    const filteredFiles = filteredDiff ? filteredDiff.split("diff --git ").length : 0;

    console.log(`Total files in diff: ${totalFiles}`);
    console.log(`Filtered files (.rb/.html/.erb/.css/.js/.py): ${filteredFiles}`);

    const agentKey = "mN8D1vVWi16jL6Oy-79Cq"
    const apiUrl = `https://assistente.v360.io/api/v1/agents/${agentKey}/`;
    const apiToken = process.env.ASSIS_API_TOKEN;
    const code_review = await callAgent(apiUrl, apiToken, filteredDiff, context);
    console.log("Code review: \n\n", code_review);
    saveCodeReview(code_review);
}

testPRDiff();