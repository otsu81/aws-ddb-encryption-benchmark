/*
* decrypts using a secrets manager, but not setting environment variable
*/

const dynamodb = require('aws-sdk/clients/dynamodb');
const secretsmanager = require('aws-sdk/clients/secretsmanager');
const crypto = require('crypto');
const ddb = new dynamodb.DocumentClient();

// const KEY = process.env.KEY

async function getAesKey() {
  const sm = new secretsmanager();
  const result = await sm.getSecretValue({
    SecretId: 'benchmark/aes'
  }).promise()
  return (JSON.parse(result.SecretString)).AES_KEY
}

async function decrypt(encrypted) {

  const j = JSON.parse(encrypted);

  const iv = Buffer.from(j.hexIv, 'hex');
  const authTag = Buffer.from(j.hexAuthTag, 'hex');

  const key = await getAesKey()

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decoded = decipher.update(j.encoded, 'base64', 'utf-8');
  decoded += decipher.final('utf-8');

  return decoded;
};

exports.handler = async (event) => {

  const result = await ddb.get({
    TableName: process.env.DDB_TABLE,
    Key: {
      cloudKeyId: event.cloudKeyId
    }
  }).promise();

  let decoded = await decrypt(result.Item.cloudPrivateKey);
  if ((decoded).startsWith('-----BEGIN RSA PRIVATE KEY-----')) return true;
  else {
    throw new Error('private key not decoded');
  };
};