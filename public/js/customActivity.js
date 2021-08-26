define(["postmonger"], function (Postmonger) {
  "use strict";

  var connection = new Postmonger.Session();
  var payload = {};
  let activityKey;
  let authToken;
  let restEndpoint;
  let domainConfigList;
  let subjectData;
  let sourceDataList;
  var lastStepEnabled = false;
  var steps = [
    // initialize to the same value as what's set in config.json for consistency
    { label: "Step 1", key: "step1" },
    { label: "Step 2", key: "step2" },
    { label: "Step 3", key: "step3" },
    { label: "Step 4", key: "step4", active: false },
  ];
  var currentStep = steps[0].key;

  $(window).ready(onRender);

  connection.on("initActivity", initialize);
  connection.on("requestedTokens", onGetTokens);
  connection.on("requestedEndpoints", onGetEndpoints);

  connection.on("clickedNext", onClickedNext);
  connection.on("clickedBack", onClickedBack);
  /*connection.on('requestedInteractionDefaults', function(settings) { 
      console.log('Default Interaction data is '+settings);
  });*/

  //connection.on('requestedInteraction', onGetInteraction);

  function onRender() {
    // JB will respond the first time 'ready' is called with 'initActivity'
    connection.trigger('ready');
    connection.trigger('requestTokens');
    //connection.trigger('requestInteractionDefaults');
    connection.trigger('requestInteraction');
    connection.trigger('requestEndpoints');

    // Disable the next button if a value isn't selected
    $("#select1").change(function () {
      var message = getMessage();
      connection.trigger("updateButton", {
        button: "next",
        enabled: Boolean(message),
      });

      $("#message").html(message);
    });

    // Toggle step 4 active/inactive
    // If inactive, wizard hides it and skips over it during navigation
    $("#toggleLastStep").click(function () {
      lastStepEnabled = !lastStepEnabled; // toggle status
      steps[3].active = !steps[3].active; // toggle active

      connection.trigger("updateSteps", steps);
    });
  }

  function initialize(data) {
    if (data) {
      payload = data;
    }

    console.log('initialize func called '+data);
    activityKey = data.key.replace('REST','');
    console.log('activityKey '+activityKey);
    connection.on('requestedInteraction', onGetInteraction);

    var message;
    var hasInArguments = Boolean(
      payload["arguments"] &&
        payload["arguments"].execute &&
        payload["arguments"].execute.inArguments &&
        payload["arguments"].execute.inArguments.length > 0
    );

    var inArguments = hasInArguments
      ? payload["arguments"].execute.inArguments
      : {};
      
  }

  function onGetInteraction(interaction){
    console.log('interaction data '+interaction);
    console.log('activityKey '+activityKey);
    let emailSubject = '';
    for(let x in interaction.activities){
        console.log('x '+interaction.activities[x].key);
        console.log('x one '+interaction.activities[x].type);
        let emailKey = interaction.activities[x].key.replace('EMAILV2','');
        if(interaction.activities[x].type == 'EMAILV2' && emailKey == activityKey){
            emailSubject = interaction.activities[x].configurationArguments.triggeredSend.emailSubject;
        }
    }
    console.log('emailSubject '+emailSubject);
  }

  function onGetTokens (tokens) {
    // Response: tokens = { token: <legacy token>, fuel2token: <fuel api token> }
     console.log(tokens);
     authToken = tokens.fuel2token;  
     //getDomainRows(authToken);
  }

  function onGetEndpoints(endpoints) {
    // Response: endpoints = { restHost: <url> } i.e. "rest.s1.qa1.exacttarget.com"
     restEndpoint = endpoints.fuelapiRestHost;
     console.log(restEndpoint);
  }

  function onClickedNext() {
    save();
  }

  function onClickedBack() {
    connection.trigger("prevStep");
  }

  function save() {
    //var name = $("#select1").find("option:selected").html();
    //var value = getMessage();

    // payload.name = name;

    //payload['arguments'].execute.inArguments = [{ "message": value }];

    // payload["metaData"].icon =
    //   "https://sparkpost-activity.herokuapp.com/images/OrangeIcon.png";
    // payload["metaData"].iconSmall =
    //   "https://sparkpost-activity.herokuapp.com/images/OrangeIcon_25px.png";
    // payload["metaData"].original_icon = "images/OrangeIcon.png";
    // payload["metaData"].original_iconSmall = "images/OrangeIcon_25px.png";

     payload["metaData"].isConfigured = true;

    connection.trigger("updateActivity", payload);
  }

  function getMessage() {
    return;
  }
});
