/*
 * Express App
 */
import * as express from "express";
import * as session from "express-session";
import * as compression from "compression"; // compresses requests
import * as bodyParser from "body-parser";
import * as logger from "morgan";
import * as path from "path";
import * as favicon from "serve-favicon";
import SfmcAppRoutes from "./SfmcAppRoutes";
import Utils from "./Utils";
import * as fs from "fs";

declare module "express-session" {
  interface SessionData {
    oauthAccessToken: string;
    oauthAccessTokenExpiry: string;
    sfmcMemberId: string;
    UserId: any;
    accountID: any;
    Domains: any;
    accountId: any;
    campaigns: any;
    Intelliseed: any;
  }
}

let activity = require(path.join(__dirname, "..", "routes", "activity.js"));
var auth = require("./auth");
var redis = require("redis");
var redisStore = require("connect-redis")(session);

const PORT = process.env.PORT || 5000;
require("dotenv").config();
// Create & configure Express server
const app = express();
var helmet = require("helmet");
const envfile = require("envfile");

const redisClient = redis.createClient(process.env.REDIS_URL, {
  tls: {
    checkServerIdentity: (): any => {
      return null;
    },
    rejectUnauthorized: false,
  },
});
redisClient.on("error", (err: any) => {
  console.log("Redis error: ", err);
});

//let reqsession: { [x: string]: any } = {};
//let intelliseedSession: { [x: string]: any } = {};

// Express configuration
app.set("port", PORT);
app.set("views", path.join(__dirname, "../views"));
app.set("view engine", "ejs");

// Use helmet. More info: https://expressjs.com/en/advanced/best-practice-security.html
//app.use(helmet());
// Allow X-Frame from Marketing Cloud. Sets "X-Frame-Options: ALLOW-FROM http://exacttarget.com".
// app.use(
//   helmet.frameguard({
//     action: "allow-from",
//     domain:
//       "https://mc.s11.exacttarget.com/cloud/#app/Sparkpost%20Inbox%20Tracker%20Demo",
//   })
// );

app.use(
  session({
    store: new redisStore({
      ttl: 7 * 24 * 60 * 60, //store is in seconds
      client: redisClient,
    }),
    name: "sfmc-sparkpost-localstore",
    secret: "sanagama-df18",
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.RUNNING_IN_HEROKU ? true : false,
      sameSite: process.env.RUNNING_IN_HEROKU ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, //cookie is in milliseconds
    },
  })
);

//app.use(compression());
//app.use(logger("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.raw({ type: "application/jwt" }));

// Setup static paths
// app.use(express.static(path.join(__dirname, "../static")));
// app.use("/customactivity", express.static(path.join(__dirname, "../public")));
//app.use("/views",express.static(path.join(__dirname, '../views')));

//for icons display
app.use(
  favicon(
    path.join(__dirname, "../static", "images", "favicons", "favicon.ico")
  )
);

const appRoutes = new SfmcAppRoutes();

//Home page rendering with code for web apps
app.get("/", function (req, res) {
  if (req.query.code === undefined) {
    const redirectUri = `https://${process.env.BASE_URL}.auth.marketingcloudapis.com/v2/authorize?response_type=code&client_id=${process.env.DF18DEMO_CLIENTID}&redirect_uri=${process.env.REDIRECT_URL}`;
    res.redirect(redirectUri);
  } else {
    res.render("ui.ejs", {
      authorization_code: req.query.code,
      tssd: req.query.tssd ? req.query.tssd : process.env.BASE_URL,
    });
  }
});

app.post("/appdemoauthtoken", function (req, res) {
  appRoutes.getOAuthAccessToken(req, res);
});

//authorization code generation
app.post("/authorizationcodegeneration", function (req, res) {
  appRoutes.getAuthorizationCode(req, res);
});

//getting app user's information
app.post("/appuserinfo", function (req, res) {
  appRoutes.appUserInfo(req, res);
});

module.exports = app;
