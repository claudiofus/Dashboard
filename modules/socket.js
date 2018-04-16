'use strict';
const db = require('../database/dbCRUD');
const Product = require('../classes/Product');
const Factories = require('../factories/Factories');
const successLog = require('./logger').successlog;
const errorLog = require('./logger').errorlog;
const fs = require('fs');
const {google} = require('googleapis');
const scopes = ['https://www.googleapis.com/auth/gmail.readonly'];
let OAuth2 = google.auth.OAuth2;
let filePath = __dirname + '/config.json';

module.exports = function (io, conf) {
    let oauth2Client = new OAuth2(conf.client_id, conf.client_secret, conf.redirect_uri);
    let url = oauth2Client.generateAuthUrl({access_type: 'offline', scope: scopes});

    io.on('connection', function (socket) {
        socket.on('signIn', function () {
            if (conf) {
                let arr = {};
                arr.redirect_uri = url;
                socket.emit('redirectLogin', arr);
            }
        });

        socket.on('getAttachment', function (params) {
            Factories.getMessagesID(params)
                .then(messages => {
                    return Promise.all(messages.map(function (message) {
                        return Factories.getMessage(message.id);
                    }));
                })
                .then(MessagesIDArray => {
                    return Promise.all(MessagesIDArray.map(function (message) {
                        let messageID = message[0];
                        let parts = message[1];
                        for (let j = 0; j < parts.length; j++) {
                            if (parts[j].mimeType === "application/pdf") {
                                return Factories.getAttachments(messageID, parts[j].body.attachmentId);
                            }
                        }
                    }));
                })
                .then(pdfArray => {
                    return Promise.all(pdfArray.map(function (pdf) {
                        io.emit('emitPDF', pdf);
                    }));
                })
                .catch(err => {
                    errorLog.error('Si è verificato un errore: ' + err.message);
                    io.emit('sendError', err.message);
                });
        });

        socket.on('writeConf', function (params) {
            for (let key in params) {
                if (params.hasOwnProperty(key)) conf[key] = params[key];
            }

            conf.authenticated = params.authenticated;
            oauth2Client = new OAuth2(conf.client_id, conf.client_secret, conf.redirect_uri);
            url = oauth2Client.generateAuthUrl({access_type: 'offline', scope: scopes});
            fs.writeFile(filePath, JSON.stringify(conf), 'utf8', function () {
                socket.emit('redirectLogin', conf);
            });
        });

        socket.on('readConf', function (callback) {
            callback = (typeof callback === 'function') ? callback : function () {
            };
            if (conf.client_id && conf.client_secret && conf.redirect_uri) {
                if (conf.tokens) conf.authenticated = true;
                callback(null, conf);
            } else {
                callback("No params setted", null);
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
            let prd = new Product(UPC);
            prd.setCreationDate(new Date());
            db.put({TableName: 'TempProducts', Item: prd}, function (err) {
                if (err) errorLog.error(err);
                successLog.info("Inserito un elemento in TempProducts.");
                socket.emit('refreshTables');
            });

            Factories.listMatchingProducts(UPC, prd)
                .then(prd => {
                    return Factories.requestReport(prd);
                })
                .then(obj => {
                    let reportID = obj[0];
                    let prd = obj[1];
                    return Factories.getReportIDRequest(reportID, prd);
                })
                .then(obj => {
                    let reportID = obj[0];
                    let prd = obj[1];
                    return Factories.getReport(reportID, prd);
                })
                .then(prd => {
                    return Factories.removeItemFromStore(prd)
                })
                .then(obj => {
                    let feedID = obj[0];
                    let prd = obj[1];
                    return Factories.checkRemoveItem(feedID, prd)
                })
                .then(prd => {
                    successLog.info("PRODOTTO: " + prd);
                    db.put({TableName: 'StoreProducts', Item: prd}, function (err) {
                        if (err) errorLog.error(err);

                        successLog.info("Prodotto aggiunto in StoreProducts.");
                        let params = {
                            TableName: 'TempProducts',
                            Key: {"UPC": prd.UPC, "CreatedAt": prd.CreatedAt}
                        };
                        db.delete(params, function (err) {
                            if (err) errorLog.error(err);

                            successLog.info("Prodotto rimosso da TempProducts.");
                            socket.emit('refreshTables');
                        });
                    });
                })
                .catch(err => {
                    errorLog.error('Errore: ' + err.message);
                    io.emit('sendError', err.message);
                });
        });

        socket.on('getInfo', function (callback) {
            callback = (typeof callback === 'function') ? callback : function () {
            };
            db.scan({TableName: "StoreProducts", limit: 15}, function (err, items) {
                if (err) errorLog.error(err);

                items.sort(orderDesc);
                db.scan({TableName: "TempProducts"}, function (err, tempItems) {
                    if (err) errorLog.error(err);

                    tempItems.sort(orderDesc);
                    if (items && tempItems) {
                        callback(null, items, tempItems);
                    } else {
                        callback("DB scan error", null, null);
                    }
                });
            });
        });
    });
};

function orderDesc(a, b) {
    if (a.CreatedAt < b.CreatedAt) return 1;
    if (a.CreatedAt > b.CreatedAt) return -1;
    return 0;
}