const express = require("express");
const app = express();

const host = 'localhost';
const port = 3000;

app.use(express.static("public"));

// Error handler
app.use((err, req, res, _next) => {
  console.log("Error"); // Writes more extensive information to the console log
  res.status(404).send("There has been an error. Oops!");
});

// Listener
app.listen(port, host, () => {
  console.log(`Todos is listening on port ${port} of ${host}!`);
});
