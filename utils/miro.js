const fetch = require("node-fetch");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
let Cookie = require("request-cookies").Cookie;
const { google } = require("googleapis");

class MiroRequests {
  constructor(username, pass, environment) {
    this.username = username;
    this.pass = pass;
    this.cookie = [];
    this.environment = environment;
  }

  async login() {
    let initData = await fetch("https://miro.com/login/", {
      headers: {
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "accept-language":
          "en-DE,en;q=0.9,de-DE;q=0.8,de;q=0.7,en-US;q=0.6,fr;q=0.5,it;q=0.4",
        "cache-control": "max-age=0",
        "sec-ch-ua":
          '"Chromium";v="88", "Google Chrome";v="88", ";Not A Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
        cookie: "",
      },
      referrer: "https://miro.com/app/dashboard/",
      referrerPolicy: "strict-origin-when-cross-origin",
      body: null,
      method: "GET",
      //"redirect": "follow",
      mode: "cors",
    });

    //console.log(initData.headers.raw()['set-cookie'].length, initData.status)
    console.log((initData.headers.raw()['set-cookie']))
    let csrfCookie = initData.headers
      .raw()
    ["set-cookie"].find((item) => item.includes("csrf-token"));
    this.csrfToken = new Cookie(csrfCookie).value;
    console.log("csrf token login", this.csrfToken);

    //console.log(`email=${encodeURIComponent(this.username)}&password=${encodeURIComponent(this.pass)}&token=${this.csrfToken}`)

    let loginData = await fetch(`https://miro.com/api/v1/auth`, {
      headers: {
        accept:
          "application/ json, text/ plain, */*",
        "accept-language":
          "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "max-age=0",
        "content-type": "application/json",
        "sec-ch-ua":
          '"Chromium";v="88", "Google Chrome";v="88", ";Not A Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
        //cookie: `csrf-token=${this.csrfToken}`,
      },
      referrer: "https://miro.com/login/",
      referrerPolicy: "strict-origin-when-cross-origin",
      method: "POST",
      redirect: "manual",
      mode: "cors",
      body: JSON.stringify({
        email: this.username,
        password: this.pass,
      })
    });

    console.log('login status', loginData.status)

    await this.mergeCookies(
      initData.headers.raw()["set-cookie"],
      loginData.headers.raw()["set-cookie"]
    );

    //console.log(await this.cookiesToString(newCookieArray)
    let html = await fetch("https://miro.com/app/dashboard/", {
      headers: {
        cookie: await this.cookiesToString(this.cookie),
      },
      referrerPolicy: "strict-origin-when-cross-origin",
      body: null,
      method: "GET",
      mode: "cors",
    });

    await this.mergeCookies(this.cookie, html.headers.raw()["set-cookie"]);

    let plainHTML = await html.text();

    const virtualConsole = new jsdom.VirtualConsole();
    let dom = new JSDOM(plainHTML, {
      runScripts: "dangerously",
      resources: "usable",
      virtualConsole,
    });

    if (dom.window['rtb']) {
      this.token = dom.window["rtb"]["token"];
      console.log(`${this.environment} logged in`, this.token);

      if (this.environment !== "prod") return

    } else {
      console.log('couldnt log in to miro', this.username, this.pass);
      setTimeout(() => {
        this.login();
      }, 1000 * 60);
    }
  };

