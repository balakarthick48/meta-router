define(["postmonger"], function (Postmonger) {
  "use strict";
  var connection = new Postmonger.Session();
  let activityKey;
  let authToken;
  let restEndpoint;
  let emailSubject = "";
  let domainConfigList = [];
  let subjectData;
  let sourceDataList = [];
  $(window).ready(onRender);
  connection.on("initActivityRunningHover", initialize);
  connection.on("requestedTokens", onGetTokens);
  connection.on("requestedEndpoints", onGetEndpoints);
  connection.on("requestedInteractionDefaults", function (settings) {
    //console.log('Default Interaction data is '+settings);
  });

  function onRender() {
    // JB will respond the first time 'ready' is called with 'initActivity'
    connection.trigger("ready");
    connection.trigger("requestTokens");
    connection.trigger("requestInteractionDefaults");
    connection.trigger("requestInteraction");
    connection.trigger("requestEndpoints");
  }

  function initialize(data) {
    $("#step1").hide();
    $("#step2").show();
    //console.log('initialize func called '+data);
    //console.log('activityKey '+data.key.replace('REST',''));
    console.log('initialize called::' + data.key + "\n" + JSON.stringify(data));
    activityKey = data.key
    connection.on("requestedInteraction", onGetInteraction);
  }

  function onGetInteraction(interaction) {
    console.log('onGetInteraction Called::'+ JSON.stringify(interaction));

    //Find the index that our interaction occurred on.
    //The EMAILV2 interaction will always be the index prior.
    let interactionActivityIndex = -1;
    for (let x in interaction.activities) {
      if (interaction.activities[x].key == activityKey) {
        interactionActivityIndex = x - 1;
        break
      }
    }

    if (interactionActivityIndex > - 1) {
      var emailInteraction = interaction.activities[interactionActivityIndex];
      if (emailInteraction) {
        emailSubject = emailInteraction.configurationArguments.triggeredSend.emailSubject;
      } else {
        console.log("ERROR: Did not find email interaction in position: " + interactionActivityIndex);
      }
    }
    console.log('emailSubject::' + emailSubject);
  }

  function findDifferences() {
    //console.log('findDifferences func called');
    $("#step2").hide();
    $("#step1").show();
    if (sourceDataList.length == 0) {
      $("#inbox_idle").append(
        '<span ><img class="imgSize" src="images/inbox_idle.png" alt="Inbox"></span>'
      );
      $("#inbox_threshold").append("-");
      $("#engagement_idle").append(
        '<span ><img class="imgSize" src="images/engagement_idle.png" alt="Engagement"></span>'
      );
      $("#engagement_threshold").append("-");
      $("#spf_idle").append(
        '<span ><img style="width:23px;height:25px;" src="images/spf_idle.png" alt="SPF"></span>'
      );
      $("#spf_threshold").append("-");
      $("#dkim_idle").append(
        '<span ><img class="imgSize" src="images/dkim_idle.png" alt="DKIM"></span>'
      );
      $("#dkim_threshold").append("-");
    } else if (domainConfigList.length == 0) {
      $("#inbox_idle").append(
        '<span ><img class="imgSize" src="images/inbox_idle.png" alt="Inbox"></span>'
      );
      let inboxData = sourceDataList[0].overallInboxPercentWeighted;
      inboxData != null && inboxData != 0
        ? $("#inbox_threshold").append(Math.ceil(inboxData * 100) + "%")
        : $("#inbox_threshold").append("-");
      $("#engagement_idle").append(
        '<span ><img class="imgSize" src="images/engagement_idle.png" alt="Engagement"></span>'
      );
      let engageData = sourceDataList[0].readRatePercent;
      engageData != null && engageData != 0
        ? $("#engagement_threshold").append(Math.ceil(engageData * 100) + "%")
        : $("#engagement_threshold").append("-");
      $("#spf_idle").append(
        '<span ><img style="width:23px;height:25px;" src="images/spf_idle.png" alt="SPF"></span>'
      );
      let spfData = sourceDataList[0].reputation.spf.passPercentageWeighted;
      spfData != null && spfData != 0
        ? $("#spf_threshold").append(Math.ceil(spfData * 100) + "%")
        : $("#spf_threshold").append("-");
      $("#dkim_idle").append(
        '<span ><img class="imgSize" src="images/dkim_idle.png" alt="DKIM"></span>'
      );
      let dkimData = sourceDataList[0].reputation.dkim.passPercentageWeighted;
      dkimData != null && dkimData != 0
        ? $("#dkim_threshold").append(Math.ceil(dkimData * 100) + "%")
        : $("#dkim_threshold").append("-");
    } else if (domainConfigList.length > 0 && sourceDataList.length > 0) {
      for (var x in domainConfigList) {
        let inboxData = domainConfigList[x].values.inbox_threshold;
        let inboxSource = sourceDataList[0].overallInboxPercentWeighted;
        if (inboxData == "" || inboxData == undefined || inboxData == null) {
          $("#inbox_idle").append(
            '<span ><img class="imgSize" src="images/inbox_idle.png" alt="Inbox"></span>'
          );
          inboxSource != null && inboxSource != 0
            ? $("#inbox_threshold").append(Math.ceil(inboxSource * 100) + "%")
            : $("#inbox_threshold").append("-");
        } else if (
          inboxSource == undefined ||
          inboxSource == null ||
          inboxSource == 0
        ) {
          $("#inbox_idle").append(
            '<span ><img class="imgSize" src="images/inbox_green.png" alt="Inbox"></span>'
          );
          $("#inbox_threshold").append("-");
        } else if (inboxData && inboxSource) {
          Math.ceil(inboxSource * 100) >= inboxData
            ? $("#inbox_idle").append(
                '<span ><img class="imgSize" src="images/inbox_green.png" alt="Inbox"></span>'
              )
            : $("#inbox_idle").append(
                '<span ><img class="imgSize" src="images/inbox_red.png" alt="Inbox"></span>'
              );
          $("#inbox_threshold").append(Math.ceil(inboxSource * 100) + "%");
        }

        let engageData = domainConfigList[x].values.engagement_threshold;
        let engageSource = sourceDataList[0].readRatePercent;
        if (engageData == "" || engageData == undefined || engageData == null) {
          $("#engagement_idle").append(
            '<span ><img class="imgSize" src="images/engagement_idle.png" alt="Engagement"></span>'
          );
          engageSource != null && engageSource != 0
            ? $("#engagement_threshold").append(
                Math.ceil(engageSource * 100) + "%"
              )
            : $("#engagement_threshold").append("-");
        } else if (
          engageSource == undefined ||
          engageSource == null ||
          engageSource == 0
        ) {
          $("#engagement_idle").append(
            '<span ><img class="imgSize" src="images/read_green.png" alt="Engagement"></span>'
          );
          $("#engagement_threshold").append("-");
        } else if (engageData && engageSource) {
          Math.ceil(engageSource * 100) >= engageData
            ? $("#engagement_idle").append(
                '<span ><img class="imgSize" src="images/read_green.png" alt="Engagement"></span>'
              )
            : $("#engagement_idle").append(
                '<span ><img class="imgSize" src="images/read_red.png" alt="Engagement"></span>'
              );
          $("#engagement_threshold").append(
            Math.ceil(engageSource * 100) + "%"
          );
        }

        let spfData = domainConfigList[x].values.spf_threshold;
        let spfSource = sourceDataList[0].reputation.spf.passPercentageWeighted;
        if (
          spfData == "" ||
          spfData == "" ||
          spfData == undefined ||
          spfData == null
        ) {
          $("#spf_idle").append(
            '<span ><img style="width:23px;height:25px;" src="images/spf_idle.png" alt="SPF"></span>'
          );
          spfSource != null && spfSource != 0
            ? $("#spf_threshold").append(Math.ceil(spfSource * 100) + "%")
            : $("#spf_threshold").append("-");
        } else if (
          spfSource == undefined ||
          spfSource == null ||
          spfSource == 0
        ) {
          $("#spf_idle").append(
            '<span ><img style="width:23px;height:25px;" src="images/spf_green.png" alt="SPF"></span>'
          );
          $("#spf_threshold").append("-");
        } else if (spfData && spfSource) {
          Math.ceil(spfSource * 100) >= spfData
            ? $("#spf_idle").append(
                '<span ><img style="width:23px;height:25px;" src="images/spf_green.png" alt="SPF"></span>'
              )
            : $("#spf_idle").append(
                '<span ><img style="width:23px;height:25px;" src="images/spf_red.png" alt="SPF"></span>'
              );
          $("#spf_threshold").append(Math.ceil(spfSource * 100) + "%");
        }

        let dkimData = domainConfigList[x].values.dkim_threshold;
        let dkimSource =
          sourceDataList[0].reputation.dkim.passPercentageWeighted;
        if (dkimData == "" || dkimData == undefined || dkimData == null) {
          $("#dkim_idle").append(
            '<span ><img class="imgSize" src="images/dkim_idle.png" alt="DKIM"></span>'
          );
          dkimSource != null && dkimSource != 0
            ? $("#dkim_threshold").append(Math.ceil(dkimSource * 100) + "%")
            : $("#dkim_threshold").append("-");
        } else if (
          dkimSource == undefined ||
          dkimSource == null ||
          dkimSource == 0
        ) {
          $("#dkim_idle").append(
            '<span ><img class="imgSize" src="images/dkim_green.png" alt="DKIM"></span>'
          );
          $("#dkim_threshold").append("-");
        } else if (dkimData && dkimSource) {
          Math.ceil(dkimSource * 100) >= dkimData
            ? $("#dkim_idle").append(
                '<span ><img class="imgSize" src="images/dkim_green.png" alt="DKIM"></span>'
              )
            : $("#dkim_idle").append(
                '<span ><img class="imgSize" src="images/dkim_red.png" alt="DKIM"></span>'
              );
          $("#dkim_threshold").append(Math.ceil(dkimSource * 100) + "%");
        }

        //for(var y in domainConfigList)[x]['Properties'][0]['Property']){

        // if(domainConfigList[x].values == 'Inbox Threshold'){
        //     let domainData = JSON.parse(domainConfigList)[x]['Properties'][0]['Property'][y]['Value'].toString();
        //     let sourData = JSON.parse(sourceDataList)[0].overallInboxPercentWeighted;
        //     //let diffValue = sourData != '-' ? Math.ceil((parseInt(sourData * 100) - parseInt(domainData)))+'%' : '-';
        //     //if(domainData != '-') Math.ceil(sourData * 100) >= domainData ? $('#inbox_idle').append('<span ><img class="imgSize" src="images/inbox_green.png" alt="Inbox"></span>') : $('#inbox_idle').append('<span ><img class="imgSize" src="images/inbox_red.png" alt="Inbox"></span>');
        //     if(domainData == '' || domainData == undefined || domainData == null) {
        //       $('#inbox_idle').append('<span ><img class="imgSize" src="images/inbox_idle.png" alt="Inbox"></span>');
        //       sourData != null && sourData != 0 ? $('#inbox_threshold').append(Math.ceil(sourData * 100)+'%') : $('#inbox_threshold').append('-');
        //     } else if(sourData == undefined || sourData == null || sourData == 0) {
        //       $('#inbox_idle').append('<span ><img class="imgSize" src="images/inbox_green.png" alt="Inbox"></span>');
        //       $('#inbox_threshold').append('-');
        //     } else if(domainData && sourData){
        //       Math.ceil(sourData * 100) >= domainData ? $('#inbox_idle').append('<span ><img class="imgSize" src="images/inbox_green.png" alt="Inbox"></span>') : $('#inbox_idle').append('<span ><img class="imgSize" src="images/inbox_red.png" alt="Inbox"></span>');
        //       $('#inbox_threshold').append(Math.ceil(sourData * 100)+'%');
        //     }
        // } else if(JSON.parse(domainConfigList)[x]['Properties'][0]['Property'][y]['Name'].toString() == 'Engagement Threshold'){
        //     let domainData = JSON.parse(domainConfigList)[x]['Properties'][0]['Property'][y]['Value'].toString();
        //     let sourData = JSON.parse(sourceDataList)[0].readRatePercent;
        //     //let diffValue = sourData != '-' ? Math.ceil((parseInt(sourData * 100) - parseInt(domainData)))+'%' : '-';
        //     //if(domainData != '-') Math.ceil(sourData * 100) >= domainData ? $('#engagement_idle').append('<span ><img class="imgSize" src="images/read_green.png" alt="Engagement"></span>') : $('#engagement_idle').append('<span ><img class="imgSize" src="images/read_red.png" alt="Engagement"></span>');
        //     if(domainData == '' || domainData == undefined || domainData == null) {
        //       $('#engagement_idle').append('<span ><img class="imgSize" src="images/engagement_idle.png" alt="Engagement"></span>');
        //       sourData != null && sourData != 0 ? $('#engagement_threshold').append(Math.ceil(sourData * 100)+'%') : $('#engagement_threshold').append('-');
        //     } else if(sourData == undefined || sourData == null || sourData == 0) {
        //       $('#engagement_idle').append('<span ><img class="imgSize" src="images/read_green.png" alt="Engagement"></span>');
        //       $('#engagement_threshold').append('-');
        //     } else if(domainData && sourData){
        //       Math.ceil(sourData * 100) >= domainData ? $('#engagement_idle').append('<span ><img class="imgSize" src="images/read_green.png" alt="Engagement"></span>') : $('#engagement_idle').append('<span ><img class="imgSize" src="images/read_red.png" alt="Engagement"></span>');
        //       $('#engagement_threshold').append(Math.ceil(sourData * 100)+'%');
        //     }
        //     //if(domainData == '-') $('#engagement_idle').append('<span ><img class="imgSize" src="images/read_green.png" alt="Engagement"></span>');

        // } else if(JSON.parse(domainConfigList)[x]['Properties'][0]['Property'][y]['Name'].toString() == 'SPF Threshold'){
        //     let domainData = JSON.parse(domainConfigList)[x]['Properties'][0]['Property'][y]['Value'].toString();
        //     let sourData = JSON.parse(sourceDataList)[0].reputation.spf.passPercentageWeighted;
        //     //let diffValue = sourData != '-' ? Math.ceil((parseInt(sourData * 100) - parseInt(domainData)))+'%' : '-';
        //     //if(domainData != '-') Math.ceil(sourData * 100) >= domainData ? $('#spf_idle').append('<span ><img class="imgSize" src="images/spf_green.png" alt="SPF"></span>') : $('#spf_idle').append('<span ><img class="imgSize" src="images/spf_red.png" alt="SPF"></span>');
        //     if(domainData == '' || domainData == '' || domainData == undefined || domainData == null) {
        //       $('#spf_idle').append('<span ><img style="width:23px;height:25px;" src="images/spf_idle.png" alt="SPF"></span>');
        //       sourData != null && sourData != 0 ? $('#spf_threshold').append(Math.ceil(sourData * 100)+'%') : $('#spf_threshold').append('-');
        //     } else if(sourData == undefined || sourData == null || sourData == 0) {
        //       $('#spf_idle').append('<span ><img style="width:23px;height:25px;" src="images/spf_green.png" alt="SPF"></span>');
        //       $('#spf_threshold').append('-');
        //     } else if(domainData && sourData){
        //       Math.ceil(sourData * 100) >= domainData ? $('#spf_idle').append('<span ><img style="width:23px;height:25px;" src="images/spf_green.png" alt="SPF"></span>') : $('#spf_idle').append('<span ><img style="width:23px;height:25px;" src="images/spf_red.png" alt="SPF"></span>');
        //       $('#spf_threshold').append(Math.ceil(sourData * 100)+'%');
        //     }
        //     //if(domainData == '-') $('#spf_idle').append('<span ><img class="imgSize" src="images/spf_green.png" alt="SPF"></span>');
        //     //sourData != 0 ? $('#spf_threshold').append(Math.ceil(sourData * 100)) : $('#spf_threshold').append('-');
        // } else if(JSON.parse(domainConfigList)[x]['Properties'][0]['Property'][y]['Name'].toString() == 'DKIM Threshold'){
        //     let domainData = JSON.parse(domainConfigList)[x]['Properties'][0]['Property'][y]['Value'].toString();
        //     let sourData = JSON.parse(sourceDataList)[0].reputation.dkim.passPercentageWeighted;
        //     //let diffValue = sourData != '-' ? Math.ceil((parseInt(sourData * 100)) - parseInt(domainData))+'%' : '-';
        //     //if(domainData != '-') Math.ceil(sourData * 100) >= domainData ? $('#dkim_idle').append('<span ><img class="imgSize" src="images/dkim_green.png" alt="DKIM"></span>') : $('#dkim_idle').append('<span ><img class="imgSize" src="images/dkim_red.png" alt="DKIM"></span>');
        //     if(domainData == '' || domainData == undefined || domainData == null) {
        //       $('#dkim_idle').append('<span ><img class="imgSize" src="images/dkim_idle.png" alt="DKIM"></span>');
        //       sourData != null && sourData != 0 ? $('#dkim_threshold').append(Math.ceil(sourData * 100)+'%') : $('#dkim_threshold').append('-');
        //     } else if(sourData == undefined || sourData == null || sourData == 0) {
        //       $('#dkim_idle').append('<span ><img class="imgSize" src="images/dkim_green.png" alt="DKIM"></span>');
        //       $('#dkim_threshold').append('-');
        //     } else if(domainData && sourData){
        //       Math.ceil(sourData * 100) >= domainData ? $('#dkim_idle').append('<span ><img class="imgSize" src="images/dkim_green.png" alt="DKIM"></span>') : $('#dkim_idle').append('<span ><img class="imgSize" src="images/dkim_red.png" alt="DKIM"></span>');
        //       $('#dkim_threshold').append(Math.ceil(sourData * 100)+'%');
        //     }
        // }
        //}
      }
    }
  }

  function onGetTokens(tokens) {
    // Response: tokens = { token: <legacy token>, fuel2token: <fuel api token> }
    console.log('onGetTokens func called::' + tokens.fuel2token);
    //console.log(tokens);
    authToken = tokens.fuel2token;
    if (emailSubject) {
      //console.log('emailSubject '+emailSubject);
      getSubjectData();
    } else {
      console.log("no subject found for this activity");
    }
    //setTimeout(function(){ getDomainRows(authToken); }, 5000);
  }

  function onGetEndpoints(endpoints) {
    // Response: endpoints = { restHost: <url> } i.e. "rest.s1.qa1.exacttarget.com"
    restEndpoint = endpoints.fuelapiRestHost;
    console.log(restEndpoint);
  }

  function getDomainRows() {
    //console.log('domainRows subjectData '+subjectData);
    let domainData = subjectData ? subjectData.fromAddress : "";
    domainData = domainData
      ? domainData.substring(domainData.indexOf("@") + 1)
      : "";
    fetch(`/retrieve/domainrows?token=${authToken}&endpoint=${restEndpoint}`, {
      method: "POST",
    })
      .then((response) => response.json())
      .then((dataValue) => {
        let tempRowData = dataValue
          ? JSON.parse(JSON.stringify(dataValue).replaceAll(" ", "_"))
          : [];
        for (var x in tempRowData) {
          if (tempRowData[x].keys.domain_name == domainData) {
            domainConfigList.push(tempRowData[x]);
          }
        }
        findDifferences();
      })
      .catch((error) => {
        console.log("Domain List runningHover : ", error);
      });
  }

  function getSubjectData() {
    console.log('getSubjectData::/subject/data.  subject:' + emailSubject + ',auth:' + authToken + ',endpoint:' + restEndpoint);
    fetch(
      `/subject/data?subject=${emailSubject}&token=${authToken}&endpoint=${restEndpoint}`,
      {
        method: "GET",
      }
    )
      .then((response) => { 
        console.log('getSubjectData::json the response')
        return response.json()
      })
      .then((dataValue) => {
        console.log('getSubjectData::json::'+dataValue);
        subjectData = dataValue.subject;
        if (subjectData) {
          console.log('calling getOriginalData. acct_id:' +dataValue.acc_id);
          getOriginalData(dataValue.acc_id);
        } else {
          console.log('calling findDifferences.');
          sourceDataList = [];
          findDifferences();
        }
      })
      .catch((error) => {
        sourceDataList = [];
        console.log("api subject runningHover : ", error);
      });
  }

  function getOriginalData(sparkpostUserId) {
    //console.log('getOriginalData subjectData '+subjectData);
    //console.log('authToken '+authToken);
    let cam_Idenfier = subjectData.campaignIdentifier;

    fetch(`/source/data?acc_id=${sparkpostUserId}&header_val=${cam_Idenfier}`, {
      method: "GET",
    })
      .then((response) => response.json())
      .then((dataValue) => {
        sourceDataList = dataValue.length == 0 ? [] : dataValue;
        getDomainRows();
      })
      .catch((error) => {
        sourceDataList = [];
        console.log("api source runningHover : ", error);
      });
  }
});
