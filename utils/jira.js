var JiraClient = require("jira-connector");

class JiraClass {
    constructor(email, token, host) {
        this.jira = new JiraClient({
            host,
            basic_auth: {
                email,
                api_token: token
            }
        });
    };

    async getAccounts() {
        let data = await this.jira.user.all({
            maxResults: 80
        })
        return data
    }

    async createIssue(title, description, id) {
        let obj = {
            fields: {
                project: {
                    key: "RY"
                },
                summary: title,
                description: description,
                issuetype: {
                    name: "Task"
                }
            }
        }

        if (id) {
            obj['fields']['assignee'] = {}
            obj['fields']['assignee']['id'] = id
        }
        let data = await this.jira.issue.createIssue(obj)
        return data
    }
}

module.exports = {
    JiraClass
}
