import { joinRoom, selfId } from "https://cdn.skypack.dev/trystero";

const peers = ['https://gundb-multiserver.glitch.me/1235']
const gun = Gun({peers:peers, localStorage:false, radisk:false});

const roomname = "gun";
var root = gun.get(roomname);
window.gun = gun;
gun.get(roomname).once((data, key)=>{console.log("Initial Connection", key, data)})

const config = { appId: "audiotimeline" };
const room = joinRoom(config, roomname);

var counter = 0;

console.log("IIII AAAMMM", selfId);

var container = document.getElementById("visualization");

// create a Group list
var groups = new vis.DataSet();
groups.add({ id: 1, content: "AUDIO" });

// create a DataSet
var data = new vis.DataSet();

var options = {};

// Create a Timeline
var timeline = new vis.Timeline(container, data, options);
timeline.setGroups(groups);
timeline.moveTo(Date.now(), {
  animation: false
});

// Play audio on select
var lastPlay;
timeline.on("select", function(properties) {
  var player = document.getElementById("wave" + properties.items);
  if (lastPlay) {
    lastPlay.pause();
  }
  if (player && player.play) player.play();
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
  rec.exportWAV(blob => createDownloadLink(blob, time, selfId, counter));
  rec.exportWAV(blob => sendGun(blob, time, selfId, counter));
  counter++
}

function createDownloadLink(blob, time, remote, count) {
  console.log("got data!", blob, time, remote, count);
  var auto = true;
  if (remote == selfId) auto = false;
  console.log('evaluating whether an id exists', !document.getElementById('wave'+remote+count), remote, count)
  if(!document.getElementById('wave'+remote+count)){
    var url = URL.createObjectURL(blob);
    var au = document.createElement("audio");
    //add controls to the <audio> element
    au.controls = false;
    if (auto) au.autoplay = true;
    au.src = url;
    var player = au;

    // render locally
    var tsid = remote + count;
    player.id = "wave" + tsid;
    var pdiv = document.createElement("div");
    pdiv.innerHTML = "👋 &#10148;";
    pdiv.appendChild(player);
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
}

function sendGun(blob, time, selfId, counter) {
  var reader = new FileReader();
  reader.readAsDataURL(blob);
  reader.onloadend = function() {
    var base64data = reader.result;
    console.log('buffer',base64data.length);
    /*
    root
      .get("123")
      .get("meta")
      .put({ name: selfId, time: time });
    root
      .get("123")
      .get("file")
      .put({ data: base64data });
    */
    gun.get(roomname).get('audio').get(selfId).put({id: selfId, count: counter, time: time, data:base64data})
  };
}

// is this right?
root.get('audio').on(audio => shotGun(audio), {change:true})

async function shotGun(data){
  console.log('audio in!',data)
  var dataArray = await gun.get(roomname).map().promOnce();
  for(let data of dataArray) {
    console.log(data.key, data.data, "DATAAAAA");
    if(data.key != "_"){
      let audioObject = await gun.get(data.data._['#']).promOnce();
      if(!audioObject.data.time.start) {
        let timeObject = await gun.get(audioObject.data.time['#']).promOnce()  
        audioObject.data.time = timeObject.data;
        console.log("direct fetch", audioObject.data, timeObject.data);
      }
      processData(audioObject.data, data.data._['#'])
    }
  }
}

function processData(data, soul) {
  //console.log('processing data', data)
  if (!data.time||!data.data||!data.id) return;
    // ignore our own, but his might not be peer id at this point, will check
    if (data.id === selfId) return;
    fetch(data.data)
      .then(res => res.blob())
      .then(blob => createDownloadLink(blob,data.time,data.id, data.count))
}



