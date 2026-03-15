# miroapi

[![CI](https://github.com/SebastianBoehler/miroapi/actions/workflows/ci.yml/badge.svg)](https://github.com/SebastianBoehler/miroapi/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg)](./CONTRIBUTING.md)

`miroapi` is a small Node.js toolbox for automating Miro, Thinkific, Jira, and Conceptboard workflows. It mixes official APIs with browser-level request flows where the public APIs are incomplete, which makes it useful for experimentation and internal tooling but also means some modules can drift when upstream products change.

This repository is public and open to maintainers. If you are exploring Miro automation, OpenClaw-adjacent integrations, or wrapper cleanup, contributions are welcome.

## Status

- The project is functional as a legacy integration toolbox, not a polished SDK.
- Some modules were written years ago and may require refreshes as upstream services evolve.
- CI currently runs a lightweight package smoke check so contributors have a stable baseline before adding deeper tests.
- Some Miro functionality relies on undocumented or browser-only endpoints. Use this repository only where that is acceptable for your environment and terms.

## Installation

```bash
npm install
```

## Usage

```js
const { MiroRequests, ThinkificAPI, JiraClass, conceptBoard } = require("miroapi");

(async () => {
  const miro = new MiroRequests("email@example.com", "password", "prod");
  await miro.login();
  const teams = await miro.getTeams();
  console.log("My teams:", teams);

  const thinkific = new ThinkificAPI(
    process.env.THINKIFIC_API_KEY,
    process.env.THINKIFIC_SUBDOMAIN,
  );
  const courses = await thinkific.getCourses();
  console.log("Courses:", courses);

  const jira = new JiraClass(
    "you@example.com",
    process.env.JIRA_API_TOKEN,
    "your-domain.atlassian.net",
  );
  const accounts = await jira.getAccounts();
  console.log("Jira accounts:", accounts);

  const boardClient = new conceptBoard("email@example.com", "password");
  console.log("Conceptboard client ready:", Boolean(boardClient));
})();
```

## Modules

### `MiroRequests`

- Logs into Miro via the web flow and manages session cookies.
- Wraps board, team, project, invite, sharing, and backup operations.
- Best suited for internal tools and prototypes where official API coverage is not enough.

### `ThinkificAPI`

- Uses Thinkific public API headers for course and user operations.
- Currently includes helpers for listing courses and creating users.

### `JiraClass`

- Thin wrapper around `jira-connector`.
- Currently includes helpers for listing accounts and creating issues.

### `conceptBoard`

- Browser-driven login flow plus helpers for listing boards and portfolios.
- Most sensitive to upstream authentication and UI changes.

## Development

```bash
npm ci
npm run validate
```

`npm run validate` checks that the repository has the expected package metadata and top-level exports. It is intentionally lightweight so CI remains reliable while the project is being modernized.

## Contributing

Start with [CONTRIBUTING.md](./CONTRIBUTING.md). Good contributions include:

- refreshing broken integrations when upstream endpoints change
- adding examples and failure diagnostics
- carving large modules into smaller helpers without breaking public behavior
- documenting what is official API usage versus browser automation

## Maintainer Notes

- Please avoid committing live cookies, tokens, or captured customer payloads.
- If you are adding a new integration, document the expected credentials and failure modes in the README.
- If you are replacing a brittle web flow with an official API, keep the migration path explicit in the pull request.
- Keep a clear boundary between officially supported APIs and reverse-engineered web flows so downstream users understand the maintenance and policy risk.

## License

Licensed under MIT. See [LICENSE](./LICENSE).
