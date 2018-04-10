'use strict';
const _ = require('lodash');
const conf = require('./config');
const Product = require('../classes/Product');
const amazonMws = require('../modules/amazon/amazon-mws')(conf.MWSaccess_key, conf.MWSsecret_key);

// REFRESH RATE
// ListMatchingProducts    ogni 5 secondi
// RequestReport           ogni minuto
// GetReportList           ogni minuto
// GetReport               ogni minuto
// SubmitFeed              ogni 2 minuti
// GetFeedSubmissionResult ogni minuto

module.exports = {
    listMatchingProducts: function (query, callback) {
        callback = (typeof callback === 'function') ? callback : function () {
        };
        if (!query.isNumber) callback("UPC not valid", null);
        let prd = new Product(query);
        amazonMws.products.search({
            'Version': '2011-10-01',
            'Action': 'ListMatchingProducts',
            'SellerId': conf.MWSseller_id,
            'MarketplaceId': conf.IT_Mrkt,
            'Query': query
        }, function (err, response) {
            if (err) {
                console.error('error products', err);
                callback(err, null);
                return;
            }
            prd.setASIN(response.Products.Product.Identifiers.MarketplaceASIN.ASIN);
            prd.setDescription(response.Products.Product.AttributeSets.ItemAttributes.Title);
            prd.setCreationDate(new Date());
            callback(null, prd);
        });
    },

    requestReport: function (prd, callback) {
        callback = (typeof callback === 'function') ? callback : function () {
        };
        amazonMws.reports.search({
            'Version': '2009-01-01',
            'Action': 'RequestReport',
            'SellerId': conf.MWSseller_id,
            'ReportType': '_GET_MERCHANT_LISTINGS_DATA_LITE_'
        }, function (err, response) {
            if (err) {
                console.error('error ', err);
                callback(err, null);
                return;
            }
            let reportID = response.ReportRequestInfo.ReportRequestId;
            setTimeout(function () {
                callback(null, reportID, prd);
            }, 60000);
        });
    },

    getReportIDRequest: function (reportID, prd, callback) {
        callback = (typeof callback === 'function') ? callback : function () {
        };
        amazonMws.reports.search({
            'Version': '2009-01-01',
            'Action': 'GetReportList',
            'SellerId': conf.MWSseller_id,
            'ReportTypeList.Type.1': '_GET_MERCHANT_LISTINGS_DATA_LITE_',
            'ReportRequestIdList.Id.1': reportID
        }, function (err, response) {
            if (err) {
                console.error('error ', err);
                callback(err, null);
                return;
            }
            setTimeout(function () {
                callback(null, response.ReportInfo.ReportId, prd);
            }, 60000);
        });
    },

    getReport: function (reportID, prd, callback) {
        callback = (typeof callback === 'function') ? callback : function () {
        };
        amazonMws.reports.search({
            'Version': '2009-01-01',
            'Action': 'GetReport',
            'SellerId': conf.MWSseller_id,
            'ReportId': reportID
        }, function (err, response) {
            if (err) {
                console.error('error ', err);
                callback(err, null);
                return;
            }
            let itemToFind = _.find(response.data, {'product-id': prd.ASIN});
            console.log(itemToFind);
            if (itemToFind) {
                let SKU = Object.values(itemToFind)[0];
                let quantity = parseInt(Object.values(itemToFind)[1]);
                let price = Object.values(itemToFind)[2];
                prd.setQuantity(quantity);
                prd.setSKU(SKU);
                prd.setPrice(price);
                callback(null, prd);
            } else {
                console.log('itemToFind is undefined');
                callback('itemToFind is undefined', null);
            }
        });
    },

    removeItemFromStore: function (prd, callback) {
        callback = (typeof callback === 'function') ? callback : function () {
        };
        if (!isNaN(prd.Quantity) && typeof prd.Quantity === 'number') prd.Quantity--;
        let xmlFeed =
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
                        '<SKU>' + prd.SKU + '</SKU>\n' +
                        '<Quantity>' + prd.Quantity + '</Quantity>\n' +
                    '</Inventory>\n' +
                '</Message>\n' +
            '</AmazonEnvelope>';

        amazonMws.feeds.submit({
            'Version': '2009-01-01',
            'Action': 'SubmitFeed',
            'SellerId': conf.MWSseller_id,
            'FeedType': '_POST_INVENTORY_AVAILABILITY_DATA_',
            'FeedContent': xmlFeed
        }, function (err, response) {
            if (err) {
                console.error('error ', err);
                callback(err, null);
                return;
            }

            setTimeout(function () {
                callback(null, response.FeedSubmissionInfo.FeedSubmissionId, callback);
            }, 90000);
        });
    },

    checkRemoveItem: function (feedID, callback) {
        callback = (typeof callback === 'function') ? callback : function () {
        };
        amazonMws.feeds.submit({
            'Version': '2009-01-01',
            'Action': 'GetFeedSubmissionResult',
            'SellerId': conf.MWSseller_id,
            'FeedSubmissionId': feedID
        }, function (err, response) {
            if (err) {
                console.error('error ', err);
                callback(err, null);
            } else if (response.AmazonEnvelope.Message.ProcessingReport.ProcessingSummary.MessagesProcessed === "1" &&
                response.AmazonEnvelope.Message.ProcessingReport.ProcessingSummary.MessagesSuccessful === "1") {
                callback(null, 'OK');
            } else {
                callback('Feed Processing with Warning or Errors.', null);
            }
        });
    }
};

String.prototype.isNumber = function () {
    return /^\d+$/.test(this);
};