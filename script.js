import { joinRoom, selfId } from "https://cdn.skypack.dev/trystero";

var peer = new Peer(selfId);
peer.on("open", function(id) {
  console.log("My peer ID is: " + id, selfId);
});
peer.on("connection", handlePeerConnect);

const config = { appId: "audiotimeline" };
const room = joinRoom(config, "lobby");
window.room = room;

var container = document.getElementById("visualization");
var groups = new vis.DataSet();
groups.add({ id: 1, content: "AUDIO" });
var data = new vis.DataSet();
var options = {};

var timeline = new vis.Timeline(container, data, options);
timeline.setGroups(groups);
timeline.moveTo(Date.now(), {
  animation: false
});

var lastPlay;
timeline.on("select", function(properties) {
  console.log('click',properties)
  var player = document.getElementById("wave" + properties.items);
  var text = document.getElementById("text" + properties.items);
  if (player && player.play) {
    if (lastPlay) {
      lastPlay.pause();
    }
    player.play();
    lastPlay = player;
  } else if (text && spoken){
    console.log('speaking',text)
    spoken.say(text.textContent)
  }
  return false;
});

// REC CODE
var gumStream; //stream from getUserMedia()
var rec; //Recorder.js object
var input; //MediaStreamAudioSourceNode we'll be recording

var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext; //audio context to help us record

var talkButton = document.getElementById("talkButton");
talkButton.addEventListener("click", swapRec);

var speakButton = document.getElementById("speakButton");
speakButton.addEventListener("click", speakUp);
if (!spoken) speakButton.disabled = true;

var time = {};
var active = false;
function swapRec() {
  talkButton.innerHTML = active ? "🤙 Talk" : "✋ Stop";
  if (!active) {
    startRecording();
  } else {
    stopRecording();
  }
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
      console.log(err);
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
  rec.getBuffer(console.log);
  rec.exportWAV(blob => createDownloadLink(blob, time));
  //rec.exportWAV(blob => sendAudio(blob));
  rec.exportWAV(blob => sendPeers(blob, time, selfId));
}

async function createDownloadLink(blob, time, remote) {
  console.log("got data!", blob);
  var url = await URL.createObjectURL(blob);
  var au = document.createElement("audio");
  //add controls to the <audio> element
  au.controls = false;
  if (remote) au.autoplay = true;
  au.src = url;
  var player = au;

  // render locally
  var tsid = Date.now();
  player.id = "wave" + tsid;
  var pdiv = document.createElement("div");
  pdiv.innerHTML = "👋 &#10148;";
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

const [sendAudio, getAudio] = room.makeAction("audio");

getAudio((data, id, meta) => processAudio(data, id, meta));

async function processAudio(data, id, meta) {
  var blob = new Blob([data], { type: "audio/wav" });
  //var blob = data;
  console.log(blob, id, meta);
  createDownloadLink(blob, true);
}

function sendPeers(data, time, id) {
  var send = function(p) {
    //console.log('sending to peer',p)
    var conn = peer.connect(p);
    conn.on("open", function() {
      return new Promise(function(resolve, reject) {
        conn.send({ data, time, id });
      }).then(console.log("sent")); //conn.close();
    });
  };
  everyone(send);
}

function handlePeerConnect(conn) {
  console.log("got connection", conn);
  conn.on("data", handlePeerMessage);
}

function handlePeerMessage(msg) {
  console.log("peer msg", msg);
  createDownloadLink(new Blob([msg.data]), msg.time, msg.id);
}

function everyone(cb) {
  var peers = room.getPeers();
  peers.forEach(peer => cb(peer));
}

function speakUp() {
  console.log("start spoken!");
  spoken.say("Speak Up!").then(e => {
    speakButton.disabled = true;
    speakButton.innerHTML = "👂 ...";
    spoken
      .listen()
      .then(function(transcript) {
        var tsid = Date.now();
        var pdiv = document.createElement("div");
        pdiv.id = "text"+tsid;
        pdiv.innerHTML = transcript;
        var items = [
          {
            id: tsid,
            content: pdiv,
            group: 1,
            start: Date.now()
          }
        ];
        timeline.moveTo(Date.now(), {
          animation: false
        });
        data.add(items);
        timeline.setGroups(groups);
        timeline.fit();
      })
      .then(function(transcript) {
        speakButton.innerHTML = "👄 Text";
        speakButton.disabled = false;
      })
      .catch(e => console.warn(e.message));
  });
}
