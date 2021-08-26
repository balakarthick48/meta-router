"use strict";
var util = require("util");
var axios = require("axios");
// Deps
const Path = require("path");
const JWT = require(Path.join(__dirname, "..", "lib", "jwtDecoder.js"));
var util = require("util");
var http = require("https");
var xml2js = require("xml2js");
var qs = require("qs");

require("dotenv").config();
exports.logExecuteData = [];

function logData(req) {
  exports.logExecuteData.push({
    body: req.body,
    headers: req.headers,
    trailers: req.trailers,
    method: req.method,
    url: req.url,
    params: req.params,
    query: req.query,
    route: req.route,
    cookies: req.cookies,
    ip: req.ip,
    path: req.path,
    host: req.host,
    fresh: req.fresh,
    stale: req.stale,
    protocol: req.protocol,
    secure: req.secure,
    originalUrl: req.originalUrl,
  });
  console.log("body: " + util.inspect(req.body));
  console.log("headers: " + req.headers);
  console.log("trailers: " + req.trailers);
  console.log("method: " + req.method);
  console.log("url: " + req.url);
  console.log("params: " + util.inspect(req.params));
  console.log("query: " + util.inspect(req.query));
  console.log("route: " + req.route);
  console.log("cookies: " + req.cookies);
  console.log("ip: " + req.ip);
  console.log("path: " + req.path);
  console.log("host: " + req.host);
  console.log("fresh: " + req.fresh);
  console.log("stale: " + req.stale);
  console.log("protocol: " + req.protocol);
  console.log("secure: " + req.secure);
  console.log("originalUrl: " + req.originalUrl);
}

/*
 * POST Handler for / route of Activity (this is the edit route).
 */
exports.edit = function (req, res) {
  logData(req);
  res.send(200, "Edit");
};

/*
 * POST Handler for /save/ route of Activity.
 */
exports.save = function (req, res) {
  logData(req);
  res.send(200, "Save");
};

/*
 * POST Handler for /execute/ route of Activity.
 */
exports.execute = function (req, res) {
  // example on how to decode JWT
  JWT(req.body, process.env.jwtSecret, (err, decoded) => {
    // verification error -> unauthorized request
    if (err) {
      console.error(err);
      return res.status(401).end();
    }

    if (decoded && decoded.inArguments && decoded.inArguments.length > 0) {
      // decoded in arguments
      var decodedArgs = decoded.inArguments[0];
      console.log("Args " + JSON.stringify(decodedArgs));

      logData(req);
      res.send(200, "Execute");
    } else {
      console.error("inArguments invalid.");
      return res.status(400).end();
    }
  });
};

/*
 * POST Handler for /publish/ route of Activity.
 */
exports.publish = function (req, res) {
  // Data from the req and put it in an array accessible to the main app.
  //console.log( req.body );
  logData(req);
  res.send(200, "Publish");
};

/*
 * POST Handler for /validate/ route of Activity.
 */
exports.validate = function (req, res) {
  logData(req);
  res.send(200, "Validate");
};

exports.subjectData = async (req, res) => {
  let account_id = await this.getMemberID(req.query.token, req.query.endpoint);

  let curr_user = await this.getUsername(
    req.query.token,
    req.query.endpoint,
    account_id
  );
  console.log("subject Data curr_user.userName >>>> " + curr_user.userName);

  let sparkpostAccId = await this.getSparkpostAccId(req, curr_user.userName);
  console.log("subject Data sparkpostAccId >>>> " + sparkpostAccId);

  let endpoint = 
      process.env.sparkpostUrl +
      "inbox/campaigns" +
      "?" + qs.stringify( { qd: 'daysBack:60' }) + 
      "&" + qs.stringify( { childAccountId: sparkpostAccId }) + 
      "&" + qs.stringify( { partnerAccountId: req.session.sfmcMemberId }) + 
      "&" + qs.stringify( { subject:req.query.subject} ) +
      "&" + qs.stringify( { Authorization: process.env.sparkpostAuthorization});
  console.log("endpoint >>>> " + endpoint);
  var configs = {
    method: "GET",
    url: endpoint,
    headers: {
      "Content-Type": "application/json",
    },
  };
  if (sparkpostAccId) {
    axios(configs)
      .then(function (response) {
        if (response.data) {
          let resp_data = {
            subject: response.data[0],
            acc_id: sparkpostAccId,
          };
          res.status(200).send(resp_data);
        } else {
          let emptyList;
          res.status(200).send(emptyList);
        }
      })
      .catch(function (error) {
        res
          .status(500)
          .send(
            "Something went wrong for retrieving subjects from sparkpost API!!!" +
              error
          );
        console.log("Retrieving all rows " + error);
      });
  } else {
    let resp_data = {
      subject: "",
      acc_id: sparkpostAccId,
    };
    console.log("Username is not available on Sparkpost API...");
    res.status(300).send(resp_data);
  }
};

