var express = require('express');
var http = require('http');
var fs = require('fs');
var app = express();
var server = http.createServer(app);
var io = require('socket.io').listen(server);
var filePath = __dirname + '/modules/config.json';

// Read file for configurations
var fileConf = fs.readFileSync(filePath, 'utf8');
var conf = JSON.parse(fileConf);
conf.authenticated = false;

server.listen(8000);

app.use(express.static(__dirname + '/'));
require('./modules/dispatcher')(app, conf);
require('./modules/gmail')(io);
require('./modules/socket')(io, conf);

module.exports = app;