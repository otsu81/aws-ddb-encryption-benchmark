const aws = require('aws-sdk');
const crypto = require('crypto');

function decrypt(encrypted) {
  const KEY = process.env.KEY;
  const j = JSON.parse(encrypted);

  const iv = Buffer.from(j.hexIv, 'hex');
  const authTag = Buffer.from(j.hexAuthTag, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
  decipher.setAuthTag(authTag);

  let decoded = decipher.update(j.encoded, 'base64', 'utf-8');
  decoded += decipher.final('utf-8');

  return decoded;
};

exports.handler = async (event) => {
  const ddb = new aws.DynamoDB.DocumentClient();
  const result = await ddb.get({
    TableName: process.env.DDB_TABLE,
    Key: {
      cloudKeyId: event.cloudKeyId
    }
  }).promise();

  let decoded = decrypt(result.Item.cloudPrivateKey);
  if ((decoded).startsWith('-----BEGIN RSA PRIVATE KEY-----')) return true;
  else {
    throw new Error('private key not decoded');
  };
};