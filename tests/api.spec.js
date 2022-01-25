process.env.NODE_ENV === 'development' && require('dotenv').config();

const axios = require('axios');
const { handle } = require('../index');
const { client } = require('../db');
const { rebuildDB } = require('../db/seed_data');

const { SERVER_ADDRESS = 'http://localhost:', PORT = 3000 } = process.env;
const API_URL = process.env.API_URL || SERVER_ADDRESS + PORT + '/api';

beforeAll(async () => {
  await rebuildDB();
  await apiSetup();
});

afterAll(async () => {
  await client.end();
  handle.close();
});

const apiSetup = async () => {
  const reports = [
    {
      title: 'floating patronus',
      location: 'hogwarts',
      description: 'it seemed to have somewhat of a glow to it',
      password: 'ExpectoPatronum',
    },
  ];

  for (let i = 0; i < reports.length; i++) {
    const { title, location, description, password } = reports[i];

    await client.query(
      `
      INSERT INTO reports (title, location, description, password, "isOpen")
      VALUES ($1, $2, $3, $4, 'true');   
    `,
      [title, location, description, password]
    );
  }
};

describe('API unit tests', () => {
  describe('GET /api/reports', () => {
    test('GET /api/reports returns an array of reports', async () => {
      const {
        data: { reports },
      } = await axios.get(`${API_URL}/reports`);

      expect(Array.isArray(reports)).toBe(true);
      expect(reports.length).toBe(1);
      expect(reports[0].title).toEqual('floating patronus');
    });

    test('GET /api/reports endpoint should return the same reports as those fetched directly from the database', async () => {
      const {
        data: { reports: fetchedReports },
      } = await axios.get(`${API_URL}/reports`);

      const { rows: reportsFromDB } = await client.query(`
        SELECT * FROM reports;
      `);

      expect(reportsFromDB.length).toEqual(fetchedReports.length);

      const firstDBReport = reportsFromDB[0];
      const firstFetchedReport = fetchedReports[0];
      firstDBReport.expirationDate = firstFetchedReport.expirationDate;

      Object.keys(firstDBReport).forEach((key) => {
        if (firstFetchedReport.hasOwnProperty(key)) {
          expect(firstDBReport[key]).toEqual(firstFetchedReport[key]);
        }
      });
    });
  });

  // we're defining this newReportId in the parent scope to any individual test,
  // so that other tests can assign and consume the value later
  // why would we do this? (hint: what if we want to use data
  // from the newReport object outside the scope in which it was created...?)
  let newReportId;

  describe('POST /api/reports', () => {
    test('POST /api/reports without proper fields throws and yields a response status of 500', async () => {
      try {
        const response = await axios.post(`${API_URL}/reports`, {
          pizza: 'party',
        });
      } catch (err) {
        expect(err.response.status).toBe(500);
      }
    });

    test('POST /api/reports with proper report object creates and returns the report', async () => {
      const newReport = {
        title: 'Disappearing Being',
        location: 'Middle Earth',
        description:
          'the little fellow put on a ring, and i swear he disappeared',
        password: 'FrodoIsMysterious',
      };

      const { data: createdReport } = await axios.post(
        `${API_URL}/reports`,
        newReport
      );

      // store id for subsequent comments association below!
      newReportId = createdReport.id;

      expect(createdReport.title).toBe(newReport.title);
      expect(createdReport.isOpen).toBe(true);
      expect(createdReport.password).toBe(undefined);
    });

    test('POST /api/reports/:reportId/comments throws error with status 500 if comment object is malformed', async () => {
      try {
        await axios.post(`${API_URL}/reports/1/comments`, { pizza: 'party' });
      } catch (err) {
        expect(err.response.status).toBe(500);
      }
    });

    test('POST /api/reports/:reportId/comments supplied with proper comment data creates a new comment associated with the new report created above', async () => {
      const newComment = {
        content: 'he is quite small to hold the one ring to rule them all...',
      };

      const { data: comment, status } = await axios.post(
        `${API_URL}/reports/${newReportId}/comments`,
        newComment
      );

      expect(comment.content).toBe(newComment.content);
      expect(status).toBe(200);
    });
  });

  describe('DELETE /api/reports', () => {
    test('DELETE /api/reports/:reportId throws an error with status 500 if reportId is undefined or not found, or if password is not supplied', async () => {
      try {
        await axios({
          method: 'delete',
          url: `${API_URL}/reports/pizza`,
          data: {
            password: 'FrodoIsMysterious',
          },
        });
      } catch (err) {
        expect(err.response.status).toBe(500);
      }

      try {
        await axios({
          method: 'delete',
          url: `${API_URL}/reports/${newReportId}`,
          data: {
            password: 'MyPrecious',
          },
        });
      } catch (err) {
        expect(err.response.status).toBe(500);
      }
    });

    test('DELETE /api/reports/:reportId succeeds with a well defined reportId and matching db record', async () => {
      const { data: deleteResponse, status } = await axios({
        method: 'delete',
        url: `${API_URL}/reports/${newReportId}`,
        data: {
          password: 'FrodoIsMysterious',
        },
      });

      const {
        rows: [softDeletedReport],
      } = await client.query(
        `
      SELECT * FROM reports
      WHERE id=$1;
    `,
        [newReportId]
      );

      expect(status).toBe(200);
      expect(softDeletedReport.isOpen).toBe(false);
      expect(deleteResponse.message).toBe('Report successfully closed!');
    });
  });

  describe('404 handling', () => {
    test('the api handles not found requests', async () => {
      try {
        await axios.get(`${API_URL}/pizza`);
      } catch (err) {
        expect(err.response.status).toBe(404);
        expect(err.response.statusText).toBe('Not Found');
      }
    });
  });
});









