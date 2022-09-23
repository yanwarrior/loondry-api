let express = require("express");
let controllers = require("./controllers");
const bodyParser = require("body-parser");
const app = express();

app.use(bodyParser.json());
controllers(app);

const PORT = 3001;

app.listen(PORT);