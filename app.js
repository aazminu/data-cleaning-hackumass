// Sets up the Express server
// import necessities
require('dotenv').config();
const express = require ('express');
const cors = require('cors');
const route = require('./routes/dataRoutes.js');
const path = require('path');

// creates express instance
const app = express();
// i like 5000 as the port 
const Port = 5000;
// allows the front end files to be accessed
app.use(express.static(path.join(__dirname, 'frontend'))); 

app.use(cors()); // allows the app to use different ports for calling apis, links back and front end basically  
app.use(express.json()); // parses json
app.use('/api/data', route); // puts all api requests for this app under this route 

//sets up the server on the port 
app.listen(Port, ()=> {
    console.log("Currently running on port,", Port);
})