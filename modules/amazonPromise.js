'use strict';
const _ = require('lodash');
const conf = require('./config');
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
            successLog.info("ListMatchingProducts: QUERY: " + query + " prd: " + JSON.stringify(prd));
            return new Promise(function (resolve, reject) {
                amazonMws.products.search({
                    'Version': '2011-10-01',
                    'Action': 'ListMatchingProducts',
                    'SellerId': conf.MWSseller_id,
                    'MarketplaceId': conf.IT_Mrkt,
                    'Query': query
                }).then(function (response) {
                    successLog.info("ListMatchingProducts: " + JSON.stringify(response));
                    let ASIN = response.Products.Product.Identifiers.MarketplaceASIN.ASIN;
                    let descr = response.Products.Product.AttributeSets.ItemAttributes.Title;
                    if (ASIN && descr) {
                        prd.setASIN(ASIN);
                        prd.setDescription(descr);
                        successLog.info("ASIN: " + ASIN);
                        successLog.info("Description: " + descr);
                        setTimeout(function () {
                            resolve(prd);
                        }, 60000);
                    } else {
                        errorLog.error('Errore ListMatchingProducts', 'ASIN o Titolo non definito');
                        reject(Error('ASIN o Titolo non definito'));
                    }
                }).catch(function (error) {
                    errorLog.error('Errore ListMatchingProducts', error);
                    reject(Error(error.Message));
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
                    successLog.info("RequestReport: " + JSON.stringify(response));
                    if (response.ReportRequestInfo.ReportRequestId) {
                        let reportID = response.ReportRequestInfo.ReportRequestId;
                        setTimeout(function () {
                            resolve([reportID, prd]);
                        }, 60000);
                    } else {
                        errorLog.error('Errore RequestReport', 'ReportRequestId non è definito');
                        reject(Error('ReportRequestId non è definito'));
                    }
                }).catch(function (error) {
                    errorLog.error('Errore RequestReport', error);
                    reject(Error(error.Message));
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
                    successLog.info("GetReportList: " + JSON.stringify(response));
                    if (response.ReportInfo.ReportId) {
                        setTimeout(function () {
                            resolve([response.ReportInfo.ReportId, prd]);
                        }, 60000);
                    } else {
                        errorLog.error('Errore GetReportList', 'ReportId non è definito');
                        reject(Error('ReportRequestId non è definito'));
                    }
                }).catch(function (error) {
                    errorLog.error('Errore GetReportList', error);
                    reject(Error(error.Message));
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
                    successLog.info("GetReport: " + JSON.stringify(response));
                    let itemFound = _.find(response.data, {'product-id': prd.ASIN});
                    successLog.info('Item found:' + itemFound);
                    if (itemFound && Object.values(itemFound)[0] && Object.values(itemFound)[1] && Object.values(itemFound)[2]) {
                        let SKU = Object.values(itemFound)[0];
                        let quantity = parseInt(Object.values(itemFound)[1]);
                        let price = Object.values(itemFound)[2];
                        prd.setQuantity(quantity);
                        prd.setSKU(SKU);
                        prd.setPrice(price);
                        resolve(prd);
                    } else {
                        errorLog.error('L\'articolo con codice UPC: ' + prd.UPC + 'non è stato trovato nell\'inventario.');
                        reject(Error('L\'articolo con codice UPC: ' + prd.UPC + 'non è stato trovato nell\'inventario.'));
                    }
                }).catch(function (error) {
                    errorLog.error('Errore GetReport', error);
                    reject(Error(error.Message));
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
                successLog.info("xml to SubmitFeed: " + xmlFeed);
                amazonMws.feeds.submit({
                    'Version': '2009-01-01',
                    'Action': 'SubmitFeed',
                    'SellerId': conf.MWSseller_id,
                    'FeedType': '_POST_INVENTORY_AVAILABILITY_DATA_',
                    'FeedContent': xmlFeed
                }).then(function (response) {
                    successLog.info("SubmitFeed: " + JSON.stringify(response));
                    if (response.FeedSubmissionInfo.FeedSubmissionId) {
                        setTimeout(function () {
                            resolve([response.FeedSubmissionInfo.FeedSubmissionId, prd]);
                        }, 180000);
                    } else {
                        errorLog.error('Errore SubmitFeed', 'FeedSubmissionId non è definito');
                        reject(Error('FeedSubmissionId non è definito'));
                    }
                }).catch(function (error) {
                    errorLog.error('Errore SubmitFeed', error);
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
                    successLog.info("GetFeedSubmissionResult: " + JSON.stringify(response));
                    if (response.AmazonEnvelope.Message.ProcessingReport.ProcessingSummary.MessagesProcessed === "1" &&
                        response.AmazonEnvelope.Message.ProcessingReport.ProcessingSummary.MessagesSuccessful === "1") {
                        resolve(prd);
                    } else {
                        errorLog.error('Feed Processing with Warning or Errors.', error);
                        reject(Error('Feed Processing with Warning or Errors.'));
                    }
                }).catch(function (error) {
                    errorLog.error('Errore GetFeedSubmissionResult', error);
                    reject(Error(error.Message));
                });
            });
        }
};