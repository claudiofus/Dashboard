var express = require('express');
var http = require('http');
var app = express();
var server = http.createServer(app);
var io = require('socket.io').listen(server);

server.listen(8000);

app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
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

io.on('connection', function (socket) {
    socket.on('tokenid', function (tokenId) {
        if (tokenId && tokenId !== '') {
            socket.tokenId = tokenId;
            socket.emit('redirect', '/dashboard');
        }
    });
});

module.exports = app;