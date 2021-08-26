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
import SfmcAppDemoRoutes from "./SfmcAppDemoRoutes";
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
app.use(express.static(path.join(__dirname, "../static")));
app.use("/customactivity", express.static(path.join(__dirname, "../public")));
//app.use("/views",express.static(path.join(__dirname, '../views')));

//for icons display
app.use(
  favicon(
    path.join(__dirname, "../static", "images", "favicons", "favicon.ico")
  )
);

const appDemoRoutes = new SfmcAppDemoRoutes();

//Home page rendering with code for web apps
app.get("/", function (req, res) {
  if (req.query.code === undefined) {
    const redirectUri = `https://${process.env.BASE_URL}.auth.marketingcloudapis.com/v2/authorize?response_type=code&client_id=${process.env.DF18DEMO_CLIENTID}&redirect_uri=${process.env.REDIRECT_URL}`;

    res.redirect(redirectUri);
  } else {
    res.render("sparkpostapi.ejs", {
      authorization_code: req.query.code,
      tssd: req.query.tssd ? req.query.tssd : process.env.BASE_URL,
    });
  }
});

app.post("/appdemoauthtoken", function (req, res) {
  appDemoRoutes.getOAuthAccessToken(req, res);
});

//authorization code generation
app.post("/authorizationcodegeneration", function (req, res) {
  appDemoRoutes.getAuthorizationCode(req, res);
});

//User ID verification from sparkpost
app.post("/sparkpostverify", function (req, res) {
  appDemoRoutes.sparkpostverify(req, res);
});

//redirecting to dashboard
app.get("/sparkpostdashboardget", function (req, res) {
  Utils.initSampleDataAndRenderView(req, res, "sparkpostdashboard.ejs");
});

//redirecting to dashboard with parameters
app.get("/sparkpostdashboardTrackersummary", function (req, res) {
  res.render("sparkpostdashboard");
});

app.get("/sparkpostdashboard", function (req, res) {
  res.render("sparkpostapi.ejs", {
    tssd: req.query.tssd,
  });
});

//getting app user's information
app.post("/appuserinfo", function (req, res) {
  appDemoRoutes.appUserInfo(req, res);
});

//Sparkpost Integration data folder check
app.post("/datafoldercheck", function (req, res) {
  appDemoRoutes.dataFolderCheck(req, res);
});

//Individual data extension creation for intelliseed
app.post("/filteriddata", function (req, res) {
  appDemoRoutes.filterIdData(req, res);
});

//retrieving the data for individual intelliseeds
app.post("/filteriddatasparkpost", function (req, res) {
  appDemoRoutes.filteriddatasparkpost(req, res);
});

//retrieving sparkpost integration data folder
app.post("/retrievingdataextensionfolderid", function (req, res) {
  appDemoRoutes.retrievingDataExtensionFolderID(req, res);
});

//retrieving Domain configuraion data row
app.post("/retrievingDataExtensionRows", function (req, res) {
  appDemoRoutes.retrievingDataExtensionRows(req, res);
});

//creating Sparkpost Integration Folder
app.post("/createsparkpostintegrationfolder", function (req, res) {
  appDemoRoutes.createSparkpostIntegrationFolder(req, res);
});

//domainconfigurationdecheck
app.post("/domainconfigurationdecheck", function (req, res) {
  appDemoRoutes.domainConfigurationDECheck(req, res);
});

//checking salesforce job stats data extension is present or not if not it will create a data extension
app.post("/checksalesforcejobstats", function (req, res) {
  appDemoRoutes.checkSalesforceJobStats(req, res);
});

//checking salesforce Bounce stats data extension is present or not if not it will create a data extension
app.post("/checksalesforcebouncestats", function (req, res) {
  appDemoRoutes.checkSalesforceBounceStats(req, res);
});

//retrieving the row for the campaign performance to display the deliverivility
app.post("/sendstatsrow", function (req, res) {
  appDemoRoutes.sendStatsRow(req, res);
});

//retrieving the bounce stats row for the campaign performance to display the Bounce Performance
app.post("/bouncestatsrow", function (req, res) {
  appDemoRoutes.bounceStatsRow(req, res);
});

// app.get("/sparkpostusersession", function (req, res) {
//   //Utils.logInfo("sparkpostusersession:" + JSON.stringify(userId));
//   res.status(200).send(userId);
// });

