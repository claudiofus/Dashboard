'use strict';
module.exports = function (io, conf) {
    const db = require('../database/StoreProducts');
    var fs = require('fs');
    var {google} = require('googleapis');
    var gmailApi = require('./gmail')(io);
    var mwsServices = require('../modules/amazonServices');
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
                if (params.hasOwnProperty(key)) {
                    conf[key] = params[key];
                }
            }

            conf.authenticated = params.authenticated;
            oauth2Client = new OAuth2(conf.client_id, conf.client_secret, conf.redirect_uri);
            url = oauth2Client.generateAuthUrl({access_type: 'offline', scope: scopes});
            fs.writeFile(filePath, JSON.stringify(conf), 'utf8', function () {
                socket.emit('redirectLogin', conf);
            });
        });

        socket.on('readConf', function (callback) {
            if (conf.client_id && conf.client_secret && conf.redirect_uri) {
                if (conf.tokens) {
                    conf.authenticated = true;
                }
                callback(conf);

            }
        });

        socket.on('logout', function () {
            conf.authenticated = false;
            conf.tokens = undefined;
            fs.writeFile(filePath, JSON.stringify(conf), 'utf8', function () {
                socket.emit('redirectLogin');
            });
        });

        socket.on('updateQuantity', function (UPC) {
            mwsServices.productRequest(UPC, function (result, item) {
                if (result === 'OK') {
                    var params = {
                        TableName: 'StoreProducts',
                        Item: {
                            UPC: UPC,
                            CreatedAt: new Date().toISOString(),
                            Description: item.Description,
                            Price: item.Price,
                            Quantity: item.Quantity
                        }
                    };
                    db.put(params, function (result) {
                        if (result === 'OK') {
                            socket.emit('getInfo');
                            console.log("Tutto OK");
                        }
                    });
                } else if (result === 'KO') {
                    console.log("!!!!!!!!KO");
                } else {
                    console.log("?????????? COME SONO ARRIVATO QUI?????");
                }
            });
        });

        socket.on('getInfo', function (callback) {
            var params = {
                TableName: "StoreProducts",
                limit: 15
            };
            db.scan(params, function (items) {
                items.sort(orderDesc);
                callback(items);
            });

        });
    });
};

function orderDesc(a, b) {
    if (a.CreatedAt < b.CreatedAt)
        return 1;
    if (a.CreatedAt > b.CreatedAt)
        return -1;
    return 0;
}