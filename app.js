'use strict';
var express = require('express');
var http = require('http');
var app = express();
var server = http.createServer(app);
var io = require('socket.io').listen(server);

const conf = require('./modules/config');
conf.authenticated = false;

server.listen(8000);

app.use(express.static(__dirname + '/'));
require('./modules/dispatcher')(app, conf);
require('./modules/gmail')(io);
require('./modules/socket')(io, conf);

module.exports = app;