const express = require('express');
const app = express();

const bodyParser = require('body-parser');
const MongoClient = require('mongodb').MongoClient;

const host = 'localhost';
const port = 3000;

app.use(express.static('public'));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())

app.get('/endpoint', (req, res) => {
  res.status(202).send('hello there');
});

app.post('/endpoint', async (req, res) => {
  await MongoClient.connect('mongodb://localhost:27017/gabrieldealmeida', function (err, client) {
    if (err) throw err

    const db = client.db('gabrieldealmeida');

    db.collection('github').insertOne(req.body);
  });

  res.status(202).send();
});

// Error handler
app.use((err, req, res, _next) => {
  console.log('Error');
  res.status(404).send('There has been an error. Oops!');
});

// Listener
app.listen(port, () => {
  console.log(`Todos is listening on port ${port} of ${host}!`);
});
