const express = require('express');

const app = express();

const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');

const host = 'localhost';
const port = 3000;

app.use(express.static('public'));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Endpoint for github webhook
app.post('/endpoint', async (req, res) => {
  await MongoClient.connect('mongodb://localhost:27017/gabrieldealmeida', (err, client) => {
    if (err) throw err;

    const db = client.db('gabrieldealmeida');

    const jsonObj = req.body;
    const { repository, sender } = jsonObj;

    db.collection('github').insertOne({
      repo: repository.name,
      repo_url: repository.html_url,
      sender_avatar: sender.avatar_url,
      sender_url: sender.html_url,
      commits: jsonObj.commits,
    });
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
