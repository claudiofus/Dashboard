'use strict';
const path = require("path");
const {google} = require('googleapis');
const errorLog = require('./logger').errorlog;
let OAuth2 = google.auth.OAuth2;
module.exports = function (app, conf) {
    let module = {};
    let oauth2Client = new OAuth2(conf.client_id, conf.client_secret, conf.redirect_uri);

    app.get('/', function (req, res) {
        res.sendFile(path.join(__dirname + '/../views/login.html'));
    });
    app.get('/dashboard', function (req, res) {
        res.sendFile(path.join(__dirname + '/../views/dashboard.html'));
    });
    app.get('/fatture', function (req, res) {
        res.sendFile(path.join(__dirname + '/../views/fatture.html'));
    });
    app.get('/store', function (req, res) {
        res.sendFile(path.join(__dirname + '/../views/store.html'));
    });
    app.get('/commissioni', function (req, res) {
        res.sendFile(path.join(__dirname + '/../views/commissioni.html'));
    });
    app.get('/configurazioni', function (req, res) {
        res.sendFile(path.join(__dirname + '/../views/configurazioni.html'));
    });
    app.get('/oauth2callback', function (req, res) {
        oauth2Client.getToken(req.query.code, function (err, tokens) {
            // Now tokens contains an access_token and an optional refresh_token. Save them.
            if (err) {
                errorLog.error(err);
                return;
            }

            oauth2Client.setCredentials(tokens);
            conf.tokens = tokens;
        });

        google.options({auth: oauth2Client});
        res.sendFile(path.join(__dirname + '/../views/dashboard.html'));
    });

    return module;
};