// Build an apiRouter using express Router
const express = require('express');
const { password } = require('pg/lib/defaults');
const apiRouter = express.Router();

// const jwt = require('jsonwebtoken')
// const { JWT_SECRET } = process.env;  do we log in? if so, do we need a Jwt_secret and authoriztion middleware?



// Import the database adapter functions from the db

const { getOpenReports,
    createReport,
    closeReport,
    createReportComment } = require('../db') // could you just import the client here instead of the individual functions? 
//would you import the client in lowercase here?

/**
 * Set up a GET request for /reports
 *
 * - it should use an async function
 * - it should await a call to getOpenReports
 * - on success, it should send back an object like { reports: theReports }
 * - on caught error, call next(error)
 */

apiRouter.get('/reports', async (req, res, next) => {

    try {
        let theReports = await getOpenReports()

        res.send({ reports: theReports })
    } catch (err) {
        next(error)
    }
})

/**
 * Set up a POST request for /reports
 *
 * - it should use an async function
 * - it should await a call to createReport, passing in the fields from req.body
 * - on success, it should send back the object returned by createReport
 * - on caught error, call next(error)
 */

apiRouter.post('/reports', async (req, res, next) => {

    try {
        const { title, location, description, password } = req.body
        const newReportFields = { title, location, description, password }
        const report = await createReport(newReportFields)

        res.status(201).send(report)

        // return report
    } catch (error) {
        next(error)
    }
})

/**
 * Set up a DELETE request for /reports/:reportId
 *
 * - it should use an async function
 * - it should await a call to closeReport, passing in the reportId from req.params
 *   and the password from req.body
 * - on success, it should send back the object returned by closeReport
 * - on caught error, call next(error)
 */
apiRouter.delete('/reports/:reportId', async (req, res, next) => {
    try {
        const { password } = req.body;
        const { reportId } = req.params;
        const messageObj = await closeReport(reportId, password);
        res.send(messageObj);

    } catch (err) {
        next(err);
    }
});


/**
 * Set up a POST request for /reports/:reportId/comments
 *
 * - it should use an async function
 * - it should await a call to createReportComment, passing in the reportId and
 *   the fields from req.body
 * - on success, it should send back the object returned by createReportComment
 * - on caught error, call next(error)
 */
apiRouter.post('/reports/:reportId/comments', async (req, res, next) => {
    try {
        const { content } = req.body;
        const newCommentFields = { content };
        const reportId = req.params;

        const comment = await createReportComment(reportId, newCommentFields, content);

        res.send(comment);
    } catch (err) {
        next(err);
    }
})


// Export the apiRouter
module.exports = apiRouter;