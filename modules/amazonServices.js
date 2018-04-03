var accessKey = '';
var accessSecret = '';

var _ = require('lodash');
var amazonMws = require('../modules/amazon/amazon-mws')(accessKey, accessSecret);

// REFRESH RATE
// ListMatchingProducts    ogni 5 secondi
// RequestReport           ogni minuto
// GetReportRequestList    ogni minuto
// GetReport               ogni minuto
// SubmitFeed              ogni 2 minuti
// GetFeedSubmissionList   ogni 45 secondi


module.exports = {
    productRequest: function (query) {
        amazonMws.products.search({
            'Version': '2011-10-01',
            'Action': 'ListMatchingProducts',
            'SellerId': '',
            'MarketplaceId': '',
            'Query': query
        }, function (error, response) {
            if (error) {
                console.log('error products', error);
                return;
            }
            var ASIN = response.Products.Product.Identifiers.MarketplaceASIN.ASIN;
            module.exports.reportRequest(ASIN, function (reportID, ASIN) {
                module.exports.getReportIDRequest(reportID, ASIN, function (reportID, ASIN) {
                    module.exports.getReport(reportID, ASIN, function (SKU, quantity) {
                        module.exports.removeItemFromStore(SKU, quantity);
                    });
                });
            });
        });
    },

    reportRequest: function (ASIN, callback) {
        amazonMws.reports.search({
            'Version': '2009-01-01',
            'Action': 'RequestReport',
            'SellerId': '',
            'ReportType': '_GET_MERCHANT_LISTINGS_DATA_LITE_'
        }, function (error, response) {
            if (error) {
                console.log('error ', error);
                return;
            }
            // console.log('response', response);
            var reportID = response.ReportRequestInfo.ReportRequestId;
            setTimeout(function () {
                callback(reportID, ASIN);
            }, 10000);
        });
    },

    getReportIDRequest: function (reportID, ASIN, callback) {
        amazonMws.reports.search({
            'Version': '2009-01-01',
            'Action': 'GetReportList',
            'SellerId': '',
            'ReportTypeList.Type.1': '_GET_MERCHANT_LISTINGS_DATA_LITE_',
            'ReportRequestIdList.Id.1': reportID
        }, function (error, response) {
            if (error) {
                console.log('error ', error);
                return;
            }
            // console.log('response', response);
            //TODO effettuare i controlli di validità (data)
            callback(response.ReportInfo.ReportId, ASIN);
        });
    },

    getReport: function (reportID, ASIN, callback) {
        amazonMws.reports.search({
            'Version': '2009-01-01',
            'Action': 'GetReport',
            'SellerId': '',
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

    removeItemFromStore: function (SKU, quantity) {
        if (!isNaN(quantity) && typeof quantity === 'number') {
            quantity--;
        }
        var xmlFeed =
            '<?xml version="1.0" encoding="utf-8" ?>\n' +
            '<AmazonEnvelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="amznenvelope.xsd">\n' +
            '<Header>\n' +
                '<DocumentVersion>1.01</DocumentVersion>\n' +
                '<MerchantIdentifier></MerchantIdentifier>\n' +
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
            'SellerId': '',
            'FeedType': '_POST_INVENTORY_AVAILABILITY_DATA_',
            'FeedContent': xmlFeed
        }, function (error, response) {
            if (error) {
                console.log('error ', error);
                return;
            }
            console.log('response', response);
        });
    }
};