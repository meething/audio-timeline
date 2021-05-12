import { joinRoom, selfId } from "https://cdn.skypack.dev/trystero";

const config = {appId: 'audiotimeline'}
const room = joinRoom(config, 'lobby')


// DOM element where the Timeline will be attached
var container = document.getElementById("visualization");

// create a Group list
var groupIds = [];
groupIds.push(selfId)
var groups = false;

function refreshGroups(){
  var upgroups = new vis.DataSet();
  groupIds.forEach(function(id){
    upgroups.add({ id: id+1, content: groupIds[id] });
  });
  groups = upgroups;
  timeline.setGroups(upgroups);
}

// create a DataSet
var data = new vis.DataSet();
// add items

data.add([
  {
    id: 1,
    group: 1,
    content: "Start!",
    start: Date.now()
  }
]);


// Configuration for the Timeline
var options = {};

// Create a Timeline
var timeline = new vis.Timeline(container, data, options);
refreshGroups();
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

      gumStream = stream;
      input = audioContext.createMediaStreamSource(stream);
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
  rec.exportWAV(blob => sendAudio(blob));
  
}

function createDownloadLink(blob,remote) {
  console.log('got data!',blob,remote)
  
  if (remote && !groupIds[remote]){
    groupIds.push(remote);
    refreshGroups();
  }
  
  var url = URL.createObjectURL(blob);
  var au = document.createElement("audio");
  au.controls = false;
  au.src = url;
  if (remote) au.autoplay = true;

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
      group: 0,
      title: "audio",
      start: time.start || Date.now(),
      end: time.stop || Date.now()+600
    }
  ];
  timeline.moveTo(time.start || Date.now()-600, {
    animation: false
  });
  data.add(items);
  timeline.setGroups(groups);
  //timeline.fit();
  time = {};
}


// ROOM EVENTS

const [sendAudio, getAudio] = room.makeAction('audio')

// blobs are automatically handled, as are any form of TypedArray
// canvas.toBlob(blob => sendAudio(blob))

// binary data is received as raw ArrayBuffers so your handling code should
// interpret it in a way that makes sense
getAudio((data, id, meta) => (processAudio(data,id,meta) ));
function processAudio(data,id,meta){
  var blob = new Blob([data], {type: "audio/wav"})
  console.log(blob,id,meta)
  createDownloadLink(blob,id)
}