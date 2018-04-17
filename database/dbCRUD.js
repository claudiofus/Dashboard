'use strict';
const AWS = require("aws-sdk");
const conf = require('./../modules/config');
const successLog = require('../modules/logger').successlog;
const errorLog = require('../modules/logger').errorlog;
AWS.config.update({
    region: "eu-west-3",
    endpoint: "https://dynamodb.eu-west-3.amazonaws.com",
    accessKeyId: conf.AWSaccess_key,
    secretAccessKey: conf.AWSsecretKey
});

let dynamodb = new AWS.DynamoDB();
let docClient = new AWS.DynamoDB.DocumentClient();

module.exports = {
    initStorePrd: function (callback) {
        callback = (typeof callback === 'function') ? callback : function () {
        };
        let params = {
            TableName: "StoreProducts",
            KeySchema: [
                {AttributeName: "UPC", KeyType: "HASH"},
                {AttributeName: "CreatedAt", KeyType: "RANGE"}
            ],
            AttributeDefinitions: [
                {AttributeName: "UPC", AttributeType: "S"},
                {AttributeName: "CreatedAt", AttributeType: "S"}
            ],
            ProvisionedThroughput: {ReadCapacityUnits: 1, WriteCapacityUnits: 1}
        };
        dynamodb.createTable(params, function (err, data) {
            if (err && err.statusCode === 400) {
                errorLog.error(err.message);
                callback(null);
            } else if (err) {
                errorLog.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2));
                callback(err, null);
            } else {
                successLog.info("Created table. Table description JSON:", JSON.stringify(data, null, 2));
                callback(null, data);
            }
        });
    },
    initTempProducts: function (callback) {
        callback = (typeof callback === 'function') ? callback : function () {
        };
        let params = {
            TableName: "TempProducts",
            KeySchema: [
                {AttributeName: "UPC", KeyType: "HASH"},
                {AttributeName: "CreatedAt", KeyType: "RANGE"}
            ],
            AttributeDefinitions: [
                {AttributeName: "UPC", AttributeType: "S"},
                {AttributeName: "CreatedAt", AttributeType: "S"}
            ],
            ProvisionedThroughput: {ReadCapacityUnits: 1, WriteCapacityUnits: 1}
        };
        dynamodb.createTable(params, function (err, data) {
            if (err && err.statusCode === 400) {
                errorLog.error(err.message);
                callback(null);
            } else if (err) {
                errorLog.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2));
                callback(err, null);
            } else {
                successLog.info("Created table. Table description JSON:", JSON.stringify(data, null, 2));
                dynamodb.waitFor('tableExists', {TableName: "TempProducts"}, function (waitForErr, waitForData) {
                    if (waitForErr) {
                        console.log(waitForErr, waitForErr.stack); // an error occurred
                    } else {
                        console.log('Created ====>', JSON.stringify(waitForData, null, 2));
                        callback(null, waitForData)
                    }
                });
            }
        });
    },
    put: function (params, callback) {
        callback = (typeof callback === 'function') ? callback : function () {
        };
        docClient.put(params, function (err, data) {
            if (err) {
                errorLog.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
                callback(err, null);
            } else {
                successLog.info("Added item:", JSON.stringify(data, null, 2));
                callback(null, data);
            }
        });
    },
    get: function (params, callback) {
        callback = (typeof callback === 'function') ? callback : function () {
        };
        docClient.get(params, function (err, data) {
            if (err) {
                errorLog.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
                callback(err, null);
            } else {
                successLog.info("GetItem succeeded:", JSON.stringify(data, null, 2));
                callback(null, data);
            }
        });
    },
    update: function (params, callback) {
        callback = (typeof callback === 'function') ? callback : function () {
        };
        docClient.update(params, function (err, data) {
            if (err) {
                errorLog.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
                callback(err, null);
            } else {
                successLog.info("UpdateItem succeeded:", JSON.stringify(data, null, 2));
                callback(null, data);
            }
        });
    },
    delete: function (params, callback) {
        callback = (typeof callback === 'function') ? callback : function () {
        };
        docClient.delete(params, function (err, data) {
            if (err) {
                errorLog.error("Unable to delete item. Error JSON:", JSON.stringify(err, null, 2));
                callback(err, null);
            } else {
                successLog.info("DeleteItem succeeded:", JSON.stringify(data, null, 2));
                callback(null, data);
            }
        });
    },
    query: function (params, callback) {
        callback = (typeof callback === 'function') ? callback : function () {
        };
        docClient.query(params, function (err, data) {
            if (err) {
                errorLog.error("Unable to query. Error:", JSON.stringify(err, null, 2));
                callback(err, null);
            } else {
                successLog.info("Query succeeded.");
                data.Items.forEach(function (item) {
                    successLog.info(item);
                });
                callback(null, data.Items);
            }
        });
    },
    scan: function (params, callback) {
        callback = (typeof callback === 'function') ? callback : function () {
        };
        docClient.scan(params, function onScan(err, data) {
            if (err) {
                errorLog.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
                callback(err, null);
            } else {
                successLog.info("Scan succeeded: " + params.TableName);
                successLog.info("Result: " + JSON.stringify(data));

                // continue scanning if we have more items, because scan can retrieve a maximum of 1MB of data
                if (typeof data.LastEvaluatedKey !== "undefined") {
                    successLog.info("Scanning for more...");
                    params.ExclusiveStartKey = data.LastEvaluatedKey;
                    docClient.scan(params, onScan);
                }
                callback(null, data.Items);
            }
        });
    },
    deleteTable: function (params, callback) {
        callback = (typeof callback === 'function') ? callback : function () {
        };
        dynamodb.deleteTable(params, function (err, data) {
            if (err) {
                errorLog.error("Unable to delete table. Error JSON:", JSON.stringify(err, null, 2));
                callback(err, null);
            } else {
                successLog.info("Deleted table. Table description JSON:", JSON.stringify(data, null, 2));
                dynamodb.waitFor('tableNotExists', params, function (waitForErr, waitForData) {
                    if (waitForErr) {
                        console.log(waitForErr, waitForErr.stack); // an error occurred
                    } else {
                        console.log('Deleted ====>', JSON.stringify(waitForData, null, 2));
                        callback(null, waitForData)
                    }
                });
            }
        });
    }
};