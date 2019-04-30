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
  baseURL: 'http://localhost:3001',
});

// const axios3002 = axios.create({
//   baseURL: 'http://localhost:3002',
// });

// const axios3003 = axios.create({
//   baseURL: 'http://localhost:3003',
// });

// const axios4000 = axios.create({
//   baseURL: 'http://localhost:4000',
// });

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
        // Save the Wikipedia API response in Redis store
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

// app.use('/api/stocks/:ticker', (req, res) => {
//   axios3002.get(`/api/stocks/${req.params.ticker}`)
//     .then(response => res.send(response.data))
//     .catch(err => res.send(err));
// })

// app.use('/api/accounts/:account_number', (req, res) => {
//   axios3002.get(`/api/accounts/${req.params.account_number}`)
//     .then(response => res.send(response.data))
//     .catch(err => res.send(err));
// })

// app.use('/api/quotes/:symbol', (req, res) => {
//   axios3003.get(`/api/quotes/${req.params.symbol}`)
//     .then(response => res.send(response.data))
//     .catch(err => res.send(err));
// })

// app.use('/stocks/tags/:tag', (req, res) => {
//   axios3003.get(`/stocks/tags/${req.params.tag}`)
//     .then(response => res.send(response.data))
//     .catch(err => res.send(err));
// })
// app.use('/api/:stockId', (req, res) => {
//   axios4000.get(`/api/${req.params.stockId}`)
//     .then(response => res.send(response.data))
//     .catch(err => res.send(err));
// })

app.listen(port, () => {
  console.log(`proxy server running at: http://localhost:${port}`);
});
