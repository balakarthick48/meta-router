"use strict";
import axios, { AxiosRequestConfig } from "axios";
import express = require("express");
import jwt = require("jwt-simple");
import SfmcApiHelper from "./SfmcApiHelper";
import path = require("path");
import Utils from "./Utils";
import qs = require("qs");

let activity = require(path.join(__dirname, "..", "routes", "activity.js"));
let sparkpostAuthorization = process.env.sparkpostAuthorization;
require("dotenv").config({
  path: path.resolve(
    __dirname,
    "..",
    "env_src",
    `${process.env.customer_ID}.env`
  ),
});
// <!-- Integrate an externally hosted app via iframe. -->
export default class SfmcAppDemoRoutes {
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

  //Used to verify the user id fetched from the marketing cloud
  public sparkpostverify(req: express.Request, res: express.Response) {
    req.session.UserId = req.body.UserId;
    let headers = {
      "Content-Type": "application/json",
    };

    let params = {
      customerUserId: req.body.UserId,
      customerAccountId: "salesforceintegration",
    };

    axios
      .get(
        process.env.sparkpostUrl +
          "provision/users?Authorization=" +
          sparkpostAuthorization,
        { params: params }
      )
      .then((result: any) => {
        // success
        req.session.accountID = result.data[0].accountId;
        activity.childAccountId = result.data[0].accountId;
        res.status(200).send(result.data);
      })
      .catch(function (err: any) {
        res.status(err.response.status).send(err.response.data);
      });
  }

  //Used to fetch all available domains from the sparkpost
  public getavailabledomains(req: express.Request, res: express.Response) {
    let sfmcAuthServiceApiUrl =
      process.env.sparkpostUrl +
      "inbox/domains/available?Authorization=" +
      sparkpostAuthorization;
    axios({
      method: "get",
      url: sfmcAuthServiceApiUrl,
      params: {
        childAccountId: req.query.accountId,
        partnerAccountId: req.session.sfmcMemberId,
      },
    })
      .then(function (result: { data: string }) {
        req.session.Domains = result.data;
        req.session.accountId = req.query.accountId;
        res.status(200).send(result.data);
      })
      .catch(function (err: any) {
        res.status(err.response.status).send(err.response.data);
      });
  }

