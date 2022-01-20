const aws = require('aws-sdk');

async function decrypt(encrypted) {
  const kms = new aws.KMS();
  const params = {
    CiphertextBlob: Buffer.from(encrypted, 'base64'),
  };
  const { Plaintext } = await kms.decrypt(params).promise();
  return Plaintext.toString();
}

exports.handler = async (event) => {
  const ddb = new aws.DynamoDB.DocumentClient();

  const result = await ddb.get({
    TableName: process.env.DDB_TABLE,
    Key: {
      cloudKeyId: event.cloudKeyId
    }
  }).promise();

  const decrypted = await decrypt(result.Item.cloudPrivateKey);

  if ((decrypted).startsWith('-----BEGIN RSA PRIVATE KEY-----')) return true;
  else {
    throw new Error('private key not decoded');
  };
};