  async getTeams() {
    //console.log('old cookies', this.cookie)
    //console.log('get teams cookies', this.cookie.find(item => item['name'] === 'token')['value'], this.token)
    let teams = await fetch(
      `https://miro.com/api/v1/accounts/?fields=id%2Ctitle%2Ctype%2Crole%2Climits%2Ctrial%2Cexpired%2CexpirationDate%2CcreatedAt%2CcurrentUserPermission%2CcurrentUserConnection%7Bid%2ClastActivityDate%2Cpermissions%2CorganizationConnection%7Blicense%7D%2Crole%2CselfLink%2CsharedBoardsNumber%2Cuser%7Bemail%7D%7D%2Cfeatures%2CinvitationLink%2Corganization%7Bid%2CbillingData%2CcurrentUserPermission%2CidleTimeout%2Ctitle%2Cfeatures%2Ctype%2Cnotifications%7D%2Cpicture%2Cprojects%7Bid%2Ctitle%7D%2Cintegrations%2CintercomEnabled%2CwhoCanInvite%2CinviteExternalUsersEnabled%2Ccredits%2CsharingPolicy%7BmoveBoardToAccountEnabled%7D%2CdomainJoinPolicy%2CdomainProps%2CjoinPolicyForExternal%2CparticipantPostInvitationPaymentTest%2Cnotifications%2CorganizationExtension%7BaccountDiscovery%7D&_=${Date.now()}`,
      {
        body: null,
        headers: {
          cookie: `token=${this.tokenCookie}`,
        },
        method: "GET",
        mode: "cors",
        credentials: "include",
      }
    );

    if (teams.status === 401) {
      let text = await teams.text()
      console.error("failed to retrieve teams", text);
      throw new Error({
        message: "failed to retrieve teams",
        HttpStatus: teams.status,
        text,
      })
    }
    //console.log('old cookies', this.cookie)
    await this.mergeCookies(this.cookie, teams.headers.raw()["set-cookie"]);

    teams = await teams.json();

    return teams;
  };

  async createProject(teamID, title) {
    const resp = await
      fetch(`https://miro.com/api/v1/accounts/${teamID}/projects/?fields=sharingPolicyOnAccount%2CcurrentUser%7Bid%2Cname%2Cemail%2Crole%2Cpicture%2CprojectPermissions%7D%2CownerConnection%7BaccountConnection%7Bid%2Caccount%7Bid%7D%2CorganizationConnection%7Blicense%2Cdeactivated%2Crole%7D%7D%2Cuser%7Bname%2Cid%2Cemail%2Cpicture%7D%2Crole%2CprojectPermissions%7D%2CaccountId%2Ctitle%2Cid%2CisStarred&title=${encodeURIComponent(title)}`, {
        headers: {
          cookie: `token=${this.tokenCookie}`,
          "x-csrf-token": this.token,
        },
        body: null,
        method: "POST",
        mode: "cors",
        credentials: "include"
      });

    if (resp.status !== 200) {
      let text = await resp.text()
      console.error("failed to create project", text);
      throw new Error({
        message: "failed to create project",
        HttpStatus: resp.status,
        text,
      })
    }

    await this.mergeCookies(this.cookie, resp.headers.raw()["set-cookie"]);

    const json = await resp.json();

    return json
  };

  async moveBoardToProject(boardID, projectID) {
    const resp = await fetch(`https://miro.com/api/v1/boards/${boardID}/attachToProject?projectId=${projectID}&sendNotification=false`, {
      headers: {
        cookie: `token=${this.tokenCookie}`,
        "x-csrf-token": this.token,
        accept: "application/json",
      },
      body: null,
      method: "POST"
    });

    if (resp.status !== 200) {
      let text = await resp.text()
      console.error("failed to move board to project", text);
      throw new Error({
        message: "failed to move board to project",
        HttpStatus: resp.status,
        text,
      })
    }

    await this.mergeCookies(this.cookie, resp.headers.raw()["set-cookie"]);

    return await resp.json()
  };

  async addUserToProject(teamID, projectID, userId, role = 'COOWNER') {
    //console.log(`https://miro.com/api/v1/accounts/${teamID}/projects/${projectID}/users?sendNotification=false`)
    const resp = await fetch(`https://miro.com/api/v1/accounts/${teamID}/projects/${projectID}/users?sendNotification=false`, {
      headers: {
        accept: "application/json",
        'content-type': 'application/json',
        cookie: `token=${this.tokenCookie}`,
        "x-csrf-token": this.token,
      },
      method: "POST",
      "body": JSON.stringify([
        {
          userId,
          role
        }
      ]),
    });

    if (resp.status !== 200) {
      let text = await resp.text()
      console.error("failed to add user to project", text);
      throw new Error({
        message: "failed to add user to project",
        HttpStatus: resp.status,
        text,
      })
    }

    await this.mergeCookies(this.cookie, resp.headers.raw()["set-cookie"]);

    return await resp.json()
  }

