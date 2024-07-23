const express = require('express')
var cors = require('cors')
const app = express()
const port = 3000

const { BigQuery } = require('@google-cloud/bigquery');
const bigquery = new BigQuery();

activeJobId = null;

function getLineAndColumnNumberFromErrorMessage(errorMessage) {
    //e.g. error 'Unrecognized name: SSY_LOC_ID; Did you mean ASSY_LOC_ID? at [65:7]'
    let lineAndColumn = errorMessage.match(/\[(\d+):(\d+)\]/);
    if (lineAndColumn) {
        return {
            line: parseInt(lineAndColumn[1]),
            column: parseInt(lineAndColumn[2])
        };
    }
    return {
        line: 0,
        column: 0
    };
}


async function queryDryRun(query) {
    // For all options, see https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs/query
    const options = {
        query: query,
        // Location must match that of the dataset(s) referenced in the query.
        //location: '',
        dryRun: true,
    };

    try {
        const [job] = await bigquery.createQueryJob(options);
        let dryRunResponse = {
            statistics: {
                totalBytesProcessed: (parseFloat(job.metadata.statistics.totalBytesProcessed) / 10 ** 9).toFixed(3) + " GB",
            },
            error: {
                hasError: false,
                message: ""
            }
        };
        return dryRunResponse;
    } catch (error) {
        let errorLocation = getLineAndColumnNumberFromErrorMessage(error.message);
        let dryRunResponse = {
            statistics: {
                totalBytesProcessed: "",
            },
            error: {
                hasError: true,
                message: error.message,
                location: errorLocation
            }
        };
        return dryRunResponse;
    }
}


// [END bigquery_client_default_credentials]
async function getQueryOutputWtDryRun(queryToProcess = my_query) {

    let query = queryToProcess;

    // For all options, see https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs/query
    const options = {
        query: query,
        //location: 'US',
    };

    let finalResponse = {
        rows: [],
        dryRunResponse: {},
    }

    dryRunResponse = await queryDryRun(query);

    finalResponse.dryRunResponse = dryRunResponse;
    if (dryRunResponse.error.hasError) {
        return JSON.stringify(finalResponse);
        //return JSON.stringify(dryRunResponse.error);
    }

    // Run the query as a job
    const [job] = await bigquery.createQueryJob(options);
    console.log(`Job ${job.id} started.`);
    activeJobId = job.id;

    const [rows] = await job.getQueryResults();

    activeJobId = null;
    finalResponse.rows = JSON.stringify(rows);
    return JSON.stringify(finalResponse);
}

function create_data(rows) {
    const parsedArray = JSON.parse(rows);

    const result = {};
    if (parsedArray.length > 0) {
        Object.keys(parsedArray[0]).forEach(key => {
            result[key] = [];
        });
    }

    parsedArray.forEach(item => {
        Object.keys(item).forEach(key => {
            if (typeof item[key] === 'object' && item[key] !== null && 'value' in item[key]) {
                result[key].push(item[key].value);
            } else {
                result[key].push(item[key]);
            }
        });
    });

    return result;
}

app.get('/run_query/:query/', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    const queryToProcess = req.params.query;
    let rowsOrErr = await getQueryOutputWtDryRun(queryToProcess);
    if (JSON.parse(rowsOrErr).dryRunResponse?.error?.hasError) {
        res.send(rowsOrErr);
    } else {
        let tin = JSON.parse(rowsOrErr).rows
        let data = create_data(tin);
        let response = {
            rows: data,
            dryRunResponse: JSON.parse(rowsOrErr).dryRunResponse
        }
        res.send(response);
    }
});

app.get('/cancel_job/', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    console.log(`Trying to cancel job: ${activeJobId}`);
    if (activeJobId) {
        const job = bigquery.job(activeJobId);
        await job.cancel();
        console.log(`Job ${activeJobId} cancelled.`);
        activeJobId = null;
        res.send({ message: "Job cancelled" });
    } else {
        res.send({ message: "No active job to cancel" });
    }
});


app.use(cors());
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
