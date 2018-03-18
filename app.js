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
app.get('/configurazioni', function (req, res) {
    res.sendFile(__dirname + '/views/configurazioni.html');
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

    socket.on('getAttachment', function (params) {
        getMessagesID(params, getMessage);
    });
});

function getMessagesID(params, callback) {
    // TODO INSERIRE CONTROLLI SUI PARAMETRI IN INGRESSO
    var query = '';
    if (params.it) query += 'from:marketplace-messages@amazon.it';
    if (params.de) query += ' || from:marketplace-messages@amazon.de';
    if (params.fr) query += ' || from:marketplace-messages@amazon.fr';
    if (params.es) query += ' || from:marketplace-messages@amazon.es';
    if (params.uk) query += ' || from:marketplace-messages@amazon.co.uk';
    if (params.startDate) query += ' after:' + params.startDate.split('/').reverse().join('/') + ' ';
    if (params.endDate) query += ' before:' + params.endDate.split('/').reverse().join('/') + ' ';

    gmail.users.messages.list({
        userId: 'me',
        q: query,
        includeSpamTrash: true
    }, function (err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            io.sockets.emit('sendError', errorMapper(err.code));
        }
        var messages = [];
        if (response.data.messages.length === 0) {
            console.log('No messages found.');
        } else {
            messages = response.data.messages;
        }
        for (var i = 0; i < messages.length; i++) {
            callback(messages[i].id, getAttachment);
        }
    });
}

function getMessage(messageID, callback) {
    gmail.users.messages.get({
        userId: 'me',
        id: messageID
    }, function (err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            io.sockets.emit('sendError', errorMapper(err.code));
        }

        var parts = response.data.payload.parts;
        for (var j = 0; j < parts.length; j++) {
            if (parts[j].mimeType === "application/pdf") {
                callback(messageID, parts[j].body.attachmentId);
            }
        }
    });
}

function getAttachment(messageID, attachmentID) {
    gmail.users.messages.attachments.get({
        userId: 'me',
        messageId: messageID,
        id: attachmentID
    }, function (err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            io.sockets.emit('sendError', errorMapper(err.code));
        }

        var pdfBase64 = response.data.data.replace(/-/g, '+').replace(/_/g, '/');
        io.sockets.emit('emitPDF', pdfBase64);
    });
}

function errorMapper(code) {
    switch (code) {
        case 401:
            return "E' necessario effettuare il login."
    }
}

module.exports = app;