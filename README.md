# miroapi

**miroapi** is a Node.js library that extends and automates Miro, Thinkific, and Jira operations by thinly wrapping their web interfaces and REST APIs. It provides high-level features beyond the official Miro API, such as board backups, project management, team administration, and more.

**Note:** This is one of my earliest coding projects; some code is years old and may be broken by now.

## Installation

```bash
# using bun
bun install
```

## Usage

```js
const { MiroRequests } = require("./utils/miro");
const { ThinkificAPI } = require("./utils/thinkific");
const { JiraClass } = require("./utils/jira");

(async () => {
  // Miro
  const miro = new MiroRequests("email@example.com", "password", "prod");
  await miro.login();
  const teams = await miro.getTeams();
  console.log("My teams:", teams);

  // Thinkific
  const thinkific = new ThinkificAPI(process.env.THINKIFIC_API_KEY);
  const courses = await thinkific.getCourses();
  console.log("Courses:", courses);

  // Jira
  const jira = new JiraClass({
    host: "your.jira.host",
    email: "you",
    token: "token",
  });
  const projects = await jira.project.getAllProjects();
  console.log("Jira Projects:", projects);
})();
```

## Features

### MiroRequests (utils/miro.js)

- **login()**: authenticate via Miro web login
- **getTeams()**, **createTeam(title)**, **backupTeam(teamID, auth)**
- **createProject**, **getProjects**, **moveBoardToProject**, **addUserToProject**
- **getBoards**, **duplicateBoard**, **deleteBoard**, **backupBoard**
- **teamInvite**, **boardInvite**, **makeTeamAdmin**, **makeBoardOwner**
- **makeBoardEditableViaLink**, **setBoardPassword**, **editSharingSettings**
- Cookie management: **mergeCookies**, **cookiesToString**, **getCookies**

### ThinkificAPI (utils/thinkific.js)

- **getCourses()**: list public courses
- **createUser(user)**: register new user and send welcome email

### Jira (utils/jira.js)

- Thin wrapper around `jira-connector` for workflows like issue creation, search, and project management.

## Contributing

Open issues or submit pull requests. Remove dead code when replacing features and adhere to Node.js best practices.

## License

ISC Sebastian Boehler
