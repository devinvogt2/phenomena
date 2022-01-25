// Use the dotenv package, to create environment variables
require('dotenv').config();
// Create a constant variable, PORT, based on what's in process.env.PORT or fallback to 3000
const PORT = process.env.PORT || 3000
// Import express, and create a server
const express = require('express')
const server = express();
const cors = require('cors');

// Require morgan and body-parser middleware ????
const morgan = require('morgan')
// Have the server use morgan with setting 'dev'
server.use(morgan("dev"));

// Import cors 

// Have the server use cors()
server.use(cors())
server.use(express.json())

server.use((req, res, next) => {
    console.log("<____Body Logger START____>");
    console.log(req.body);
    console.log("<_____Body Logger END_____>");

    next();
});

// Have the server use your api router with prefix '/api'
const apiRouter = require('./api')
server.use('/api', apiRouter)
// Import the client from your db/index.js
const { client } = require('./db')
// Create custom 404 handler that sets the status code to 404. ????

server.use('*', (req, res, next) => {

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Custom 404</title>
        <link rel="stylesheet" href="/style.css" />
      </head>
      <body>
        <div class="not-found">
          <p>Page Not Found</p>
          <img src=“/custom-404.gif" />
        </div>
      </body>
      </html>`

    res.status(404).send(html)
})

// Create custom error handling that sets the status code to 500 ????
// and returns the error as an object ??? 
server.use((err, req, res, next) => {
    err.status = 500
    next(err)
})

// Start the server listening on port PORT

const handle = server.listen(PORT, async () => {

    try {
        await client.connect()
    } catch (err) {
        console.error(err);
        await client.end();
        throw err
    }

    console.log('The server is up on port', PORT, ' and the db is connected!')
})
// On success, connect to the database

module.exports = { handle, PORT }
