define(["postmonger"], function (Postmonger) {
  "use strict";
  var connection = new Postmonger.Session();
  let activityKey;
  let subjectData;
  let restEndpoint;
  let emailSubject = "";
  $(window).ready(onRender);
  connection.on("initActivityRunningModal", initialize);
  connection.on("requestedTokens", onGetTokens);
  connection.on("requestedEndpoints", onGetEndpoints);
  connection.on("requestedInteractionDefaults", function (settings) {
    console.log("Default Interaction data is " + settings);
  });

  function onRender() {
    // JB will respond the first time 'ready' is called with 'initActivity'
    connection.trigger("ready");
    connection.trigger("requestTokens");
    connection.trigger("requestInteractionDefaults");
    connection.trigger("requestInteraction");
    connection.trigger("requestEndpoints");
    connection.trigger("destroy");
  }

  function initialize(data) {
    //console.log('initialize func Modal '+data);
    //console.log('activityKey '+data.key.replace('REST',''));
    activityKey = data.key.replace("REST", "");
    connection.on("requestedInteraction", onGetInteraction);
  }

  function onGetInteraction(interaction) {
    //console.log('interaction data '+interaction);
    //console.log('activityKey '+activityKey);
    for (let x in interaction.activities) {
      //console.log('x '+interaction.activities[x].key);
      //console.log('x one '+interaction.activities[x].type);
      let emailKey = interaction.activities[x].key.replace("EMAILV2", "");
      if (
        interaction.activities[x].type == "EMAILV2" &&
        emailKey == activityKey
      ) {
        emailSubject =
          interaction.activities[x].configurationArguments.triggeredSend
            .emailSubject;
      }
    }
  }

  function onGetTokens(tokens) {
    // Response: tokens = { token: <legacy token>, fuel2token: <fuel api token> }
    console.log(tokens);
    if (emailSubject) {
      //console.log('emailSubject '+emailSubject);
      getSubjectData(emailSubject, tokens.fuel2token);
    } else {
      console.log("no subject found for this activity");
    }
  }

  function onGetEndpoints(endpoints) {
    // Response: endpoints = { restHost: <url> } i.e. "rest.s1.qa1.exacttarget.com"
    restEndpoint = endpoints.fuelapiRestHost;
    console.log(restEndpoint);
  }

  function getSubjectData(emaiSubject, token) {
    fetch(
      `/subject/data?subject=${emaiSubject}&token=${token}&endpoint=${restEndpoint}`,
      {
        method: "GET",
      }
    )
      .then((response) => response.json())
      .then((dataValue) => {
        //console.log('getSubjectData '+dataValue);
        subjectData = dataValue ? dataValue.subject : "";
        if (subjectData) {
          let domainData = subjectData.fromAddress;
          domainData = domainData.substring(domainData.indexOf("@") + 1);
          let campagnId = subjectData.campaignId;
          closeModal();
          var win = window.open(
            `https://sfmc.emailanalyst.com/bin/#/inbox/campaign/${campagnId}?tabFocus=active&domains=${domainData}&days=30&includePanel=true&includeSeed=true&includeVirtual=true&ispWeight=false`,
            "_blank"
          );
          if (win) {
            //Browser has allowed it to be opened
            win.focus();
          } else {
            //Browser has blocked it
            alert("Please allow popups for this website");
          }
        } else {
          var win = window.open(
            `https://sfmc.emailanalyst.com/bin/#/inbox/campaign/none?tabFocus=active&domains=none&days=30&includePanel=true&includeSeed=true&includeVirtual=true&ispWeight=false`,
            "_blank"
          );
          if (win) {
            //Browser has allowed it to be opened
            win.focus();
          } else {
            //Browser has blocked it
            alert("Please allow popups for this website");
          }
        }
      })
      .catch((error) => {
        closeModal();
        console.log("api subject runningModal : ", error);
      });
  }

  function closeModal() {
    connection.trigger("destroy");
  }
});
