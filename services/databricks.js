// handles interactrions with databricks 
const axios = require('axios'); // used for HTTP requests 

//triggers the databricks job
exports.trigger = async (filePath, selectedOptions) => {
    console.log("Trigger function called with filePath:", filePath); // log the input file path
    console.log("Selected options:", selectedOptions); // log the selected options

    //url for the endpoint - thanks for reading the documentation Charlie !
    const url = `${process.env.DATABRICKS_HOST}/api/2.0/jobs/run-now`;
    //headers for API requests
    const headers = {
        Authorization: `Bearer ${process.env.DATABRICKS_TOKEN}`,
        'Content-Type': 'application/json' // we want JSOn data
    };

    // the data we are sending
    const data = {
        job_id: process.env.DATABRICKS_JOB_ID, // specific job ID
        notebook_params: { 
            file_path: filePath, // passes file path so databricks knows what to access
            options: selectedOptions // the selected options user chose (the checkboxes)
        }
    };
    // makes a POST request to the Databricks API
    try {
        const response = await axios.post(url, data, { headers }); // Sends req
        return { success: true, runId: response.data.run_id }; // returns success (usually)
    } catch (error) {
        console.error("Error triggering Databricks job:", error); //incase of error
        return { success: false, error }; // returns specific error
    }
};

//check status of Databricks job - important for polling 
exports.checkStatus = async (runId) => {
    const url = `${process.env.DATABRICKS_HOST}/api/2.0/jobs/runs/get?run_id=${runId}`; // url for run status 
    const headers = { // basic headers 
        Authorization: `Bearer ${process.env.DATABRICKS_TOKEN}`,
        'Content-Type': 'application/json'
    };

    // sending a GET request now
    try {
        const response = await axios.get(url, { headers });
        const { life_cycle_state, result_state } = response.data.state; // gets the job status 
        return { lifeCycleState: life_cycle_state, resultState: result_state };
    } catch (error) {
        console.error("Error checking Databricks job status:", error); // should NOT happen 
        throw error;
    }
};