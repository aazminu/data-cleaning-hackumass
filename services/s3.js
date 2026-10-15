// Hnadles upload and retrieval of file with s3
const AWS = require('aws-sdk');
const fs = require('fs'); // the file system to read files
require('dotenv').config();


// new S3 instance using the log ins 
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION //wonder why this is necesary 
});

// uploads to S3
exports.uploads3 = async (file) => {
    if (!file || !file.originalname) {
        throw new Error("File is undefined."); // if no file
    }
    
    loc = 'uploads/' + Date.now() + '_' + file.originalname; // file path is constructed, uses exact date so that each file name is unique 
    const data = fs.readFileSync(file.path); 
    // upload parameters
    const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: loc,  // makes so that each file is original named
        Body: data
    }

    //  uploads file to s3 and waits for the promise to resolive
    const result = await s3.upload(params).promise();
    //returns path of s3 file 
    return loc;
};

//retrieves the pre-signed url download link for S3
exports.downloads3 = async (filename) => {
    const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: filename, //filepath 
        Expires: 3600 // 60 minute expiry
    };
    
    return s3.getSignedUrlPromise('getObject', params);
};