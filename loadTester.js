
const aws = require('aws-sdk');
const fs = require('fs');

const timer = ms => new Promise( res => setTimeout(res, ms));

async function test(fncName){

    const privateKeyNames = fs.readdirSync('loaders/cloud_private_keys');


    const lambda = new aws.Lambda();
    let promises = [];

    try {
        for (let i = 0; i < privateKeyNames.length; i++) {
            let params = {
                FunctionName: `${fncName}`,
                Payload: `${JSON.stringify({cloudKeyId: privateKeyNames[i]})}`,
            };
            promises.push(lambda.invoke(params).promise());

            if (promises.length % 10 === 0) {
                let ts1 = new Date().getTime();
                await Promise.all(promises);
                let ts2 = new Date().getTime();
                let delay = 1000 - (ts2 - ts1);
                if (delay > 0) timer(delay);
                // console.log(promises)
                promises = [];
            };

            if (i % 100 === 0) console.log(`${fncName}: ${i} invocations...`)
        };
        await Promise.all(promises);
    } catch (e) {
        throw (e)
    };
};

if (!process.argv[2]) console.log('Missing input, try adding a lambda function name: node loadTester [FUNCTION_NAME]')
else test(process.argv[2]);