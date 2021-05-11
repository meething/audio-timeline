// DOM element where the Timeline will be attached
var container = document.getElementById('visualization');

// create a DataSet
var data = new vis.DataSet();

// add items
data.add([
    {id: 5, content: 'item 5', start: '2021-04-15'},
    {id: 6, content:  'item7<br><a href="#" onclick="addItem()">click here</a>', start: '2021-04-17'}
]);

// Configuration for the Timeline
var options = {};

// Create a Timeline
var timeline = new vis.Timeline(container, data, options);

//$('button').click(function() {
window.addItem = function() {
    // Create a DataSet (allows two way data-binding)
    var id = 999;
    var url = "http://ia902606.us.archive.org/35/items/shortpoetry_047_librivox/song_cjrg_teasdale_64kb.mp3";
    var html = "<div id='wave"+id+"'>audio</div>"
    var items = [{id: 7, content: html, start: '2021-04-20'}];
    data.add(items);
        var wave = WaveSurfer.create({
        container: '#wave'+id,
        fillParent: true,
        autoCenter: true,
        mediaControls: true
    });
    wave.load('http://ia902606.us.archive.org/35/items/shortpoetry_047_librivox/song_cjrg_teasdale_64kb.mp3');
    wave.on('ready', function () {
        wave.play();
    });
};