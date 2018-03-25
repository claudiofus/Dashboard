module.exports = function (gmail, io) {
    var module = {};

    module.getMessagesID = function (params, callback) {
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
                callback(messages[i].id, module.getAttachment);
            }
        });
    };

    module.getMessage = function (messageID, callback) {
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
    };

    module.getAttachment = function (messageID, attachmentID) {
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
    };

    function errorMapper(code) {
        switch (code) {
            case 401:
                return "E' necessario effettuare il login."
        }
    }

    return module;
};