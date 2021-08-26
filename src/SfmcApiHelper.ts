"use strict";

import path = require("path");
import axios, { AxiosRequestConfig } from "axios";
import express = require("express");
import Utils from "./Utils";
import xml2js = require("xml2js");
let activity = require(path.join(__dirname, "..", "routes", "activity.js"));

require("dotenv").config();
export default class SfmcApiHelper {
  // Instance variables
  private _oauthToken = "";
  private _accessToken = "";
  private member_id = "";
  private soap_instance_url = "";
  private rest_instance_url = "";
  private FolderID = "";
  private ParentFolderID = "";
  private DEexternalKeyDomainConfiguration = "";
  private DEexternalKeyIntelliseedLists = "";
  private userName = "";
  private tssd = "";
  private isAccessToken = false;

  public getAuthorizationCode(
    clientId: string,
    clientSecret: string,
    redirectURL: string
  ): Promise<any> {
    let self = this;
    return self.getAuthorizationCodeHelper(clientId, redirectURL);
  }

  /**
   * getAuthorizationCodeHelper: Helper method to get auth code
   *
   */
  public getAuthorizationCodeHelper(
    clientId: any,
    redirectURL: any
  ): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      let sfmcAuthServiceApiUrl =
        "https://" +
        process.env.BASE_URL +
        ".auth.marketingcloudapis.com/v2/authorize?response_type=code&client_id=" +
        clientId +
        "&redirect_uri=" +
        redirectURL +
        "&state=mystate";
      //https://YOUR_SUBDOMAIN.auth.marketingcloudapis.com/v2/authorize?response_type=code&client_id=vqwyswrlzzfk024ivr682esb&redirect_uri=https%3A%2F%2F127.0.0.1%3A80%2F
      axios
        .get(sfmcAuthServiceApiUrl)
        .then((response: any) => {
          resolve({
            statusText: response.data,
          });
        })
        .catch((error: any) => {
          // error
          let errorMsg = "Error getting Authorization Code.";
          errorMsg += "\nMessage: " + error.message;
          errorMsg +=
            "\nStatus: " + error.response ? error.response.status : "<None>";
          errorMsg +=
            "\nResponse data: " + error.response
              ? Utils.prettyPrintJson(JSON.stringify(error.response.data))
              : "<None>";
          Utils.logError(errorMsg);

          reject(errorMsg);
        });
    });
  }

  /*
   * CheckAutomationStudio: To build the Automation Studio App after creation of SFMC Bounce Stats - MID Data extension
   */
  public CheckAutomationStudio(
    accessToken: string,
    jobStatId: string,
    bounceDEId: string,
    endpoint: string,
    member_id: string
  ) {
    let self = this;

    console.log("CheckAutomationStudio accessToken " + accessToken);
    console.log("CheckAutomationStudio endpoint" + endpoint);
    console.log("CheckAutomationStudio jobStatId" + jobStatId);
    console.log("CheckAutomationStudio bounceDEId" + bounceDEId);
    console.log("CheckAutomationStudio member_id" + member_id);

    let existAutomatedData =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">' +
      "    <s:Header>" +
      '        <a:Action s:mustUnderstand="1">Create</a:Action>' +
      `        <a:To s:mustUnderstand="1">${endpoint.replace(
        ".rest.",
        ".soap."
      )}Service.asmx</a:To>` +
      `        <fueloauth xmlns="http://exacttarget.com">${accessToken}</fueloauth>` +
      "   </s:Header>" +
      '  <s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
      '<RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">' +
      "        <RetrieveRequest>" +
      "            <ObjectType>Automation</ObjectType>" +
      "           <Properties>Name</Properties>" +
      "          <Properties>Description</Properties>" +
      "          <Properties>CustomerKey</Properties>" +
      "          <Properties>IsActive</Properties>" +
      "          <Properties>ScheduledTime</Properties>" +
      "          <Properties>Status</Properties>" +
      '          <Filter xsi:type="SimpleFilterPart">' +
      "              <Property>Name</Property>" +
      "              <SimpleOperator>equals</SimpleOperator>" +
      "              <Value>SFMC Email Sending Stats</Value>" +
      "          </Filter>" +
      "      </RetrieveRequest>" +
      "  </RetrieveRequestMsg>" +
      "  </s:Body>" +
      "</s:Envelope>";

    console.log("existAutomatedData " + existAutomatedData);

    let existConfig: AxiosRequestConfig = {
      method: "post",
      url: `${endpoint.replace(".rest.", ".soap.")}Service.asmx`,
      headers: {
        "Content-Type": "text/xml",
      },
      data: existAutomatedData,
    };

    return new Promise<any>((resolve, reject) => {
      axios(existConfig)
        .then((response: any) => {
          let parser = new xml2js.Parser();
          let rawdata = response.data;

          parser.parseString(
            rawdata,
            async function (err: string, result: any) {
              if (
                JSON.stringify(
                  result["soap:Envelope"]["soap:Body"][0][
                    "RetrieveResponseMsg"
                  ][0]["Results"][0]
                ).includes("No rows were found")
              ) {
                self
                  .creatingAutomationStudio(
                    accessToken,
                    jobStatId,
                    bounceDEId,
                    endpoint,
                    member_id
                  )
                  .then((response: any) => {
                    console.log(
                      "creatingAutomation Studio response --> " +
                        JSON.stringify(response)
                    );
                  })
                  .catch((error: any) => {
                    console.log(
                      "creatingAutomation Studio error --> " +
                        JSON.stringify(error)
                    );
                  });
              } else {
                console.log(
                  "Existing automation Name: " +
                    JSON.stringify(
                      result["soap:Envelope"]["soap:Body"][0][
                        "RetrieveResponseMsg"
                      ][0]["Results"][0]["Name"]
                    )
                );
                resolve({
                  statusText: JSON.stringify(
                    result["soap:Envelope"]["soap:Body"][0][
                      "RetrieveResponseMsg"
                    ][0]["Results"][0]["Name"]
                  ),
                });
              }
            }
          );
        })
        .catch((error: any) => {
          // error
          console.log("inside the existing automation catch ");
          let errorMsg = `Error retrieving Automation Studio app`;
          errorMsg += "\nMessage: " + error.message;
          errorMsg +=
            "\nStatus: " + error.response ? error.response.status : "<None>";
          errorMsg +=
            "\nResponse data: " + error.response
              ? Utils.prettyPrintJson(JSON.stringify(error.response.data))
              : "<None>";
          Utils.logError(errorMsg);
          reject({
            statusText: errorMsg,
          });
        });
    });
  }

  async creatingAutomationStudio(
    accessToken: string,
    jobStatId: string,
    bounceDEId: string,
    endpoint: string,
    member_id: string
  ) {
    let queryFolderResponse: any = await this.getQueryFolderId(
      accessToken,
      endpoint
    );
    console.log(
      "CreateAutomationStudio queryFolderResponse" +
        JSON.stringify(queryFolderResponse)
    );

    let emailStats = {
      name: "SFMC Email Stats",
      key: "SFMC_Email_Stats",
      description: "",
      queryText:
        "select\ns.AccountID as EID,\ns.jobid as [Job ID],\ncount(s.SubscriberKey) as Sends\nfrom _sent s\ngroup by s.jobid, s.AccountID",
      targetName: "Salesforce Job Stats - " + member_id,
      targetKey: "Salesforce Job Stats - " + member_id,
      targetId: jobStatId,
      targetDescription: "",
      targetUpdateTypeId: 0,
      targetUpdateTypeName: "Overwrite",
      categoryId: queryFolderResponse.categoryId,
      isFrozen: false,
    };

    let emailResponse: any = await this.CreateQueryActivity(
      accessToken,
      endpoint,
      emailStats
    );
    console.log(
      "CreateAutomationStudio emailResponse" + JSON.stringify(emailResponse)
    );

    let openStats = {
      name: "SFMC Open Stats",
      key: "SFMC_Open_Stats",
      description: "",
      queryText:
        "select\no.jobid as [job id],\ncount(o.SubscriberKey) as opens\nfrom _open o\ngroup by o.jobid",
      targetName: "SaqueryFolderResponselesforce Job Stats - " + member_id,
      targetKey: "Salesforce Job Stats - " + member_id,
      targetId: jobStatId,
      targetDescription: "",
      targetUpdateTypeId: 1,
      targetUpdateTypeName: "Update",
      categoryId: queryFolderResponse.categoryId,
      isFrozen: false,
    };

    let openResponse: any = await this.CreateQueryActivity(
      accessToken,
      endpoint,
      openStats
    );

    let clicksStats = {
      name: "SFMC Clicks Stats",
      key: "SFMC_Clicks_Stats",
      description: "",
      queryText:
        "select\no.jobid as [job id],\ncount(o.SubscriberKey) as Clicks\nfrom _click o\ngroup by o.jobid",
      targetName: "Salesforce Job Stats - " + member_id,
      targetKey: "Salesforce Job Stats - " + member_id,
      targetId: jobStatId,
      targetDescription: "",
      targetUpdateTypeId: 1,
      targetUpdateTypeName: "Update",
      categoryId: queryFolderResponse.categoryId,
      isFrozen: false,
    };

    let clicksResponse: any = await this.CreateQueryActivity(
      accessToken,
      endpoint,
      clicksStats
    );

    let unsubStats = {
      name: "SFMC Unsub Stats",
      key: "SFMC_Unsub_Stats",
      description: "",
      queryText:
        "select\nu.jobid as [job id],\ncount(u.SubscriberKey) as unsub\nfrom _unsubscribe u\ngroup by u.jobid",
      targetName: "Salesforce Job Stats - " + member_id,
      targetKey: "Salesforce Job Stats - " + member_id,
      targetId: jobStatId,
      targetDescription: "",
      targetUpdateTypeId: 1,
      targetUpdateTypeName: "Update",
      categoryId: queryFolderResponse.categoryId,
      isFrozen: false,
    };

    let unsubResponse: any = await this.CreateQueryActivity(
      accessToken,
      endpoint,
      unsubStats
    );

    let bounceStats = {
      name: "SFMC Bounce Stats",
      key: "SFMC_Bounce_Stats",
      description: "",
      queryText:
        "select\nb.jobid as [job id],\ncount(b.SubscriberKey) as Bounce\nfrom _bounce b\ngroup by b.jobid",
      targetName: "Salesforce Job Stats - " + member_id,
      targetKey: "Salesforce Job Stats - " + member_id,
      targetId: jobStatId,
      targetDescription: "",
      targetUpdateTypeId: 1,
      targetUpdateTypeName: "Update",
      categoryId: queryFolderResponse.categoryId,
      isFrozen: false,
    };

    let bounceResponse: any = await this.CreateQueryActivity(
      accessToken,
      endpoint,
      bounceStats
    );

    let bounceDetails = {
      name: "SFMC Bounce Details",
      key: "SFMC_Bounce_Details",
      description: "",
      queryText:
        "select\ns.AccountID as [Account ID],\ns.jobid as [Job ID],\ncount(s.subscriberkey) as [Total Bounce],\ns.BounceCategory as [Bounce Category]\nfrom _bounce s\ngroup by s.AccountID,s.jobid,s.BounceCategory",
      targetName: "Salesforce Bounce Stats - " + member_id,
      targetKey: "Salesforce Bounce Stats - " + member_id,
      targetId: bounceDEId,
      targetDescription: "",
      targetUpdateTypeId: 0,
      targetUpdateTypeName: "Overwrite",
      categoryId: queryFolderResponse.categoryId,
      isFrozen: false,
    };

    let bounceDetailsResponse: any = await this.CreateQueryActivity(
      accessToken,
      endpoint,
      bounceDetails
    );

    //queryDefinitionId//name//key
    let automationData =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">' +
      "    <s:Header>" +
      '        <a:Action s:mustUnderstand="1">Create</a:Action>' +
      `        <a:To s:mustUnderstand="1">${endpoint.replace(
        ".rest.",
        ".soap."
      )}Service.asmx</a:To>` +
      `        <fueloauth xmlns="http://exacttarget.com">${accessToken}</fueloauth>` +
      "   </s:Header>" +
      '  <s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
      '      <CreateRequest xmlns="http://exacttarget.com/wsdl/partnerAPI">' +
      '          <Objects xsi:type="Automation">' +
      "              <Name>SFMC Email Sending Stats</Name>" +
      "              <CustomerKey>SFMC_Email_Sending_Stats</CustomerKey>" +
      "              <AutomationTasks>" +
      "                <AutomationTask>" +
      "                    <Name>" +
      emailResponse.name +
      "</Name>" +
      "                    <Activities>" +
      "                       <Activity>" +
      "                          <ObjectID>" +
      emailResponse.queryDefinitionId +
      "</ObjectID>" +
      '                          <ActivityObject xsi:type="QueryDefinition">' +
      "                              <ObjectID>" +
      emailResponse.queryDefinitionId +
      "</ObjectID>" +
      "                              <CustomerKey>" +
      emailResponse.key +
      "</CustomerKey>" +
      "                              <Name>" +
      emailResponse.name +
      "</Name>" +
      "                          </ActivityObject>" +
      "                      </Activity>" +
      "                  </Activities>" +
      "                </AutomationTask>" +
      "                <AutomationTask>" +
      "                    <Name>" +
      openResponse.name +
      "</Name>" +
      "                    <Activities>" +
      "                       <Activity>" +
      "                          <ObjectID>" +
      openResponse.queryDefinitionId +
      "</ObjectID>" +
      '                          <ActivityObject xsi:type="QueryDefinition">' +
      "                              <ObjectID>" +
      openResponse.queryDefinitionId +
      "</ObjectID>" +
      "                              <CustomerKey>" +
      openResponse.key +
      "</CustomerKey>" +
      "                              <Name>" +
      openResponse.name +
      "</Name>" +
      "                          </ActivityObject>" +
      "                      </Activity>" +
      "                  </Activities>" +
      "                </AutomationTask>" +
      "                <AutomationTask>" +
      "                    <Name>" +
      clicksResponse.name +
      "</Name>" +
      "                    <Activities>" +
      "                       <Activity>" +
      "                          <ObjectID>" +
      clicksResponse.queryDefinitionId +
      "</ObjectID>" +
      '                          <ActivityObject xsi:type="QueryDefinition">' +
      "                              <ObjectID>" +
      clicksResponse.queryDefinitionId +
      "</ObjectID>" +
      "                              <CustomerKey>" +
      clicksResponse.key +
      "</CustomerKey>" +
      "                              <Name>" +
      clicksResponse.name +
      "</Name>" +
      "                          </ActivityObject>" +
      "                      </Activity>" +
      "                  </Activities>" +
      "                </AutomationTask>" +
      "                <AutomationTask>" +
      "                    <Name>" +
      unsubResponse.name +
      "</Name>" +
      "                    <Activities>" +
      "                       <Activity>" +
      "                          <ObjectID>" +
      unsubResponse.queryDefinitionId +
      "</ObjectID>" +
      '                          <ActivityObject xsi:type="QueryDefinition">' +
      "                              <ObjectID>" +
      unsubResponse.queryDefinitionId +
      "</ObjectID>" +
      "                              <CustomerKey>" +
      unsubResponse.key +
      "</CustomerKey>" +
      "                              <Name>" +
      unsubResponse.name +
      "</Name>" +
      "                          </ActivityObject>" +
      "                      </Activity>" +
      "                  </Activities>" +
      "                </AutomationTask>" +
      "                <AutomationTask>" +
      "                    <Name>" +
      bounceResponse.name +
      "</Name>" +
      "                    <Activities>" +
      "                       <Activity>" +
      "                          <ObjectID>" +
      bounceResponse.queryDefinitionId +
      "</ObjectID>" +
      '                          <ActivityObject xsi:type="QueryDefinition">' +
      "                              <ObjectID>" +
      bounceResponse.queryDefinitionId +
      "</ObjectID>" +
      "                              <CustomerKey>" +
      bounceResponse.key +
      "</CustomerKey>" +
      "                              <Name>" +
      bounceResponse.name +
      "</Name>" +
      "                          </ActivityObject>" +
      "                      </Activity>" +
      "                  </Activities>" +
      "                </AutomationTask>" +
      "                <AutomationTask>" +
      "                    <Name>" +
      bounceDetailsResponse.name +
      "</Name>" +
      "                    <Activities>" +
      "                       <Activity>" +
      "                          <ObjectID>" +
      bounceDetailsResponse.queryDefinitionId +
      "</ObjectID>" +
      '                          <ActivityObject xsi:type="QueryDefinition">' +
      "                              <ObjectID>" +
      bounceDetailsResponse.queryDefinitionId +
      "</ObjectID>" +
      "                              <CustomerKey>" +
      bounceDetailsResponse.key +
      "</CustomerKey>" +
      "                              <Name>" +
      bounceDetailsResponse.name +
      "</Name>" +
      "                          </ActivityObject>" +
      "                      </Activity>" +
      "                  </Activities>" +
      "                </AutomationTask>" +
      "              </AutomationTasks>" +
      "              <AutomationType>scheduled</AutomationType>" +
      "          </Objects>" +
      "      </CreateRequest>" +
      "  </s:Body>" +
      "</s:Envelope>";

    let config: AxiosRequestConfig = {
      method: "post",
      url: `${endpoint.replace(".rest.", ".soap.")}Service.asmx`,
      headers: {
        "Content-Type": "text/xml",
      },
      data: automationData,
    };

    return new Promise<any>((resolve, reject) => {
      axios(config)
        .then((response: any) => {
          let parser = new xml2js.Parser();
          let rawdata = response.data;
          //var parseData = new parser.Parser();
          parser.parseString(rawdata, function (err: string, result: any) {
            let status_Code =
              result["soap:Envelope"]["soap:Body"][0]["CreateResponse"][0][
                "Results"
              ][0]["StatusCode"];
            if (status_Code == "OK") {
              //res.status(200).send('Automation created successfully');
              console.log("Creating automation status_Code: " + status_Code);
              resolve({
                statusText: status_Code,
              });
            } else if (status_Code == "Error") {
              let status_Msg =
                result["soap:Envelope"]["soap:Body"][0]["CreateResponse"][0][
                  "Results"
                ][0]["StatusMessage"];
              console.log(
                "Creating automation status_Code: " +
                  status_Code +
                  " Status Msg :" +
                  status_Msg
              );
              reject({
                statusText: status_Code,
              });
              //res.status(400).send(status_Msg);
            }
          });
        })
        .catch((error: any) => {
          // error
          let errorMsg = `Error getting Automation Studio build`;
          errorMsg += "\nMessage: " + error.message;
          errorMsg +=
            "\nStatus: " + error.response ? error.response.status : "<None>";
          errorMsg +=
            "\nResponse data: " + error.response
              ? Utils.prettyPrintJson(JSON.stringify(error.response.data))
              : "<None>";
          Utils.logError(errorMsg);
          reject(errorMsg);
        });
    });
  }

  public CreateQueryActivity(
    accessToken: string,
    endpoint: string,
    queryPayload: any
  ) {
    return new Promise<any>((resolve, reject) => {
      let config: AxiosRequestConfig = {
        method: "post",
        url: `${endpoint}/automation/v1/queries`,
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + accessToken,
        },
        data: queryPayload,
      };

      axios(config)
        .then((response: any) => {
          console.log(
            `creating ${queryPayload.name} Query Activity` + response.data
          );
          resolve(response.data);
        })
        .catch((error: any) => {
          // error
          let errorMsg = `Error getting ${queryPayload.name} Query Activity`;
          errorMsg += "\nMessage: " + error.message;
          errorMsg +=
            "\nStatus: " + error.response ? error.response.status : "<None>";
          errorMsg +=
            "\nResponse data: " + error.response
              ? Utils.prettyPrintJson(JSON.stringify(error.response.data))
              : "<None>";
          Utils.logError(errorMsg);
          reject(errorMsg);
        });
    });
  }

  public getQueryFolderId(code: string, tssd: string) {
    const endpoint = `${tssd}/email/v1/categories?catType=queryactivity`;

    return new Promise<any>((resolve, reject) => {
      let config: AxiosRequestConfig = {
        method: "get",
        url: endpoint,
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + code,
        },
      };

      axios(config)
        .then((response: any) => {
          resolve(response.data.items[0]);
        })
        .catch((error: any) => {
          // error
          let errorMsg = "Error getting QueryFolder Id";
          errorMsg += "\nMessage: " + error.message;
          errorMsg +=
            "\nStatus: " + error.response ? error.response.status : "<None>";
          errorMsg +=
            "\nResponse data: " + error.response
              ? Utils.prettyPrintJson(JSON.stringify(error.response.data))
              : "<None>";
          Utils.logError(errorMsg);
          reject(errorMsg);
        });
    });
  }

  /**
   * getOAuthAccessToken: POSTs to SFMC Auth URL to get an OAuth access token with the given ClientId and ClientSecret
   *
   * More info: https://developer.salesforce.com/docs/atlas.en-us.noversion.mc-getting-started.meta/mc-getting-started/get-access-token.htm
   *
   */
  public getOAuthAccessToken(
    clientId: string,
    clientSecret: string,
    req: any,
    res: any
  ): Promise<any> {
    let self = this;
    var tssd = "";
    tssd = req.body.tssd ? req.body.tssd : process.env.BASE_URL;
    console.log("authorizetssd:" + tssd);
    let headers = {
      "Content-Type": "application/json",
    };

    let postBody = {
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code: req.body.authorization_code,
      redirect_uri: process.env.REDIRECT_URL,
    };

    return self.getOAuthTokenHelper(headers, postBody, res, tssd);
  }

  /**
   * getOAuthTokenHelper: Helper method to POST the given header & body to the SFMC Auth endpoint
   *
   */
  public getOAuthTokenHelper(
    headers: any,
    postBody: any,
    res: any,
    tssd: string
  ): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      console.log("author" + JSON.stringify(tssd));
      let sfmcAuthServiceApiUrl =
        "https://" + tssd + ".auth.marketingcloudapis.com/v2/token";
      this.isAccessToken = true;
      console.log("sfmcAuthServiceApiUrl:" + sfmcAuthServiceApiUrl);
      axios
        .post(sfmcAuthServiceApiUrl, postBody, { headers: headers })
        .then((response: any) => {
          let refreshToken = response.data.refresh_token;
          this.getRefreshTokenHelper(refreshToken, tssd, true, res);
        })
        .catch((error: any) => {
          // error
          let errorMsg = "Error getting OAuth Access Token.";
          errorMsg += "\nMessage: " + error.message;
          errorMsg +=
            "\nStatus: " + error.response ? error.response.status : "<None>";
          errorMsg +=
            "\nResponse data: " + error.response
              ? Utils.prettyPrintJson(JSON.stringify(error.response.data))
              : "<None>";
          Utils.logError(errorMsg);

          reject(errorMsg);
        });
    });
  }

  //Helper method to get refresh token
  public getRefreshTokenHelper(
    refreshToken: string,
    tssd: string,
    returnResponse: boolean,
    res: any
  ): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      console.log("tssdrefresh:" + tssd);
      console.log("returnResponse:" + returnResponse);

      let sfmcAuthServiceApiUrl =
        "https://" + tssd + ".auth.marketingcloudapis.com/v2/token";
      let headers = {
        "Content-Type": "application/json",
      };
      console.log("sfmcAuthServiceApiUrl:" + sfmcAuthServiceApiUrl);
      let postBody1 = {
        grant_type: "refresh_token",
        client_id: process.env.DF18DEMO_CLIENTID,
        client_secret: process.env.DF18DEMO_CLIENTSECRET,
        refresh_token: refreshToken,
      };
      axios
        .post(sfmcAuthServiceApiUrl, postBody1, { headers: headers })
        .then((response: any) => {
          let bearer = response.data.token_type;
          let tokenExpiry = response.data.expires_in;
          // this._accessToken = response.data.refresh_token;
          //this._oauthToken = response.data.access_token;
          Utils.logInfo("Auth Token:" + response.data.access_token);
          const customResponse = {
            refreshToken: response.data.refresh_token,
            oauthToken: response.data.access_token,
          };
          if (returnResponse) {
            res.status(200).send(customResponse);
          }
          resolve(customResponse);
        })
        .catch((error: any) => {
          let errorMsg = "Error getting refresh Access Token.";
          errorMsg += "\nMessage: " + error.message;
          errorMsg +=
            "\nStatus: " + error.response ? error.response.status : "<None>";
          errorMsg +=
            "\nResponse data: " + error.response
              ? Utils.prettyPrintJson(JSON.stringify(error.response.data))
              : "<None>";
          Utils.logError(errorMsg);

          reject(errorMsg);
        });
    });
  }

  //Fetching the app user information
  public appUserInfo(req: any, res: any) {
    let self = this;
    console.log("req.body.tssd:" + req.body.tssd);
    console.log("req.body.trefreshToken:" + req.body.refreshToken);
    let userInfoUrl =
      "https://" + req.body.tssd + ".auth.marketingcloudapis.com/v2/userinfo";

    self
      .getRefreshTokenHelper(req.body.refreshToken, req.body.tssd, false, res)
      .then((response) => {
        Utils.logInfo(
          "refreshTokenbody:" + JSON.stringify(response.refreshToken)
        );
        Utils.logInfo("AuthTokenbody:" + JSON.stringify(response.oauthToken));

        const refreshTokenbody = response.refreshToken;
        Utils.logInfo("refreshTokenbody1:" + JSON.stringify(refreshTokenbody));
        let headers = {
          "Content-Type": "application/json",
          Authorization: "Bearer " + response.oauthToken,
        };
        axios
          .get(userInfoUrl, { headers: headers })
          .then((response: any) => {
            const getUserInfoResponse = {
              member_id: response.data.organization.member_id,
              soap_instance_url: response.data.rest.soap_instance_url,
              rest_instance_url: response.data.rest.rest_instance_url,
              refreshToken: refreshTokenbody,
            };

            //Set the member_id into the session
            console.log(
              "Setting active sfmc mid into session:" +
                getUserInfoResponse.member_id
            );
            req.session.sfmcMemberId = getUserInfoResponse.member_id;

            res.status(200).send(getUserInfoResponse);
          })
          .catch((error: any) => {
            // error
            let errorMsg = "Error getting User's Information.";
            errorMsg += "\nMessage: " + error.message;
            errorMsg +=
              "\nStatus: " + error.response ? error.response.status : "<None>";
            errorMsg +=
              "\nResponse data: " + error.response
                ? Utils.prettyPrintJson(JSON.stringify(error.response.data))
                : "<None>";
            Utils.logError(errorMsg);

            res
              .status(500)
              .send(Utils.prettyPrintJson(JSON.stringify(error.response.data)));
          });
      })
      .catch((error: any) => {
        res
          .status(500)
          .send(Utils.prettyPrintJson(JSON.stringify(error.response.data)));
      });
  }

  //checking Sparkpost Integration Data extension
  public dataFolderCheck(req: express.Request, res: express.Response) {
    console.log("bodymemberid:" + req.body.memberid);
    console.log("bodymemberid:" + req.body.soapInstance);

    let self = this;
    // self.getRefreshTokenHelper(this._accessToken, res);
    self
      .getRefreshTokenHelper(req.body.refreshToken, req.body.tssd, false, res)
      .then((response) => {
        Utils.logInfo(
          "datafolderTokenbody:" + JSON.stringify(response.refreshToken)
        );
        Utils.logInfo(
          "datafolderAuthTokenbody:" + JSON.stringify(response.oauthToken)
        );
        const refreshTokenbody = response.refreshToken;
        Utils.logInfo(
          "datafolderTokenbody1:" + JSON.stringify(refreshTokenbody)
        );
        self
          .getCategoryIDHelper(
            req.body.memberid,
            req.body.soapInstance,
            response.oauthToken
          )
          .then((result) => {
            const sendresponse = {
              refreshToken: refreshTokenbody,
              statusText: result.statusText,
              soap_instance_url: req.body.soapInstance,
              member_id: req.body.memberid,
              FolderID: result.FolderID,
            };
            console.log("sendresponse:" + JSON.stringify(sendresponse));
            res.status(result.status).send(sendresponse);
          })
          .catch((err) => {
            res.status(500).send(err);
          });
      })
      .catch((error: any) => {
        res
          .status(500)
          .send(Utils.prettyPrintJson(JSON.stringify(error.response.data)));
      });
  }

  //Helper method for checking Sparkpost Integration Data extension
  public getCategoryIDHelper(
    member_id: string,
    soap_instance_url: string,
    oauthToken: string
  ): Promise<any> {
    let soapMessage =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">' +
      "    <s:Header>" +
      '        <a:Action s:mustUnderstand="1">Retrieve</a:Action>' +
      '        <a:To s:mustUnderstand="1">' +
      soap_instance_url +
      "Service.asmx" +
      "</a:To>" +
      '        <fueloauth xmlns="http://exacttarget.com">' +
      oauthToken +
      "</fueloauth>" +
      "    </s:Header>" +
      '    <s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
      '        <RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">' +
      "            <RetrieveRequest>" +
      "                <ObjectType>DataFolder</ObjectType>" +
      "                <Properties>ID</Properties>" +
      "                <Properties>CustomerKey</Properties>" +
      "                <Properties>Name</Properties>" +
      "                <Properties>ParentFolder.ID</Properties>" +
      "                <Properties>ParentFolder.Name</Properties>" +
      '                <Filter xsi:type="SimpleFilterPart">' +
      "                    <Property>Name</Property>" +
      "                    <SimpleOperator>equals</SimpleOperator>" +
      "                    <Value>Sparkpost Integrations - " +
      member_id +
      "</Value>" +
      "                </Filter>" +
      "            </RetrieveRequest>" +
      "        </RetrieveRequestMsg>" +
      "    </s:Body>" +
      "</s:Envelope>";

    return new Promise<any>((resolve, reject) => {
      let headers = {
        "Content-Type": "text/xml",
        SOAPAction: "Retrieve",
      };

      axios({
        method: "post",
        url: "" + soap_instance_url + "Service.asmx" + "",
        data: soapMessage,
        headers: { "Content-Type": "text/xml" },
      })
        .then((response: any) => {
          var extractedData = "";
          var parser = new xml2js.Parser();
          parser.parseString(
            response.data,
            (
              err: any,
              result: {
                [x: string]: {
                  [x: string]: { [x: string]: { [x: string]: any }[] }[];
                };
              }
            ) => {
              let FolderID =
                result["soap:Envelope"]["soap:Body"][0][
                  "RetrieveResponseMsg"
                ][0]["Results"];
              if (FolderID != undefined) {
                //    this.FolderID = FolderID[0]["ID"][0];
                resolve({
                  status: response.status,
                  statusText: true,
                  FolderID: FolderID[0]["ID"][0],
                });
              } else {
                resolve({
                  status: response.status,
                  statusText: false,
                });
              }
            }
          );
        })
        .catch((error: any) => {
          // error
          let errorMsg =
            "Error loading sample data. POST response from Marketing Cloud:";
          errorMsg += "\nMessage: " + error.message;
          errorMsg +=
            "\nStatus: " + error.response ? error.response.status : "<None>";
          errorMsg +=
            "\nResponse data: " + error.response.data
              ? Utils.prettyPrintJson(JSON.stringify(error.response.data))
              : "<None>";
          Utils.logError(errorMsg);

          reject(errorMsg);
        });
    });
  }

  //Retrieve Domain configuration data extension row
  public retrievingDataExtensionRows(
    req: express.Request,
    res: express.Response
  ) {
    console.log("retrievingDataExtensionRows:" + req.body.memberid);
    console.log("retrievingDataExtensionRows:" + req.body.soapInstance);
    console.log("retrievingDataExtensionRows:" + req.body.refreshToken);
    Utils.logInfo("retrievingDataExtensionRows:" + req.body.FolderID);
    //console.log('domainConfigurationDECheck:'+req.body.ParentFolderID);

    let refreshTokenbody = "";
    this.getRefreshTokenHelper(req.body.refreshToken, req.body.tssd, false, res)
      .then((response) => {
        Utils.logInfo(
          "retrievingDataExtensionRows:" + JSON.stringify(response.refreshToken)
        );
        Utils.logInfo(
          "retrievingDataExtensionRows:" + JSON.stringify(response.oauthToken)
        );
        refreshTokenbody = response.refreshToken;
        Utils.logInfo(
          "retrievingDataExtensionRows:" + JSON.stringify(refreshTokenbody)
        );

        let soapMessage = "";
        Utils.logInfo("request.body :::  " + JSON.stringify(req.body));
        if (req.body.domainvalue != undefined && req.body.domainvalue != "") {
          let FiltersoapMessage =
            '<?xml version="1.0" encoding="UTF-8"?>' +
            '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">' +
            "    <s:Header>" +
            '        <a:Action s:mustUnderstand="1">Retrieve</a:Action>' +
            '        <a:To s:mustUnderstand="1">' +
            req.body.soapInstance +
            "Service.asmx" +
            "</a:To>" +
            '        <fueloauth xmlns="http://exacttarget.com">' +
            response.oauthToken +
            "</fueloauth>" +
            "    </s:Header>" +
            '    <s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
            '        <RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">' +
            "            <RetrieveRequest>" +
            "                <ObjectType>DataExtensionObject[Domain Configuration-" +
            req.body.memberid +
            "]</ObjectType>" +
            "      <Properties>Domain ID</Properties>" +
            "        <Properties>Domain Name</Properties>" +
            "        <Properties>Inbox Threshold</Properties>" +
            "        <Properties>Engagement Threshold</Properties>" +
            "        <Properties>SPF Threshold</Properties>" +
            "        <Properties>DKIM Threshold</Properties>" +
            "        <Properties>Campaign Min</Properties>" +
            "        <Properties>Intelliseed Lists</Properties>" +
            "        <Properties>Threshold Recipe</Properties>" +
            "        <Properties>Rules Recipe</Properties>" +
            "        <Properties>Created or Modified by</Properties>" +
            '<Filter xsi:type="SimpleFilterPart">' +
            "<Property>Domain Name</Property>" +
            "<SimpleOperator>equals</SimpleOperator>" +
            "<Value>" +
            req.body.domainvalue +
            "</Value>" +
            "</Filter>" +
            "            </RetrieveRequest>" +
            "        </RetrieveRequestMsg>" +
            "    </s:Body>" +
            "</s:Envelope>";
          soapMessage = FiltersoapMessage;
        } else {
          let FiltersoapMessage =
            '<?xml version="1.0" encoding="UTF-8"?>' +
            '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">' +
            "    <s:Header>" +
            '        <a:Action s:mustUnderstand="1">Retrieve</a:Action>' +
            '        <a:To s:mustUnderstand="1">' +
            req.body.soapInstance +
            "Service.asmx" +
            "</a:To>" +
            '        <fueloauth xmlns="http://exacttarget.com">' +
            response.oauthToken +
            "</fueloauth>" +
            "    </s:Header>" +
            '    <s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
            '        <RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">' +
            "            <RetrieveRequest>" +
            "                <ObjectType>DataExtensionObject[Domain Configuration-" +
            req.body.memberid +
            "]</ObjectType>" +
            "      <Properties>Domain ID</Properties>" +
            "        <Properties>Domain Name</Properties>" +
            "        <Properties>Inbox Threshold</Properties>" +
            "        <Properties>Engagement Threshold</Properties>" +
            "        <Properties>SPF Threshold</Properties>" +
            "        <Properties>DKIM Threshold</Properties>" +
            "        <Properties>Campaign Min</Properties>" +
            "        <Properties>Intelliseed Lists</Properties>" +
            "        <Properties>Threshold Recipe</Properties>" +
            "        <Properties>Rules Recipe</Properties>" +
            "        <Properties>Created or Modified by</Properties>" +
            "            </RetrieveRequest>" +
            "        </RetrieveRequestMsg>" +
            "    </s:Body>" +
            "</s:Envelope>";
          soapMessage = FiltersoapMessage;
        }
        return new Promise<any>((resolve, reject) => {
          const configs: AxiosRequestConfig = {
            method: "post",
            url: "" + req.body.soapInstance + "Service.asmx" + "",
            headers: {
              "Content-Type": "text/xml",
            },
            data: soapMessage,
          };

          axios(configs)
            .then(function (response: any) {
              Utils.logInfo("::::::::: " + response.data);
              let rawdata = response.data;
              var rawData = "";
              var parser = new xml2js.Parser();
              parser.parseString(rawdata, function (err: any, result: any) {
                rawData =
                  result["soap:Envelope"]["soap:Body"][0][
                    "RetrieveResponseMsg"
                  ][0]["Results"];
              });

              let sendresponse = {
                refreshToken: refreshTokenbody,
                rawData: rawData,
              };
              console.log(
                "raw data and send response " + rawData + "\n" + sendresponse
              );
              res.status(200).send(sendresponse);
            })
            .catch(function (error: any) {
              let errorMsg = "Error getting the Data extensions getting rows";
              errorMsg += "\nMessage: " + error.message;
              errorMsg +=
                "\nStatus: " + error.response
                  ? error.response.status
                  : "<None>";
              errorMsg +=
                "\nResponse data: " + error.response.data
                  ? Utils.prettyPrintJson(JSON.stringify(error.response.data))
                  : "<None>";
              Utils.logError("errormsg:" + errorMsg);

              reject(errorMsg);
            });
        });
      })
      .catch((error: any) => {
        res
          .status(500)
          .send(Utils.prettyPrintJson(JSON.stringify(error.response.data)));
      });
  }

  //retrieving Sparkpost Integration Data Extension Folder ID
  public retrievingDataExtensionFolderID(
    req: express.Request,
    res: express.Response
  ) {
    console.log("rertivememberid:" + req.body.memberid);
    console.log("rertivememberid:" + req.body.soapInstance);
    let soapMessage = "";
    let refreshTokenbody = "";
    //this.getRefreshTokenHelper(this._accessToken, res);
    this.getRefreshTokenHelper(req.body.refreshToken, req.body.tssd, false, res)
      .then((response) => {
        Utils.logInfo(
          "datafolderTokenbody:" + JSON.stringify(response.refreshToken)
        );
        Utils.logInfo(
          "datafolderAuthTokenbody:" + JSON.stringify(response.oauthToken)
        );
        refreshTokenbody = response.refreshToken;
        Utils.logInfo(
          "datafolderTokenbody1:" + JSON.stringify(refreshTokenbody)
        );

        let headers = {
          "Content-Type": "text/xml",
          SOAPAction: "Retrieve",
        };
        soapMessage =
          '<?xml version="1.0" encoding="UTF-8"?>' +
          '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">' +
          "    <s:Header>" +
          '        <a:Action s:mustUnderstand="1">Retrieve</a:Action>' +
          '        <a:To s:mustUnderstand="1">' +
          req.body.soapInstance +
          "Service.asmx" +
          "</a:To>" +
          '        <fueloauth xmlns="http://exacttarget.com">' +
          response.oauthToken +
          "</fueloauth>" +
          "    </s:Header>" +
          '    <s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
          '        <RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">' +
          "            <RetrieveRequest>" +
          "                <ObjectType>DataFolder</ObjectType>" +
          "                <Properties>ID</Properties>" +
          "                <Properties>CustomerKey</Properties>" +
          "                <Properties>Name</Properties>" +
          '                <Filter xsi:type="SimpleFilterPart">' +
          "                    <Property>Name</Property>" +
          "                    <SimpleOperator>equals</SimpleOperator>" +
          "                    <Value>Data Extensions</Value>" +
          "                </Filter>" +
          "            </RetrieveRequest>" +
          "        </RetrieveRequestMsg>" +
          "    </s:Body>" +
          "</s:Envelope>";

        return new Promise<any>((resolve, reject) => {
          axios({
            method: "post",
            url: "" + req.body.soapInstance + "Service.asmx" + "",
            data: soapMessage,
            headers: { "Content-Type": "text/xml" },
          })
            .then((response: any) => {
              var extractedData = "";
              let sendresponse = {};
              var parser = new xml2js.Parser();
              parser.parseString(
                response.data,
                (
                  err: any,
                  result: {
                    [x: string]: {
                      [x: string]: { [x: string]: { [x: string]: any }[] }[];
                    };
                  }
                ) => {
                  let ParentFolderID =
                    result["soap:Envelope"]["soap:Body"][0][
                      "RetrieveResponseMsg"
                    ][0]["Results"][0]["ID"][0];

                  if (ParentFolderID != undefined) {
                    //    this.ParentFolderID = ParentFolderID;
                    sendresponse = {
                      refreshToken: refreshTokenbody,
                      statusText: true,
                      soap_instance_url: req.body.soapInstance,
                      member_id: req.body.memberid,
                      ParentFolderID: ParentFolderID,
                    };
                    res.status(200).send(sendresponse);
                  } else {
                    sendresponse = {
                      refreshToken: refreshTokenbody,
                      statusText: false,
                      soap_instance_url: req.body.soapInstance,
                      member_id: req.body.memberid,
                      ParentFolderID: ParentFolderID,
                    };
                    res.status(200).send(sendresponse);
                  }
                  //this.creatingHearsayIntegrationFolder(ParentFolderID);
                }
              );
            })
            .catch((error: any) => {
              // error
              let errorMsg =
                "Error getting the Data extensions folder properties......";
              errorMsg += "\nMessage: " + error.message;
              errorMsg +=
                "\nStatus: " + error.response
                  ? error.response.status
                  : "<None>";
              errorMsg +=
                "\nResponse data: " + error.response.data
                  ? Utils.prettyPrintJson(JSON.stringify(error.response.data))
                  : "<None>";
              Utils.logError(errorMsg);

              reject(errorMsg);
            });
        });
      })
      .catch((error: any) => {
        res
          .status(500)
          .send(Utils.prettyPrintJson(JSON.stringify(error.response.data)));
      });
  }

  public createSparkpostIntegrationFolder(
    req: express.Request,
    res: express.Response
  ) {
    // this.getRefreshTokenHelper(this._accessToken, res);
    console.log("createSparkpostIntegrationFolder:" + req.body.memberid);
    console.log("createSparkpostIntegrationFolder:" + req.body.soapInstance);
    console.log("createSparkpostIntegrationFolder:" + req.body.refreshToken);
    console.log("createSparkpostIntegrationFolder:" + req.body.ParentFolderID);

    let refreshTokenbody = "";
    //this.getRefreshTokenHelper(this._accessToken, res);
    this.getRefreshTokenHelper(req.body.refreshToken, req.body.tssd, false, res)
      .then((response) => {
        Utils.logInfo(
          "datafolderTokenbody:" + JSON.stringify(response.refreshToken)
        );
        Utils.logInfo(
          "datafolderAuthTokenbody:" + JSON.stringify(response.oauthToken)
        );
        refreshTokenbody = response.refreshToken;
        Utils.logInfo(
          "datafolderTokenbody1:" + JSON.stringify(refreshTokenbody)
        );
        let createFolderData =
          '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
          "<soapenv:Header>" +
          "<fueloauth>" +
          response.oauthToken +
          "</fueloauth>" +
          "</soapenv:Header>" +
          "<soapenv:Body>" +
          '<CreateRequest xmlns="http://exacttarget.com/wsdl/partnerAPI">' +
          "<Options/>" +
          '<ns1:Objects xmlns:ns1="http://exacttarget.com/wsdl/partnerAPI" xsi:type="ns1:DataFolder">' +
          '<ns1:ModifiedDate xsi:nil="true"/>' +
          '<ns1:ObjectID xsi:nil="true"/>' +
          "<ns1:CustomerKey>Sparkpost Integrations - " +
          req.body.memberid +
          "</ns1:CustomerKey>" +
          "<ns1:ParentFolder>" +
          '<ns1:ModifiedDate xsi:nil="true"/>' +
          "<ns1:ID>" +
          req.body.ParentFolderID +
          "</ns1:ID>" +
          '<ns1:ObjectID xsi:nil="true"/>' +
          "</ns1:ParentFolder>" +
          "<ns1:Name>Sparkpost Integrations - " +
          req.body.memberid +
          "</ns1:Name>" +
          "<ns1:Description>Sparkpost Integrations - " +
          req.body.memberid +
          " Folder</ns1:Description>" +
          "<ns1:ContentType>dataextension</ns1:ContentType>" +
          "<ns1:IsActive>true</ns1:IsActive>" +
          "<ns1:IsEditable>true</ns1:IsEditable>" +
          "<ns1:AllowChildren>true</ns1:AllowChildren>" +
          "</ns1:Objects>" +
          "</CreateRequest>" +
          "</soapenv:Body>" +
          "</soapenv:Envelope>";

        return new Promise<any>((resolve, reject) => {
          let headers = {
            "Content-Type": "text/xml",
            SOAPAction: "Create",
          };

          // POST to Marketing Cloud Data Extension endpoint to load sample data in the POST body
          axios({
            method: "post",
            url: "" + req.body.soapInstance + "Service.asmx" + "",
            data: createFolderData,
            headers: headers,
          })
            .then((response: any) => {
              let sendresponse = {};

              var parser = new xml2js.Parser();
              parser.parseString(
                response.data,
                (
                  err: any,
                  result: {
                    [x: string]: {
                      [x: string]: { [x: string]: { [x: string]: any }[] }[];
                    };
                  }
                ) => {
                  let SparkpostIntegrationsID =
                    result["soap:Envelope"]["soap:Body"][0][
                      "CreateResponse"
                    ][0]["Results"][0]["NewID"][0];
                  if (SparkpostIntegrationsID != undefined) {
                    //  this.FolderID = SparkpostIntegrationsID;

                    sendresponse = {
                      refreshToken: refreshTokenbody,
                      statusText: true,
                      soap_instance_url: req.body.soapInstance,
                      member_id: req.body.memberid,
                      FolderID: SparkpostIntegrationsID,
                    };
                    res.status(200).send(sendresponse);
                  } else {
                    sendresponse = {
                      refreshToken: refreshTokenbody,
                      statusText: false,
                      soap_instance_url: req.body.soapInstance,
                      member_id: req.body.memberid,
                      FolderID: SparkpostIntegrationsID,
                    };
                    res.status(200).send(sendresponse);
                  }
                }
              );
            })
            .catch((error: any) => {
              // error
              let errorMsg =
                "Error creating the Sparkpost Integrations folder......";
              errorMsg += "\nMessage: " + error.message;
              errorMsg +=
                "\nStatus: " + error.response
                  ? error.response.status
                  : "<None>";
              errorMsg +=
                "\nResponse data: " + error.response.data
                  ? Utils.prettyPrintJson(JSON.stringify(error.response.data))
                  : "<None>";
              Utils.logError(errorMsg);

              reject(errorMsg);
            });
        });
      })
      .catch((error: any) => {
        res
          .status(500)
          .send(Utils.prettyPrintJson(JSON.stringify(error.response.data)));
      });
  }

  //Checking for Domain Configuration Data extension
  public domainConfigurationDECheck(
    req: express.Request,
    res: express.Response
  ) {
    //this.getRefreshTokenHelper(this._accessToken, res);
    console.log("domainConfigurationDECheck:" + req.body.memberid);
    console.log("domainConfigurationDECheck:" + req.body.soapInstance);
    console.log("domainConfigurationDECheck:" + req.body.refreshToken);
    Utils.logInfo("domainConfigurationDECheck1:" + req.body.FolderID);
    //console.log('domainConfigurationDECheck:'+req.body.ParentFolderID);

    let refreshTokenbody = "";
    //this.getRefreshTokenHelper(this._accessToken, res);
    this.getRefreshTokenHelper(req.body.refreshToken, req.body.tssd, false, res)
      .then((response) => {
        Utils.logInfo(
          "domainConfigurationDECheck:" + JSON.stringify(response.refreshToken)
        );
        Utils.logInfo(
          "domainConfigurationDECheck:" + JSON.stringify(response.oauthToken)
        );
        refreshTokenbody = response.refreshToken;
        Utils.logInfo(
          "domainConfigurationDECheck1:" + JSON.stringify(refreshTokenbody)
        );

        let soapMessage =
          '<?xml version="1.0" encoding="UTF-8"?>' +
          '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">' +
          "    <s:Header>" +
          '        <a:Action s:mustUnderstand="1">Retrieve</a:Action>' +
          '        <a:To s:mustUnderstand="1">' +
          req.body.soapInstance +
          "Service.asmx" +
          "</a:To>" +
          '        <fueloauth xmlns="http://exacttarget.com">' +
          response.oauthToken +
          "</fueloauth>" +
          "    </s:Header>" +
          '    <s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
          '        <RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">' +
          "            <RetrieveRequest>" +
          "                <ObjectType>DataExtension</ObjectType>" +
          "                <Properties>ObjectID</Properties>" +
          "                <Properties>CustomerKey</Properties>" +
          "                <Properties>Name</Properties>" +
          '                <Filter xsi:type="SimpleFilterPart">' +
          "                    <Property>Name</Property>" +
          "                    <SimpleOperator>equals</SimpleOperator>" +
          "                    <Value>Domain Configuration-" +
          req.body.memberid +
          "</Value>" +
          "                </Filter>" +
          "            </RetrieveRequest>" +
          "        </RetrieveRequestMsg>" +
          "    </s:Body>" +
          "</s:Envelope>";

        return new Promise<any>((resolve, reject) => {
          let headers = {
            "Content-Type": "text/xml",
            SOAPAction: "Retrieve",
          };

          axios({
            method: "post",
            url: "" + req.body.soapInstance + "Service.asmx" + "",
            data: soapMessage,
            headers: { "Content-Type": "text/xml" },
          })
            .then((response: any) => {
              var extractedData = "";
              let sendresponse = {};
              var parser = new xml2js.Parser();
              parser.parseString(
                response.data,
                (
                  err: any,
                  result: {
                    [x: string]: {
                      [x: string]: { [x: string]: { [x: string]: any }[] }[];
                    };
                  }
                ) => {
                  let DomainConfiguration =
                    result["soap:Envelope"]["soap:Body"][0][
                      "RetrieveResponseMsg"
                    ][0]["Results"];

                  if (DomainConfiguration != undefined) {
                    let DEexternalKeyDomainConfiguration =
                      DomainConfiguration[0]["CustomerKey"];
                    //    this.DEexternalKeyDomainConfiguration =;
                    //    DomainConfiguration[0]["CustomerKey"];
                    sendresponse = {
                      refreshToken: refreshTokenbody,
                      statusText:
                        "Domain Configuration Data Extension already created",
                      soap_instance_url: req.body.soapInstance,
                      member_id: req.body.memberid,
                      DEexternalKeyDomainConfiguration:
                        DEexternalKeyDomainConfiguration,
                    };
                    res.status(200).send(sendresponse);
                  } else {
                    this.creatingDomainConfigurationDE(
                      req,
                      res,
                      req.body.memberid,
                      req.body.soapInstance,
                      refreshTokenbody,
                      req.body.FolderID,
                      req.body.tssd
                    );
                  }
                }
              );
            })
            .catch((error: any) => {
              // error
              let errorMsg =
                "Error getting the 'Domain Configuration' Data extension properties......";
              errorMsg += "\nMessage: " + error.message;
              errorMsg +=
                "\nStatus: " + error.response
                  ? error.response.status
                  : "<None>";
              errorMsg +=
                "\nResponse data: " + error.response.data
                  ? Utils.prettyPrintJson(JSON.stringify(error.response.data))
                  : "<None>";
              Utils.logError(errorMsg);

              reject(errorMsg);
            });
        });
      })
      .catch((error: any) => {
        res
          .status(500)
          .send(Utils.prettyPrintJson(JSON.stringify(error.response.data)));
      });
  }

  //Getting active Journeys for Journey performance dashboard
  public getActiveJourneys(req: express.Request, res: express.Response) {
    console.log("rowCount:" + req.query.memberid);
    console.log("rowCount:" + req.query.soapInstance);
    console.log("rowCount:" + req.query.refreshToken);
    console.log("rowCount:" + req.query.restInstance);
    let refreshTokenbody = "";
    this.getRefreshTokenHelper(
      req.query.refreshToken,
      req.query.tssd,
      false,
      res
    )
      .then((response) => {
        Utils.logInfo("rowCount:" + JSON.stringify(response.refreshToken));
        Utils.logInfo("rowCount:" + JSON.stringify(response.oauthToken));
        refreshTokenbody = response.refreshToken;
        Utils.logInfo("rowCount:" + JSON.stringify(refreshTokenbody));

        return new Promise<any>((resolve, reject) => {
          let headers = {
            "Content-Type": "application/json",
            Authorization: "Bearer " + response.oauthToken,
          };
          // https://mcj6cy1x9m-t5h5tz0bfsyqj38ky.rest.marketingcloudapis.com/
          let JourneyUrl =
            "https://" +
            req.query.tssd +
            ".rest.marketingcloudapis.com/interaction/v1/interactions?status=Published";
          axios({
            method: "get",
            url: JourneyUrl,
            headers: headers,
          })
            .then((response: any) => {
              let sendresponse = {
                refreshToken: refreshTokenbody,
                journeys: response.data,
              };
              res.status(200).send(sendresponse);
            })
            .catch((error: any) => {
              // error
              let errorMsg = "Error getting the Active Journeys......";
              errorMsg += "\nMessage: " + error.message;
              errorMsg +=
                "\nStatus: " + error.response
                  ? error.response.status
                  : "<None>";
              errorMsg +=
                "\nResponse data: " + error.response.data
                  ? Utils.prettyPrintJson(JSON.stringify(error.response.data))
                  : "<None>";
              Utils.logError(errorMsg);

              reject(errorMsg);
            });
        });
      })
      .catch((error: any) => {
        res
          .status(500)
          .send(Utils.prettyPrintJson(JSON.stringify(error.response.data)));
      });
  }

  //Getting journeys By ID
  public getJourneysById(req: express.Request, res: express.Response) {
    //this.getRefreshTokenHelper(this._accessToken, res);
    //this.getRefreshTokenHelper(this._accessToken, res);
    console.log("getJourneysById:" + req.body.memberid);
    console.log("getJourneysById:" + req.body.soapInstance);
    console.log("getJourneysById:" + req.body.refreshToken);
    Utils.logInfo("getJourneysById:" + req.body.FolderID);
    let refreshTokenbody = "";
    this.getRefreshTokenHelper(req.body.refreshToken, req.body.tssd, false, res)
      .then((response) => {
        Utils.logInfo(
          "getJourneysById:" + JSON.stringify(response.refreshToken)
        );
        Utils.logInfo("getJourneysById:" + JSON.stringify(response.oauthToken));
        refreshTokenbody = response.refreshToken;
        Utils.logInfo("getJourneysById:" + JSON.stringify(refreshTokenbody));

        return new Promise<any>((resolve, reject) => {
          let headers = {
            "Content-Type": "application/json",
            Authorization: "Bearer " + response.oauthToken,
          };
          let JourneyUrl =
            "https://" +
            req.body.tssd +
            ".rest.marketingcloudapis.com/interaction/v1/interactions/" +
            req.body.journeyId;
          axios({
            method: "get",
            url: JourneyUrl,
            headers: headers,
          })
            .then((response: any) => {
              let sendresponse = {
                refreshToken: refreshTokenbody,
                activity: response.data,
              };
              res.status(200).send(sendresponse);
              // res.status(200).send(response.data);
            })
            .catch((error: any) => {
              // error
              let errorMsg = "Error getting the Active Journeys......";
              errorMsg += "\nMessage: " + error.message;
              errorMsg +=
                "\nStatus: " + error.response
                  ? error.response.status
                  : "<None>";
              errorMsg +=
                "\nResponse data: " + error.response.data
                  ? Utils.prettyPrintJson(JSON.stringify(error.response.data))
                  : "<None>";
              Utils.logError(errorMsg);

              reject(errorMsg);
            });
        });
      })
      .catch((error: any) => {
        res
          .status(500)
          .send(Utils.prettyPrintJson(JSON.stringify(error.response.data)));
      });
  }

  //Creating Domain Configuration data extesnion
  public creatingDomainConfigurationDE(
    req: express.Request,
    res: express.Response,
    member_id: string,
    soap_instance_url: string,
    refreshToken: string,
    FolderID: string,
    tssd: string
  ) {
    //this.getRefreshTokenHelper(this._accessToken, res);
    console.log("creatingDomainConfigurationDE:" + member_id);
    console.log("creatingDomainConfigurationDE:" + soap_instance_url);
    console.log("creatingDomainConfigurationDE:" + refreshToken);
    Utils.logInfo("creatingDomainConfigurationDE:" + FolderID);
    console.log("creatingDomainConfigurationDE:" + tssd);

    //console.log('domainConfigurationDECheck:'+req.body.ParentFolderID);

    let refreshTokenbody = "";
    this.getRefreshTokenHelper(refreshToken, tssd, false, res)
      .then((response) => {
        Utils.logInfo(
          "creatingDomainConfigurationDE:" +
            JSON.stringify(response.refreshToken)
        );
        Utils.logInfo(
          "creatingDomainConfigurationDE:" + JSON.stringify(response.oauthToken)
        );
        refreshTokenbody = response.refreshToken;
        Utils.logInfo(
          "creatingDomainConfigurationDE1:" + JSON.stringify(refreshTokenbody)
        );

        let DCmsg =
          '<?xml version="1.0" encoding="UTF-8"?>' +
          '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">' +
          "    <s:Header>" +
          '        <a:Action s:mustUnderstand="1">Create</a:Action>' +
          '        <a:To s:mustUnderstand="1">' +
          soap_instance_url +
          "Service.asmx" +
          "</a:To>" +
          '        <fueloauth xmlns="http://exacttarget.com">' +
          response.oauthToken +
          "</fueloauth>" +
          "    </s:Header>" +
          '    <s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
          '        <CreateRequest xmlns="http://exacttarget.com/wsdl/partnerAPI">' +
          '            <Objects xsi:type="DataExtension">' +
          "                <CategoryID>" +
          FolderID +
          "</CategoryID>" +
          "                <CustomerKey>Domain Configuration-" +
          member_id +
          "</CustomerKey>" +
          "                <Name>Domain Configuration-" +
          member_id +
          "</Name>" +
          "                <Fields>" +
          "                    <Field>" +
          "                        <CustomerKey>Domain ID</CustomerKey>" +
          "                        <Name>Domain ID</Name>" +
          "                        <FieldType>Text</FieldType>" +
          "                        <MaxLength>50</MaxLength>" +
          "                        <IsRequired>true</IsRequired>" +
          "                        <IsPrimaryKey>false</IsPrimaryKey>" +
          "                    </Field>" +
          "                    <Field>" +
          "                        <CustomerKey>Domain Name</CustomerKey>" +
          "                        <Name>Domain Name</Name>" +
          "                        <FieldType>Text</FieldType>" +
          "                        <MaxLength>100</MaxLength>" +
          "                        <IsRequired>true</IsRequired>" +
          "                        <IsPrimaryKey>true</IsPrimaryKey>" +
          "                    </Field>" +
          "                    <Field>" +
          "                        <CustomerKey>Inbox Threshold</CustomerKey>" +
          "                        <Name>Inbox Threshold</Name>" +
          "                        <FieldType>Text</FieldType>" +
          "                        <MaxLength>100</MaxLength>" +
          "                        <IsRequired>false</IsRequired>" +
          "                        <IsPrimaryKey>false</IsPrimaryKey>" +
          "                    </Field>" +
          "                    <Field>" +
          "                        <CustomerKey>Engagement Threshold</CustomerKey>" +
          "                        <Name>Engagement Threshold</Name>" +
          "                        <FieldType>Text</FieldType>" +
          "                        <MaxLength>100</MaxLength>" +
          "                        <IsRequired>false</IsRequired>" +
          "                        <IsPrimaryKey>false</IsPrimaryKey>" +
          "                    </Field>" +
          "                    <Field>" +
          "                        <CustomerKey>SPF Threshold</CustomerKey>" +
          "                        <Name>SPF Threshold</Name>" +
          "                        <FieldType>Text</FieldType>" +
          "                        <MaxLength>100</MaxLength>" +
          "                        <IsRequired>false</IsRequired>" +
          "                        <IsPrimaryKey>false</IsPrimaryKey>" +
          "                    </Field>" +
          "                    <Field>" +
          "                        <CustomerKey>DKIM Threshold</CustomerKey>" +
          "                        <Name>DKIM Threshold</Name>" +
          "                        <FieldType>Text</FieldType>" +
          "                        <MaxLength>100</MaxLength>" +
          "                        <IsRequired>false</IsRequired>" +
          "                        <IsPrimaryKey>false</IsPrimaryKey>" +
          "                    </Field>" +
          "                    <Field>" +
          "                        <CustomerKey>Campaign Min</CustomerKey>" +
          "                        <Name>Campaign Min</Name>" +
          "                        <FieldType>Decimal</FieldType>" +
          "                        <Precision>18</Precision>" +
          "                          <Scale>0</Scale>" +
          "                        <IsRequired>false</IsRequired>" +
          "                        <IsPrimaryKey>false</IsPrimaryKey>" +
          "                    </Field>" +
          "                    <Field>" +
          "                        <CustomerKey>Intelliseed Lists</CustomerKey>" +
          "                        <Name>Intelliseed Lists</Name>" +
          "                        <FieldType>Text</FieldType>" +
          "                        <MaxLength>250</MaxLength>" +
          "                        <IsRequired>false</IsRequired>" +
          "                        <IsPrimaryKey>false</IsPrimaryKey>" +
          "                    </Field>" +
          "                    <Field>" +
          "                        <CustomerKey>Threshold Recipe</CustomerKey>" +
          "                        <Name>Threshold Recipe</Name>" +
          "                        <FieldType>Text</FieldType>" +
          "                        <MaxLength>250</MaxLength>" +
          "                        <IsRequired>false</IsRequired>" +
          "                        <IsPrimaryKey>false</IsPrimaryKey>" +
          "                    </Field>" +
          "                    <Field>" +
          "                        <CustomerKey>Rules Recipe</CustomerKey>" +
          "                        <Name>Rules Recipe</Name>" +
          "                        <FieldType>Text</FieldType>" +
          "                        <MaxLength>250</MaxLength>" +
          "                        <IsRequired>false</IsRequired>" +
          "                        <IsPrimaryKey>false</IsPrimaryKey>" +
          "                    </Field>" +
          "                    <Field>" +
          "                        <CustomerKey>Created or Modified by</CustomerKey>" +
          "                        <Name>Created or Modified by</Name>" +
          "                        <FieldType>Text</FieldType>" +
          "                        <IsRequired>true</IsRequired>" +
          "                        <IsPrimaryKey>false</IsPrimaryKey>" +
          "                    </Field>" +
          "                    <Field>" +
          "                        <CustomerKey>Created or Modified date</CustomerKey>" +
          "                        <Name>Created or Modified date</Name>" +
          "                        <FieldType>Date</FieldType>" +
          "						  <DefaultValue>getdate()</DefaultValue>" +
          "                        <IsRequired>true</IsRequired>" +
          "                        <IsPrimaryKey>false</IsPrimaryKey>" +
          "                    </Field>" +
          "                </Fields>" +
          "            </Objects>" +
          "        </CreateRequest>" +
          "    </s:Body>" +
          "</s:Envelope>";

        return new Promise<any>((resolve, reject) => {
          let headers = {
            "Content-Type": "text/xml",
          };

          axios({
            method: "post",
            url: "" + soap_instance_url + "Service.asmx" + "",
            data: DCmsg,
            headers: headers,
          })
            .then((response: any) => {
              var parser = new xml2js.Parser();
              parser.parseString(
                response.data,
                (
                  err: any,
                  result: {
                    [x: string]: {
                      [x: string]: { [x: string]: { [x: string]: any }[] }[];
                    };
                  }
                ) => {
                  let DomainConfiguration =
                    result["soap:Envelope"]["soap:Body"][0][
                      "CreateResponse"
                    ][0]["Results"];

                  if (DomainConfiguration != undefined) {
                    let DEexternalKeyDomainConfiguration =
                      DomainConfiguration[0]["Object"][0]["CustomerKey"];

                    //this.DEexternalKeyDomainConfiguration =
                    // DomainConfiguration[0]["Object"][0]["CustomerKey"];
                    let sendresponse = {};
                    sendresponse = {
                      refreshToken: refreshTokenbody,
                      statusText:
                        "Domain Configuration Data extension has been created Successfully",
                      soap_instance_url: soap_instance_url,
                      member_id: member_id,
                      DEexternalKeyDomainConfiguration:
                        DEexternalKeyDomainConfiguration,
                    };
                    res.status(200).send(sendresponse);

                    /*  res
                  .status(200)
                  .send(
                    "Domain Configuration Data extension has been created Successfully"
                  );*/
                  }
                }
              );
            })
            .catch((error: any) => {
              // error
              let errorMsg =
                "Error creating the Domain Configuration Data extension......";
              errorMsg += "\nMessage: " + error.message;
              errorMsg +=
                "\nStatus: " + error.response
                  ? error.response.status
                  : "<None>";
              errorMsg +=
                "\nResponse data: " + error.response.data
                  ? Utils.prettyPrintJson(JSON.stringify(error.response.data))
                  : "<None>";
              Utils.logError(errorMsg);

              reject(errorMsg);
            });
        });
      })
      .catch((error: any) => {
        res
          .status(500)
          .send(Utils.prettyPrintJson(JSON.stringify(error.response.data)));
      });
  }

  //Inserting a row in Domain configuration data extension
  public insertRowForDC(req: express.Request, res: express.Response) {
    let self = this;
    //self.getRefreshTokenHelper(this._accessToken, res);
    let sessionId = req.session.id;
    console.log("insertRowForDC:" + req.body.userInfobody.memberid);
    console.log("insertRowForDC:" + req.body.userInfobody.soapInstance);
    console.log("insertRowForDC:" + JSON.stringify(req.body));
    console.log("insertRowForDC:" + req.body.refreshToken);
    console.log(
      "insertRowForDC:" + req.body.userInfobody.DEexternalKeyDomainConfiguration
    );
    console.log("insertRowForDC:" + req.body.userInfobody.restInstance);
    let refreshTokenbody = "";
    //this.getRefreshTokenHelper(this._accessToken, res);
    self
      .getRefreshTokenHelper(
        req.body.refreshToken,
        req.body.userInfobody.tssd,
        false,
        res
      )
      .then((response) => {
        Utils.logInfo(
          "insertRowForDC:" + JSON.stringify(response.refreshToken)
        );
        Utils.logInfo("insertRowForDC:" + JSON.stringify(response.oauthToken));
        refreshTokenbody = response.refreshToken;
        Utils.logInfo("insertRowForDC:" + JSON.stringify(refreshTokenbody));
        if (response.oauthToken != "") {
          self
            .insertRowForDCHelper(
              response.oauthToken,
              req.body.userInfobody.restInstance,
              req.body.userInfobody.DEexternalKeyDomainConfiguration,
              JSON.stringify(req.body.domainConfigurationData)
            )
            .then((result) => {
              let sendresponse = {
                statusText: result.statusText,
                refreshToken: refreshTokenbody,
              };
              res.status(result.status).send(sendresponse);
              // res.status(result.status).send(result.statusText);
            })
            .catch((err) => {
              res.status(500).send(err);
            });
        } else {
          // error
          let errorMsg =
            "OAuth Access Token *not* found in session.\nPlease complete previous demo step\nto get an OAuth Access Token.";
          Utils.logError(errorMsg);
          res.status(500).send(errorMsg);
        }
      })
      .catch((error: any) => {
        res
          .status(500)
          .send(Utils.prettyPrintJson(JSON.stringify(error.response.data)));
      });
  }

  //Helper method for nserting a row in Domain configuration data extension
  private insertRowForDCHelper(
    oauthAccessToken: string,
    rest_instance_url: string,
    DEexternalKeyDomainConfiguration: string,
    jsonData: string
  ): Promise<any> {
    let self = this;
    let _sfmcDataExtensionApiUrl =
      rest_instance_url +
      "/hub/v1/dataevents/key:" +
      DEexternalKeyDomainConfiguration +
      "/rowset";
    let ReqBody = JSON.parse(jsonData);
    Utils.logInfo("reqBody insert ::: " + JSON.stringify(ReqBody));
    let post_data = "";
    let ExtensionjsonData = [];

    if (ReqBody[0].keys["Domain Name"] == "Apply to all domains") {
      let Domainname = ReqBody[0].values.consolidatedDomainName;
      let DomainId = ReqBody[0].values.consolidatedDomainID;
      let DomainNameCount;
      let DomainNameArray = [];
      let DomainIdArray = [];

      if (Domainname != undefined && Domainname != "") {
        DomainNameArray = Domainname.split(",");
        DomainIdArray = DomainId.split(",");

        for (var i = 0; i < DomainNameArray.length; i++) {
          ExtensionjsonData.push({
            keys: {
              "Domain Name": DomainNameArray[i],
            },
            values: {
              "Domain ID": DomainIdArray[i],
              "Inbox Threshold": ReqBody[0].values["Inbox Threshold"],
              "Engagement Threshold": ReqBody[0].values["Engagement Threshold"],
              "SPF Threshold": ReqBody[0].values["SPF Threshold"],
              "DKIM Threshold": ReqBody[0].values["DKIM Threshold"],
              "Campaign Min": ReqBody[0].values["Campaign Min"],
              "Intelliseed Lists": ReqBody[0].values["Intelliseed Lists"],
              "Created or Modified by":
                ReqBody[0].values["Created or Modified by"],
              "Threshold Recipe": ReqBody[0].values["Threshold Recipe"],
              "Rules Recipe": ReqBody[0].values["Rules Recipe"],
            },
          });
        }
      }
      post_data = JSON.stringify(ExtensionjsonData);
    } else {
      post_data = jsonData;
    }
    return new Promise<any>((resolve, reject) => {
      let headers = {
        "Content-Type": "application/json",
        Authorization: "Bearer " + oauthAccessToken,
      };

      axios
        .post(_sfmcDataExtensionApiUrl, post_data, { headers: headers })
        .then((response: any) => {
          // success
          resolve({
            status: response.status,
            statusText:
              response.statusText +
              "\n" +
              Utils.prettyPrintJson(JSON.stringify(response.data)),
          });
        })
        .catch((error: any) => {
          // error
          let errorMsg =
            "Error loading sample data. POST response from Marketing Cloud:";
          errorMsg += "\nMessage: " + error.message;
          errorMsg +=
            "\nStatus: " + error.response ? error.response.status : "<None>";
          errorMsg +=
            "\nResponse data: " + error.response.data
              ? Utils.prettyPrintJson(JSON.stringify(error.response.data))
              : "<None>";
          Utils.logError(errorMsg);

          reject(errorMsg);
        });
    });
  }

  //Checking Intelliseeds Lists data extension availability
  public intelliseedListsDECheck(req: express.Request, res: express.Response) {
    console.log("intelliseedListsDECheck:" + req.body.memberid);
    console.log("intelliseedListsDECheck:" + req.body.soapInstance);
    console.log("intelliseedListsDECheck:" + req.body.refreshToken);
    Utils.logInfo("intelliseedListsDECheck1:" + req.body.FolderID);
    //console.log('domainConfigurationDECheck:'+req.body.ParentFolderID);

    let refreshTokenbody = "";
    this.getRefreshTokenHelper(req.body.refreshToken, req.body.tssd, false, res)
      .then((response) => {
        Utils.logInfo(
          "intelliseedListsDECheck:" + JSON.stringify(response.refreshToken)
        );
        Utils.logInfo(
          "intelliseedListsDECheck:" + JSON.stringify(response.oauthToken)
        );
        refreshTokenbody = response.refreshToken;
        Utils.logInfo(
          "intelliseedListsDECheck:" + JSON.stringify(refreshTokenbody)
        );
        let soapMessage =
          '<?xml version="1.0" encoding="UTF-8"?>' +
          '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">' +
          "    <s:Header>" +
          '        <a:Action s:mustUnderstand="1">Retrieve</a:Action>' +
          '        <a:To s:mustUnderstand="1">' +
          req.body.soapInstance +
          "Service.asmx" +
          "</a:To>" +
          '        <fueloauth xmlns="http://exacttarget.com">' +
          response.oauthToken +
          "</fueloauth>" +
          "    </s:Header>" +
          '    <s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
          '        <RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">' +
          "            <RetrieveRequest>" +
          "                <ObjectType>DataExtension</ObjectType>" +
          "                <Properties>ObjectID</Properties>" +
          "                <Properties>CustomerKey</Properties>" +
          "                <Properties>Name</Properties>" +
          '                <Filter xsi:type="SimpleFilterPart">' +
          "                    <Property>Name</Property>" +
          "                    <SimpleOperator>equals</SimpleOperator>" +
          "                    <Value>Intelliseed Lists-" +
          req.body.memberid +
          "</Value>" +
          "                </Filter>" +
          "            </RetrieveRequest>" +
          "        </RetrieveRequestMsg>" +
          "    </s:Body>" +
          "</s:Envelope>";

        return new Promise<any>((resolve, reject) => {
          let headers = {
            "Content-Type": "text/xml",
            SOAPAction: "Retrieve",
          };

          axios({
            method: "post",
            url: "" + req.body.soapInstance + "Service.asmx" + "",
            data: soapMessage,
            headers: { "Content-Type": "text/xml" },
          })
            .then((response: any) => {
              var extractedData = "";
              var parser = new xml2js.Parser();
              parser.parseString(
                response.data,
                (
                  err: any,
                  result: {
                    [x: string]: {
                      [x: string]: { [x: string]: { [x: string]: any }[] }[];
                    };
                  }
                ) => {
                  let DomainConfiguration =
                    result["soap:Envelope"]["soap:Body"][0][
                      "RetrieveResponseMsg"
                    ][0]["Results"];

                  if (DomainConfiguration != undefined) {
                    let sendresponse = {};
                    let DEexternalKeyIntelliseedLists =
                      DomainConfiguration[0]["CustomerKey"];
                    // this.DEexternalKeyDomainConfiguration =
                    // DomainConfiguration[0]["CustomerKey"];
                    sendresponse = {
                      refreshToken: refreshTokenbody,
                      statusText:
                        "Intelliseeds Lists Data Extension already created",
                      soap_instance_url: req.body.soapInstance,
                      member_id: req.body.memberid,
                      DEexternalKeyIntelliseedLists:
                        DEexternalKeyIntelliseedLists,
                    };
                    res.status(200).send(sendresponse);
                  } else {
                    this.creatingIntelliseedListDE(
                      req,
                      res,
                      req.body.memberid,
                      req.body.soapInstance,
                      refreshTokenbody,
                      req.body.FolderID,
                      req.body.tssd
                    );
                  }
                }
              );
            })
            .catch((error: any) => {
              // error
              let errorMsg =
                "Error getting the 'Intelliseeds Lists' Data extension properties......";
              errorMsg += "\nMessage: " + error.message;
              errorMsg +=
                "\nStatus: " + error.response
                  ? error.response.status
                  : "<None>";
              errorMsg +=
                "\nResponse data: " + error.response.data
                  ? Utils.prettyPrintJson(JSON.stringify(error.response.data))
                  : "<None>";
              Utils.logError(errorMsg);

              reject(errorMsg);
            });
        });
      })
      .catch((error: any) => {
        res
          .status(500)
          .send(Utils.prettyPrintJson(JSON.stringify(error.response.data)));
      });
  }

  //Creating Intelliseeeds Lists data extension
  public creatingIntelliseedListDE(
    req: express.Request,
    res: express.Response,
    member_id: string,
    soap_instance_url: string,
    refreshToken: string,
    FolderID: string,
    tssd: string
  ) {
    //  this.getRefreshTokenHelper(this._accessToken, res);
    console.log("creatingIntelliseedListDE:" + member_id);
    console.log("creatingIntelliseedListDE:" + soap_instance_url);
    console.log("creatingIntelliseedListDE:" + refreshToken);
    Utils.logInfo("creatingIntelliseedListDE1:" + FolderID);
    //console.log('domainConfigurationDECheck:'+req.body.ParentFolderID);

    let refreshTokenbody = "";
    //this.getRefreshTokenHelper(this._accessToken, res);
    this.getRefreshTokenHelper(refreshToken, tssd, false, res)
      .then((response) => {
        Utils.logInfo(
          "creatingIntelliseedListDE:" + JSON.stringify(response.refreshToken)
        );
        Utils.logInfo(
          "creatingIntelliseedListDE:" + JSON.stringify(response.oauthToken)
        );
        refreshTokenbody = response.refreshToken;
        Utils.logInfo(
          "creatingIntelliseedListDE:" + JSON.stringify(refreshTokenbody)
        );

        let ISLmsg =
          '<?xml version="1.0" encoding="UTF-8"?>' +
          '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">' +
          "    <s:Header>" +
          '        <a:Action s:mustUnderstand="1">Create</a:Action>' +
          '        <a:To s:mustUnderstand="1">' +
          soap_instance_url +
          "Service.asmx" +
          "</a:To>" +
          '        <fueloauth xmlns="http://exacttarget.com">' +
          response.oauthToken +
          "</fueloauth>" +
          "    </s:Header>" +
          '    <s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
          '        <CreateRequest xmlns="http://exacttarget.com/wsdl/partnerAPI">' +
          '            <Objects xsi:type="DataExtension">' +
          "                <CategoryID>" +
          FolderID +
          "</CategoryID>" +
          "                <CustomerKey>Intelliseed Lists-" +
          member_id +
          "</CustomerKey>" +
          "                <Name>Intelliseed Lists-" +
          member_id +
          "</Name>" +
          "                <Fields>" +
          "                    <Field>" +
          "                        <CustomerKey>Domain ID</CustomerKey>" +
          "                        <Name>Domain ID</Name>" +
          "                        <FieldType>Text</FieldType>" +
          "                        <MaxLength>50</MaxLength>" +
          "                        <IsRequired>true</IsRequired>" +
          "                        <IsPrimaryKey>false</IsPrimaryKey>" +
          "                    </Field>" +
          "                    <Field>" +
          "                        <CustomerKey>Domain Name</CustomerKey>" +
          "                        <Name>Domain Name</Name>" +
          "                        <FieldType>Text</FieldType>" +
          "                        <MaxLength>100</MaxLength>" +
          "                        <IsRequired>true</IsRequired>" +
          "                        <IsPrimaryKey>true</IsPrimaryKey>" +
          "                    </Field>" +
          "                    <Field>" +
          "                        <CustomerKey>Intelliseed List Name</CustomerKey>" +
          "                        <Name>Intelliseed List Name</Name>" +
          "                        <FieldType>Text</FieldType>" +
          "                        <MaxLength>100</MaxLength>" +
          "                        <IsRequired>false</IsRequired>" +
          "                        <IsPrimaryKey>false</IsPrimaryKey>" +
          "                    </Field>" +
          "                    <Field>" +
          "                        <CustomerKey>Percent of List</CustomerKey>" +
          "                        <Name>Percent of List</Name>" +
          "                        <FieldType>Decimal</FieldType>" +
          "                        <Precision>18</Precision>" +
          "                          <Scale>0</Scale>" +
          "                        <IsRequired>false</IsRequired>" +
          "                        <IsPrimaryKey>false</IsPrimaryKey>" +
          "                    </Field>" +
          "                </Fields>" +
          "            </Objects>" +
          "        </CreateRequest>" +
          "    </s:Body>" +
          "</s:Envelope>";

        return new Promise<any>((resolve, reject) => {
          let headers = {
            "Content-Type": "text/xml",
          };

          // POST to Marketing Cloud Data Extension endpoint to load sample data in the POST body
          axios({
            method: "post",
            url: "" + soap_instance_url + "Service.asmx" + "",
            data: ISLmsg,
            headers: headers,
          })
            .then((response: any) => {
              var parser = new xml2js.Parser();
              parser.parseString(
                response.data,
                (
                  err: any,
                  result: {
                    [x: string]: {
                      [x: string]: { [x: string]: { [x: string]: any }[] }[];
                    };
                  }
                ) => {
                  let IntelliseedLists =
                    result["soap:Envelope"]["soap:Body"][0][
                      "CreateResponse"
                    ][0]["Results"];

                  if (IntelliseedLists != undefined) {
                    let sendresponse = {};
                    let DEexternalKeyIntelliseedLists =
                      IntelliseedLists[0]["Object"][0]["CustomerKey"];

                    //this.DEexternalKeyIntelliseedLists =
                    //IntelliseedLists[0]["Object"][0]["CustomerKey"];

                    sendresponse = {
                      refreshToken: refreshTokenbody,
                      statusText:
                        "Intelliseeds Lists Data extension has been created Successfully",
                      soap_instance_url: soap_instance_url,
                      member_id: member_id,
                      DEexternalKeyIntelliseedLists:
                        DEexternalKeyIntelliseedLists,
                    };
                    res.status(200).send(sendresponse);
                    /* res
                  .status(200)
                  .send(
                    "Intelliseeds Lists Data extension has been created Successfully"
                  ); */
                  }
                }
              );
            })
            .catch((error: any) => {
              // error
              let errorMsg =
                "Error creating the Domain Configuration Data extension......";
              errorMsg += "\nMessage: " + error.message;
              errorMsg +=
                "\nStatus: " + error.response
                  ? error.response.status
                  : "<None>";
              errorMsg +=
                "\nResponse data: " + error.response.data
                  ? Utils.prettyPrintJson(JSON.stringify(error.response.data))
                  : "<None>";
              Utils.logError(errorMsg);

              reject(errorMsg);
            });
        });
      })
      .catch((error: any) => {
        res
          .status(500)
          .send(Utils.prettyPrintJson(JSON.stringify(error.response.data)));
      });
  }

  //Inserting data extension row for Intelliseed Lists
  public insertRowForISL(req: express.Request, res: express.Response) {
    let self = this;
    console.log("insertRowForISL:" + req.body.userInfo.memberid);
    console.log("insertRowForISL:" + req.body.userInfo.soapInstance);
    console.log("insertRowForISL:" + req.body.userInfo.refreshToken);
    console.log("insertRowForISL:" + req.body.userInfo.restInstance);
    console.log(
      "insertRowForISL:" + req.body.userInfo.DEexternalKeyIntelliseedLists
    );

    let refreshTokenbody = "";
    self
      .getRefreshTokenHelper(
        req.body.userInfo.refreshToken,
        req.body.userInfo.tssd,
        false,
        res
      )
      .then((response) => {
        Utils.logInfo(
          "insertRowForISL:" + JSON.stringify(response.refreshToken)
        );
        Utils.logInfo("insertRowForISL:" + JSON.stringify(response.oauthToken));
        refreshTokenbody = response.refreshToken;
        Utils.logInfo("insertRowForISL:" + JSON.stringify(refreshTokenbody));
        if (refreshTokenbody != "") {
          self
            .insertRowForISLHelper(
              response.oauthToken,
              req.body.userInfo.restInstance,
              req.body.userInfo.DEexternalKeyIntelliseedLists,
              JSON.stringify(req.body.intelliseedListsData)
            )
            .then((result) => {
              let sendresponse = {
                statusText: result.statusText,
                refreshToken: refreshTokenbody,
              };
              res.status(result.status).send(sendresponse);
            })
            .catch((err) => {
              res.status(500).send(err);
            });
        } else {
          // error
          let errorMsg =
            "OAuth Access Token *not* found in session.\nPlease complete previous demo step\nto get an OAuth Access Token.";
          Utils.logError(errorMsg);
          res.status(500).send(errorMsg);
        }
      })
      .catch((error: any) => {
        res
          .status(500)
          .send(Utils.prettyPrintJson(JSON.stringify(error.response.data)));
      });
  }

  //Helper method for Insert row in Intelliseeds Lists data extension
  private insertRowForISLHelper(
    oauthAccessToken: string,
    rest_instance_url: string,
    DEexternalKeyIntelliseedLists: string,
    jsonData: string
  ): Promise<any> {
    console.log("JSON data ::: " + jsonData);
    let self = this;
    let _sfmcDataExtensionApiUrl =
      rest_instance_url +
      "/hub/v1/dataevents/key:" +
      DEexternalKeyIntelliseedLists +
      "/rowset";
    return new Promise<any>((resolve, reject) => {
      let headers = {
        "Content-Type": "application/json",
        Authorization: "Bearer " + oauthAccessToken,
      };

      axios
        .post(_sfmcDataExtensionApiUrl, jsonData, { headers: headers })
        .then((response: any) => {
          // success
          resolve({
            status: response.status,
            statusText:
              response.statusText +
              "\n" +
              Utils.prettyPrintJson(JSON.stringify(response.data)),
          });
        })
        .catch((error: any) => {
          // error
          let errorMsg =
            "Error loading data into Intelliseed Lists. POST response from Marketing Cloud:";
          errorMsg += "\nMessage: " + error.message;
          errorMsg +=
            "\nStatus: " + error.response ? error.response.status : "<None>";
          errorMsg +=
            "\nResponse data: " + error.response.data
              ? Utils.prettyPrintJson(JSON.stringify(error.response.data))
              : "<None>";
          Utils.logError(errorMsg);

          reject(errorMsg);
        });
    });
  }

  //row count of domain configuration
  public rowCount(req: express.Request, res: express.Response) {
    let self = this;
    console.log("rowCount:" + req.query.memberid);
    console.log("rowCount:" + req.query.soapInstance);
    console.log("rowCount:" + req.query.refreshToken);
    //console.log("rowCount:" + req.query.restInstance);
    console.log("rowCount:" + req.query.DEexternalKeyDomainConfiguration);
    let refreshTokenbody = "";
    self
      .getRefreshTokenHelper(req.query.refreshToken, req.query.tssd, false, res)
      .then((response) => {
        Utils.logInfo("rowCount:" + JSON.stringify(response.refreshToken));
        Utils.logInfo("rowCount:" + JSON.stringify(response.oauthToken));
        refreshTokenbody = response.refreshToken;
        Utils.logInfo("rowCount:" + JSON.stringify(refreshTokenbody));

        // self.getRefreshTokenHelper(this._accessToken, res);
        if (response.oauthToken != "") {
          self
            .rowCountHelper(
              response.oauthToken,
              req.query.soapInstance,
              req.query.DEexternalKeyDomainConfiguration,
              req.query.domainvalue,
              req.query.memberid
            )
            .then((result) => {
              let sendresponse = {};
              sendresponse = {
                refreshToken: refreshTokenbody,
                rawData: result.rawData,
                rest_instance_url: req.query.restInstance,
                member_id: req.query.memberid,
                soap_instance_url: req.query.soapInstance,
              };
              res.status(result.status).send(sendresponse);
            })
            .catch((err) => {
              res.status(500).send(err);
            });
        } else {
          // error
          let errorMsg =
            "OAuth Access Token *not* found in session.\nPlease complete previous demo step\nto get an OAuth Access Token.";
          Utils.logError(errorMsg);
          res.status(500).send(errorMsg);
        }
      })
      .catch((error: any) => {
        res
          .status(500)
          .send(Utils.prettyPrintJson(JSON.stringify(error.response.data)));
      });
  }

  //helper method for row count of domain configuration
  private rowCountHelper(
    oauthAccessToken: string,
    soap_instance_url: String,
    DEexternalKeyDomainConfiguration: string,
    domainvalue: string,
    memberid: string
  ): Promise<any> {
    let self = this;
    let FiltersoapMessage = "";
    if (domainvalue != undefined && domainvalue != "") {
      FiltersoapMessage =
        '<?xml version="1.0" encoding="UTF-8"?>' +
        '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">' +
        "    <s:Header>" +
        '        <a:Action s:mustUnderstand="1">Retrieve</a:Action>' +
        '        <a:To s:mustUnderstand="1">' +
        soap_instance_url +
        "Service.asmx" +
        "</a:To>" +
        '        <fueloauth xmlns="http://exacttarget.com">' +
        oauthAccessToken +
        "</fueloauth>" +
        "    </s:Header>" +
        '    <s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
        '        <RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">' +
        "            <RetrieveRequest>" +
        "                <ObjectType>DataExtensionObject[Domain Configuration-" +
        memberid +
        "]</ObjectType>" +
        "      <Properties>Domain ID</Properties>" +
        "        <Properties>Domain Name</Properties>" +
        "        <Properties>Inbox Threshold</Properties>" +
        "        <Properties>Engagement Threshold</Properties>" +
        "        <Properties>SPF Threshold</Properties>" +
        "        <Properties>DKIM Threshold</Properties>" +
        "        <Properties>Campaign Min</Properties>" +
        "        <Properties>Intelliseed Lists</Properties>" +
        "        <Properties>Threshold Recipe</Properties>" +
        "        <Properties>Rules Recipe</Properties>" +
        "        <Properties>Created or Modified by</Properties>" +
        '<Filter xsi:type="SimpleFilterPart">' +
        "<Property>Domain Name</Property>" +
        "<SimpleOperator>equals</SimpleOperator>" +
        "<Value>" +
        domainvalue +
        "</Value>" +
        "</Filter>" +
        "            </RetrieveRequest>" +
        "        </RetrieveRequestMsg>" +
        "    </s:Body>" +
        "</s:Envelope>";
      //soapMessage = FiltersoapMessage;
    }
    return new Promise<any>((resolve, reject) => {
      const configs: AxiosRequestConfig = {
        method: "post",
        url: "" + soap_instance_url + "Service.asmx" + "",
        headers: {
          "Content-Type": "text/xml",
        },
        data: FiltersoapMessage,
      };
      axios(configs)
        .then(function (response: any) {
          Utils.logInfo("::::::::: " + response.data);
          let rawdata = response.data;
          var rawData = "";
          var parser = new xml2js.Parser();
          parser.parseString(rawdata, function (err: any, result: any) {
            rawData =
              result["soap:Envelope"]["soap:Body"][0]["RetrieveResponseMsg"][0][
                "Results"
              ];
          });

          resolve({
            rawData: rawData,
            status: response.status,
          });
        })
        .catch(function (error: any) {
          let errorMsg = "Error getting the Data extensions getting rows";
          errorMsg += "\nMessage: " + error.message;
          errorMsg +=
            "\nStatus: " + error.response ? error.response.status : "<None>";
          errorMsg +=
            "\nResponse data: " + error.response.data
              ? Utils.prettyPrintJson(JSON.stringify(error.response.data))
              : "<None>";
          Utils.logError("errormsg:" + errorMsg);

          reject(errorMsg);
        });
    });
    //https://YOUR-HOST.rest.marketingcloudapis.com/data/v1/customobjectdata/key/<DE-KEY>/rowset?$page=1&$pagesize=1
    // let _sfmcDataExtensionApiUrl =
    //   rest_instance_url +
    //   "/data/v1/customobjectdata/key/" +
    //   DEexternalKeyDomainConfiguration +
    //   "/rowset?$page=1&$pagesize=1";

    // return new Promise<any>((resolve, reject) => {
    //   let headers = {
    //     "Content-Type": "application/json",
    //     Authorization: "Bearer " + oauthAccessToken,
    //   };

    //   // POST to Marketing Cloud Data Extension endpoint to load sample data in the POST body
    //   axios
    //     .get(_sfmcDataExtensionApiUrl, { headers: headers })
    //     .then((response: any) => {
    //       // success
    //       resolve({
    //         status: response.status,
    //         statusText: Utils.prettyPrintJson(
    //           JSON.stringify(response.data.count)
    //         ),
    //       });
    //     })
    //     .catch((error: any) => {
    //       // error
    //       let errorMsg =
    //         "Error getting row count. GET response from Marketing Cloud:";
    //       errorMsg += "\nMessage: " + error.message;
    //       errorMsg +=
    //         "\nStatus: " + error.response ? error.response.status : "<None>";
    //       errorMsg +=
    //         "\nResponse data: " + error.response.data
    //           ? Utils.prettyPrintJson(JSON.stringify(error.response.data))
    //           : "<None>";
    //       Utils.logError(errorMsg);

    //       reject(errorMsg);
    //     });
    // });
  }

  //creating data extension for the individual intelliseed
  public filterIdData(req: express.Request, res: express.Response) {
    let self = this;
    //self.getRefreshTokenHelper(this._accessToken, res);
    console.log("filterIdData:" + req.body.userInfo.memberid);
    console.log("filterIdData:" + req.body.userInfo.soapInstance);
    console.log("filterIdData:" + req.body.userInfo.refreshToken);
    Utils.logInfo("filterIdData:" + req.body.userInfo.FolderID);
    //console.log('domainConfigurationDECheck:'+req.body.ParentFolderID);

    let refreshTokenbody = "";
    //this.getRefreshTokenHelper(this._accessToken, res);
    self
      .getRefreshTokenHelper(
        req.body.userInfo.refreshToken,
        req.body.userInfo.tssd,
        false,
        res
      )
      .then((response) => {
        Utils.logInfo("filterIdData:" + JSON.stringify(response.refreshToken));
        Utils.logInfo("filterIdData:" + JSON.stringify(response.oauthToken));
        refreshTokenbody = response.refreshToken;
        Utils.logInfo("filterIdData:" + JSON.stringify(refreshTokenbody));

        if (refreshTokenbody != "") {
          self
            .filterIdDataHelper(
              response.oauthToken,
              req.body.intelliseed_Name,
              req.body.userInfo.memberid,
              req.body.userInfo.soapInstance,
              req.body.userInfo.FolderID
            )
            .then((result) => {
              let sendresponse = {
                statusText: result.statusText,
                refreshToken: refreshTokenbody,
              };
              res.status(result.status).send(sendresponse);
            })
            .catch((err) => {
              res.status(500).send(err);
            });
        } else {
          // error
          let errorMsg =
            "OAuth Access Token *not* found in session.\nPlease complete previous demo step\nto get an OAuth Access Token.";
          Utils.logError(errorMsg);
          res.status(500).send(errorMsg);
        }
      })
      .catch((error: any) => {
        res
          .status(500)
          .send(Utils.prettyPrintJson(JSON.stringify(error.response.data)));
      });
  }

  //helper method for creating data extension for the individual intelliseed
  private filterIdDataHelper(
    oauthAccessToken: string,
    intelliseedDEname: string,
    member_id: string,
    soap_instance_url: string,
    FolderID: string
  ): Promise<any> {
    let self = this;
    const str = intelliseedDEname.replace(/[^a-zA-Z0-9 -]/g, "");
    //str.replace(/[()]/g, "");
    let ISLmsg =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">' +
      "    <s:Header>" +
      '        <a:Action s:mustUnderstand="1">Create</a:Action>' +
      '        <a:To s:mustUnderstand="1">' +
      soap_instance_url +
      "Service.asmx" +
      "</a:To>" +
      '        <fueloauth xmlns="http://exacttarget.com">' +
      oauthAccessToken +
      "</fueloauth>" +
      "    </s:Header>" +
      '    <s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
      '        <CreateRequest xmlns="http://exacttarget.com/wsdl/partnerAPI">' +
      '            <Objects xsi:type="DataExtension">' +
      "                <CategoryID>" +
      FolderID +
      "</CategoryID>" +
      "                <CustomerKey>" +
      str +
      "-" +
      member_id +
      "</CustomerKey>" +
      "                <Name>" +
      str +
      "-" +
      member_id +
      "</Name>" +
      "                <IsSendable>true</IsSendable>" +
      "                <SendableDataExtensionField>" +
      "                    <CustomerKey>Email Address</CustomerKey>" +
      "                    <Name>Email Address</Name>" +
      "                    <FieldType>EmailAddress</FieldType>" +
      "                </SendableDataExtensionField>" +
      "                <SendableSubscriberField>" +
      "                    <Name>Subscriber Key</Name>" +
      "                    <Value></Value>" +
      "                </SendableSubscriberField>" +
      "                <Fields>" +
      "                    <Field>" +
      "                        <CustomerKey>Email Address</CustomerKey>" +
      "                        <Name>Email Address</Name>" +
      "                        <FieldType>EmailAddress</FieldType>" +
      "                        <MaxLength>254</MaxLength>" +
      "                        <IsRequired>true</IsRequired>" +
      "                        <IsPrimaryKey>true</IsPrimaryKey>" +
      "                    </Field>" +
      "                    <Field>" +
      "                        <CustomerKey>Country Code</CustomerKey>" +
      "                        <Name>Country Code</Name>" +
      "                        <FieldType>Text</FieldType>" +
      "                        <MaxLength>100</MaxLength>" +
      "                        <IsRequired>true</IsRequired>" +
      "                        <IsPrimaryKey>false</IsPrimaryKey>" +
      "                    </Field>" +
      "                    <Field>" +
      "                        <CustomerKey>ISP Name</CustomerKey>" +
      "                        <Name>ISP Name</Name>" +
      "                        <FieldType>Text</FieldType>" +
      "                        <MaxLength>100</MaxLength>" +
      "                        <IsRequired>false</IsRequired>" +
      "                        <IsPrimaryKey>false</IsPrimaryKey>" +
      "                    </Field>" +
      "                </Fields>" +
      "            </Objects>" +
      "        </CreateRequest>" +
      "    </s:Body>" +
      "</s:Envelope>";

    return new Promise<any>((resolve, reject) => {
      let headers = {
        "Content-Type": "text/xml",
      };

      axios({
        method: "post",
        url: "" + soap_instance_url + "Service.asmx" + "",
        data: ISLmsg,
        headers: headers,
      })
        .then((response: any) => {
          resolve({
            status: response.status,
            statusText:
              response.statusText +
              "\n" +
              Utils.prettyPrintJson(JSON.stringify(response.data)),
          });
        })
        .catch((error: any) => {
          // error
          let errorMsg =
            "Error creating the Domain Configuration Data extension......";
          errorMsg += "\nMessage: " + error.message;
          errorMsg +=
            "\nStatus: " + error.response ? error.response.status : "<None>";
          errorMsg +=
            "\nResponse data: " + error.response.data
              ? Utils.prettyPrintJson(JSON.stringify(error.response.data))
              : "<None>";
          Utils.logError(errorMsg);
          reject(errorMsg);
        });
    });
  }

  //Individual Intelliseed data extension row insertion
  public FilterSetDataExtensionUpdation(
    req: express.Request,
    res: express.Response
  ) {
    var dataExtName = req.body.DataExtensionName;
    console.log("FilterSetDataExtensionUpdation:" + req.body.memberid);
    console.log("FilterSetDataExtensionUpdation:" + req.body.soapInstance);
    console.log("FilterSetDataExtensionUpdation:" + req.body.refreshToken);
    Utils.logInfo("FilterSetDataExtensionUpdation:" + req.body.restInstance);
    //console.log('domainConfigurationDECheck:'+req.body.ParentFolderID);

    let refreshTokenbody = "";
    //this.getRefreshTokenHelper(this._accessToken, res);
    this.getRefreshTokenHelper(req.body.refreshToken, req.body.tssd, false, res)
      .then((response) => {
        Utils.logInfo(
          "FilterSetDataExtensionUpdation:" +
            JSON.stringify(response.refreshToken)
        );
        Utils.logInfo(
          "FilterSetDataExtensionUpdation:" +
            JSON.stringify(response.oauthToken)
        );
        refreshTokenbody = response.refreshToken;
        Utils.logInfo(
          "FilterSetDataExtensionUpdation:" + JSON.stringify(refreshTokenbody)
        );

        // this.getRefreshTokenHelper(this._accessToken, res);
        Utils.logInfo("Filter Data " + JSON.stringify(req.body));
        let filterData = [req.body][0][dataExtName];
        let self = this;
        [self][req.body.DataExtensionName] = [req.body][0][dataExtName];
        //res.status(200).send("Checking");
        let data = [];
        for (let i = 0; i < filterData.length; i++) {
          data.push({
            keys: {
              "Email Address": filterData[i]["evunEmailAddress"],
            },
            values: {
              "Country Code": filterData[i]["countryCode"],
              "ISP Name": filterData[i]["ispName"],
            },
          });
        }
        if (refreshTokenbody != "") {
          self
            .FilterSetDataExtensionUpdationHelper(
              response.oauthToken,
              JSON.stringify(req.body),
              req.body.DataExtensionName,
              JSON.stringify(data),
              req.body.restInstance,
              req.body.memberid
            )
            .then((result) => {
              let sendresponse = {
                statusText: result.statusText,
                refreshToken: refreshTokenbody,
              };
              res.status(result.status).send(sendresponse);
            })
            .catch((err) => {
              res.status(500).send(err);
            });
        } else {
          // error
          let errorMsg =
            "OAuth Access Token *not* found in session.\nPlease complete previous demo step\nto get an OAuth Access Token.";
          Utils.logError(errorMsg);
          res.status(500).send(errorMsg);
        }
      })
      .catch((error: any) => {
        res
          .status(500)
          .send(Utils.prettyPrintJson(JSON.stringify(error.response.data)));
      });
  }

  //Helper method individual Intelliseed data extension row insertion
  private FilterSetDataExtensionUpdationHelper(
    oauthAccessToken: string,
    jsonData: string,
    extensionName: string,
    extensionData: string,
    rest_instance_url: string,
    member_id: string
  ): Promise<any> {
    let self = this;
    let _sfmcDataExtensionApiUrl =
      rest_instance_url +
      "/hub/v1/dataevents/key:" +
      extensionName.replace(/[^a-zA-Z0-9 -]/g, "") +
      "-" +
      member_id +
      "/rowset";

    return new Promise<any>((resolve, reject) => {
      let headers = {
        "Content-Type": "application/json",
        Authorization: "Bearer " + oauthAccessToken,
      };

      // POST to Marketing Cloud Data Extension endpoint to load sample data in the POST body
      axios
        .post(_sfmcDataExtensionApiUrl, extensionData, { headers: headers })
        .then((response: any) => {
          // success

          resolve({
            status: response.status,
            statusText:
              response.statusText +
              "\n" +
              Utils.prettyPrintJson(JSON.stringify(response.data)),
          });
        })
        .catch((error: any) => {
          // error
          let errorMsg =
            "Error loading data into Intelliseed Lists. POST response from Marketing Cloud:";
          errorMsg += "\nMessage: " + error.message;
          errorMsg +=
            "\nStatus: " + error.response ? error.response.status : "<None>";
          errorMsg +=
            "\nResponse data: " + error.response.data
              ? Utils.prettyPrintJson(JSON.stringify(error.response.data))
              : "<None>";
          Utils.logError(errorMsg);

          reject(errorMsg);
        });
    });
  }

  //checking the Salesforce job stats data extension
  public checkSalesforceJobStats(req: express.Request, res: express.Response) {
    console.log("checkSalesforceJobStats:" + req.body.memberid);
    console.log("checkSalesforceJobStats:" + req.body.soapInstance);
    console.log("checkSalesforceJobStats:" + req.body.refreshToken);
    Utils.logInfo("checkSalesforceJobStats:" + req.body.FolderID);
    //console.log('domainConfigurationDECheck:'+req.body.ParentFolderID);

    let refreshTokenbody = "";
    //this.getRefreshTokenHelper(this._accessToken, res);
    this.getRefreshTokenHelper(req.body.refreshToken, req.body.tssd, false, res)
      .then((response) => {
        Utils.logInfo(
          "checkSalesforceJobStats:" + JSON.stringify(response.refreshToken)
        );
        Utils.logInfo(
          "checkSalesforceJobStats:" + JSON.stringify(response.oauthToken)
        );
        refreshTokenbody = response.refreshToken;
        Utils.logInfo(
          "checkSalesforceJobStats:" + JSON.stringify(refreshTokenbody)
        );
        let soapMessage =
          '<?xml version="1.0" encoding="UTF-8"?>' +
          '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">' +
          "    <s:Header>" +
          '        <a:Action s:mustUnderstand="1">Retrieve</a:Action>' +
          '        <a:To s:mustUnderstand="1">' +
          req.body.soapInstance +
          "Service.asmx" +
          "</a:To>" +
          '        <fueloauth xmlns="http://exacttarget.com">' +
          response.oauthToken +
          "</fueloauth>" +
          "    </s:Header>" +
          '    <s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
          '        <RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">' +
          "            <RetrieveRequest>" +
          "                <ObjectType>DataExtension</ObjectType>" +
          "                <Properties>ObjectID</Properties>" +
          "                <Properties>CustomerKey</Properties>" +
          "                <Properties>Name</Properties>" +
          '                <Filter xsi:type="SimpleFilterPart">' +
          "                    <Property>Name</Property>" +
          "                    <SimpleOperator>equals</SimpleOperator>" +
          "                    <Value>Salesforce Job Stats - " +
          req.body.memberid +
          "</Value>" +
          "                </Filter>" +
          "            </RetrieveRequest>" +
          "        </RetrieveRequestMsg>" +
          "    </s:Body>" +
          "</s:Envelope>";

        return new Promise<any>((resolve, reject) => {
          let headers = {
            "Content-Type": "text/xml",
            SOAPAction: "Retrieve",
          };
          console.log("soapMessage:" + soapMessage);
          axios({
            method: "post",
            url: "" + req.body.soapInstance + "Service.asmx" + "",
            data: soapMessage,
            headers: { "Content-Type": "text/xml" },
          })
            .then((response: any) => {
              console.log("sendjobstats:" + JSON.stringify(response.data));
              var parser = new xml2js.Parser();
              parser.parseString(
                response.data,
                (
                  err: any,
                  result: {
                    [x: string]: {
                      [x: string]: { [x: string]: { [x: string]: any }[] }[];
                    };
                  }
                ) => {
                  let sendJobStats =
                    result["soap:Envelope"]["soap:Body"][0][
                      "RetrieveResponseMsg"
                    ][0]["Results"];
                  console.log("sendJobStats:" + sendJobStats);
                  if (sendJobStats != undefined) {
                    let sendresponse = {
                      jobStatsId: JSON.stringify(
                        result["soap:Envelope"]["soap:Body"][0][
                          "RetrieveResponseMsg"
                        ][0]["Results"][0]["ObjectID"]
                      ).replace(/[^\w\s]/gi, ""),
                      refreshToken: refreshTokenbody,
                      statusText: "Send Job stats already created",
                      soap_instance_url: req.body.soapInstance,
                      member_id: req.body.memberid,
                    };
                    //  res.status(200).send("Send Job stats already created");
                    res.status(200).send(sendresponse);
                  } else {
                    this.creatingSalesforceJobStatsDE(
                      req,
                      res,
                      req.body.memberid,
                      req.body.soapInstance,
                      refreshTokenbody,
                      req.body.FolderID,
                      req.body.tssd
                    );
                  }
                }
              );
            })
            .catch((error: any) => {
              // error
              let errorMsg =
                "Error getting the 'Domain Configuration' Data extension properties......";
              errorMsg += "\nMessage: " + error.message;
              errorMsg +=
                "\nStatus: " + error.response
                  ? error.response.status
                  : "<None>";
              errorMsg +=
                "\nResponse data: " + error.response.data
                  ? Utils.prettyPrintJson(JSON.stringify(error.response.data))
                  : "<None>";
              Utils.logError(errorMsg);

              reject(errorMsg);
            });
        });
      })
      .catch((error: any) => {
        res
          .status(500)
          .send(Utils.prettyPrintJson(JSON.stringify(error.response.data)));
      });
  }

  //creating Salesforce Job Stats Data extension
  public creatingSalesforceJobStatsDE(
    req: express.Request,
    res: express.Response,
    member_id: string,
    soap_instance_url: string,
    refreshToken: string,
    FolderID: string,
    tssd: string
  ) {
    console.log("creatingSalesforceJobStatsDE:" + member_id);
    console.log("creatingSalesforceJobStatsDE:" + soap_instance_url);
    console.log("creatingSalesforceJobStatsDE:" + refreshToken);
    Utils.logInfo("creatingSalesforceJobStatsDE:" + FolderID);
    //console.log('domainConfigurationDECheck:'+req.body.ParentFolderID);

    let refreshTokenbody = "";
    //this.getRefreshTokenHelper(this._accessToken, res);
    this.getRefreshTokenHelper(refreshToken, tssd, false, res)
      .then((response) => {
        Utils.logInfo(
          "creatingSalesforceJobStatsDE:" +
            JSON.stringify(response.refreshToken)
        );
        Utils.logInfo(
          "creatingSalesforceJobStatsDE:" + JSON.stringify(response.oauthToken)
        );
        refreshTokenbody = response.refreshToken;
        Utils.logInfo(
          "creatingSalesforceJobStatsDE:" + JSON.stringify(refreshTokenbody)
        );
        let DCmsg =
          '<?xml version="1.0" encoding="UTF-8"?>' +
          '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">' +
          "    <s:Header>" +
          '        <a:Action s:mustUnderstand="1">Create</a:Action>' +
          '        <a:To s:mustUnderstand="1">' +
          soap_instance_url +
          "Service.asmx" +
          "</a:To>" +
          '        <fueloauth xmlns="http://exacttarget.com">' +
          response.oauthToken +
          "</fueloauth>" +
          "    </s:Header>" +
          '    <s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
          '        <CreateRequest xmlns="http://exacttarget.com/wsdl/partnerAPI">' +
          '            <Objects xsi:type="DataExtension">' +
          "                <CategoryID>" +
          FolderID +
          "</CategoryID>" +
          "                <CustomerKey>Salesforce Job Stats - " +
          member_id +
          "</CustomerKey>" +
          "                <Name>Salesforce Job Stats - " +
          member_id +
          "</Name>" +
          "                <Fields>" +
          "                    <Field>" +
          "                        <CustomerKey>EID</CustomerKey>" +
          "                        <Name>EID</Name>" +
          "                        <FieldType>Text</FieldType>" +
          "                        <MaxLength>50</MaxLength>" +
          "                        <IsRequired>false</IsRequired>" +
          "                        <IsPrimaryKey>false</IsPrimaryKey>" +
          "                    </Field>" +
          "                    <Field>" +
          "                        <CustomerKey>Sends</CustomerKey>" +
          "                        <Name>Sends</Name>" +
          "                        <FieldType>Number</FieldType>" +
          "                        <IsRequired>false</IsRequired>" +
          "                    </Field>" +
          "                    <Field>" +
          "                        <CustomerKey>Opens</CustomerKey>" +
          "                        <Name>Opens</Name>" +
          "                        <FieldType>Number</FieldType>" +
          "                        <IsRequired>false</IsRequired>" +
          "                    </Field>" +
          "                    <Field>" +
          "                        <CustomerKey>Clicks</CustomerKey>" +
          "                        <Name>Clicks</Name>" +
          "                        <FieldType>Number</FieldType>" +
          "                        <IsRequired>false</IsRequired>" +
          "                    </Field>" +
          "                    <Field>" +
          "                        <CustomerKey>unSub</CustomerKey>" +
          "                        <Name>unSub</Name>" +
          "                        <FieldType>Number</FieldType>" +
          "                        <IsRequired>false</IsRequired>" +
          "                    </Field>" +
          "                    <Field>" +
          "                        <CustomerKey>Domain</CustomerKey>" +
          "                        <Name>Domain</Name>" +
          "                        <FieldType>Text</FieldType>" +
          "                        <MaxLength>100</MaxLength>" +
          "                        <IsRequired>false</IsRequired>" +
          "                        <IsPrimaryKey>false</IsPrimaryKey>" +
          "                    </Field>" +
          "                    <Field>" +
          "                        <CustomerKey>Job ID</CustomerKey>" +
          "                        <Name>Job ID</Name>" +
          "                        <FieldType>Text</FieldType>" +
          "                        <MaxLength>100</MaxLength>" +
          "                        <IsRequired>true</IsRequired>" +
          "                        <IsPrimaryKey>true</IsPrimaryKey>" +
          "                    </Field>" +
          "                    <Field>" +
          "                        <CustomerKey>Bounce</CustomerKey>" +
          "                        <Name>Bounce</Name>" +
          "                        <FieldType>Number</FieldType>" +
          "                        <IsRequired>false</IsRequired>" +
          "                    </Field>" +
          "                </Fields>" +
          "            </Objects>" +
          "        </CreateRequest>" +
          "    </s:Body>" +
          "</s:Envelope>";

        return new Promise<any>((resolve, reject) => {
          let headers = {
            "Content-Type": "text/xml",
          };

          // POST to Marketing Cloud Data Extension endpoint to load sample data in the POST body
          axios({
            method: "post",
            url: "" + soap_instance_url + "Service.asmx" + "",
            data: DCmsg,
            headers: headers,
          })
            .then((response: any) => {
              var parser = new xml2js.Parser();
              parser.parseString(
                response.data,
                (
                  err: any,
                  result: {
                    [x: string]: {
                      [x: string]: { [x: string]: { [x: string]: any }[] }[];
                    };
                  }
                ) => {
                  let sendresponse = {};
                  sendresponse = {
                    jobStatsId: JSON.stringify(
                      result["soap:Envelope"]["soap:Body"][0][
                        "CreateResponse"
                      ][0]["Results"][0]["NewObjectID"]
                    ).replace(/[^\w\s]/gi, ""),
                    refreshToken: refreshTokenbody,
                    statusText:
                      "Salesforce job stats Data extension has been created Successfully",
                    soap_instance_url: soap_instance_url,
                    member_id: member_id,
                  };
                  res.status(200).send(sendresponse);
                  /* res
                .status(200)
                .send(
                  "Salesforce job stats Data extension has been created Successfully"
                ); */
                }
              );
            })
            .catch((error: any) => {
              // error
              let errorMsg =
                "Error creating the Salesforce job stats Data extension Data extension......";
              errorMsg += "\nMessage: " + error.message;
              errorMsg +=
                "\nStatus: " + error.response
                  ? error.response.status
                  : "<None>";
              errorMsg +=
                "\nResponse data: " + error.response.data
                  ? Utils.prettyPrintJson(JSON.stringify(error.response.data))
                  : "<None>";
              Utils.logError(errorMsg);

              reject(errorMsg);
            });
        });
      })
      .catch((error: any) => {
        res
          .status(500)
          .send(Utils.prettyPrintJson(JSON.stringify(error.response.data)));
      });
  }

  public sendStatsRow(req: express.Request, res: express.Response) {
    let soapMessage = "";
    console.log("sendStatsRow:" + req.body.memberid);
    console.log("sendStatsRow:" + req.body.soapInstance);
    console.log("sendStatsRow:" + req.body.refreshToken);
    Utils.logInfo("sendStatsRow:" + req.body.FolderID);
    let refreshTokenbody = "";
    //this.getRefreshTokenHelper(this._accessToken, res);
    this.getRefreshTokenHelper(req.body.refreshToken, req.body.tssd, false, res)
      .then((response) => {
        Utils.logInfo("sendStatsRow:" + JSON.stringify(response.refreshToken));
        Utils.logInfo("sendStatsRow:" + JSON.stringify(response.oauthToken));
        refreshTokenbody = response.refreshToken;
        Utils.logInfo("sendStatsRow:" + JSON.stringify(refreshTokenbody));

        if (req.body.xjob != undefined && req.body.xjob != "") {
          let FiltersoapMessage =
            '<?xml version="1.0" encoding="UTF-8"?>' +
            '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">' +
            "    <s:Header>" +
            '        <a:Action s:mustUnderstand="1">Retrieve</a:Action>' +
            '        <a:To s:mustUnderstand="1">' +
            req.body.soapInstance +
            "Service.asmx" +
            "</a:To>" +
            '        <fueloauth xmlns="http://exacttarget.com">' +
            response.oauthToken +
            "</fueloauth>" +
            "    </s:Header>" +
            '    <s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
            '        <RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">' +
            "            <RetrieveRequest>" +
            "                <ObjectType>DataExtensionObject[Salesforce Job Stats - " +
            req.body.memberid +
            "]</ObjectType>" +
            "      <Properties>EID</Properties>" +
            "        <Properties>Sends</Properties>" +
            "        <Properties>Opens</Properties>" +
            "        <Properties>Clicks</Properties>" +
            "        <Properties>unSub</Properties>" +
            "        <Properties>Domain</Properties>" +
            "        <Properties>Job ID</Properties>" +
            "        <Properties>Bounce</Properties>" +
            '<Filter xsi:type="SimpleFilterPart">' +
            "<Property>Job ID</Property>" +
            "<SimpleOperator>equals</SimpleOperator>" +
            "<Value>" +
            req.body.xjob +
            "</Value>" +
            "</Filter>" +
            "            </RetrieveRequest>" +
            "        </RetrieveRequestMsg>" +
            "    </s:Body>" +
            "</s:Envelope>";
          soapMessage = FiltersoapMessage;
        }
        return new Promise<any>((resolve, reject) => {
          const configs: AxiosRequestConfig = {
            method: "post",
            url: "" + req.body.soapInstance + "Service.asmx" + "",
            headers: {
              "Content-Type": "text/xml",
            },
            data: soapMessage,
          };
          axios(configs)
            .then(function (response: any) {
              let rawdata = response.data;
              var rawData = "";
              var parser = new xml2js.Parser();
              parser.parseString(rawdata, function (err: any, result: any) {
                rawData =
                  result["soap:Envelope"]["soap:Body"][0][
                    "RetrieveResponseMsg"
                  ][0]["Results"];
              });
              let sendresponse = {
                refreshToken: refreshTokenbody,
                rawData: rawData,
              };
              res.status(200).send(sendresponse);
            })
            .catch(function (error: any) {
              let errorMsg = "Error getting the Data extensions getting rows";
              errorMsg += "\nMessage: " + error.message;
              errorMsg +=
                "\nStatus: " + error.response
                  ? error.response.status
                  : "<None>";
              errorMsg +=
                "\nResponse data: " + error.response.data
                  ? Utils.prettyPrintJson(JSON.stringify(error.response.data))
                  : "<None>";
              Utils.logError("errormsg:" + errorMsg);

              reject(errorMsg);
            });
        });
      })
      .catch((error: any) => {
        res
          .status(500)
          .send(Utils.prettyPrintJson(JSON.stringify(error.response.data)));
      });
  }

  //checking the Bounce stats data extension
  public checkSalesforceBounceStats(
    req: express.Request,
    res: express.Response
  ) {
    console.log("checkSalesforceBounceStats: " + req.body.memberid);
    console.log("checkSalesforceBounceStats: " + req.body.jobStatId);
    console.log("checkSalesforceBounceStats: " + req.body.soapInstance);
    console.log("checkSalesforceBounceStats: " + req.body.refreshToken);
    Utils.logInfo("checkSalesforceBounceStats: " + req.body.FolderID);
    //console.log('domainConfigurationDECheck:'+req.body.ParentFolderID);

    let refreshTokenbody = "";
    let accessToken = "";
    //this.getRefreshTokenHelper(this._accessToken, res);
    this.getRefreshTokenHelper(req.body.refreshToken, req.body.tssd, false, res)
      .then((response) => {
        Utils.logInfo(
          "checkSalesforceBounceStats:" + JSON.stringify(response.refreshToken)
        );
        Utils.logInfo(
          "checkSalesforceBounceStats:" + JSON.stringify(response.oauthToken)
        );
        accessToken = response.oauthToken;
        refreshTokenbody = response.refreshToken;
        Utils.logInfo(
          "checkSalesforceBounceStats:" + JSON.stringify(refreshTokenbody)
        );
        let soapMessage =
          '<?xml version="1.0" encoding="UTF-8"?>' +
          '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">' +
          "    <s:Header>" +
          '        <a:Action s:mustUnderstand="1">Retrieve</a:Action>' +
          '        <a:To s:mustUnderstand="1">' +
          req.body.soapInstance +
          "Service.asmx" +
          "</a:To>" +
          '        <fueloauth xmlns="http://exacttarget.com">' +
          response.oauthToken +
          "</fueloauth>" +
          "    </s:Header>" +
          '    <s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
          '        <RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">' +
          "            <RetrieveRequest>" +
          "                <ObjectType>DataExtension</ObjectType>" +
          "                <Properties>ObjectID</Properties>" +
          "                <Properties>CustomerKey</Properties>" +
          "                <Properties>Name</Properties>" +
          '                <Filter xsi:type="SimpleFilterPart">' +
          "                    <Property>Name</Property>" +
          "                    <SimpleOperator>equals</SimpleOperator>" +
          "                    <Value>Salesforce Bounce Stats - " +
          req.body.memberid +
          "</Value>" +
          "                </Filter>" +
          "            </RetrieveRequest>" +
          "        </RetrieveRequestMsg>" +
          "    </s:Body>" +
          "</s:Envelope>";

        return new Promise<any>((resolve, reject) => {
          let headers = {
            "Content-Type": "text/xml",
            SOAPAction: "Retrieve",
          };

          axios({
            method: "post",
            url: "" + req.body.soapInstance + "Service.asmx" + "",
            data: soapMessage,
            headers: { "Content-Type": "text/xml" },
          })
            .then((response: any) => {
              var parser = new xml2js.Parser();
              parser.parseString(
                response.data,
                (
                  err: any,
                  result: {
                    [x: string]: {
                      [x: string]: { [x: string]: { [x: string]: any }[] }[];
                    };
                  }
                ) => {
                  let sendJobStats =
                    result["soap:Envelope"]["soap:Body"][0][
                      "RetrieveResponseMsg"
                    ][0]["Results"];
                  console.log("sendJobStatsbounce:" + sendJobStats);
                  if (sendJobStats != undefined) {
                    let sendresponse = {
                      refreshToken: refreshTokenbody,
                      statusText:
                        "Bounce Stats Data extension has been created Successfully",
                      soap_instance_url: req.body.soapInstance,
                      member_id: req.body.memberid,
                    };
                    this.CheckAutomationStudio(
                      accessToken,
                      req.body.jobStatId,
                      JSON.stringify(
                        result["soap:Envelope"]["soap:Body"][0][
                          "RetrieveResponseMsg"
                        ][0]["Results"][0]["ObjectID"]
                      ).replace(/[^\w\s]/gi, ""),
                      req.body.soapInstance.replace(".soap.", ".rest."),
                      req.body.memberid
                    );
                    //  res.status(200).send("Send Job stats already created");
                    res.status(200).send(sendresponse);
                    /*   res
                  .status(200)
                  .send(
                    "Bounce Stats Data extension has been created Successfully"
                  ); */
                  } else {
                    this.creatingBounceStatsDE(
                      req,
                      res,
                      req.body.memberid,
                      req.body.soapInstance,
                      refreshTokenbody,
                      req.body.FolderID,
                      req.body.tssd
                    );
                  }
                }
              );
            })
            .catch((error: any) => {
              // error
              let errorMsg =
                "Error getting the 'Bounce Stats' Data extension properties......";
              errorMsg += "\nMessage: " + error.message;
              errorMsg +=
                "\nStatus: " + error.response
                  ? error.response.status
                  : "<None>";
              errorMsg +=
                "\nResponse data: " + error.response.data
                  ? Utils.prettyPrintJson(JSON.stringify(error.response.data))
                  : "<None>";
              Utils.logError(errorMsg);

              reject(errorMsg);
            });
        });
      })
      .catch((error: any) => {
        res
          .status(500)
          .send(Utils.prettyPrintJson(JSON.stringify(error.response.data)));
      });
  }

  //creating Bounce stats DE
  public creatingBounceStatsDE(
    req: express.Request,
    res: express.Response,
    member_id: string,
    soap_instance_url: string,
    refreshToken: string,
    FolderID: string,
    tssd: string
  ) {
    console.log("creatingBounceStatsDE:" + member_id);
    console.log("creatingBounceStatsDE: jobStatId" + req.body.jobStatId);
    console.log("creatingBounceStatsDE:" + soap_instance_url);
    console.log("creatingBounceStatsDE:" + refreshToken);
    Utils.logInfo("creatingBounceStatsDE:" + FolderID);
    //console.log('domainConfigurationDECheck:'+req.body.ParentFolderID);

    let refreshTokenbody = "";
    let accessToken = "";
    //this.getRefreshTokenHelper(this._accessToken, res);
    this.getRefreshTokenHelper(refreshToken, tssd, false, res)
      .then((response) => {
        Utils.logInfo(
          "creatingSalesforceJobStatsDE:" +
            JSON.stringify(response.refreshToken)
        );
        Utils.logInfo(
          "creatingSalesforceJobStatsDE:" + JSON.stringify(response.oauthToken)
        );
        refreshTokenbody = response.refreshToken;
        accessToken = response.oauthToken;
        Utils.logInfo(
          "creatingSalesforceJobStatsDE:" + JSON.stringify(refreshTokenbody)
        );
        let DCmsg =
          '<?xml version="1.0" encoding="UTF-8"?>' +
          '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">' +
          "    <s:Header>" +
          '        <a:Action s:mustUnderstand="1">Create</a:Action>' +
          '        <a:To s:mustUnderstand="1">' +
          soap_instance_url +
          "Service.asmx" +
          "</a:To>" +
          '        <fueloauth xmlns="http://exacttarget.com">' +
          response.oauthToken +
          "</fueloauth>" +
          "    </s:Header>" +
          '    <s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
          '        <CreateRequest xmlns="http://exacttarget.com/wsdl/partnerAPI">' +
          '            <Objects xsi:type="DataExtension">' +
          "                <CategoryID>" +
          FolderID +
          "</CategoryID>" +
          "                <CustomerKey>Salesforce Bounce Stats - " +
          member_id +
          "</CustomerKey>" +
          "                <Name>Salesforce Bounce Stats - " +
          member_id +
          "</Name>" +
          "                <Fields>" +
          "                    <Field>" +
          "                        <CustomerKey>Account ID</CustomerKey>" +
          "                        <Name>Account ID</Name>" +
          "                        <FieldType>Text</FieldType>" +
          "                        <MaxLength>50</MaxLength>" +
          "                        <IsRequired>false</IsRequired>" +
          "                    </Field>" +
          "                    <Field>" +
          "                        <CustomerKey>Job ID</CustomerKey>" +
          "                        <Name>Job ID</Name>" +
          "                        <FieldType>Text</FieldType>" +
          "                        <MaxLength>50</MaxLength>" +
          "                        <IsRequired>true</IsRequired>" +
          "                    </Field>" +
          "                    <Field>" +
          "                        <CustomerKey>Total Bounce</CustomerKey>" +
          "                        <Name>Total Bounce</Name>" +
          "                        <FieldType>Number</FieldType>" +
          "                        <IsRequired>false</IsRequired>" +
          "                    </Field>" +
          "                    <Field>" +
          "                        <CustomerKey>Bounce Category</CustomerKey>" +
          "                        <Name>Bounce Category</Name>" +
          "                        <FieldType>Text</FieldType>" +
          "                        <IsRequired>false</IsRequired>" +
          "                        <MaxLength>50</MaxLength>" +
          "                    </Field>" +
          "                </Fields>" +
          "            </Objects>" +
          "        </CreateRequest>" +
          "    </s:Body>" +
          "</s:Envelope>";

        Utils.logInfo("Body ::: " + DCmsg);

        return new Promise<any>((resolve, reject) => {
          let headers = {
            "Content-Type": "text/xml",
          };

          // POST to Marketing Cloud Data Extension endpoint to load sample data in the POST body
          axios({
            method: "post",
            url: "" + soap_instance_url + "Service.asmx" + "",
            data: DCmsg,
            headers: headers,
          })
            .then((response: any) => {
              Utils.logInfo("response.data :::" + response.data);
              var parser = new xml2js.Parser();
              parser.parseString(
                response.data,
                (
                  err: any,
                  result: {
                    [x: string]: {
                      [x: string]: { [x: string]: { [x: string]: any }[] }[];
                    };
                  }
                ) => {
                  let sendresponse = {};
                  sendresponse = {
                    refreshToken: refreshTokenbody,
                    statusText:
                      "Bounce stats Data extension has been created Successfully",
                    soap_instance_url: soap_instance_url,
                    member_id: member_id,
                  };
                  this.CheckAutomationStudio(
                    accessToken,
                    req.body.jobStatId,
                    JSON.stringify(
                      result["soap:Envelope"]["soap:Body"][0][
                        "CreateResponse"
                      ][0]["Results"][0]["NewObjectID"]
                    ).replace(/[^\w\s]/gi, ""),
                    req.body.soapInstance.replace(".soap.", ".rest."),
                    req.body.memberid
                  );
                  res.status(200).send(sendresponse);
                  /* res
                .status(200)
                .send(
                  "Bounce stats Data extension has been created Successfully"
                ); */
                }
              );
            })
            .catch((error: any) => {
              // error
              let errorMsg =
                "Error creating the Salesforce job stats Data extension Data extension......";
              errorMsg += "\nMessage: " + error.message;
              errorMsg +=
                "\nStatus: " + error.response
                  ? error.response.status
                  : "<None>";
              errorMsg +=
                "\nResponse data: " + error.response.data
                  ? Utils.prettyPrintJson(JSON.stringify(error.response.data))
                  : "<None>";
              Utils.logError(errorMsg);

              reject(errorMsg);
            });
        });
      })
      .catch((error: any) => {
        res
          .status(500)
          .send(Utils.prettyPrintJson(JSON.stringify(error.response.data)));
      });
  }

  public bounceStatsRow(req: express.Request, res: express.Response) {
    let soapMessage = "";
    console.log("req.body.xjob");
    console.log("sendStatsRow:" + req.body.memberid);
    console.log("sendStatsRow:" + req.body.soapInstance);
    console.log("sendStatsRow:" + req.body.refreshToken);
    Utils.logInfo("sendStatsRow:" + req.body.FolderID);
    let refreshTokenbody = "";
    //this.getRefreshTokenHelper(this._accessToken, res);
    this.getRefreshTokenHelper(req.body.refreshToken, req.body.tssd, false, res)
      .then((response) => {
        Utils.logInfo("sendStatsRow:" + JSON.stringify(response.refreshToken));
        Utils.logInfo("sendStatsRow:" + JSON.stringify(response.oauthToken));
        refreshTokenbody = response.refreshToken;
        Utils.logInfo("sendStatsRow:" + JSON.stringify(refreshTokenbody));
        if (req.body.xjob != undefined && req.body.xjob != "") {
          let FiltersoapMessage =
            '<?xml version="1.0" encoding="UTF-8"?>' +
            '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">' +
            "    <s:Header>" +
            '        <a:Action s:mustUnderstand="1">Retrieve</a:Action>' +
            '        <a:To s:mustUnderstand="1">' +
            req.body.soapInstance +
            "Service.asmx" +
            "</a:To>" +
            '        <fueloauth xmlns="http://exacttarget.com">' +
            response.oauthToken +
            "</fueloauth>" +
            "    </s:Header>" +
            '    <s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
            '        <RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">' +
            "            <RetrieveRequest>" +
            "                <ObjectType>DataExtensionObject[Salesforce Bounce Stats - " +
            req.body.memberid +
            "]</ObjectType>" +
            "      <Properties>Account ID</Properties>" +
            "        <Properties>Job ID</Properties>" +
            "        <Properties>Total Bounce</Properties>" +
            "        <Properties>Bounce Category</Properties>" +
            '<Filter xsi:type="SimpleFilterPart">' +
            "<Property>Job ID</Property>" +
            "<SimpleOperator>equals</SimpleOperator>" +
            "<Value>" +
            req.body.xjob +
            "</Value>" +
            "</Filter>" +
            "            </RetrieveRequest>" +
            "        </RetrieveRequestMsg>" +
            "    </s:Body>" +
            "</s:Envelope>";
          soapMessage = FiltersoapMessage;
        }
        return new Promise<any>((resolve, reject) => {
          const configs: AxiosRequestConfig = {
            method: "post",
            url: "" + req.body.soapInstance + "Service.asmx" + "",
            headers: {
              "Content-Type": "text/xml",
            },
            data: soapMessage,
          };
          axios(configs)
            .then(function (response: any) {
              let rawdata = response.data;
              var rawData = "";
              var parser = new xml2js.Parser();
              parser.parseString(rawdata, function (err: any, result: any) {
                rawData =
                  result["soap:Envelope"]["soap:Body"][0][
                    "RetrieveResponseMsg"
                  ][0]["Results"];
              });
              let sendresponse = {
                refreshToken: refreshTokenbody,
                rawData: rawData,
              };
              res.status(200).send(sendresponse);
              // res.status(200).send(rawData);
            })
            .catch(function (error: any) {
              let errorMsg = "Error getting the Data extensions getting rows";
              errorMsg += "\nMessage: " + error.message;
              errorMsg +=
                "\nStatus: " + error.response
                  ? error.response.status
                  : "<None>";
              errorMsg +=
                "\nResponse data: " + error.response.data
                  ? Utils.prettyPrintJson(JSON.stringify(error.response.data))
                  : "<None>";
              Utils.logError("errormsg:" + errorMsg);

              reject(errorMsg);
            });
        });
      })
      .catch((error: any) => {
        res
          .status(500)
          .send(Utils.prettyPrintJson(JSON.stringify(error.response.data)));
      });
  }

  public getSenderDomain(req: express.Request, res: express.Response) {
    let FiltersoapMessage: string;
    console.log("req.body.xjob" + req.query.senderProfileID);
    console.log("getSenderDomain:" + req.query.memberid);
    console.log("getSenderDomain:" + req.query.soapInstance);
    console.log("getSenderDomain:" + req.query.refreshToken);
    Utils.logInfo("getSenderDomain:" + req.query.FolderID);
    let refreshTokenbody = "";
    //this.getRefreshTokenHelper(this._accessToken, res);
    this.getRefreshTokenHelper(
      req.query.refreshToken,
      req.query.tssd,
      false,
      res
    )
      .then((response) => {
        Utils.logInfo(
          "getSenderDomain:" + JSON.stringify(response.refreshToken)
        );
        Utils.logInfo("getSenderDomain:" + JSON.stringify(response.oauthToken));
        refreshTokenbody = response.refreshToken;
        Utils.logInfo("getSenderDomain:" + JSON.stringify(refreshTokenbody));
        if (
          req.query.senderProfileID != undefined &&
          req.query.senderProfileID != ""
        ) {
          FiltersoapMessage =
            '<?xml version="1.0" encoding="UTF-8"?>' +
            '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">' +
            "    <s:Header>" +
            '        <a:Action s:mustUnderstand="1">Retrieve</a:Action>' +
            '        <a:To s:mustUnderstand="1">' +
            req.query.soapInstance +
            "Service.asmx" +
            "</a:To>" +
            '        <fueloauth xmlns="http://exacttarget.com">' +
            response.oauthToken +
            "</fueloauth>" +
            "    </s:Header>" +
            '    <s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
            '        <RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">' +
            "            <RetrieveRequest>" +
            "                <ObjectType>SenderProfile</ObjectType>" +
            "      <Properties>ObjectID</Properties>" +
            "        <Properties>Name</Properties>" +
            "        <Properties>CustomerKey</Properties>" +
            '<Filter xsi:type="SimpleFilterPart">' +
            "<Property>ObjectID</Property>" +
            "<SimpleOperator>equals</SimpleOperator>" +
            "<Value>" +
            req.query.senderProfileID +
            "</Value>" +
            "</Filter>" +
            "            </RetrieveRequest>" +
            "        </RetrieveRequestMsg>" +
            "    </s:Body>" +
            "</s:Envelope>";
        }
        return new Promise<any>((resolve, reject) => {
          const configs: AxiosRequestConfig = {
            method: "post",
            url: "" + req.query.soapInstance + "Service.asmx" + "",
            headers: {
              "Content-Type": "text/xml",
            },
            data: FiltersoapMessage,
          };
          axios(configs)
            .then(function (response: any) {
              let senderProfileResponse = response.data;
              var senderDomainData = "";
              var parser = new xml2js.Parser();
              parser.parseString(
                senderProfileResponse,
                function (err: any, result: any) {
                  senderDomainData =
                    result["soap:Envelope"]["soap:Body"][0][
                      "RetrieveResponseMsg"
                    ][0]["Results"];
                  if (senderDomainData != undefined) {
                    let domainName =
                      result["soap:Envelope"]["soap:Body"][0][
                        "RetrieveResponseMsg"
                      ][0]["Results"][0]["Name"][0];
                    let sendresponse = {
                      refreshToken: refreshTokenbody,
                      domainName: domainName,
                    };
                    res.status(200).send(sendresponse);
                  }
                }
              );

              // res.status(200).send(rawData);
            })
            .catch(function (error: any) {
              let errorMsg = "Error getting the sender profile ID's domain";
              errorMsg += "\nMessage: " + error.message;
              errorMsg +=
                "\nStatus: " + error.response
                  ? error.response.status
                  : "<None>";
              errorMsg +=
                "\nResponse data: " + error.response.data
                  ? Utils.prettyPrintJson(JSON.stringify(error.response.data))
                  : "<None>";
              Utils.logError("errormsg:" + errorMsg);

              reject(errorMsg);
            });
        });
      })
      .catch((error: any) => {
        res
          .status(500)
          .send(Utils.prettyPrintJson(JSON.stringify(error.response.data)));
      });
  }
}
