'use strict';
var _ = require('lodash');
const conf = require('./config');
var amazonMws = require('../modules/amazon/amazon-mws')(conf.MWSaccess_key, conf.MWSsecret_key);

// REFRESH RATE
// ListMatchingProducts    ogni 5 secondi
// RequestReport           ogni minuto
// GetReportList           ogni minuto
// GetReport               ogni minuto
// SubmitFeed              ogni 2 minuti
// GetFeedSubmissionResult ogni minuto

module.exports = {
    productRequest: function (query, callback) {
        amazonMws.products.search({
            'Version': '2011-10-01',
            'Action': 'ListMatchingProducts',
            'SellerId': conf.MWSseller_id,
            'MarketplaceId': conf.IT_Mrkt,
            'Query': query
        }, function (error, response) {
            if (error) {
                console.log('error products', error);
                callback('KO');
            }
            var ASIN = response.Products.Product.Identifiers.MarketplaceASIN.ASIN;
            var description = response.Products.Product.AttributeSets.ItemAttributes.Title;
            setTimeout(function () {
                module.exports.reportRequest(ASIN, function (reportID, ASIN) {
                    module.exports.getReportIDRequest(reportID, ASIN, function (reportID, ASIN) {
                        module.exports.getReport(reportID, ASIN, function (SKU, quantity) {
                            module.exports.removeItemFromStore(SKU, quantity, function (feedID) {
                                module.exports.checkRemoveItem(feedID, function (esito) {
                                    callback(esito);
                                });
                            });
                        });
                    });
                });
            }, 60000);
        });
    },

    reportRequest: function (ASIN, callback) {
        amazonMws.reports.search({
            'Version': '2009-01-01',
            'Action': 'RequestReport',
            'SellerId': conf.MWSseller_id,
            'ReportType': '_GET_MERCHANT_LISTINGS_DATA_LITE_'
        }, function (error, response) {
            if (error) {
                console.log('error ', error);
                return;
            }
            var reportID = response.ReportRequestInfo.ReportRequestId;
            setTimeout(function () {
                callback(reportID, ASIN);
            }, 60000);
        });
    },

    getReportIDRequest: function (reportID, ASIN, callback) {
        amazonMws.reports.search({
            'Version': '2009-01-01',
            'Action': 'GetReportList',
            'SellerId': conf.MWSseller_id,
            'ReportTypeList.Type.1': '_GET_MERCHANT_LISTINGS_DATA_LITE_',
            'ReportRequestIdList.Id.1': reportID
        }, function (error, response) {
            if (error) {
                console.log('error ', error);
                return;
            }
            setTimeout(function () {
                callback(response.ReportInfo.ReportId, ASIN);
            }, 60000);
        });
    },

    getReport: function (reportID, ASIN, callback) {
        amazonMws.reports.search({
            'Version': '2009-01-01',
            'Action': 'GetReport',
            'SellerId': conf.MWSseller_id,
            'ReportId': reportID
        }, function (error, response) {
            if (error) {
                console.log('error ', error);
                return;
            }
            // console.log('response', response);
            var itemToFind = _.find(response.data, {'product-id': ASIN});
            console.log(itemToFind);
            var SKU = Object.values(itemToFind)[0];
            var quantity = parseInt(Object.values(itemToFind)[1]);
            callback(SKU, quantity);
        });
    },

    removeItemFromStore: function (SKU, quantity, callback) {
        if (!isNaN(quantity) && typeof quantity === 'number') {
            quantity--;
        }
        var xmlFeed =
            '<?xml version="1.0" encoding="utf-8" ?>\n' +
            '<AmazonEnvelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="amznenvelope.xsd">\n' +
                '<Header>\n' +
                    '<DocumentVersion>1.01</DocumentVersion>\n' +
                    '<MerchantIdentifier>' + conf.MWSseller_id + '</MerchantIdentifier>\n' +
                '</Header>\n' +
                '<MessageType>Inventory</MessageType>\n' +
                '<Message>\n' +
                    '<MessageID>1</MessageID>\n' +
                    '<OperationType>Update</OperationType>\n' +
                    '<Inventory>\n' +
                        '<SKU>' + SKU + '</SKU>\n' +
                        '<Quantity>' + quantity + '</Quantity>\n' +
                    '</Inventory>\n' +
                '</Message>\n' +
            '</AmazonEnvelope>';

        amazonMws.feeds.submit({
            'Version': '2009-01-01',
            'Action': 'SubmitFeed',
            'SellerId': conf.MWSseller_id,
            'FeedType': '_POST_INVENTORY_AVAILABILITY_DATA_',
            'FeedContent': xmlFeed
        }, function (error, response) {
            if (error) {
                console.log('error ', error);
                return;
            }

            setTimeout(function () {
                callback(response.FeedSubmissionInfo.FeedSubmissionId, callback);
            }, 60000);
        });
    },

    checkRemoveItem: function (feedID, callback) {
        amazonMws.feeds.submit({
            'Version': '2009-01-01',
            'Action': 'GetFeedSubmissionResult',
            'SellerId': conf.MWSseller_id,
            'FeedSubmissionId': feedID
        }, function (error, response) {
            if (error) {
                console.log('error ', error);
                callback('KO');
            } else if (response.AmazonEnvelope.Message.ProcessingReport.ProcessingSummary.MessagesProcessed === "1" &&
                response.AmazonEnvelope.Message.ProcessingReport.ProcessingSummary.MessagesSuccessful === "1") {
                callback('OK');
            } else {
                callback('KO');
            }
        });
    }
};