const {google} = require('googleapis');
const util = require('util');
const successLog = require('./logger').successlog;
const errorLog = require('./logger').errorlog;
const gmail = google.gmail('v1');

module.exports = {
    getMessagesID: function (params) {
        return new Promise(function (resolve, reject) {
            let query = '';
            if (params.it) query += 'from:marketplace-messages@amazon.it';
            if (params.de) query += ' || from:marketplace-messages@amazon.de';
            if (params.fr) query += ' || from:marketplace-messages@amazon.fr';
            if (params.es) query += ' || from:marketplace-messages@amazon.es';
            if (params.uk) query += ' || from:marketplace-messages@amazon.co.uk';
            if (params.startDate) query += ' after:' + params.startDate.split('/').reverse().join('/') + ' ';
            if (params.endDate) query += ' before:' + params.endDate.split('/').reverse().join('/') + ' ';

            let list = util.promisify(gmail.users.messages.list);
            list({
                userId: 'me',
                q: query,
                includeSpamTrash: true
            }).then(function (response) {
                let messages = response.data.messages;
                if (messages && messages.length > 0) {
                    resolve(messages);
                } else {
                    errorLog.error('No messages found.');
                    reject(Error('Non sono state trovate fatture.'));
                }
            }).catch(function (error) {
                errorLog.error('Error getMessagesID', error);
                reject(Error(error.message));
            });
        })
    },

    getMessage: function (messageID) {
        return new Promise(function (resolve, reject) {
            let message = util.promisify(gmail.users.messages.get);
            message({
                userId: 'me',
                id: messageID
            }).then(function (response) {
                let parts = response.data.payload.parts;
                if (parts && parts.length > 0) {
                    resolve([messageID, parts]);
                } else {
                    errorLog.error('No payload parts found.');
                    reject(Error('Errore nel recupero dell\'allegato.'));
                }
            }).catch(function (error) {
                errorLog.error('Error getMessage', error);
                reject(Error(error.message));
            });
        })
    },

    getAttachment: function (messageID, attachmentID) {
        return new Promise(function (resolve, reject) {
            let attachments = util.promisify(gmail.users.messages.attachments.get);
            attachments({
                userId: 'me',
                messageId: messageID,
                id: attachmentID
            }).then(function (response) {
                if (response.data && response.data.data) {
                    let pdfBase64 = response.data.data.replace(/-/g, '+').replace(/_/g, '/');
                    resolve(pdfBase64);
                } else {
                    errorLog.error('Error getAttachment');
                    reject(Error('Il file allegato risulta corrotto.'));
                }
            }).catch(function (error) {
                errorLog.error('Error getAttachment', error);
                reject(Error(error.message));
            });
        })
    }
};