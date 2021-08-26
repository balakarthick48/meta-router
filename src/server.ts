/*
 * Main entry point: Start Express App
 */

import * as errorHandler from "errorhandler";
import * as http from 'http';
import fs = require('fs');
import { AddressInfo } from "net";

require('dotenv').config();
const app = require("./app");

app.use(errorHandler());
app.set('trust proxy', 1);

if (!process.env.RUNNING_IN_HEROKU) {
  console.log("======================================================");
  console.log("  WARNING: INSTANCE IS RUNNING IN DEVELOPMENT MODE");
  console.log("  IF THIS APP IS RUNNING WITHIN HEROKU YOU MUST SET THE 'RUNNING_IN_HEROKU' ENV VARIABLE TO TRUE");
  console.log("  DO NOT RUN WITH THIS MODE IN PRODUCTION");
  console.log("======================================================");
}
let server = http.createServer(app).listen(app.get("port"), () => {
  onListening(false, app.get("env"), server.address() as AddressInfo);
});

// Helper to log status after Express starts
function onListening(isHttps: boolean, mode: string, addressInfo: AddressInfo)
{
  let scheme = isHttps ? "https" : "http";
  console.log((" Express is running '%s' server in '%s' mode at %s://[%s]:%d, family: %s"),
    scheme, mode, scheme, addressInfo.address, addressInfo.port, addressInfo.family);
  console.log("  Press CTRL-C to stop\n");
}
