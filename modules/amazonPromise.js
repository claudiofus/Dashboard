'use strict';
const _ = require('lodash');
const conf = require('./config');
const Product = require('../classes/Product');
const successLog = require('./logger').successlog;
const errorLog = require('./logger').errorlog;
const amazonMws = require('../modules/amazon/amazon-mws')(conf.MWSaccess_key, conf.MWSsecret_key);

// REFRESH RATE
// ListMatchingProducts    ogni 5 secondi
// RequestReport           ogni minuto
// GetReportList           ogni minuto
// GetReport               ogni minuto
// SubmitFeed              ogni 2 minuti
// GetFeedSubmissionResult ogni minuto

module.exports = {
    listMatchingProductsPr:
        function (query, prd) {
            return new Promise(function (resolve, reject) {
                amazonMws.products.search({
                    'Version': '2011-10-01',
                    'Action': 'ListMatchingProducts',
                    'SellerId': conf.MWSseller_id,
                    'MarketplaceId': conf.IT_Mrkt,
                    'Query': query
                }).then(function (response) {
                    prd.setASIN(response.Products.Product.Identifiers.MarketplaceASIN.ASIN);
                    prd.setDescription(response.Products.Product.AttributeSets.ItemAttributes.Title);
                    setTimeout(function () {
                        resolve(prd);
                    }, 60000);
                }).catch(function (error) {
                    errorLog.error('Error ListMatchingProducts', error);
                    reject(Error(error.message));
                });
            })
        },
    requestReportPr:
        function (prd) {
            return new Promise(function (resolve, reject) {
                amazonMws.reports.search({
                    'Version': '2009-01-01',
                    'Action': 'RequestReport',
                    'SellerId': conf.MWSseller_id,
                    'ReportType': '_GET_MERCHANT_LISTINGS_DATA_LITE_'
                }).then(function (response) {
                    let reportID = response.ReportRequestInfo.ReportRequestId;
                    setTimeout(function () {
                        resolve([reportID, prd]);
                    }, 60000);
                }).catch(function (error) {
                    errorLog.error('Error RequestReport', error);
                    reject(Error(error.message));
                });
            });
        },
    getReportIDRequestPr:
        function (reportID, prd) {
            return new Promise(function (resolve, reject) {
                amazonMws.reports.search({
                    'Version': '2009-01-01',
                    'Action': 'GetReportList',
                    'SellerId': conf.MWSseller_id,
                    'ReportTypeList.Type.1': '_GET_MERCHANT_LISTINGS_DATA_LITE_',
                    'ReportRequestIdList.Id.1': reportID
                }).then(function (response) {
                    setTimeout(function () {
                        resolve([response.ReportInfo.ReportId, prd]);
                    }, 60000);
                }).catch(function (error) {
                    errorLog.error('Error GetReportList', error);
                    reject(Error(error.message));
                });
            });
        },
    getReportPr:
        function (reportID, prd) {
            return new Promise(function (resolve, reject) {
                amazonMws.reports.search({
                    'Version': '2009-01-01',
                    'Action': 'GetReport',
                    'SellerId': conf.MWSseller_id,
                    'ReportId': reportID
                }).then(function (response) {
                    let itemToFind = _.find(response.data, {'product-id': prd.ASIN});
                    successLog.info(itemToFind);
                    if (itemToFind) {
                        let SKU = Object.values(itemToFind)[0];
                        let quantity = parseInt(Object.values(itemToFind)[1]);
                        let price = Object.values(itemToFind)[2];
                        prd.setQuantity(quantity);
                        prd.setSKU(SKU);
                        prd.setPrice(price);
                        resolve(prd);
                    } else {
                        errorLog.error('itemToFind is undefined');
                        reject(Error('itemToFind is undefined'));
                    }
                }).catch(function (error) {
                    errorLog.error('Error GetReport', error);
                    reject(Error(error.message));
                });
            });
        },
    removeItemFromStorePr:
        function (prd) {
            return new Promise(function (resolve, reject) {
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
                }).then(function (response) {
                    setTimeout(function () {
                        resolve([response.FeedSubmissionInfo.FeedSubmissionId, prd]);
                    }, 120000);
                }).catch(function (error) {
                    errorLog.error('Error SubmitFeed', error);
                    reject(Error(error));
                });
            });
        },
    checkRemoveItemPr:
        function (feedID, prd) {
            return new Promise(function (resolve, reject) {
                amazonMws.feeds.submit({
                    'Version': '2009-01-01',
                    'Action': 'GetFeedSubmissionResult',
                    'SellerId': conf.MWSseller_id,
                    'FeedSubmissionId': feedID
                }).then(function (response) {
                    if (response.AmazonEnvelope.Message.ProcessingReport.ProcessingSummary.MessagesProcessed === "1" &&
                        response.AmazonEnvelope.Message.ProcessingReport.ProcessingSummary.MessagesSuccessful === "1") {
                        resolve(prd);
                    } else {
                        errorLog.error('Feed Processing with Warning or Errors.', error);
                        reject(Error('Feed Processing with Warning or Errors.'));
                    }
                }).catch(function (error) {
                    errorLog.error('Error GetFeedSubmissionResult', error);
                    reject(Error(error.message));
                });
            });
        }
};

String.prototype.isNumber = function () {
    return /^\d+$/.test(this);
};
