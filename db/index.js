const { Client } = require("pg");
// Create a constant, CONNECTION_STRING, from either process.env.DATABASE_URL or postgres://localhost:5432/phenomena-dev
const CONNECTION_STRING =
  process.env.DATABASE_URL || "postgres://localhost:5432/phenomena-dev";
// Create the client using new Client(CONNECTION_STRING)
// Do not connect to the client in this file!
const client = new Client(CONNECTION_STRING);

// Require the Client constructor from the pg package
async function getOpenReports() {
  try {
    const { rows: openReports } = await client.query(
      `
      SELECT * FROM reports
      WHERE "isOpen"=true;
    `
    );
    // first load all of the reports which are open
    // then load the comments only for those reports, using a
    // WHERE "reportId" IN () clause
    for (let i = 0; i < openReports.length; i++) {
      const { rows: comments } = await client.query(`
        SELECT * FROM comments
        WHERE comments."reportId"=${openReports[i].id}; 
      `);

      openReports[i].comments = comments;
      openReports[i].isExpired =
        Date.parse(openReports[i].expirationDate) < new Date();
      delete openReports[i].password;
    }
    // then, build two new properties on each report:
    // .comments for the comments which go with it
    //    it should be an array, even if there are none
    // .isExpired if the expiration date is before now
    //    you can use Date.parse(report.expirationDate) < new Date()
    // also, remove the password from all reports
    // finally, return the reports
    return openReports;
  } catch (error) {
    throw error;
  }
}

/**
 * You should use the reportFields parameter (which is
 * an object with properties: title, location, description, password)
 * to insert a new row into the reports table.
 *
 * On success, you should return the new report object,
 * and on failure you should throw the error up the stack.
 *
 * Make sure to remove the password from the report object
 * before returning it.
 */
async function createReport(reportFields) {
  // Get all of the fields from the passed in object
  const { title, location, description, password } = reportFields;
  try {
    const {
      rows: [report],
    } = await client.query(
      `
      INSERT INTO reports (title, location, description, password, "isOpen")
      VALUES ($1, $2, $3, $4, true)
      RETURNING *;
    `,
      [title, location, description, password]
    );
    delete report.password;

    return report;
    // insert the correct fields into the reports table
    // remember to return the new row from the query
    // remove the password from the returned row
    // return the new report
  } catch (error) {
    throw error;
  }
}

/**
 * NOTE: This function is not for use in other files, so we use an _ to
 * remind us that it is only to be used internally.
 * (for our testing purposes, though, we WILL export it)
 *
 * It is used in both closeReport and createReportComment, below.
 *
 * This function should take a reportId, select the report whose
 * id matches that report id, and return it.
 *
 * This should return the password since it will not eventually
 * be returned by the API, but instead used to make choices in other
 * functions.
 */
async function _getReport(reportId) {
  try {
    // SELECT the report with id equal to reportId
    // return the report
    const {
      rows: [report],
    } = await client.query(
      `
      SELECT * FROM reports
      WHERE reports.id=$1;  
    `,
      [reportId]
    );
    return report;
  } catch (error) {
    throw error;
  }
}

/**
 * You should update the report where the reportId
 * and password match, setting isOpen to false.
 *
 * If the report is updated this way, return an object
 * with a message of "Success".
 *
 * If nothing is updated this way, throw an error
 */
async function closeReport(reportId, password) {
  try {
    // First, actually grab the report with that id
    const report = await _getReport(reportId);
    // If it doesn't exist, throw an error with a useful message
    if (!report) {
      throw new Error("Report does not exist with that id");
    }
    // If the passwords don't match, throw an error
    if (report.password !== password) {
      throw new Error("Password incorrect for this report, please try again!");
    }
    // If it has already been closed, throw an error with a useful message
    if (!report.isOpen) {
      throw new Error("This report has already been closed");
    }
    // Finally, update the report if there are no failures, as above
    const {
      rows: [updatedReport],
    } = await client.query(
      `
      UPDATE reports
      SET "isOpen"='false'
      WHERE id=$1;
    `,
      [reportId]
    );
    // Return a message stating that the report has been closed
    return { message: "Report successfully closed!" };
  } catch (error) {
    throw error;
  }
}

/**
 * Comment Related Methods
 */

/**
 * If the report is not found, or is closed or expired, throw an error
 *
 * Otherwise, create a new comment with the correct
 * reportId, and update the expirationDate of the original
 * report to CURRENT_TIMESTAMP + interval '1 day'
 */
async function createReportComment(reportId, commentFields) {
  const { content } = commentFields;


  try {
    const report = await _getReport(reportId)

    if (!report) {
      throw new Error('That report does not exist, no comment has been made')
    }
    if (!report.isOpen) {
      throw new Error('That report has been closed, no comment has been made')
    }

    if (Date.parse(report.expirationDate) < new Date()) {
      throw new Error('The discussion time on this report has expired, no comment has been made')
    }
    const {
      rows: [comment],
    } = await client.query(

      `INSERT INTO comments (content, "reportId")
   VALUES ($1, $2)
   RETURNING *` ,
      [content, reportId]
    )

    let today = new Date();
    today.setDate(today.getDate() + 1);
    report.expirationDate = today;


    return comment

  } catch (error) {
    throw error;
  }
}
// export the client and all database functions below
module.exports = {
  client,
  getOpenReports,
  createReport,
  _getReport,
  closeReport,
  createReportComment
}