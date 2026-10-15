// uploads file to s3, triggers databricks and then retrieves the cleaned data

const { uploads3, downloads3 } = require('../services/s3'); //functions from s3 file
const { trigger, checkStatus } = require('../services/databricks'); //functions to call databricks
require('dotenv').config(); //loads variables
const sgMail = require('@sendgrid/mail'); //imports sendgrid - what we use for mailing
sgMail.setApiKey(process.env.SENDGRID_API_KEY); // sets API Key - was running into issues without this, "Key needs to start with 'SG.' "

// Function to upload file, trigger Databricks job, and handle email notification
exports.uploadAndProcessFile = async (req, res) => {
    const { email } = req.body; // store user's email from the request
    const file = req.file; //get the uploaded file from the request

    try {
        console.log("Received file upload request:", file);

        // Upload file to S3
        const S3FilePath = await uploads3(file);
        console.log("File successfully uploaded to S3", S3FilePath);

        // Trigger Databricks job
        const databricksResponse = await trigger(S3FilePath, req.body.selectedOptions);
        if (databricksResponse.success) {
            console.log("Databricks job started. Run ID:", databricksResponse.runId);

            // Poll for job completion and send email
            await pollForCompletion(databricksResponse.runId, S3FilePath, email);
            res.json({ message: 'File being cleaned ! You will receive an email once complete (3-5 minutes) ', runId: databricksResponse.runId });


        } else {
            console.error("Failed to process with DataBricks ", databricksResponse);
            res.status(500).json({ message: 'Failed to process with DataBricks' });
        }


    } catch (error) {
        console.error("Error in upload/cleaning function:", error);
        res.status(500).json({ message: 'Error in upload/cleaning function:' });
    }
};

// Polling function to check job completion and send email, necesary as we want to wait before we display the download link
async function pollForCompletion(runId, filePath, email) {
    const pollInterval = 15000; // Poll every 15 seconds
    const maxAttempts = 40; //Maxes at 6 minutes - Highest it every took was 5:30 
    let attempts = 0;

    console.log("Polling the job ");
    console.log("User email:", email);

    while (attempts < maxAttempts) {
      // polls the 
        try {
            console.log(`Polling attempt #${attempts + 1}...`);
            const { lifeCycleState, resultState } = await checkStatus(runId);

            if (lifeCycleState === "TERMINATED") {
                if (resultState === "SUCCESS") {
                    // Generate the download link and send email
                    const downloadLink = await downloads3(filePath.replace("uploads/", "processed/"));
                    await sendCompletionEmail(downloadLink, email);
                    console.log("Job completed successfully. Email sent to:", email);
                    return;
                } else {
                    console.error("Databricks job failed.");
                    return;
                }
            }
            console.log("Job still running - Checking again in 15 seconds");
            
            await new Promise(resolve => setTimeout(resolve, pollInterval)); //sets the 15 second timer 
            
            attempts++;

        } catch (error) {
            console.error("Error during job polling:", error);
            return;
        }
    }
    console.error("Timed out after 6 minutes :( ");
}

// Function to send the email with the download link
async function sendCompletionEmail(downloadLink, email) {
    const msg = {
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@scrubdata.local',
        subject: 'Your File is Ready for Download',
        //formats the email all nice
        text: `Thank you for using Scrub Data! Your file has been processed and is ready for download: ${downloadLink}`,
        html: `<p>Thank you for using Scrub Data!  Your file has been processed and is ready for download: <a href="${downloadLink}">Download it here</a>.</p>`,
    };
    // tries to send mail
    try {
        await sgMail.send(msg);
        console.log("Email sent to:", email);
    } catch (error) {
        console.error("Error sending email:", error);
    }
}
