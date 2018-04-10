'use strict';
const AWS = require("aws-sdk");
const conf = require('./../modules/config');
AWS.config.update({
    region: "eu-west-3",
    endpoint: "https://dynamodb.eu-west-3.amazonaws.com",
    accessKeyId: conf.AWSaccess_key,
    secretAccessKey: conf.AWSsecretKey
});

var dynamodb = new AWS.DynamoDB();
var docClient = new AWS.DynamoDB.DocumentClient();

module.exports = {
    initStorePrd: function (callback) {
        callback = (typeof callback === 'function') ? callback : function () {
        };
        var params = {
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
                console.error(err.message);
                callback(null);
            } else if (err) {
                console.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2));
                callback(err, null);
            } else {
                console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
                callback(null, data);
            }
        });
    },
    initTempProducts: function (callback) {
        callback = (typeof callback === 'function') ? callback : function () {
        };
        var params = {
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
                console.error(err.message);
                callback(null);
            } else if (err) {
                console.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2));
                callback(err, null);
            } else {
                console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
                callback(null, data);
            }
        });
    },
    put: function (params, callback) {
        callback = (typeof callback === 'function') ? callback : function () {
        };
        docClient.put(params, function (err, data) {
            if (err) {
                console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
                callback(err, null);
            } else {
                console.log("Added item:", JSON.stringify(data, null, 2));
                callback(null, data);
            }
        });
    },
    get: function (params, callback) {
        callback = (typeof callback === 'function') ? callback : function () {
        };
        docClient.get(params, function (err, data) {
            if (err) {
                console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
                callback(err, null);
            } else {
                console.log("GetItem succeeded:", JSON.stringify(data, null, 2));
                callback(null, data);
            }
        });
    },
    update: function (params, callback) {
        callback = (typeof callback === 'function') ? callback : function () {
        };
        docClient.update(params, function (err, data) {
            if (err) {
                console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
                callback(err, null);
            } else {
                console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
                callback(null, data);
            }
        });
    },
    delete: function (params, callback) {
        callback = (typeof callback === 'function') ? callback : function () {
        };
        docClient.delete(params, function (err, data) {
            if (err) {
                console.error("Unable to delete item. Error JSON:", JSON.stringify(err, null, 2));
                callback(err, null);
            } else {
                console.log("DeleteItem succeeded:", JSON.stringify(data, null, 2));
                callback(null, data);
            }
        });
    },
    query: function (params, callback) {
        callback = (typeof callback === 'function') ? callback : function () {
        };
        docClient.query(params, function (err, data) {
            if (err) {
                console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
                callback(err, null);
            } else {
                console.log("Query succeeded.");
                data.Items.forEach(function (item) {
                    console.log(item);
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
                console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
                callback(err, null);
            } else {
                console.log("Scan succeeded.");

                // continue scanning if we have more items, because scan can retrieve a maximum of 1MB of data
                if (typeof data.LastEvaluatedKey !== "undefined") {
                    console.log("Scanning for more...");
                    params.ExclusiveStartKey = data.LastEvaluatedKey;
                    docClient.scan(params, onScan);
                }
                callback(null, data.Items);
            }
        });
    }
};