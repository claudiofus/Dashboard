module.exports = function (io, conf) {
    var fs = require('fs');
    var {google} = require('googleapis');
    var gmailApi = require('./gmail')(io);
    var OAuth2 = google.auth.OAuth2;
    var oauth2Client = new OAuth2(conf.client_id, conf.client_secret, conf.redirect_uri);
    var scopes = ['https://www.googleapis.com/auth/gmail.readonly'];
    var url = oauth2Client.generateAuthUrl({access_type: 'offline', scope: scopes});
    var filePath = __dirname + '/config.json';

    io.on('connection', function (socket) {
        socket.on('signIn', function () {
            if (conf) {
                var arr = {};
                arr.redirect_uri = url;
                socket.emit('redirectLogin', arr);
            }
        });

        socket.on('getAttachment', function (params) {
            gmailApi.getMessagesID(params, gmailApi.getMessage);
        });

        socket.on('writeConf', function (params) {
            for (var key in params) {
                conf[key] = params[key];
            }

            conf.authenticated = params.authenticated;
            oauth2Client = new OAuth2(conf.client_id, conf.client_secret, conf.redirect_uri);
            url = oauth2Client.generateAuthUrl({access_type: 'offline', scope: scopes});
            fs.writeFile(filePath, JSON.stringify(conf), 'utf8', function () {
                socket.emit('redirectLogin', conf);
            });
        });

        socket.on('readConf', function () {
            if (conf.client_id && conf.client_secret && conf.redirect_uri) {
                if (conf.tokens) {
                    conf.authenticated = true;
                }
                socket.emit('sendConf', conf);
            }
        });

        socket.on('logout', function () {
            conf.authenticated = false;
            conf.tokens = undefined;
            fs.writeFile(filePath, JSON.stringify(conf), 'utf8', function () {
                socket.emit('redirectLogin');
            });
        });
    });
};