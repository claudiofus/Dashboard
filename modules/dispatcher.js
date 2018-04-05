'use strict';
module.exports = function (app, conf) {
    var module = {};
    var path = require("path");
    var {google} = require('googleapis');
    var OAuth2 = google.auth.OAuth2;
    var oauth2Client = new OAuth2(conf.client_id, conf.client_secret, conf.redirect_uri);

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
            if (!err) {
                oauth2Client.setCredentials(tokens);
                conf.tokens = tokens;
            }
        });

        google.options({auth: oauth2Client});
        res.sendFile(path.join(__dirname + '/../views/dashboard.html'));
    });

    return module;
};