  //used to get the status of campaign that we need to fetch
  public getstatus(req: express.Request, res: express.Response) {
    let accountID = req.body.accountID;
    // var configs;

    if (req.body.subject == undefined) {
      const config: AxiosRequestConfig = {
        method: "GET",
        url:
          process.env.sparkpostUrl +
          "inbox/campaigns" +
          "?" +
          qs.stringify({ qd: "daysBack:60" }) +
          "&" +
          qs.stringify({ childAccountId: req.body.accountID }) +
          "&" +
          qs.stringify({ partnerAccountId: req.session.sfmcMemberId }) +
          "&" +
          qs.stringify({ Authorization: sparkpostAuthorization }),
        headers: {
          "Content-Type": "application/json",
        },
      };
      console.log("endpoint >>>> " + config.url);
      axios(config)
        .then(function (response: { data: string }) {
          req.session.campaigns = response.data;
          res.status(200).send(response.data);
        })
        .catch(function (error: any) {
          console.log("Error:" + JSON.stringify(error));
          res.status(error.response.status).send(error.response.data);
        });
    } else if(req.body.subject.includes("%%")){

      // let assetResponse: any = await this.getAssetbyEmailId(req, res);
      // console.log('getStatus assetResponse' + JSON.stringify(assetResponse));
      let emailId = req.body.emailId;
      let subject = req.body.subject.replace('%%=v(', '').replace(')=%%','').replace('%%','')+' =';
      console.log('emailId '+emailId);
      console.log('subject '+subject);

      this._apiHelper.getRefreshTokenHelper(req.body.refreshToken, req.body.tssd, false, res)
        .then((response) => {

          Utils.logInfo(
            "refreshTokenbody:" + JSON.stringify(response.refreshToken)
          );
          Utils.logInfo("AuthTokenbody:" + JSON.stringify(response.oauthToken));
          
          const refreshTokenbody = response.refreshToken;

          let data = JSON.stringify({
            "query": {
              "property": "data.email.legacy.legacyId",
              "simpleOperator": "equals",
              "value": emailId
            },
            "fields": [
              "id",
              "name",
              "data",
              "legacyData",
              "meta",
              "views"
            ]
          });

          let endpoint = `https://${req.body.tssd}.rest.marketingcloudapis.com/asset/v1/content/assets/query`;
          let configs: AxiosRequestConfig = {
            method: 'POST',
            url: endpoint,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + response.oauthToken
            },
            data: data
          };
          console.log('config is '+JSON.stringify(configs));

          console.log("else endpoint >>>> " + configs.url);

          axios(configs)
            .then(function (response: { data: any }) {

              let parseString = JSON.stringify(response.data.items[0].views);
              //console.log('parseString is '+parseString);
              let startIndex = parseString.indexOf(subject);
              console.log('startIndex is '+startIndex);
              let subArray = [];
              while (startIndex > 0) {
                let initIndex = parseString.indexOf(subject, startIndex);
                console.log('initIndex '+initIndex);
                if(initIndex > 0){
                  let startPos = parseString.substring(initIndex + subject.length + 1, parseString.length - 1);
                  //console.log('startPos '+startPos);
                  let endPos = startPos.split('\"').slice(1, 2).join().replace('\\','');
                  console.log('endPos '+endPos);
                  subArray.push(endPos);
                  startIndex = initIndex + 1;
                  console.log('startIndex is '+startIndex);
                } else {
                  startIndex = initIndex;
                }
              }
              console.log('subArray is '+subArray);
              let mulSubject = '';
              subArray.forEach((elem, index) => {
                console.log(elem);
                console.log(index);
                if(index == subArray.length - 1){
                  mulSubject += subArray.length == 1 ? elem : '('+elem+')';
                } else {
                  mulSubject += '('+elem+') OR ';
                }
              });
              console.log('mulSubject is '+mulSubject);

              const config: AxiosRequestConfig = {
                method: "GET",
                url:
                  process.env.sparkpostUrl +
                  "inbox/campaigns" +
                  "?" + qs.stringify( {qd : 'daysBack:60'}) + 
                  "&" + qs.stringify( { childAccountId: req.body.accountID}) +
                  "&" + qs.stringify( { partnerAccountId: req.session.sfmcMemberId}) +
                  "&" + qs.stringify( { subject: mulSubject} ) +
                  "&" + qs.stringify( { Authorization: sparkpostAuthorization} ) +
                  "&" + qs.stringify({ domain: req.body.senderProfileDomain }),
                headers: {
                  "Content-Type": "application/json",
                },
              };

              console.log("else endpoint >>>> " + config.url);
              
              axios(config)
              .then(function (response: { data: any }) {
                req.session.campaigns = response.data;
                var optimisedResponse;
                //Utils.logInfo("Config data " + JSON.stringify(response))
                Utils.logInfo("Get Status Response else if ::: " + JSON.stringify(response.data))
                if (req.body.senderProfileDomain != '' && req.body.senderProfileDomain != undefined) {
                  for (var i = 0; i < response.data.length; i++) {
                    if (response.data[i].campaignIdentifier != null) {
                      optimisedResponse = response.data[i];
                      console.log("Optimised Response else if ::: " + JSON.stringify(optimisedResponse));
                      break;
                    }
                  }
                  let sendresponse = {
                    refreshToken: refreshTokenbody,
                    subjectData: optimisedResponse
                  };
                  res.status(200).send(sendresponse);
                } else {
                  let sendresponse = {
                    refreshToken: refreshTokenbody,
                    subjectData: optimisedResponse
                  };
                  res.status(200).send(sendresponse);
                }
              })
              .catch(function (error: any) {
                console.log("Error:" + JSON.stringify(error));
                res.status(error.response.status)
                  .send(error.response.data);
              });
            })
            .catch(function (error: any) {
              console.log("Error:" + JSON.stringify(error));
              res.status(error.response.status)
                 .send(error.response.data);
            });
        })
        .catch((error: any) => {
          res.status(error.response.status)
             .send(error.response.data);
        });
    } else {
      const config: AxiosRequestConfig = {
        method: "GET",
        url:
          process.env.sparkpostUrl +
          "inbox/campaigns" +
          "?" + qs.stringify({ qd: 'daysBack:60' }) +
          "&" + qs.stringify({ childAccountId: req.body.accountID }) +
          "&" + qs.stringify({ partnerAccountId: req.session.sfmcMemberId }) +
          "&" + qs.stringify({ subject: req.body.subject }) +
          "&" + qs.stringify({ Authorization: sparkpostAuthorization }) +
          "&" + qs.stringify({ domain: req.body.senderProfileDomain }),
        headers: {
          "Content-Type": "application/json",
        },
      };
      console.log("endpoint >>>> " + config.url);
      axios(config)
        .then(function (response: { data: any }) {
          req.session.campaigns = response.data;
          var optimisedResponse;
          //Utils.logInfo("Config data " + JSON.stringify(response))
          Utils.logInfo("Get Status Response ::: " + JSON.stringify(response.data))
          if (req.body.senderProfileDomain != '' && req.body.senderProfileDomain != undefined) {
            for (var i = 0; i < response.data.length; i++) {
              if (response.data[i].campaignIdentifier != null) {
                optimisedResponse = response.data[i];
                console.log("Optimised Response ::: " + JSON.stringify(optimisedResponse));
                break;
              }
            }
            let sendresponse = {
              refreshToken: '',
              subjectData: optimisedResponse
            };
            res.status(200).send(sendresponse);
          } else {
            let sendresponse = {
              refreshToken: '',
              subjectData: optimisedResponse
            };
            res.status(200).send(sendresponse);
          }
        })
        .catch(function (error: any) {
          console.log("Error:" + JSON.stringify(error));
          res.status(error.response.status)
            .send(error.response.data);
        });
    }

