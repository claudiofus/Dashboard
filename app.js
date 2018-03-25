var express = require('express');
var http = require('http');
var fs = require('fs');
var app = express();
var server = http.createServer(app);
var io = require('socket.io').listen(server);
var {google} = require('googleapis');
var OAuth2 = google.auth.OAuth2;

var filePath = __dirname + '/config.json';
var scopes = ['https://www.googleapis.com/auth/gmail.readonly'];

// Read file for configurations
var fileConf = fs.readFileSync(filePath, 'utf8');
var conf = JSON.parse(fileConf);
conf.authenticated = false;
var oauth2Client = new OAuth2(conf.client_id, conf.client_secret, conf.redirect_uri);
var url = oauth2Client.generateAuthUrl({access_type: 'offline', scope: scopes});

server.listen(8000);

app.use(express.static(__dirname + '/'));
var dispatcher = require('./modules/dispatcher')(app, google, oauth2Client, conf);
var gmailApi = require('./modules/gmail')(google.gmail('v1'), io);

var accessKey = '';
var accessSecret = '';

var amazonMws = require('./modules/amazon/amazon-mws')(accessKey, accessSecret);

// var productRequest = function () {
//     amazonMws.products.search({
//         'Version': '2011-10-01',
//         'Action': 'GetMatchingProduct',
//         'SellerId': '',
//         'MWSAuthToken': '',
//         'MarketplaceId': '',
//         'ASINList.ASIN.1': ''
//     }, function (error, response) {
//         if (error) {
//             console.log('error products', error);
//             return;
//         }
//         console.log('response', response);
//     });
// };
//
// productRequest();

// var reportRequest = function () {
//
//     amazonMws.reports.search({
//         'Version': '2009-01-01',
//         'Action': 'GetReportList',
//         'SellerId': '',
//         'MWSAuthToken': ''
//     }, function (error, response) {
//         if (error) {
//             console.log('error ', error);
//             return;
//         }
//         console.log('response', response);
//     });
// };
//
// reportRequest();

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
        conf = {
            client_id: params.client_id,
            client_secret: params.client_secret,
            redirect_uri: params.redirect_uri,
            authenticated: params.authenticated
        };
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

module.exports = app;