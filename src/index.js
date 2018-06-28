
var http = require('http');
var https = require('https');
exports.handler = function (event, context) {
    try {
        //console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

// session starts
function onSessionStarted(sessionStartedRequest, session) {
    //console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId);
}

// when not specified what to do
function onLaunch(launchRequest, session, callback) {
    // console.log("onLaunch requestId=" + launchRequest.requestId);

    // skill launch
    getWelcomeResponse(callback);
}

// user specifies intent
function onIntent(intentRequest, session, callback) {
    // console.log("onIntent requestId=" + intentRequest.requestId);
    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    // skill's intent handlers
    if ("GetSongIntent" === intentName) {
        getSyn(intent, session, callback);
    } else if ("AMAZON.HelpIntent" === intentName) {
        getHelpResponse(callback);
    } else if ("AMAZON.StopIntent" === intentName || "AMAZON.CancelIntent" === intentName) {
        handleSessionEndRequest(callback);
    } else {
        throw "Invalid intent";
    }
}

// user ends session
function onSessionEnded(sessionEndedRequest, session) {
    //console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId);
}

// skill's behaviour

function getWelcomeResponse(callback) {
    var sessionAttributes = {};
    var cardTitle = "Welcome";
    var speechOutput = "Welcome to Lyrical Ly. I can find name of songs and artists.";
    var repromptText = "You can get help by saying help and stop by saying stop and cancel by saying cancel.";
    var shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function getHelpResponse(callback) {
    var sessionAttributes = {};
    var cardTitle = "Help";
    var speechOutput = "To use Lyrical Ly you say some lyrics for which you would like to know song name for.";
    var repromptText = "Go ahead.";
    var shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function handleSessionEndRequest(callback) {
    var cardTitle = "Session Ended";
    var speechOutput = "Thank you for using Lyrical Ly. Keep Humming. Have a nice day!";
    var shouldEndSession = true;//exiting the skill

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
}

function makeTheoRequest(word, theoResponseCallback) {

   if (word===undefined) {
     theoResponseCallback(new Error('undefined'));
   }
  // api here
  word = encodeURIComponent(word);
  var query_url ='https://api.genius.com/search?q='+word+'&access_token=SsUDr__5hfbTJxmDAZj77RsRfEA1jajV56zxuUEfkBtiphsxhCPZOSf5M70rp2LJ';
  var body = '';
  var jsonObject;

  https.get(query_url, (res) => {
      console.log(res.statusMessage);
      console.log(res.statusCode);
    if (res.statusCode==200) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
          body += chunk;
        });
        res.on('end', () => {
          jsonObject = JSON.parse(body);

           theoResponseCallback(null, body);

        });
    }
    // else if (res.statusCode==303) {
    //     query_url ='http://words.bighugelabs.com/api/2/dd7538424e122a7e1188aa55fe67454e/' +res.statusMessage + '/json';
    //     https.get(query_url, (res2) => {
    //         res2.setEncoding('utf8');
    //         res2.on('data', function (chunk) {
    //           body += chunk;
    //         });
    //         res2.on('end', () => {
    //           jsonObject = JSON.parse(body);
    //           theoResponseCallback(null, body);
    //         });
    //     });
    // }
    else {
      theoResponseCallback(new Error(res.statusCode));
    }
  }).on('error', (e) => {
     theoResponseCallback(new Error(e.message));
  });
}

function getSyn(intent, session, callback) {
    var repromptText = null;
    var sessionAttributes = {};
    var shouldEndSession = true;
    var speechOutput = "";
    var maxLength = 0;

    makeTheoRequest( intent.slots.song.value, function theoResponseCallback(err, theoResponseBody) {
        var speechOutput;

        if (err) {
            if (err=='undefined'){
                 speechOutput = "Error";
            }
            else {
                speechOutput = "Try again with some different lyrics.";
            }

        } else {

            var theoResponse = JSON.parse(theoResponseBody);
            
            if (theoResponse.response.hits.length == 0) {
                speechOutput = "Sorry, I can't find the song with these lyrics."
            }
            
            else {
            speechOutput = "Here's what I found. Name of the song is " + theoResponse.response.hits[0].result.full_title;
            }


        }
        callback(sessionAttributes,
             buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
    });

}


//Helper functions

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: "Lyrical Ly",
            content: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}

