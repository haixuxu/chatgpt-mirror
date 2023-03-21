require("dotenv").config();
const express = require("express");
const logger = require("morgan");
const compression = require("compression");
const path = require("path");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const app = express();
const port = process.env.PORT || 3000;
const sse = require('./sse');
const chatrouter = require("./chatgpt");

app.use(compression());
app.use(logger("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(sse())
// app.use(sse({serializerFn:function(id, event, data){
//     return JSON.stringify(data);
// }}));

app.use("/backend-api", chatrouter);

// app.set("views", path.join(__dirname, "views"));
// app.set("view engine", "jade");

app.listen(port, () => {
  console.log(`Example app listening on port http://127.0.0.1:${port}/`);
});
