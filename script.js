import { joinRoom } from "https://cdn.skypack.dev/trystero";

const config = {appId: 'audiotimeline'}
const room = joinRoom(config, 'lobby')


// DOM element where the Timeline will be attached
var container = document.getElementById("visualization");

// create a Group list
var groups = new vis.DataSet();
groups.add({ id: 1, content: "AUDIO" });
// create a DataSet
var data = new vis.DataSet();
// add items
/*
data.add([
  {
    id: 5,
    group: 1,
    content: "Start!",
    start: Date.now()
  }
]);
*/

// Configuration for the Timeline
var options = {};

// Create a Timeline
var timeline = new vis.Timeline(container, data, options);
timeline.setGroups(groups);
timeline.moveTo(Date.now(), {
  animation: false
});

// play on select
var lastPlay;
timeline.on('select', function (properties) {
  var player = document.getElementById('wave'+properties.items);
  if (lastPlay) { lastPlay.pause(); }
  player.play();
  lastPlay = player;
  return false;
});


// REC CODE
var gumStream; //stream from getUserMedia()
var rec; //Recorder.js object
var input; //MediaStreamAudioSourceNode we'll be recording

// shim for AudioContext when it's not avb.
var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext; //audio context to help us record

var talkButton = document.getElementById("talkButton");
talkButton.addEventListener("click", swapRec);

var time = {};
var active = false;
function swapRec() {
  talkButton.innerHTML = active ? "🤙 Talk": "✋ Stop"
  if (!active) { startRecording() } else { stopRecording() }
  active = !active;
}

function startRecording() {
  console.log("recordButton clicked");
  time.start = Date.now();

  var constraints = {
    audio: true,
    video: false
  };

  navigator.mediaDevices
    .getUserMedia(constraints)
    .then(function(stream) {
 
      audioContext = new AudioContext();

      //update the format
      document.getElementById("formats").innerHTML =
        "Recording: 1 channel pcm @ " + audioContext.sampleRate / 1000 + "kHz";

      /*  assign to gumStream for later use  */
      gumStream = stream;

      /* use the stream */
      input = audioContext.createMediaStreamSource(stream);

      /* 
    	Create the Recorder object and configure to record mono sound (1 channel)
    	Recording 2 channels  will double the file size
    */
      rec = new Recorder(input, {
        numChannels: 1
      });

      //start the recording process
      rec.record();

      console.log("Recording started");
    })
    .catch(function(err) {
       console.log(err)
    });
}

function pauseRecording() {
  console.log("pauseButton clicked rec.recording=", rec.recording);
  if (rec.recording) {
    rec.stop();
  } else {
    rec.record();
  }
}

function stopRecording() {
  console.log("stopButton clicked");
  time.stop = Date.now();
  rec.stop();
  gumStream.getAudioTracks()[0].stop();
  document.getElementById("formats").innerHTML = "";
  //create the wav blob and pass it on to createDownloadLink
  rec.exportWAV(createDownloadLink);
  rec.exportWAV(sendAudio);
}

function createDownloadLink(blob,remote) {
  console.log('got data!',blob)
  var url = URL.createObjectURL(blob);
  var au = document.createElement("audio");
  //add controls to the <audio> element
  au.controls = false;
  if (remote) au.autoplay = true;
  au.src = url;
  var player = au;

  
  // render locally
  var tsid = Date.now();
  player.id = 'wave'+tsid;
  var pdiv = document.createElement("div");
  pdiv.innerHTML = "👋 &#10148;"
  pdiv.appendChild(player);
  var items = [
    {
      id: tsid,
      content: pdiv,
      group: 1,
      start: time.start || Date.now(),
      end: time.stop || undefined
    }
  ];
  timeline.moveTo(time.start || Date.now(), {
    animation: false
  });
  data.add(items);
  timeline.setGroups(groups);
  timeline.fit();
  time = {};
}


// ROOM EVENTS

const [sendAudio, getAudio] = room.makeAction('audio')

getAudio((data, id, meta) => (processAudio(data,id,meta)));

async function processAudio(data,id,meta){
  var blob = new Blob([data], {type: "audio/wav"})
  //var blob = data;
  console.log(blob,id,meta)
  createDownloadLink(blob, true)
}