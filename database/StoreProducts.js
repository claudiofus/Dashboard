var AWS = require("aws-sdk");
AWS.config.update({
    region: '',
    endpoint: '',
    accessKeyId: '',
    secretAccessKey: ''
});

var dynamodb = new AWS.DynamoDB();
var docClient = new AWS.DynamoDB.DocumentClient();

var params = {
    TableName: "StoreProducts",
    KeySchema: [
        {AttributeName: "UPC", KeyType: "HASH"}
    ],
    AttributeDefinitions: [
        {AttributeName: "UPC", AttributeType: "S"}
    ],
    ProvisionedThroughput: {ReadCapacityUnits: 1, WriteCapacityUnits: 1}
};

module.exports = {
    init: function () {
        dynamodb.createTable(params, function (err, data) {
            if (err) {
                console.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2));
            } else {
                console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
            }
        });
    },
    put: function (params, callback) {
        docClient.put(params, function (err, data) {
            if (err) {
                console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
            } else {
                console.log("Added item:", JSON.stringify(data, null, 2));
                callback("OK");
            }
        });
    },
    get: function (params, callback) {
        docClient.get(params, function (err, data) {
            if (err) {
                console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
            } else {
                console.log("GetItem succeeded:", JSON.stringify(data, null, 2));
                callback(data);
            }
        });
    },
    update: function (params) {
        docClient.update(params, function (err, data) {
            if (err) {
                console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
            } else {
                console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
            }
        });
    },
    delete: function (params) {
        docClient.delete(params, function (err, data) {
            if (err) {
                console.error("Unable to delete item. Error JSON:", JSON.stringify(err, null, 2));
            } else {
                console.log("DeleteItem succeeded:", JSON.stringify(data, null, 2));
            }
        });
    },
    query: function (params, callback) {
        docClient.query(params, function (err, data) {
            if (err) {
                console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
            } else {
                console.log("Query succeeded.");
                data.Items.forEach(function (item) {
                    console.log(item);
                });
                callback(data);
            }
        });
    },
    scan: function (params, callback) {
        docClient.scan(params, function onScan(err, data) {
            if (err) {
                console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
            } else {
                console.log("Scan succeeded.");

                // continue scanning if we have more items, because scan can retrieve a maximum of 1MB of data
                if (typeof data.LastEvaluatedKey !== "undefined") {
                    console.log("Scanning for more...");
                    params.ExclusiveStartKey = data.LastEvaluatedKey;
                    docClient.scan(params, onScan);
                }
                callback(data.Items);
            }
        });
    }
};