exports.sourceData = async (req, res) => {
  let endpoint = 
      process.env.sparkpostUrl +
      "inbox/campaigns" + 
      "?" + qs.stringify({ qd: 'daysBack:30' } ) + 
      "&" + qs.stringify({ childAccountId: req.query.acc_id }) + 
      "&" + qs.stringify({ partnerAccountId: req.session.sfmcMemberId }) + 
      "&" + qs.stringify({ headerKey:'x-job' }) +
      "&" + qs.stringify({ headerValue: req.query.header_val }) + 
      "&" + qs.stringify({ Authorization: process.env.sparkpostAuthorization });
  console.log("endpoint >>>> " + endpoint);
  var configs = {
    method: "GET",
    url: endpoint,
    headers: {
      "Content-Type": "application/json",
    },
  };

  axios(configs)
    .then(function (response) {
      //console.log('api source data '+response.data);
      if (response.data) {
        res.status(200).send(response.data);
      } else {
        let emptyList;
        res.status(200).send(emptyList);
      }
    })
    .catch(function (error) {
      res.status(500).send("api source data!!!" + error);
      console.log("api source data " + error);
    });
};

exports.getMemberID = (accessToken, tssd) =>
  new Promise((resolve, reject) => {
    let endpoint = `${tssd}platform/v1/tokenContext`;
    console.log("endpoint >>>> " + endpoint);
    var configs = {
      method: "GET",
      url: endpoint,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    };

    axios(configs)
      .then(function (response) {
        if (response.data) {
          resolve(response.data);
        }
      })
      .catch(function (error) {
        console.log("tokenContext " + error);
        return reject(error);
      });
  });

exports.getUsername = (accessToken, tssd, userObj) =>
  new Promise((resolve, reject) => {
    let endpoint = `${tssd}platform/v1/accounts/${userObj.organization.id}/users`;
    console.log("get UserName endpoint >>>> " + endpoint);
    var configs = {
      method: "GET",
      url: endpoint,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    };

    axios(configs)
      .then(function (response) {
        if (response.data) {
          for (let x in response.data.items) {
            if (userObj.user.id == response.data.items[x].id) {
              resolve(response.data.items[x]);
            }
          }
          resolve(response.data);
        }
      })
      .catch(function (error) {
        console.log("get UserName " + error);
        return reject(error);
      });
  });

exports.getSparkpostAccId = (req, username) =>
  new Promise((resolve, reject) => {
    let endpoint = 
      process.env.sparkpostUrl + 
      "provision/users" + 
      "?" + qs.stringify({ customerUserId: username }) + 
      "&" + qs.stringify({ customerAccountId: 'salesforceIntegration' }) + 
      "&" + qs.stringify({ partnerAccountId: req.session.sfmcMemberId }) + 
      "&" + qs.stringify({ Authorization: process.env.sparkpostAuthorization });

    console.log("endpoint >>>> " + endpoint);
    var configs = {
      method: "GET",
      url: endpoint,
      headers: {
        "Content-Type": "application/json",
      },
    };

    axios(configs)
      .then(function (response) {
        if (response.data.length > 0) {
          resolve(response.data[0].accountId);
        } else {
          resolve("");
        }
      })
      .catch(function (error) {
        console.log("get SparkpostAccId " + error);
        return reject(error);
      });
  });

exports.domainRows = async (req, res) => {
  let account_id = await this.getMemberID(req.query.token, req.query.endpoint);
  var configs = {
    method: "get",
    url: `${req.query.endpoint}data/v1/customobjectdata/key/${process.env.SPARKPOST_DOMAIN_KEY}-${account_id.organization.id}/rowset`,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${req.query.token}`,
    },
  };
  axios(configs)
    .then(function (response) {
      if (response.data) {
        res.status(200).send(response.data.items);
      } else {
        let emptyList;
        res.status(200).send(emptyList);
      }
    })
    .catch(function (error) {
      res
        .status(500)
        .send(
          "Something went wrong for retrieving rows from domain config!!!" +
            error
        );
      console.log("Retrieving all rows " + error);
    });
};
