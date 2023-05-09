import express from "express";
import * as dotenv from "dotenv";
import logger from "morgan";
import compression from "compression";
import path from "path";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import basicAuth from "./middlewares/basicauth.mjs";
import sse from "./middlewares/sse.mjs";
import chatgptRouter from "./chatgpt.mjs";
import authCallback from "./auth.mjs";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const __dirname = path.resolve();

app.use(compression());
app.use(logger("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());



app.use(express.static(path.join(__dirname, "public"), { maxAge: 3600 * 30 }));

if (process.env.BASIC_AUTH === "true") {
  app.use(basicAuth(authCallback,'please enter auth user,pass'));
}

app.use(sse());
app.use("/backend-api", chatgptRouter);

// app.set("views", path.join(__dirname, "views"));
// app.set("view engine", "jade");

app.listen(port, () => {
  console.log(`Example app listening on port http://127.0.0.1:${port}/`);
});
