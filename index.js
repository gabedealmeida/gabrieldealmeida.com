const express = require('express');

const app = express();

const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');

const TimeAgo = require('javascript-time-ago');

const en = require('javascript-time-ago/locale/en');

TimeAgo.addLocale(en);
const timeAgo = new TimeAgo('en-US');

const host = 'localhost';
const port = 3000;

app.set('views', './views');
app.set('view engine', 'pug');

app.use(express.static('public'));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', async (req, res) => {
  let documents = [];
  const client = new MongoClient('mongodb://localhost:27017/gabrieldealmeida');

  try {
    await client.connect();
    documents = await client.db('gabrieldealmeida')
      .collection('github')
      .find()
      .sort({ $natural: -1 })
      .limit(5)
      .toArray();
  } catch (e) {
    console.log(e);
  } finally {
    await client.close();
  }

  res.render('home', { documents, timeAgo });
});

// Endpoint for github webhook
app.post('/endpoint', async (req, res) => {
  const client = new MongoClient('mongodb://localhost:27017/gabrieldealmeida');
  const jsonObj = req.body;
  const { repository, sender } = jsonObj;

  try {
    await client.connect();
    await client.db('gabrieldealmeida').collection('github').insertOne({
      repo: repository.name,
      repoPath: repository.full_name,
      repoUrl: repository.html_url,
      senderAvatar: sender.avatar_url,
      senderUrl: sender.html_url,
      commits: jsonObj.commits,
    });
  } catch (e) {
    console.log(e);
  } finally {
    await client.close();
  }

  res.status(202).send();
});

// Error handler
app.use((err, req, res, _next) => {
  console.log('Error');
  res.status(404).send('There has been an error. Oops!');
});

// Listener
app.listen(port, () => {
  console.log(`Gabrieldelameida.com is listening on port ${port} of ${host}!`);
});
