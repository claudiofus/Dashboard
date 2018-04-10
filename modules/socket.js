'use strict';
const db = require('../database/dbCRUD');
const Product = require('../classes/Product');
const fs = require('fs');
const {google} = require('googleapis');
const gmailApi = require('./gmail');
const mwsServices = require('../modules/amazonServices');
let scopes = ['https://www.googleapis.com/auth/gmail.readonly'];
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
            gmailApi.getMessagesID(params, function (err, messages) {
                if (err) {
                    console.error('The API returned an error: ' + err);
                    io.emit('sendError', errorMapper(err.code));
                } else {
                    for (let i = 0; i < messages.length; i++) {
                        gmailApi.getMessage(null, messages[i].id, function (err, messageID, parts) {
                            if (err) {
                                console.error('The API returned an error: ' + err);
                                io.emit('sendError', errorMapper(err.code));
                                return;
                            }
                            for (let j = 0; j < parts.length; j++) {
                                if (parts[j].mimeType === "application/pdf") {
                                    gmailApi.getAttachment(null, messageID, parts[j].body.attachmentId, function (err, pdfBase64) {
                                        if (err) {
                                            console.error('The API returned an error: ' + err);
                                            io.emit('sendError', errorMapper(err.code));
                                        }
                                        io.emit('emitPDF', pdfBase64);
                                    });
                                }
                            }
                        });
                    }
                }
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
                if (err) console.error(err);
                console.log("Tutto OK");
                socket.emit('refreshTables');
            });

            // mwsServices.listMatchingProductsPr(UPC).then(prd => {
            //    mwsServices.requestReportPr(prd).then(reportID, prd => {
            //        mwsServices.getReportPr(reportID, prd).then(prd => {
            //            mwsServices.removeItemFromStorePr(prd).then(feedID => {
            //                mwsServices.checkRemoveItemPr(feedID).then(prd => {
            //                    logResult(prd);
            //                })
            //            })
            //        })
            //    })
            // });


            mwsServices.listMatchingProducts(UPC, function (err, prd) {
                if (err) {
                    console.error('The API returned an error: ' + err);
                    socket.emit('sendError', err.message);
                    return;
                }

                setTimeout(function () {
                    mwsServices.requestReport(prd, function (err, reportID, prd) {
                        if (err) console.error(err);
                        mwsServices.getReportIDRequest(reportID, prd, function (err, reportID, prd) {
                            if (err) console.error(err);
                            mwsServices.getReport(reportID, prd, function (err, prd) {
                                if (err) console.error(err);
                                mwsServices.removeItemFromStore(prd, function (err, feedID) {
                                    if (err) console.error(err);
                                    mwsServices.checkRemoveItem(feedID, function (err) {
                                        if (err) console.error(err);
                                        console.log("PRODOTTO: " + prd);
                                        db.put({TableName: 'StoreProducts', Item: prd}, function (err) {
                                            if (err) console.error(err);

                                            console.log("Prodotto aggiunto in StoreProducts.");
                                            let params = {
                                                TableName: 'TempProducts',
                                                Key: {"UPC": prd.UPC, "CreatedAt": prd.CreatedAt}
                                            };
                                            db.delete(params, function (err) {
                                                if (err) console.error(err);

                                                console.log("Prodotto rimosso da TempProducts.");
                                                socket.emit('refreshTables');
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                }, 60000);
            });
        });

        socket.on('getInfo', function (callback) {
            callback = (typeof callback === 'function') ? callback : function () {
            };
            let params = {
                TableName: "StoreProducts",
                limit: 15
            };
            db.scan(params, function (err, items) {
                if (err) console.error(err);

                items.sort(orderDesc);
                let params = {TableName: "TempProducts"};
                db.scan(params, function (err, tempItems) {
                    if (err) console.error(err);

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

function errorMapper(code) {
    switch (code) {
        case 401:
            return "E' necessario effettuare il login."
    }
}


function requestReport(res) {
    return mwsServices.requestReportPr(res);
}

function getReportIDRequest(res) {
    return mwsServices.getReportIDRequestPr(res);
}

function getReport(res) {
    return mwsServices.getReportPr(res);
}

function removeItemFromStore(res) {
    return mwsServices.removeItemFromStorePr(res);
}

function checkRemoveItem(res) {
    return mwsServices.checkRemoveItemPr(res);
}

function logResult(prd) {
    console.log("PRODOTTO: " + prd);
    db.put({TableName: 'StoreProducts', Item: prd}, function (err) {
        if (err) console.error(err);

        console.log("Prodotto aggiunto in StoreProducts.");
        let params = {
            TableName: 'TempProducts',
            Key: {"UPC": prd.UPC, "CreatedAt": prd.CreatedAt}
        };
        db.delete(params, function (err) {
            if (err) console.error(err);

            console.log("Prodotto rimosso da TempProducts.");
            socket.emit('refreshTables');
        });
    });
}