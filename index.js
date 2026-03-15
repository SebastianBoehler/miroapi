const { MiroRequests } = require("./utils/miro");
const { ThinkificAPI } = require("./utils/thinkific");
const { JiraClass } = require("./utils/jira");
const { conceptBoard } = require("./utils/conceptBoard");

module.exports = {
  MiroRequests,
  ThinkificAPI,
  JiraClass,
  conceptBoard,
  ConceptBoard: conceptBoard,
};
