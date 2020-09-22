const express = require('express');
const app = express();
const fs = require('fs');
const bodyParser = require('body-parser');

const jsonParser = bodyParser.json();

const host = 'localhost';
const port = 3000;

app.use(express.static('public'));

app.use(express.urlencoded({ extended: false }));

app.get('/endpoint', (req, res) => {
  res.status(202).send('hello there');
});

app.post('/endpoint', jsonParser, (req, res) => {
  fs.writeFileSync('endpoint.json', JSON.stringify(req.body));
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
