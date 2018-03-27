var express = require('express');
var http = require('http');
var fs = require('fs');
var app = express();
var server = http.createServer(app);
var io = require('socket.io').listen(server);
var filePath = __dirname + '/modules/config.json';

// Read file for configurations
var fileConf = fs.readFileSync(filePath, 'utf8');
var conf = JSON.parse(fileConf);
conf.authenticated = false;

server.listen(8000);

app.use(express.static(__dirname + '/'));
var dispatcher = require('./modules/dispatcher')(app, conf);
var gmailApi = require('./modules/gmail')(io);
var socket = require('./modules/socket')(io, conf);

var accessKey = '';
var accessSecret = '';

var amazonMws = require('./modules/amazon/amazon-mws')(accessKey, accessSecret);

//ORDINE DEI SERVIZI
// ListMatchingProducts
// RequestReport
// GetReportList
// GetReport
// SubmitFeed

var productRequest = function () {
    amazonMws.products.search({
        'Version': '2011-10-01',
        'Action': 'ListMatchingProducts',
        'SellerId': '',
        'MWSAuthToken': '',
        'MarketplaceId': '',
        'Query': ''
    }, function (error, response) {
        if (error) {
            console.log('error products', error);
            return;
        }
        //console.log('response ', JSON.stringify(response));
        console.log('response', response);
        var ASIN = response.Products.Product.Identifiers.MarketplaceASIN.ASIN;
        reportRequest();
        getReportIDRequest(ASIN, function (reportID, ASIN) {
            getReport(reportID, ASIN, function (ASIN) {
                removeItemFromStore(ASIN);
            });
        });
    });
};

var reportRequest = function () {

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
        console.log('response', response);
    });
};

var getReportIDRequest = function (ASIN, callback) {

    amazonMws.reports.search({
        'Version': '2009-01-01',
        'Action': 'GetReportList',
        'SellerId': ''
    }, function (error, response) {
        if (error) {
            console.log('error ', error);
            return;
        }
        console.log('response', response);
        //TODO effettuare i controlli di validità (data e tipo)
        callback(response.ReportInfo["0"].ReportId, ASIN);
    });
};

var getReport = function (reportID, ASIN, callback) {

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
        console.log('response', response);
        callback(ASIN);
    });
};

var removeItemFromStore = function (ASIN) {
    var FeedContent = '';
    // <Message>
    //     <MessageID>1</MessageID>
    //     <OperationType>Update</OperationType>
    //     <Inventory>
    //         <SKU></SKU>
    //         <Quantity>4</Quantity>
    //     </Inventory>
    // </Message>

    amazonMws.feeds.submit({
        'Version': '2009-01-01',
        'Action': 'SubmitFeed',
        'SellerId': '',
        'FeedType': '_POST_PRODUCT_DATA_',
        'FeedContent': FeedContent
    }, function (error, response) {
        if (error) {
            console.log('error ', error);
            return;
        }
        console.log('response', response);
    });
};

productRequest();

module.exports = app;