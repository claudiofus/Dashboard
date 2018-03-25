module.exports = function (app, google, oauth2Client, conf) {
    var module = {};
    var path = require("path");

    app.get('/', function (req, res) {
        res.sendfile(path.join(__dirname + '/../views/login.html'));
        // res.sendFile(__dirname + '/views/login.html');
    });
    app.get('/dashboard', function (req, res) {
        res.sendfile(path.join(__dirname + '/../views/dashboard.html'));
    });
    app.get('/fatture', function (req, res) {
        res.sendfile(path.join(__dirname + '/../views/fatture.html'));
    });
    app.get('/store', function (req, res) {
        res.sendfile(path.join(__dirname + '/../views/store.html'));
    });
    app.get('/commissioni', function (req, res) {
        res.sendfile(path.join(__dirname + '/../views/commissioni.html'));
    });
    app.get('/configurazioni', function (req, res) {
        res.sendfile(path.join(__dirname + '/../views/configurazioni.html'));
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
        res.sendfile(path.join(__dirname + '/../views/dashboard.html'));
    });

    return module;
};