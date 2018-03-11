var express = require('express');
var http = require('http');
var app = express();
var server = http.createServer(app);
var io = require('socket.io').listen(server);
var {google} = require('googleapis');
var OAuth2 = google.auth.OAuth2;
var gmail = google.gmail('v1');

//TODO REMOVE CLIENTID
var oauth2Client = new OAuth2(

);

var scopes = ['https://www.googleapis.com/auth/gmail.readonly'];
var url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes
});

server.listen(8000);

app.use(express.static(__dirname + '/'));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/views/login.html');
});

app.get('/login', function (req, res) {
    res.sendFile(__dirname + '/views/login.html');
});

app.get('/dashboard', function (req, res) {
    res.sendFile(__dirname + '/views/dashboard.html');
});
app.get('/fatture', function (req, res) {
    res.sendFile(__dirname + '/views/fatture.html');
});
app.get('/store', function (req, res) {
    res.sendFile(__dirname + '/views/store.html');
});
app.get('/commissioni', function (req, res) {
    res.sendFile(__dirname + '/views/commissioni.html');
});

app.get('/oauth2callback', function (req, res) {
    oauth2Client.getToken(req.query.code, function (err, tokens) {
        // Now tokens contains an access_token and an optional refresh_token. Save them.
        if (!err) {
            oauth2Client.setCredentials(tokens);
        }
    });
    google.options({
        auth: oauth2Client
    });
    res.sendFile(__dirname + '/views/dashboard.html');
});

io.on('connection', function (socket) {
    socket.on('signIn', function () {
        socket.emit('redirectLogin', url);
    });

    socket.on('getAttachment', function (startDate, endDate, email) {
        getMessagesID(startDate, endDate, function (messages) {
            for (var i = 0; i < messages.length; i++) {
                var message = messages[i];
                getMessage(message.id, function (parts) {
                    if (parts) {
                        for (j = 0; j < parts.length; j++) {
                            if (parts[j].mimeType === "application/pdf") {
                                getAttachment(message.id, parts[j].body.attachmentId, function (downloadedPdf) {
                                    console.log(downloadedPdf);
                                    var pdf = downloadedPdf;
                                });
                            }
                        }
                    }
                });
            }
        });
    });
});

function getMessagesID(startDate, endDate, callback) {
    // TODO INSERIRE CONTROLLI SUI PARAMETRI IN INGRESSO
    var query = '';
    if (startDate) query += ' after:' + startDate.split('/').reverse().join('/') + ' ';
    if (endDate) query += ' before:' + endDate.split('/').reverse().join('/') + ' ';
    gmail.users.messages.list({
        userId: 'me',
        q: 'from:marketplace-messages@amazon.it' + query
    }, function (err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }
        var messages = [];
        if (response.data.messages.length === 0) {
            console.log('No messages found.');
        } else {
            messages = response.data.messages;
        }
        return callback(messages);
    });
}

function getMessage(messageID, callback) {
    gmail.users.messages.get({
        userId: 'me',
        id: messageID
    }, function (err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return callback();
        }

        return callback(response.data.payload.parts);
    });
}

function getAttachment(messageID, attachmentID, callback) {
    gmail.users.messages.attachments.get({
        userId: 'me',
        messageId: messageID,
        id: attachmentID
    }, function (err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return callback();
        }

        var pdfBase64 = response.data.data;
        var pdfDownload = Buffer.from(pdfBase64.toString('utf-8'), 'base64');
        return callback(pdfDownload);
    });
}

module.exports = app;