var http = require('http');
var path = require('path');
var fs = require('fs');

// Loading the index file . html displayed to the client
var server = http.createServer(function (request, response) {
    var filePath = request.url;
    if (filePath === '/' || request.url === '/app.js') filePath = '\\views\\login.html';

    filePath = __dirname + filePath;
    var extname = path.extname(filePath);
    var contentType = 'text/html';

    switch (extname) {
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.css':
            contentType = 'text/css';
            break;
    }

    fs.exists(filePath, function (exists) {
        if (exists) {
            fs.readFile(filePath, function (error, content) {
                if (error) {
                    response.writeHead(500);
                    response.end();
                }
                else {
                    response.writeHead(200, {'Content-Type': contentType});
                    response.end(content, 'utf-8');
                }
            });
        }
    });
});

// Loading socket.io
var io = require('socket.io').listen(server);

// When a client connects, we note it in the console
io.sockets.on('connection', function (socket) {
    socket.emit('message', 'You are connected!');
});

server.listen(8000);