    //&headerKey=x-job&headerValue=514011827_53709
  }

  //used to get the status of campaign that we need to fetch
  // public getdomaindeliverability(req: express.Request, res: express.Response) {
  //   let sfmcAuthServiceApiUrl =
  //     "https://api.edatasource.com/v4/inbox/deliverability/" +
  //     req.query.domain +
  //     "?qd=daysBack%3A30&Authorization=b9481863c2764a46ae81e054a8fc4f65";
  //   axios({
  //     method: "get",
  //     url: sfmcAuthServiceApiUrl,
  //   })
  //     .then(function (result: { data: string }) {
  //       res.status(200).send(result.data);
  //     })
  //     .catch(function (err: any) {
  //       Utils.logInfo("error, Getting Domain Deliverability..." + err);
  //       res.status(500).send(err);
  //     });
  // }

  //Fetching the intelliseed lists to display it in the modal
  public fetchintelliseedlist(req: express.Request, res: express.Response) {
    let sfmcAuthServiceApiUrl =
      process.env.sparkpostUrl +
      "inbox/intelliseed/filter_sets?Authorization=" +
      sparkpostAuthorization;
    axios({
      method: "get",
      url: sfmcAuthServiceApiUrl,
      params: {
        childAccountId: req.body.accountId,
        partnerAccountId: req.session.sfmcMemberId,
      },
    })
      .then(function (result: { data: string }) {
        req.session.Intelliseed = result.data;
        res.status(200).send(result.data);
      })
      .catch(function (err: any) {
        Utils.logInfo("error, Getting intelliseed lists..." + err);
        res.status(500).send(err);
      });
  }

  //getting the data need to be stored in the individual Intelliseed's data extension
  public filteriddatasparkpost(req: express.Request, res: express.Response) {
    let sfmcAuthServiceApiUrl =
      process.env.sparkpostUrl +
      "inbox/intelliseed/" +
      req.body.filterId +
      "?Authorization=" +
      sparkpostAuthorization;
    axios({
      method: "get",
      url: sfmcAuthServiceApiUrl,
      params: {
        childAccountId: req.body.accountId,
        partnerAccountId: req.session.sfmcMemberId,
      },
    })
      .then(function (result: { data: string }) {
        // Utils.logInfo("Success, Got all intelliseed lists..." + result.data);
        res.status(200).send(result.data);
      })
      .catch(function (err: any) {
        //Utils.logInfo("error, Getting intelliseed lists..." + err);
        res.status(500).send(err);
      });
  }

  //Used to call the helper class for fetching user information
  public appUserInfo(req: express.Request, res: express.Response) {
    let self = this;
    self._apiHelper.appUserInfo(req, res);
  }

  //Used to call the helper class for checking the Sparkpost Integration data folder check
  public dataFolderCheck(req: express.Request, res: express.Response) {
    let self = this;
    self._apiHelper.dataFolderCheck(req, res);
  }

  //Used to call the helper class for fetching the folder ID of Sparkpost Integration
  public retrievingDataExtensionFolderID(
    req: express.Request,
    res: express.Response
  ) {
    let self = this;
    self._apiHelper.retrievingDataExtensionFolderID(req, res);
  }
  //Used to call the helper class for fetching row of domain configuration based on the domain we selected
  public retrievingDataExtensionRows(
    req: express.Request,
    res: express.Response
  ) {
    let self = this;
    self._apiHelper.retrievingDataExtensionRows(req, res);
  }

  //Used to call the helper class for fetching send stats row to display the deliveribility in the campaign performance dashboard
  public sendStatsRow(req: express.Request, res: express.Response) {
    let self = this;
    self._apiHelper.sendStatsRow(req, res);
  }

  //bounceStatsRow
  public bounceStatsRow(req: express.Request, res: express.Response) {
    let self = this;
    self._apiHelper.bounceStatsRow(req, res);
  }

  //Used to call the helper class for fetching the active journeys
  public getActiveJourneys(req: express.Request, res: express.Response) {
    let self = this;
    self._apiHelper.getActiveJourneys(req, res);
  }
  //Used to call the helper class for fetching journies by ID
  public getJourneysById(req: express.Request, res: express.Response) {
    let self = this;
    self._apiHelper.getJourneysById(req, res);
  }

  //Used to call the helper class for creating the Sparkpost Integration data folder
  public createSparkpostIntegrationFolder(
    req: express.Request,
    res: express.Response
  ) {
    let self = this;
    self._apiHelper.createSparkpostIntegrationFolder(req, res);
  }

  //Used to call the helper class for checking the Domain configuration data extension check
  public domainConfigurationDECheck(
    req: express.Request,
    res: express.Response
  ) {
    let self = this;
    self._apiHelper.domainConfigurationDECheck(req, res);
  }

  //Used to call the helper class for checking the salesforce job stats data extension check
  public checkSalesforceJobStats(req: express.Request, res: express.Response) {
    let self = this;
    self._apiHelper.checkSalesforceJobStats(req, res);
  }

  //Used to call the helper class for checking the salesforce Bounce Stats Data extension check
  public checkSalesforceBounceStats(
    req: express.Request,
    res: express.Response
  ) {
    let self = this;
    self._apiHelper.checkSalesforceBounceStats(req, res);
  }

  //Used to call the helper class for inserting the row in Domain configuration data extension
  public insertRowForDC(req: express.Request, res: express.Response) {
    let self = this;
    self._apiHelper.insertRowForDC(req, res);
  }

  //Used to call the helper class for checking the Intelliseeds Lists data extension
  public intelliseedListsDECheck(req: express.Request, res: express.Response) {
    let self = this;
    self._apiHelper.intelliseedListsDECheck(req, res);
  }

  //Used to call the helper class for inserting the row in Intellliseeed Lists data extension
  public insertRowForISL(req: express.Request, res: express.Response) {
    let self = this;
    self._apiHelper.insertRowForISL(req, res);
  }

  //Used to call the helper class for fetching the row count of Domain configuration data extension
  public rowCount(req: express.Request, res: express.Response) {
    let self = this;
    self._apiHelper.rowCount(req, res);
  }

  //Used to call the helper class for creating the data extension for individual data extension
  public filterIdData(req: express.Request, res: express.Response) {
    let self = this;
    self._apiHelper.filterIdData(req, res);
  }

  //Used to call the helper class for inserting the row for individual Intelliseed's data extension
  public FilterSetDataExtensionUpdation(
    req: express.Request,
    res: express.Response
  ) {
    let self = this;
    self._apiHelper.FilterSetDataExtensionUpdation(req, res);
  }

  //Used to get the sender's domain by using senderProfileId from getJourneysByID call
  public getSenderDomain(req: express.Request, res: express.Response) {
    let self = this;
    self._apiHelper.getSenderDomain(req, res);
  }
}
