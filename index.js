const express = require('express');
const app = express();

const bodyParser = require('body-parser');
const MongoClient = require('mongodb').MongoClient;

const host = 'localhost';
const port = 3000;

app.use(express.static('public'));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())

app.post('/endpoint', async (req, res) => {
  await MongoClient.connect('mongodb://localhost:27017/gabrieldealmeida', function (err, client) {
    if (err) throw err

    const db = client.db('gabrieldealmeida');

    const jsonObj = req.body;
    const repository = jsonObj.repository;
    const ownerObj = repository.owner;
    const headCommit = jsonObj.head_commit;
    const commiterObj = headCommit.commiter;


    db.collection('github').insertOne({ repo: repository.name, repo_url: repository.html_url, owner: ownerObj.name, owner_avatar: ownerObj.avatar_url, owner_url: ownerObj.html_url, commit_msg: headCommit.message, timestamp: headCommit.timestamp, commit_url: headCommit.url, commiter: commiterObj.name, commiter_username: commiterObj.username });
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
