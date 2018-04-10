const {google} = require('googleapis');
var gmail = google.gmail('v1');

module.exports = {
    getMessagesID: function (params, callback) {
        callback = (typeof callback === 'function') ? callback : function () {
        };
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
                console.error('The API returned an error: ' + err);
                callback(err, null);
                return;
            }
            var messages = [];
            if (response.data.messages.length === 0) {
                console.error('No messages found.');
                callback("No messages found.", null);
            } else {
                messages = response.data.messages;
            }

            callback(null, messages);
        });
    },

    getMessage: function (err, messageID, callback) {
        callback = (typeof callback === 'function') ? callback : function () {
        };

        if (err) {
            console.error(err);
            callback(err, null);
        }

        gmail.users.messages.get({
            userId: 'me',
            id: messageID
        }, function (err, response) {
            if (err) {
                console.error('The API returned an error: ' + err);
            }

            var parts = response.data.payload.parts;
            if (parts.length === 0) {
                callback("No payload parts found.", null);
            }

            callback(null, messageID, parts);
        });
    },

    getAttachment: function (err, messageID, attachmentID, callback) {
        if (err) {
            console.error(err);
            callback(err, null);
        }

        gmail.users.messages.attachments.get({
            userId: 'me',
            messageId: messageID,
            id: attachmentID
        }, function (err, response) {
            if (err) {
                console.error('The API returned an error: ' + err);
                callback(err, null);
            }

            var pdfBase64 = response.data.data.replace(/-/g, '+').replace(/_/g, '/');
            callback(null, pdfBase64);
        });
    }
};