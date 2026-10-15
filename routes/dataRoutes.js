// import necesisities
const express = require('express');
const multer = require('multer');
const router = express.Router();
const controller = require('../controllers/dataController');

//store uploaded files in uploads directory
const upload = multer({ dest: 'uploads/' });

// Updated route to accept email and process file
router.post('/upload', upload.single('file'), controller.uploadAndProcessFile);


//export router to be used elswhere 
module.exports = router;
