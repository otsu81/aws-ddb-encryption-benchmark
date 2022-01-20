const aws = require('aws-sdk');

exports.handler = async (event) => {
  const ddb = new aws.DynamoDB.DocumentClient();
  const result = await ddb.get({
    TableName: process.env.DDB_TABLE,
    Key: {
      cloudKeyId: event.cloudKeyId
    }
  }).promise();
  if ((result.Item.cloudPrivateKey).startsWith('-----BEGIN RSA PRIVATE KEY-----')) return true;
  else {
    throw new Error('private key not decoded');
  };
};