  async getUsers(orgId) {
    //console.log('old cookies', this.cookie)
    let users = await fetch(
      `https://miro.com/api/v1/organizations/${orgId}/members?deactivated=false&fields=id%2Cpicture%2Cemail%2Ctype%2Cname%2ClastActiveDate%2Crole%2CdayPassesActivatedInLast30Days%2Clicense%2CaccountsNumber&accountRoles=ADMIN%2CUSER&sort=name&limit=100&offset=0`,
      {
        body: null,
        headers: {
          cookie: `token=${this.tokenCookie}`,
        },
        method: "GET",
        mode: "cors",
        credentials: "include",
      }
    );

    if (users.status !== 200) {
      let text = await users.text()
      throw new Error({
        message: "failed to retrieve users",
        HttpStatus: users.status,
        text,
      })
    }

    await this.mergeCookies(this.cookie, users.headers.raw()["set-cookie"]);
    users = await users.json();
    //console.log('user keys', Object.keys(users))
    if (this.environment === 'dev') users['data'] = users['data'].filter(user => user['email'].includes('remotly.de'))
    return users;
  };

  async getBoards(teamID, projectID) {
    //TODO: remove unnecessary fields from request
    let boards = await fetch(
      `https://miro.com/api/v1/boards/?offset=0&limit=150&filter=DEFAULT&sort=LAST_OPENED&fields=id%2Ctitle%2ClastViewedByMeDate%2ClastModifyingUser%7Bid%7D%2ClastModifyingUserName%2ConlineUsers.limit(10)%7Bid%2Cname%2Crole%2Cemail%2Cpicture%2Cstate%7D%2CupdatedAt%2Cpicture%7Bsize44%2Csize180%2Csize420%7D%2Cowner%7Bid%2Cname%7D%2CcurrentUserPermission%7Bid%2Crole%2Cpermissions%7D%2CcurrentUserContext%7Bid%2Crole%2Cpermissions%2CdirectlyShared%7D%2Cdemo%2CsharingPolicyOnAccount%2Cparticipant%2Cproject%7Btitle%7D%2Caccount%7Bid%2Cfeatures%2Corganization%7Bfeatures%7D%2Ctype%2Ctrial%7D%2ClockedByActiveBoardsPerAccountLimitExceeded%2Cstarred%2CtrashedDate%2CdeletionDate&attachment=${teamID}${projectID ? `&projectId=${projectID}` : ''}`,
      {
        body: null,
        headers: {
          cookie: `token=${this.tokenCookie}`,
        },
        method: "GET",
        mode: "cors",
        credentials: "include",
      }
    );
    //console.log('old cookies', this.cookie)
    //console.log('resp cookie', users.headers.raw()['set-cookie'])
    await this.mergeCookies(this.cookie, boards.headers.raw()["set-cookie"]);
    //console.log('old cookies', this.cookie)

    boards = await boards.json();
    //console.log('users',JSON.stringify(users, null, 3))
    return boards;
  };

  async moveBoard(boardID, accountID) {
    let board = await fetch(
      `https://miro.com/api/v1/boards/${boardID}/attach-to-account?accountId=${accountID}`,
      {
        body: null,
        headers: {
          cookie: `token=${this.tokenCookie}`,
          "x-csrf-token": this.token,
        },
        method: "POST",
        mode: "cors",
        credentials: "include",
      }
    );
    //console.log('old cookies', this.cookie)
    //console.log('resp cookie', users.headers.raw()['set-cookie'])
    await this.mergeCookies(this.cookie, board.headers.raw()["set-cookie"]);
    //console.log('old cookies', this.cookie)

    board = await board.json();
    //console.log('users',JSON.stringify(users, null, 3))
    return board;
  };

  async makeBoardEditableViaLink(boardID, policy = 'EDIT') {
    let resp = await fetch(`https://miro.com/api/v1/boards/${boardID}/publicity?sharingPolicy=${policy}`, {
      method: 'PUT',
      headers: {
        cookie: `token=${this.tokenCookie}`,
        "x-csrf-token": this.token,
      },
      mode: "cors",
      credentials: "include",
    })

    return resp.json()
  };

  async getUsersInTeam(teamID) {
    let resp = await fetch(`https://miro.com/api/v1/accounts/${teamID}/user-connections?fields=id%2Cuser%7Bid%2Cemail%2Cstate%2Cname%2Cpicture%7D%2ClastActivityDate%2Crole%2CdayPassesActivatedInLast30Days%2CorganizationConnection%7Blicense%2Crole%2CaccountsNumber%7D&roles=ADMIN%2CUSER&sort=name&limit=100&offset=0`, {
      method: 'GET',
      headers: {
        cookie: `token=${this.tokenCookie}`,
        "x-csrf-token": this.token,
      },
      mode: "cors",
      credentials: "include",
    })
    let json = await resp.json()
    return json['data']
  };

