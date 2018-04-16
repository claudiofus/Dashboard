const gmailApi = require('../modules/gmail');
const mwsServices = require('../modules/amazonPromise');

module.exports = {
    // GMAIL FACTORIES
    getMessagesID: function (params) {
        return gmailApi.getMessagesID(params);
    },
    getMessage: function (messageID) {
        return gmailApi.getMessage(messageID);
    },
    getAttachments: function (messageID, attachmentID) {
        return gmailApi.getAttachment(messageID, attachmentID);
    },
    // AMAZON FACTORIES
    listMatchingProducts: function (query, prd) {
        return mwsServices.listMatchingProductsPr(query, prd);
    },
    requestReport: function (prd) {
        return mwsServices.requestReportPr(prd);
    },
    getReportIDRequest: function (reportID, prd) {
        return mwsServices.getReportIDRequestPr(reportID, prd);
    },
    getReport: function (reportID, prd) {
        return mwsServices.getReportPr(reportID, prd);
    },
    removeItemFromStore: function (prd) {
        return mwsServices.removeItemFromStorePr(prd);
    },
    checkRemoveItem: function (feedID, prd) {
        return mwsServices.checkRemoveItemPr(feedID, prd);
    }
};