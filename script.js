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

  /*
  	Simple constraints object, for more advanced audio features see
  	https://addpipe.com/blog/audio-constraints-getusermedia/
  */

  var constraints = {
    audio: true,
    video: false
  };


  /*
    	We're using the standard promise based getUserMedia() 
    	https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
	*/

  navigator.mediaDevices
    .getUserMedia(constraints)
    .then(function(stream) {
      console.log(
        "getUserMedia() success, stream created, initializing Recorder.js ..."
      );

      /*
    	create an audio context after getUserMedia is called
    	sampleRate might change after getUserMedia is called, like it does on macOS when recording through AirPods
    	the sampleRate defaults to the one set in your OS for your playback device
    */
      audioContext = new AudioContext();

      //update the format
      document.getElementById("formats").innerHTML =
        "Format: 1 channel pcm @ " + audioContext.sampleRate / 1000 + "kHz";

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
     
    });
}

function pauseRecording() {
  console.log("pauseButton clicked rec.recording=", rec.recording);
  if (rec.recording) {
    //pause
    rec.stop();
  } else {
    //resume
    rec.record();
  }
}

function stopRecording() {
  console.log("stopButton clicked");
  time.stop = Date.now();
  //tell the recorder to stop the recording
  rec.stop();

  //stop microphone access
  gumStream.getAudioTracks()[0].stop();

  //create the wav blob and pass it on to createDownloadLink
  rec.exportWAV(createDownloadLink);
}

function createDownloadLink(blob) {
  var url = URL.createObjectURL(blob);
  var au = document.createElement("audio");
  var li = document.createElement("li");
  var link = document.createElement("a");

  //name of .wav file to use during upload and download (without extendion)
  var filename = new Date().toISOString();

  //add controls to the <audio> element
  au.controls = false;
  au.autoplay = true;
  au.src = url;

  var player = au;

  //save to disk link
  link.href = url;
  link.download = filename + ".wav"; //download forces the browser to donwload the file using the  filename
  link.innerHTML = "Save to disk";

  //add the new audio element to li
  li.appendChild(au);

  //add the filename to the li
  li.appendChild(document.createTextNode(filename + ".wav "));

  //add the save to disk link to li
  li.appendChild(link);

  //add the li element to the ol
  //recordingsList.appendChild(li);

  console.log("html", player);

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
      title: "audio",
      start: time.start,
      end: time.stop
    }
  ];
  timeline.moveTo(time.start, {
    animation: false
  });
  data.add(items);
  timeline.setGroups(groups);
  timeline.fit();
  time = {};
}
