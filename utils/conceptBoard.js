const fetch = require("node-fetch");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
let Cookie = require("request-cookies").Cookie;

//PDF download
//https://app.conceptboard.com/export-as-pdf/38891426-b6a5-4ce6-881e-5ebadf4f2bbb/versions/;hi=14;low=19

class conceptBoard {
    constructor(username, password) {
        this.username = username;
        this.password = password;
        this.cookie = [];
    };

    async login() {
        this.cookie = []
        console.log('login to conceptBoard')
        let resp = await fetch(`https://app.conceptboard.com/login-redirect`)
        const plainHtml = await resp.text();

        await this.mergeCookies(
            this.cookie,
            resp.headers.raw()["set-cookie"]
        );

        const virtualConsole = new jsdom.VirtualConsole();
        let dom = new JSDOM(plainHtml, {
            runScripts: "dangerously",
            resources: "usable",
            virtualConsole,
        });

        if (!dom.window['sp']['info']['user']) {
            console.error('couldnt get csrf token from dom');
            return
        }

        this.nonce = dom.window['sp']['info']['user']['nonce'] //csrf-token probably hash of sRAK cookie | is linked to cookie value | probably never changes during session
        console.log('cb nonce', this.nonce)
        console.log('cb cookie', await this.cookiesToString())

        let respInit = await fetch(`https://app.conceptboard.com/api/v0_1/auth/actions/initiate-authentication`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': await this.cookiesToString(),
                'X-CB-CSRF': this.nonce,
            },
            body: JSON.stringify({
                email: this.username,
                afterwardsUrl: 'https://app.conceptboard.com/home'
            })
        })

        if (respInit.status !== 200) {
            console.error('failed to init auth', respInit.status)
            return
        }
        let initJSON = await respInit.json()

        if (initJSON['error']) {
            console.error('failed to init auth', initJSON['error'])
            return
        }

        await this.mergeCookies(
            this.cookie,
            respInit.headers.raw()["set-cookie"]
        );

        let cbLoginData = initJSON['data'].find(item => item['displayName'] === 'Conceptboard')

        let respAuth = await fetch(`https://app.conceptboard.com${cbLoginData['endpoint']}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': await this.cookiesToString(),
                'X-CB-CSRF': this.nonce,
            },
            body: JSON.stringify({
                email: this.username,
                password: this.password,
                rememberMe: true,
            }),
            redirect: 'manual'
        });

        //console.log(await respAuth.text())

        await this.mergeCookies(
            this.cookie,
            respAuth.headers.raw()["set-cookie"]
        );

        //should redirect
        console.log('cb auth status', respAuth.status)
        if (respAuth.status !== 302) console.error('cb login failed', respAuth.status)
        else {
            console.log('cb login success')
            this.lastLogin = new Date().getTime()
        }
        await this.getUserId(respAuth.headers.raw()['location'][0])

    };

    async getUserId(href) {

        const getResp = await fetch(href, {
            method: 'GET',
            headers: {
                accept: '*/*',
                'cookie': await this.cookiesToString(),
                'X-CB-CSRF': this.nonce,
                referer: 'https://app.conceptboard.com/login-redirect',
            },
        })

        await this.mergeCookies(
            this.cookie,
            getResp.headers.raw()["set-cookie"]
        );

        const respHref = await fetch(href, {
            method: 'GET',
            headers: {
                accept: '*/*',
                'cookie': await this.cookiesToString(),
                'X-CB-CSRF': this.nonce,
                referer: 'https://app.conceptboard.com/login-redirect',
            },
        })

        await this.mergeCookies(
            this.cookie,
            respHref.headers.raw()["set-cookie"]
        );

        let resp = await fetch('https://app.conceptboard.com/', {
            method: 'GET',
            headers: {
                'cookie': await this.cookiesToString(),
                'X-CB-CSRF': this.nonce,
            },
        })

        let html = await resp.text();
        const virtualConsole = new jsdom.VirtualConsole();
        let dom = new JSDOM(html, {
            runScripts: "dangerously",
            resources: "usable",
            virtualConsole,
        });

        if (!dom.window['sp']) {
            console.error('couldnt get userID for CB');
            return
        }

        let userID = dom.window['sp']['info']['user']['id']
        this.userID = userID

        console.log('cb user id', userID)

        await this.mergeCookies(
            this.cookie,
            resp.headers.raw()["set-cookie"]
        );
    };

    async getBoards(portfolioID) {
        let urlencoded = new URLSearchParams();
        urlencoded.append("limit", 50);
        urlencoded.append("ownerType", 'ALL');
        urlencoded.append("sortType", 'LASTMODIFIED');
        urlencoded.append("searchText", '');
        urlencoded.append("displayType", 'ONLYDOCUMENTS'); //COMBINED
        urlencoded.append("archived", false);
        urlencoded.append("contentSearch", false);

        if (portfolioID) urlencoded.append('portfolioId', portfolioID);

        let resp = await fetch(`https://app.conceptboard.com/__/ajax/query/list`, {
            method: 'POST',
            headers: {
                'Cookie': await this.cookiesToString(),
                'X-CB-CSRF': this.nonce,
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            },
            body: urlencoded,
        })
        let text = await resp.text();
        let json = text.split('&&')[1]
        json = JSON.parse(json)

        await this.mergeCookies(
            this.cookie,
            resp.headers.raw()["set-cookie"]
        );
        //console.log(json)
        return json['boardQueryResultList']
    };

    async getPortfolios() {

        let resp = await fetch(`https://app.conceptboard.com/api/v0_1/users/${this.userID}/portfolios`, {
            method: 'GET',
            headers: {
                'cookie': await this.cookiesToString(),
                'X-CB-CSRF': this.nonce,
            },
        })

        await this.mergeCookies(
            this.cookie,
            resp.headers.raw()["set-cookie"]
        );

        let json = await resp.json()

        return json['data']
    };

    async getUsers() {
        //https://app.conceptboard.com/__/info
        let resp = await fetch(`https://app.conceptboard.com/api/v0_1/contacts/teammembers`, {
            method: 'GET',
            headers: {
                'cookie': await this.cookiesToString(),
                'Content-Type': 'application/json',
                'X-CB-CSRF': this.nonce,
                'X-IS-AJAX-CALL': true,
            },
        })

        console.log('getUsers status', resp.status)

        if (resp.status === 500) {
            this.login()
            throw {
                message: 'Something went wrong, please try again later',
                status: 500
            }
        }

        await this.mergeCookies(
            this.cookie,
            resp.headers.raw()["set-cookie"]
        );

        let json = await resp.json()

        if (resp.status !== 200) console.error('json', json)
        else if (resp.status === 403 && json['title'] === 'csrf token invalid') this.login()

        return json['data']
    };

    async getUserDetails(companyID, userID) {
        let resp = await fetch(`https://app.conceptboard.com/api/v0_1/companyusers?userid=${userID}&companyid=${companyID}&%5Bobject%20Object%5D=`, {
            method: 'GET',
            headers: {
                'cookie': await this.cookiesToString(),
                'Content-Type': 'application/json',
                'X-CB-CSRF': this.nonce,
                'X-IS-AJAX-CALL': true,
            },
        })

        await this.mergeCookies(
            this.cookie,
            resp.headers.raw()["set-cookie"]
        );

        let json = await resp.json()

        if (resp.status !== 200) console.error('[cb] userDetails', json)
        else if (resp.status === 403 && json['title'] === 'csrf token invalid') this.login()

        return json['data'] || json['errors'] || json
    }

    async createProject(title) {
        let resp = await fetch(`https://app.conceptboard.com/__/newproject`, {
            method: 'POST',
            headers: {
                'Cookie': await this.cookiesToString(),
                'X-CB-CSRF': this.nonce,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                portfolioTitle: title
            })
        })

        await this.mergeCookies(
            this.cookie,
            resp.headers.raw()["set-cookie"]
        );

        let text = await resp.text()
        let json = text.split('&&')[1]
        json = JSON.parse(json)

        return json
    };

    async copyBoard(documentId, includeHistory = true) {
        let resp = await fetch(`https://app.conceptboard.com/__/copy`, {
            method: 'POST',
            headers: {
                'Cookie': await this.cookiesToString(),
                'X-CB-CSRF': this.nonce,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                documentId,
                includeHistory
            })
        })

        await this.mergeCookies(
            this.cookie,
            resp.headers.raw()["set-cookie"]
        );

        let text = await resp.text()
        let json = text.split('&&')[1]
        json = JSON.parse(json)

        return json
    };

    async copyProject(portfolioId) {
        let resp = await fetch(`https://app.conceptboard.com/api/v0_1/portfolios/${portfolioId}/actions/copy`, {
            method: 'POST',
            headers: {
                'Cookie': await this.cookiesToString(),
                'X-CB-CSRF': this.nonce,
                'Content-Type': 'application/json',
            },
        })

        await this.mergeCookies(
            this.cookie,
            resp.headers.raw()["set-cookie"]
        );

        let json = await resp.json()

        return json['data']
    };

    async inviteToProject(projectId, userid, personalmessage = '', accesstype = 'editor') {
        let resp = await fetch(`https://app.conceptboard.com/api/v0_1/portfolios/${projectId}/userswithaccess`, {
            method: 'POST',
            headers: {
                'Cookie': await this.cookiesToString(),
                'X-CB-CSRF': this.nonce,
                'Content-Type': 'application/json',
                "accept": "*/*",
                "accept-language": "en-DE,en;q=0.9,de-DE;q=0.8,de;q=0.7,en-US;q=0.6,fr;q=0.5,it;q=0.4",
                "Referer": "https://app.conceptboard.com/boards",
                "Referrer-Policy": "strict-origin-when-cross-origin",
                "x-is-ajax-call": "true",
                "x-requested-with": "XMLHttpRequest",
                "sec-ch-ua": "\" Not A;Brand\";v=\"99\", \"Chromium\";v=\"102\", \"Google Chrome\";v=\"102\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
            },
            body: JSON.stringify({
                userid,
                accesstype,
                personalmessage
            })
        })

        console.log('invite to project status', resp.status, userid)

        await this.mergeCookies(
            this.cookie,
            resp.headers.raw()["set-cookie"]
        );

        let json = await resp.json()

        if (resp.status !== 200) {
            console.error('invite error', JSON.stringify(json['error'] || json))
            return {
                error: json['error'],
                status: resp.status,
                failed: true
            }
        }
        return json
    };

    async renameProject(portfolioId, title) {

        let resp = await fetch(`https://app.conceptboard.com/__/portfolio/${portfolioId}/settings/title`, {
            method: 'POST',
            headers: {
                'Cookie': await this.cookiesToString(),
                "accept": "*/*",
                "accept-language": "en-DE,en;q=0.9,de-DE;q=0.8,de;q=0.7,en-US;q=0.6,fr;q=0.5,it;q=0.4",
                "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                "sec-ch-ua": "\" Not A;Brand\";v=\"99\", \"Chromium\";v=\"102\", \"Google Chrome\";v=\"102\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "x-is-ajax-call": "true",
                "x-requested-with": "XMLHttpRequest",
                'X-CB-CSRF': this.nonce,
                "Referer": "https://app.conceptboard.com/boards",
                "Referrer-Policy": "strict-origin-when-cross-origin"
            },
            body: `title=${encodeURIComponent(title)}`
        })

        //console.log('status', resp.status, `title=${encodeURIComponent(title)}`, await this.cookiesToString())

        await this.mergeCookies(
            this.cookie,
            resp.headers.raw()["set-cookie"]
        );

        let text = await resp.text()
        //console.log(text)
        let json = text.split('&&')[1]
        json = JSON.parse(json)

        //console.log(json)

        return json
    };

    async deleteBoard(documentId) {
        let resp = await fetch(`https://app.conceptboard.com/__/delete`, {
            method: 'POST',
            headers: {
                'Cookie': await this.cookiesToString(),
                'X-CB-CSRF': this.nonce,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                documentId
            })
        })

        await this.mergeCookies(
            this.cookie,
            resp.headers.raw()["set-cookie"]
        );

        let text = await resp.text()
        let json = text.split('&&')[1]
        json = JSON.parse(json)

        return json
    };

    async moveBoardtoPortfolio(documentId, portfolioId) {
        let resp = await fetch(`https://app.conceptboard.com/__/addToPortfolio`, {
            method: 'POST',
            headers: {
                'Cookie': await this.cookiesToString(),
                'X-CB-CSRF': this.nonce,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                documentId,
                portfolioId
            })
        })

        await this.mergeCookies(
            this.cookie,
            resp.headers.raw()["set-cookie"]
        );

        let text = await resp.text()
        let json = text.split('&&')[1]
        json = JSON.parse(json)

        return json
    };

    async changeAccessControl(boardId, token = 'Remotly+10') {
        let resp = await fetch(`https://app.conceptboard.com/api/v0_1/documents/${boardId}/accesscontrol`, {
            method: 'POST',
            headers: {
                'Cookie': await this.cookiesToString(),
                'X-CB-CSRF': this.nonce,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                "mode": "public_link_with_password",
                token,
                "minimumAccessTypeForChange": "editor",
                "defaultAccessType": "editor"
            })
        })

        await this.mergeCookies(
            this.cookie,
            resp.headers.raw()["set-cookie"]
        );

        console.log('status', resp.stats)

        let json = await resp.json()

        console.log(json)

        return json
    };

    async mergeCookies(oldCookies = this.cookie, newCookies) {
        //format oldStr

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
            if (index >= 0) oldCookies[index]["value"] = cookie.value;
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
        return oldCookies;
    };

    async cookiesToString(array = this.cookie) {
        let string = "";
        for (var b in array) {
            //let domain = array[b]['domain']
            string += `${array[b]["name"]}=${array[b]["value"]}; `;
        }
        return string;
    };
}

module.exports = {
    conceptBoard
}