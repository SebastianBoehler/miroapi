const fetch = require('node-fetch')

class ThinkificAPI {
    constructor(key) {
        this.key = key
        this.headers = {
            'X-Auth-API-Key': this.key,
            'X-Auth-Subdomain': 'remotly',
            'Content-Type': 'application/json'
        }
    };

    async getCourses(limit = 250) {
        let resp = await fetch(`https://api.thinkific.com/api/public/v1/courses?limit=${limit}`, { //page as param
            method: 'GET',
            headers: this.headers
        })
        resp = await resp.json()
        //console.log(resp)
        return resp
    };

    async createUser(user) {
        let body = {
            "first_name": user['first'],
            "last_name": user['last'],
            "email": user['email'],
            "password": user['pass'],
            //"roles": [],
            //"bio": "The user's bio",
            //"company": "The user's company",
            //"headline": "The user's job title",
            //"affiliate_code": "abc123",
            //"affiliate_commission": 20,
            //"affiliate_commission_type": "%",
            //"affiliate_payout_email": "bob@example.com",
            //"custom_profile_fields": [],
            //"skip_custom_fields_validation": false,
            "send_welcome_email": true,
            //"external_id": 0
        }

        let resp = await fetch(`https://api.thinkific.com/api/public/v1/users`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(body)
        })
        resp = await resp.json()
        return resp
    };
}

module.exports = {
    ThinkificAPI
}
