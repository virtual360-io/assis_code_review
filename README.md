# Code Review Assistant

GitHub Action for automated code reviews using AI.

## Local Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Install dotenv (if not already installed):**
   ```bash
   npm install dotenv
   ```

3. **Create `.env` file:**
   ```bash
   GITHUB_TOKEN=ghp_your_github_token
   ASSIS_API_TOKEN=your_api_token
   ```

4. **Edit `local_run.js`:**
   - Update `getContext()` with your repo owner, repo name, and PR number

5. **Run locally:**
   ```bash
   node local_run.js
   ```

Results are saved to `tmp/code_review.md`.

