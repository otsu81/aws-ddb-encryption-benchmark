const crypto = require('crypto');
const aws = require('aws-sdk');
const fs = require('fs');
const _ = require('lodash');
const { v4: uuidv4 } = require('uuid');

const KEY = Buffer.from(fs.readFileSync('key')); // read from file "key" - must be 32 bytes long

const timer = ms => new Promise( res => setTimeout(res, ms));

function makeBatches (dirs, batchSize) {
    const cloudPublicKeys = fs.readdirSync(dirs.cloudPublicKeys);
    const cloudPrivateKeys = fs.readdirSync(dirs.cloudPrivateKeys);
    const hubPublicKeys = fs.readdirSync(dirs.hubPublicKeys);

    if (!(cloudPrivateKeys.length === cloudPublicKeys.length &&
        cloudPrivateKeys.length === hubPublicKeys.length &&
        cloudPrivateKeys !== null)) {
            console.log('Not the same number of keys in one of the key directories')
            process.exit(0);
        };

    const keyIds = [...cloudPrivateKeys]

    const rows = [];
    const len = cloudPrivateKeys.length;
    for (let i = 0; i < len; i++) {

        let privateKey = fs.readFileSync(`cloud_private_keys/${cloudPrivateKeys.pop()}`).toString();
        if (process.argv[4] === 'encrypt') {
            privateKey = JSON.stringify(encrypt(privateKey, KEY));
        }
        // console.log(privateKey);

        row = {
            cloudKeyId: keyIds.pop(),
            cloudPrivateKey: privateKey,
            cloudPublicKey: fs.readFileSync(`cloud_public_keys/${cloudPublicKeys.pop()}`).toString(),
            hubKeyId: uuidv4(),
            hubPublicKey: fs.readFileSync(`hub_public_keys/${hubPublicKeys.pop()}`).toString(),
            thingName: uuidv4()
        };
        rows.push(row);
    };

    return _.chunk(rows, batchSize);
};

function encrypt(val, key){
    const iv = crypto.randomBytes(12); // initialization vector should be 12 bytes for aes256-gcm
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encoded = cipher.update(val, 'utf-8', 'base64');
    encoded += cipher.final('base64');
    // const tag = cipher.getAuthTag();
    const hexIv = Buffer.from(iv).toString('hex');
    const hexTag = Buffer.from(cipher.getAuthTag()).toString('hex'); // convert to hex from buffer for easier storage

    return {
        encoded: encoded,
        hexIv: hexIv,
        hexAuthTag: hexTag,
    };
};

async function resolvePromises(promises) {
    unprocessed = [];
    console.log('awaiting batch promise resolution');
    let ts1 = new Date().getTime();
    let result = await Promise.all(promises);
    let ts2 = new Date().getTime();
    result.forEach(item => {
        if (Object.keys(item.UnprocessedItems).length !== 0) {
            console.log(item);
            unprocessed.push(item);
        };
    });
    await timer(ts2 - ts1 + 50);
    return unprocessed;
}

async function ddbBatchWriter (batches, ddbTablename, awsRegion) {
    aws.config.update({
        region: awsRegion
    });
    const ddb = new aws.DynamoDB.DocumentClient();

    let promises = [];
    let unprocessed = [];
    for (j = 0; j < batches.length; j++) {

        // limit to DDB is 50 calls per second, with some headroom...
        if (promises.length >= 45) {
            unprocessed.concat(await resolvePromises(promises));
            promises = [];
        }

        let batch = batches[j];
        let itemsArray = [];
        for (i = 0; i < batch.length; i++) {
            itemsArray.push({
                PutRequest: {
                    Item: batch[i]
                }
            })
        };
        let params = {
            RequestItems: {
                [ddbTablename]: itemsArray
            }
        };
        promises.push(ddb.batchWrite(params).promise());
    }
    unprocessed.concat(await resolvePromises(promises));
    return unprocessed;
};

async function run(ddbTablename, awsRegion) {
    const batches = makeBatches({
        cloudPrivateKeys: 'cloud_private_keys/',
        cloudPublicKeys: 'cloud_public_keys/',
        hubPublicKeys: 'hub_public_keys/'
    }, 25); // max batch size is 25 requests, 400kb per item, 16MB total
    await ddbBatchWriter(batches, ddbTablename, awsRegion);

}

if (!(process.argv[2] && process.argv[3])) console.log('Must specify DDB table name and region, example usage: node ddbLoader dynamo-table eu-west-1')
else run(process.argv[2], process.argv[3]);