  async getUsersInProject(teamID, projectID) {
    const resp = await fetch(`https://miro.com/api/v1/accounts/${teamID}/projects/${projectID}/user-connections?fields=accountConnection%7Bid%2Crole%2Caccount%7Bid%7D%2CorganizationConnection%7Blicense%2Crole%7D%7D%2Cuser%7Bname%2Cid%2Cemail%2Cpicture%7D%2Cinvites%2Crole%2Cid&limit=100&offset=0&roles=COMMENTATOR%2CEDITOR%2CVIEWER%2CCOOWNER`, {
      headers: {
        cookie: `token=${this.tokenCookie}`,
        "x-csrf-token": this.token,
      },
      "body": null,
      "method": "GET"
    });

    await this.mergeCookies(this.cookie, resp.headers.raw()["set-cookie"]);

    return await resp.json();
  };

  async setBoardPassword(boardID, password) {
    console.log(`set password for board ${boardID} to ${password}`)
    let resp = await fetch(`https://miro.com/api/v1/boards/${boardID}/public-access-password`, {
      method: 'PUT',
      headers: {
        cookie: `token=${this.tokenCookie}`,
        "x-csrf-token": this.token,
        'content-type': 'application/json'
      },
      mode: "cors",
      credentials: "include",
      body: JSON.stringify({
        password
      })
    });

    await this.mergeCookies(this.cookie, resp.headers.raw()["set-cookie"]);

    return resp.json()
  };

  async editSharingSettings(boardID, accessLevel = 'BOARD_OWNER') {
    const resp = await fetch(`https://miro.com/api/v1/boards/${boardID}/copy-access-level?copyAccessLevel=${accessLevel}`, {
      headers: {
        cookie: `token=${this.tokenCookie}`,
        "x-csrf-token": this.token,
      },
      body: null,
      method: "PUT"
    });

    await this.mergeCookies(this.cookie, resp.headers.raw()["set-cookie"]);

    return await resp.json()
  }

  async deleteBoard(boardID) {
    let resp = await fetch(`https://miro.com/api/v1/boards/${boardID}/trash`, {
      body: null,
      headers: {
        cookie: `token=${this.tokenCookie}`,
        "x-csrf-token": this.token,
      },
      method: "POST",
      mode: "cors",
      credentials: "include",
    });
    //console.log('old cookies', this.cookie)
    //console.log('resp cookie', users.headers.raw()['set-cookie'])
    await this.mergeCookies(this.cookie, resp.headers.raw()["set-cookie"]);
    //console.log('old cookies', this.cookie)

    resp = await resp.json();
    //console.log('users',JSON.stringify(users, null, 3))
    return resp;
  };

  async duplicateBoard(accountID, title, boardID) {
    //console.log(`https://miro.com/api/v1/boards/?accountId=${accountID}&title=${title}&sourceBoardId=${boardID}&copyPermissions=false`)
    //console.log(this.cookie)
    let duplicate = await fetch(
      `https://miro.com/api/v1/boards/?accountId=${accountID}&title=${encodeURIComponent(
        title
      )}&sourceBoardId=${boardID}&copyPermissions=false`,
      {
        body: null,
        headers: {
          cookie: `token=${this.tokenCookie}`,
          "x-csrf-token": this.token,
          //"x-client-type": "desktop"
        },
        method: "POST",
        mode: "cors",
        credentials: "include",
      }
    );
    //console.log('old cookies', this.cookie)
    console.log("Status", duplicate.status);
    //console.log('resp cookie', users.headers.raw()['set-cookie'])
    await this.mergeCookies(this.cookie, duplicate.headers.raw()["set-cookie"]);
    //console.log('old cookies', this.cookie)

    duplicate = await duplicate.json();
    //console.log('users',JSON.stringify(duplicate, null, 3))
    return duplicate;
  };

