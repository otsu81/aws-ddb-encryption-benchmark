const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const dirs = {
  cloudPrivateKeys: 'cloud_private_keys/',
  cloudPublicKeys: 'cloud_public_keys/',
  hubPublicKeys: 'hub_public_keys/',
};

const cloudPrivateKeys = fs.readdirSync(dirs.cloudPrivateKeys);
const cloudPublicKeys = fs.readdirSync(dirs.cloudPublicKeys);
const hubPublicKeys = fs.readdirSync(dirs.hubPublicKeys);

const keyIds = [...cloudPrivateKeys]

// g === h && g === f && g !== null

if (!(cloudPrivateKeys.length === cloudPublicKeys.length && cloudPrivateKeys.length === hubPublicKeys.length && cloudPrivateKeys !== null)) {
  console.log('Not the same number of keys in one of the key directories')
  process.exit(0);
};


const rows = [];
const len = cloudPrivateKeys.length;
for (let i = 0; i < len; i++) {
  row = {
    cloudKeyId: keyIds.pop(),
    cloudPrivateKey: fs.readFileSync(`cloud_private_keys/${cloudPrivateKeys.pop()}`).toString(),
    cloudPublicKey: fs.readFileSync(`cloud_public_keys/${cloudPublicKeys.pop()}`).toString(),
    hubKeyId: uuidv4(),
    hubPublicKey: fs.readFileSync(`hub_public_keys/${hubPublicKeys.pop()}`).toString(),
    thingName: uuidv4()
  };
  rows.push(row);
};

console.log(JSON.stringify(rows, null, 2));