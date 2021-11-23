"use strict";
import axios, { AxiosRequestConfig } from "axios";
import express = require("express");
import jwt = require("jwt-simple");
import SfmcApiHelper from "./SfmcApiHelper";
import path = require("path");
import Utils from "./Utils";
import qs = require("qs");

// <!-- Integrate an externally hosted app via iframe. -->
export default class SfmcAppRoutes {
  // Instance variables
  private _apiHelper = new SfmcApiHelper();

  /**
   * GET handler for: /appdemooauthtoken
   * getOAuthAccessToken: called by demo app to get an OAuth access token
   *
   * More info: https://developer.salesforce.com/docs/atlas.en-us.noversion.mc-getting-started.meta/mc-getting-started/get-access-token.htm
   *
   */
  public getOAuthAccessToken(req: express.Request, res: express.Response) {
    let self = this;
    let sessionId = req.session.id;
    let clientId = process.env.DF18DEMO_CLIENTID;
    let clientSecret = process.env.DF18DEMO_CLIENTSECRET;
    let session = req.session;

    req.session.oauthAccessToken = "";
    req.session.oauthAccessTokenExpiry = "";

    if (clientId && clientSecret) {
      // set the desired timeout in options

      self._apiHelper
        .getOAuthAccessToken(clientId, clientSecret, req, res)
        .then((result) => {
          // req.session.oauthAccessToken = result.oauthAccessToken;
          //req.session.oauthAccessTokenExpiry = result.oauthAccessTokenExpiry;
          res.status(result.status).send(result.statusText);
          req.setTimeout(0, () => {});
        })
        .catch((err) => {
          res.status(500).send(err);
        });
    } else {
      // error
      let errorMsg =
        "ClientID or ClientSecret *not* found in environment variables.";
      res.status(500).send(errorMsg);
    }
  }

  //to get authorization code for web app
  public getAuthorizationCode(req: express.Request, res: express.Response) {
    let self = this;
    let sessionId = req.session.id;
    let clientId = process.env.DF18DEMO_CLIENTID;
    let clientSecret = process.env.DF18DEMO_CLIENTSECRET;
    let redirectURL = process.env.REDIRECT_URL;

    if (clientId && redirectURL) {
      self._apiHelper
        .getAuthorizationCode(clientId, clientSecret, redirectURL)
        .then((result) => {
          res.send(result.statusText);
          req.setTimeout(0, () => {});
        })
        .catch((err) => {
          res.status(500).send(err);
        });
    } else {
      let errorMsg =
        "ClientID or ClientSecret *not* found in environment variables.";
      Utils.logError(errorMsg);
      res.status(500).send(errorMsg);
    }
  }

  //Used to call the helper class for fetching user information
  public appUserInfo(req: express.Request, res: express.Response) {
    let self = this;
    self._apiHelper.appUserInfo(req, res);
  }
}
