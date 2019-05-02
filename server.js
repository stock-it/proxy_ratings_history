require('newrelic');
const express = require('express');
const path = require('path');
const axios = require('axios');
const redis = require('redis');
const app = express();
const port = process.env.PORT || 3000;

const client = redis.createClient();

client.on('error', (err) => {
  console.log("Error " + err);
});

app.use('/', express.static(path.join(__dirname, 'public')));
app.use('/stocks/:ticker', express.static(path.join(__dirname, 'public')));

const axios3001 = axios.create({
  baseURL: 'http://54.213.221.102:3001',
});

app.get('/api/:ticker', (req, res) => {
  return client.get(`/api/${req.params.ticker}`, (err, result) => {
    // If that key exist in Redis store
    if (result) {
      const resultJSON = JSON.parse(result);
      return res.status(200).json(resultJSON);
    } else {
      return axios3001.get(`/api/${req.params.ticker}`)
      .then(response => {
        const responseJSON = response.data;
        // Save the API response in Redis store
        client.setex(`/api/${req.params.ticker}`, 3600, JSON.stringify({ source: 'Redis Cache', ...responseJSON, }));
        // Send JSON response to client
        return res.status(200).json();
      })
      .catch(err => {
        return res.json(err);
      })
    }
  })
});     


app.get('/api/history/:ticker', (req, res) => {
  axios3001.get(`/api/history/${req.params.ticker}`)
    .then(response => res.send(response.data))
    .catch(err => res.send(err));
});


app.listen(port, () => {
  console.log(`proxy server running at: http://localhost:${port}`);
});