  async boardInvite(boardID, email, role) {
    let invite = await fetch(
      `https://miro.com/api/v1/boards/${boardID}/share?fields=data%7BboardConnection%7BaccountConnection%7Bid%2CorganizationConnection%7Brole%2Clicense%7D%7D%7D%7D`,
      {
        body: JSON.stringify({
          emails: Array.isArray(email) ? email : [email],
          message: "",
          role: role || "EDITOR",
        }),
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          cookie: `token=${this.tokenCookie}`,
          "x-csrf-token": this.token,
        },
        method: "POST",
        mode: "cors",
        credentials: "include",
      }
    );
    //console.log('old cookies', this.cookie)
    //console.log('resp cookie', users.headers.raw()['set-cookie'])
    await this.mergeCookies(this.cookie, invite.headers.raw()["set-cookie"]);
    //console.log('old cookies', this.cookie)

    invite = await invite.json();
    //console.log('board invite resp', JSON.stringify(invite, null, 3))
    return invite;
  };

  async teamInvite(email, teamID, orgID) {
    let members = [
      {
        email: email,
      }
    ]

    if (Array.isArray(email)) {
      members = email.map(item => {
        return {
          email: item
        }
      })
    }

    let invite = await fetch(
      `https://miro.com/api/v1/organizations/${orgID}/members`,
      {
        body: JSON.stringify({
          members,
          accounts: [
            {
              id: teamID,
              membersOperation: "ADD",
            },
          ],
          license: "FULL",
        }),
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          "accept-language":
            "en-DE,en;q=0.9,de-DE;q=0.8,de;q=0.7,en-US;q=0.6,fr;q=0.5,it;q=0.4",
          cookie: `token=${this.tokenCookie}`,
          "x-csrf-token": this.token,
        },
        method: "POST",
        mode: "cors",
        credentials: "include",
      }
    );
    //console.log('resp cookie', users.headers.raw()['set-cookie'])
    await this.mergeCookies(this.cookie, invite.headers.raw()["set-cookie"]);
    //console.log('old cookies', this.cookie)

    invite = await invite.json();
    //console.log('team invite',JSON.stringify(invite, null, 3))
    return invite;
  };

  async makeBoardOwner(userID, boardID) {
    let owner = await fetch(
      `https://miro.com/api/v1/boards/${encodeURIComponent(boardID)}/owner?userId=${userID}`,
      {
        body: null,
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          cookie: `token=${this.tokenCookie}`,
          "x-csrf-token": this.token,
        },
        method: "PUT",
        mode: "cors",
        credentials: "include",
      }
    );
    //console.log('resp cookie', users.headers.raw()['set-cookie'])
    await this.mergeCookies(this.cookie, owner.headers.raw()["set-cookie"]);
    //console.log('old cookies', this.cookie)

    owner = await owner.json();
    //console.log('team invite',JSON.stringify(invite, null, 3))
    return owner;
  };

  async makeTeamAdmin(userEmail, teamID) {
    let id = await fetch(
      `https://miro.com/api/v1/accounts/${teamID}/user-connections?fields=id%2Cuser%7Bemail%7D&search=${userEmail}&limit=500&offset=0`,
      {
        method: "GET",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          cookie: `token=${this.tokenCookie}`,
        },
      }
    );

    await this.mergeCookies(this.cookie, id.headers.raw()["set-cookie"]);

    id = await id.json();
    if (id["data"].length > 1) throw new Error("more than one user found");
    let userID = id["data"][0]["id"];

    let owner = await fetch(
      `https://miro.com/api/v1/accounts/${teamID}/user-connections/${userID}/?role=ADMIN`,
      {
        body: null,
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          cookie: `token=${this.tokenCookie}`,
          "x-csrf-token": this.token,
        },
        method: "PUT",
        mode: "cors",
        credentials: "include",
      }
    );
    //console.log('resp cookie', users.headers.raw()['set-cookie'])
    await this.mergeCookies(this.cookie, owner.headers.raw()["set-cookie"]);
    //console.log('old cookies', this.cookie)

    owner = await owner.json();
    //console.log('team invite',JSON.stringify(invite, null, 3))
    return owner;
  };

  async backupBoard(board, auth) {
    let download = await fetch(`https://miro.com/api/v1/boards/${board["id"]}/?archive=true`,
      {
        method: "GET",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          cookie: `token=${this.tokenCookie}`,
          "x-csrf-token": this.token,
        },
      }
    );
    let raw = await download.text()

    //no google auth provided
    if (!auth) {
      return raw
    }

    const drive = google.drive({
      version: "v3",
      auth,
    });
    const media = {
      mimeType: "application/rtb",
      body: raw,
    };

    console.log("uploading", board["title"]);

    return new Promise((resolve, reject) => {
      drive.files.create(
        {
          resource: {
            name:
              board["title"] ||
              `Miro Board Backup ${new Date().toLocaleTimeString()}`,
            //parents: ['14uP2IH-6vktdm6YJQsM0UTKCcmuc2J9C']
          },
          media: media,
          fields: ["id", "parents"],
        },
        (err, file) => {
          if (err) {
            // Handle error
            console.error(err.message || err);
            reject(err);
          } else {
            console.log("File: ", file['id']);
            resolve(file['id'] || board['title'] || file);
          }
        }
      );
    });
  };

  async backupTeam(teamID, auth) {
    let { data: boards } = await this.getBoards(teamID);

    console.log("boards", boards.length);
    let blocked = [];

    for (let board of boards) {
      if (
        board["currentUserPermission"]["permissions"].find(
          (item) => item === "GET_BOARD_ARCHIVE"
        )
      ) {
        await this.backupBoard(board, auth).catch((e) => {
          //catch errors
          board["upload_error"] = e.message || e.name || e;
          blocked.push(board);
        });
      } else {
        //duplicate board if permissions are not enough
        if (
          board["currentUserPermission"]["permissions"].find(
            (item) => item === "COPY_BOARD"
          )
        ) {
          let duplicate = await this.duplicateBoard(
            board["account"]["id"],
            board["title"],
            board["id"]
          );

          await this.backupBoard(duplicate, auth);

          await this.deleteBoard(duplicate["id"]);
        } else {
          console.log("missing permissions");
          blocked.push(board);
        }
      }
    }

    return blocked;
  };

  async createTeam(title, orgID) {

    let resp = await fetch(
      `https://miro.com/api/v1/accounts/?title=${encodeURIComponent(
        title
      )}&usersLimit=2147483647&type=PAID_TEAM&organizationId=${orgID}`,
      {
        headers: {
          accept: "application/json",
          "x-csrf-token": this.token,
          cookie: `token=${this.tokenCookie}`,
        },
        body: null,
        method: "POST",
        mode: "cors",
        credentials: "include",
      }
    );

    await this.mergeCookies(this.cookie, resp.headers.raw()["set-cookie"]);

    let data = await resp.json();
    //console.log(JSON.stringify(data, null, 3))

    return data;
  };

  async mergeCookies(oldCookies, newCookies) {
    //format oldStr
    //console.log(oldCookies.length, newCookies.length)
    if (!oldCookies) {
      console.error("cookie merge failed no old cookies provided");
      return;
    }
    oldCookies = oldCookies.map((item, index) => {
      if (typeof item === "string") {
        let cookie = new Cookie(item);
        return {
          name: cookie.key,
          value: cookie.value,
          path: cookie.path,
          domain: cookie.domain,
        };
      } else return item;
    });
    //console.log('old', oldCookies)

    for (var a in newCookies) {
      //console.log('a', a, newCookies.length)
      let cookie = new Cookie(newCookies[a]);
      //console.log(cookie)
      let index = oldCookies.findIndex((item) => item["name"] === cookie.key);
      //console.log('index', index, cookie.key)
      if (index >= 1) oldCookies[index]["value"] = cookie.value;
      else
        oldCookies.push({
          name: cookie.key,
          value: cookie.value,
          path: cookie.path,
          domain: cookie.domain,
        });
    }

    //console.log('merged', oldCookies.length)

    this.cookie = oldCookies;
    this.tokenCookie = this.cookie.find(
      (item) => item["name"] === "token"
    )?.value;
    return oldCookies;
  };

  async cookiesToString(array) {
    let string = "";
    for (var b in array) {
      //let domain = array[b]['domain']
      string += `${array[b]["name"]}=${array[b]["value"]}; `;
    }
    return string;
  };

  getCookies() {
    return this.cookie;
  };
}

module.exports = {
  MiroRequests,
};