//getting intelliseeds to display in the modal
app.post(
  "/fetchintelliseedlist",
  auth.isSparkpostVerified,
  function (req, res) {
    appDemoRoutes.fetchintelliseedlist(req, res);
    //intelliseedSession[req.body.accountId] = req.session;
  }
);

//
app.get(
  "/getintelliseedsession",
  auth.isSparkpostVerified,
  function (req, res) {
    Utils.logInfo("intelliseed session :" + JSON.stringify(req.session));
    res.status(200).send(req.session);
  }
);

//Used to retrieve the domains available in sparkpost
app.get("/getavailabledomains", auth.isSparkpostVerified, function (req, res) {
  appDemoRoutes.getavailabledomains(req, res);
  //reqsession[req.query.accountId] = req.session;
});

//Used to retrieve the domains available in sessions
app.get(
  "/getsessionavailabledomains",
  auth.isSparkpostVerified,
  function (req, res) {
    //Utils.logInfo("reqsession:" + JSON.stringify(reqsession));
    console.log("req.session " + JSON.stringify(req.session));
    res.status(200).send(req.session);
  }
);

//campaign's status
app.post("/getstatus", auth.isSparkpostVerified, function (req, res) {
  appDemoRoutes.getstatus(req, res);
  //campaigns = req.session;
  //Utils.logInfo("campaigns:" + campaigns);
});

//get sender domain using sender profile ID
app.get("/getsenderdomain", function (req, res) {
  appDemoRoutes.getSenderDomain(req, res);
});

// app.get("/getdomaindeliverability", function (req, res) {
//   appDemoRoutes.getdomaindeliverability(req, res);
// });

//Domain configuration row count
app.get("/rowcount", function (req, res) {
  appDemoRoutes.rowCount(req, res);
});

//Journey builder's mails to be displayed in the journey performance
//campaigns available in sessions
// app.get("/getsessioncampaigns", function (req, res) {
//   res.status(200).send(campaigns);
// });

//insert row for dc
app.post("/insertrowfordc", function (req, res) {
  appDemoRoutes.insertRowForDC(req, res);
});

//Inserting row for intelliseed Lists DE
app.post("/insertrowforisl", function (req, res) {
  appDemoRoutes.insertRowForISL(req, res);
});

//checking Intelliseeds Lists DE
app.post("/intelliseedlistsdecheck", function (req, res) {
  appDemoRoutes.intelliseedListsDECheck(req, res);
});

//getting all active journeys
app.get("/getactivejourneys", function (req, res) {
  appDemoRoutes.getActiveJourneys(req, res);
});

//get Journeys By ID
app.post("/getJourneysById", function (req, res) {
  appDemoRoutes.getJourneysById(req, res);
});

//Updating the row of Individual Intelliseed
app.post("/filteriddataextensionupdation", function (req, res) {
  appDemoRoutes.FilterSetDataExtensionUpdation(req, res);
});

app.get("/subject/data/", auth.isSparkpostVerified, activity.subjectData);
app.get("/source/data/", auth.isSparkpostVerified, activity.sourceData);

app.post("/journeybuilder/save/", activity.save);
app.post("/journeybuilder/validate/", activity.validate);
app.post("/journeybuilder/publish/", activity.publish);
app.post("/journeybuilder/execute/", activity.execute);
app.post("/retrieve/domainrows/", activity.domainRows);
app.get("/sitemap.xml", function (req, res) {
  res.header("Content-Type", "text/plain");
  res.header("Content-Security-Policy", "frame-ancestors '*'");
  res.header("Pragma", "no-cache");
  res.header(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.header("Expires", "0");
  res.header("Surrogate-Control", "no-store");
  return res.status(401).send({
    status: "error",
    code: 400,
    message: "sitemap.xml",
    data: {},
  });
});
app.get("/robots.txt", function (req, res) {
  res.header("Content-Type", "text/plain");
  res.header("Content-Security-Policy", "frame-ancestors '*'");
  res.header("Pragma", "no-cache");
  res.header(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.header("Expires", "0");
  res.header("Surrogate-Control", "no-store");
  return res.status(401).send({
    status: "error",
    code: 400,
    message: "robots.txt",
    data: {},
  });
});

// Marketing Cloud POSTs the JWT to the '/login' endpoint when a user logs in

module.exports = app;
