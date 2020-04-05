/*****************************************************************************\
********************************** V I D A ************************************
*******************************************************************************

  p5.vida 0.3.00a by Paweł Janicki, 2017-2019
    https://tetoki.eu/vida | https://paweljanicki.jp

*******************************************************************************

  VIDA by Paweł Janicki is licensed under a Creative Commons
  Attribution-ShareAlike 4.0 International License
  (http://creativecommons.org/licenses/by-sa/4.0/). Based on a work at:
  https://tetoki.eu.

*******************************************************************************

  VIDA is a simple library that adds camera (or video) based motion detection
  and blob tracking functionality to p5js.

  The library allows motion detection based on a static or progressive
  background; defining rectangular zones in the monitored image, inside which
  the occurrence of motion triggers the reaction of the program; detection of
  moving objects ("blobs") with unique index, position, mass, rectangle,
  approximated polygon.

  The main guidelines of the library are to maintain the code in a compact
  form, easy to modify, hack and rework.

  VIDA is a part of the Tetoki! project (https://tetoki.eu) and is developed
  thanks to substantial help and cooperation with the WRO Art Center
  (https://wrocenter.pl) and HAT Research Center
  (http://artandsciencestudies.com).

  Notes:

    [1] Limitations: of course, the use of the camera from within web browser
    is subject to various restrictions mainly related to security settings (in
    particular, browsers differ significantly in terms of enabling access to
    the video camera for webpages (eg p5js sketches) loaded from local media or
    from the network - in the last case it is also important if the connection
    uses the HTTPS protocol [or HTTP]). Therefore, if there are problems with
    access to the video camera from within a web browser, it is worth testing a
    different one. During developement, for on-the-fly checks, VIDA is mainly
    tested with Firefox, which by default allows you to access the video camera
    from files loaded from local media. VIDA itself does not impose any
    additional specific restrictions related to the type and parameters of the
    camera - any video camera working with p5js should work with the library.
    You can find valuable information on this topic at https://webrtc.org and
    in the documentation of the web browser you use.
    
    [2] Also it is worth remembering that blob detection is rather expensive
    computationally, so it's worth to stick to the lowest possible video
    resolutions if you plan to run your programs on the hardware, the
    performance you are not sure. The efficiency in processing video from a
    video camera and video files should be similar.

    [3] VIDA is using (with a few exceptions) normalized coords instead of
    pixel-based. Thus, the coordinates of the active zones, the location of
    detected moving objects (and some of their other parameters) are
    represented by floating point numbers within the range from 0.0 to 1.0. The
    use of normalized coordinates and parameters allows to manipulate the
    resolution of the image being processed (eg from a video camera) without
    having to change eg the position of active zones. analogously, data
    describing moving objects is easier to use, if their values are not related
    to any specific resolution expressed in pixels. Names of all normalized
    parameters are preceded by the prefix "norm". The upper left corner of the
    image has the coordinates [0.0, 0.0]. The bottom right corner of the image
    has the coordinates [1.0, 1.0].

                      [0.0, 0.0]
                      +------------------------------|
                      |              [0.5, 0.2]      |
                      |              +               |
                      |                              |
                      |      [0.25, 0.5]             |
                      |      +                       |
                      |                              |
                      |                   [0.7, 0.8] |
                      |                   +          |
                      |                              |
                      |------------------------------+
                                                     [1.0, 1.0]
                                                     
\*****************************************************************************/

var myVideo, // video file
    myVida;  // VIDA
let dropzone;
let firstSound = 0;
let c;

let linePoint1 = [100,100];
let linePoint2 = [200,200];
let gBool = 0;
var startOsc;

  
/*
  Some web browsers do not allow the automatic start of a video file and allow
  you to play the file only as a result of user interaction. Therefore, we will
  use this variable to manage the start of the file after interacting with the
  user.
*/

var interactionStartedFlag = false;

/*
  We will use the sound in this example (so remember to add the p5.Sound
  library to your project if you want to recreate this). This array will be
  used to store oscillators.
*/
var synth = [];
var oscTest = new p5.Oscillator('sine');

function setup() {
  startOsc=0;
  //canvas centered in x 

  canvasVOffset = 100;
  c = createCanvas(3 * windowWidth/6, 3 * windowHeight/6); // we need some space...
  c.position(windowWidth/2 - width/2,canvasVOffset);
  c.mousePressed(playOscillator);
  
  
  
  p1 = createP("Other videos to try: ");
  p2 = createP("...or upload your own video below!");
  b1 = select('#b1');
  b2 = select('#b2');
  b3 = select('#b3');

  var buttonHeight = (canvasVOffset) / 2;
  p1.size(width/5, buttonHeight);
  p2.size(width/5, buttonHeight);
  b1.size(width/5, buttonHeight);
  b2.size(width/5, buttonHeight);
  b3.size(width/5, buttonHeight);
  

  var vOffset = canvasVOffset - buttonHeight;
  p1.position(windowWidth/2 - c.width/2, vOffset);
  b1.position(windowWidth/2 - c.width/2 + p1.width, vOffset);
  b2.position(windowWidth/2 - c.width/2 + p1.width+ b1.width, vOffset);
  b3.position(windowWidth/2 - c.width/2 + p1.width + b1.width + b2.width, vOffset);
  p2.position(windowWidth/2 - c.width/2 + p1.width + b1.width + b2.width + b3.width + 20, vOffset);
  

  b1.mousePressed(button1);
  b2.mousePressed(button2);
  b3.mousePressed(button3);


  
  dropzone = select('#dropzone');
  dropzone.position(windowWidth/2-dropzone.width/2,450);
  dropzone.dragOver(highlight);
  dropzone.dragLeave(unhighlight);
  dropzone.drop(gotFile,unhighlight);
  // load test video file
  myVideo = createVideo(['Paranal.mp4']);

  myVideo.size(windowWidth/2,windowHeight/2);
  // workaround for browser autoplay restrictions
  
  // fix for some mobile browsers
  myVideo.elt.setAttribute('playsinline', '');
  // loop the video, hide the original object and start the playback
  myVideo.loop(); myVideo.hide();
  myVideo.elt.muted = true;
  myVideo.volume(0);
  /*
    VIDA stuff. One parameter - the current sketch - should be passed to the
    class constructor (thanks to this you can use Vida e.g. in the instance
    mode).
  */
  myVida = new Vida(this); // create the object
  /*
    Turn on the progressive background mode.
  */
  myVida.progressiveBackgroundFlag = true;
  /*
    The value of the feedback for the procedure that calculates the background
    image in progressive mode. The value should be in the range from 0.0 to 1.0
    (float). Typical values of this variable are in the range between ~0.9 and
    ~0.98.
  */
  myVida.imageFilterFeedback = 0.935;
  /*
    The value of the threshold for the procedure that calculates the threshold
    image. The value should be in the range from 0.0 to 1.0 (float).
  */
  myVida.imageFilterThreshold = 0.1;
  /*
    In order for VIDA to handle active zones (it doesn't by default), we set
    this flag.
  */
  myVida.handleActiveZonesFlag = true;
  /*
    If you want to change the default sensitivity of active zones, use this
    function. The value (floating point number in the range from 0.0 to 1.0)
    passed to the function determines the movement intensity threshold which
    must be exceeded to trigger the zone (so, higher the parameter value =
    lower the zone sensitivity).
  */
  myVida.setActiveZonesNormFillThreshold(0.02);
  /*
    Let's create several active zones. VIDA uses normalized (in the range from
    0.0 to 1.0) instead of pixel-based. Thanks to this, the position and size
    of the zones are independent of any eventual changes in the captured image
    resolution.
  */
  var padding = 0.07; var n = 20;
  var zoneWidth = 0.01; var zoneHeight = 0.01;
  var hOffset = (1.0 - (n * zoneWidth + (n - 1) * padding)) / 2.0;
  var vOffset = 0.25;
  var x1 = linePoint1[0]/width;   var x2 = linePoint2[0]/width;
 var y1 = linePoint1[1]/height;   var y2 = linePoint2[1]/height;

  for(var i = 0; i < n; i++) {
    /*
      addActiveZone function (which, of course, adds active zones to the VIDA
      object) requires the following parameters:
        [your vida object].addActiveZone(
          _id, // zone's identifier (integer or string)
          _normX, _normY, _normW, _normH, // normalized (!) rectangle
          _onChangeCallbackFunction // callback function (triggered on change)
        );
    */
    myVida.addActiveZone(
      i,
      x1 + i * (x2 - x1) / n, y1 + i * (y2 - y1) / n, zoneWidth, zoneHeight,
      onActiveZoneChange
    );
    /*
      For each active zone, we will also create a separate oscillator that we
      will mute/unmute depending on the state of the zone. We use the standard
      features of the p5.Sound library here: the following code just creates an
      oscillator that generates a sinusoidal waveform and places the oscillator
      in the synth array.
    */
    var osc = new p5.Oscillator('sine');
    
    /*
      Let's assume that each subsequent oscillator will play 4 halftones higher
      than the previous one (from the musical point of view, it does not make
      much sense, but it will be enough for the purposes of this example). If
      you do not take care of the music and the calculations below seem unclear
      to you, you can ignore this part or access additional information, e.g.
      here: https://en.wikipedia.org/wiki/MIDI_tuning_standard
    */
    osc.freq(110.0 * Math.pow(2.0, (30 + (i * 4) - 69.0) / 12.0));
    osc.amp(0.0); osc.start();
    synth[i] = osc;
  }

  frameRate(30); // set framerate
}

function button1() {
myVideo.stop();

var load = createP("loading");

load.position(100,100);
myVideo = createVideo('Paranal.mp4');

 myVideo.size(windowWidth/2,windowHeight/2);
  // workaround for browser autoplay restrictions
  //myVideo.elt.muted = true;
  // fix for some mobile browsers
  myVideo.elt.setAttribute('playsinline', '');
  // loop the video, hide the original object and start the playback
  myVideo.loop();  myVideo.hide();
   myVideo.volume(0);
 // myVideo.loop();
  //img.position(10,10);
  //img.loop()

  myVideo.elt.muted = true; 
  
}

function button2(){
  myVideo.stop();

myVideo = createVideo('Paranal2.mp4');
 myVideo.size(windowWidth/2,windowHeight/2);
  // workaround for browser autoplay restrictions
  //myVideo.elt.muted = true;
  // fix for some mobile browsers
  myVideo.elt.setAttribute('playsinline', '');
  // loop the video, hide the original object and start the playback
  myVideo.loop(); myVideo.hide();
   myVideo.volume(0);
 // myVideo.loop();
  //img.position(10,10);
  //img.loop()
  myVideo.elt.muted = true; 
}
function button3(){
  myVideo.stop();

myVideo = createVideo('AntLine.mp4');
 myVideo.size(windowWidth/2,windowHeight/2);
  // workaround for browser autoplay restrictions
  //myVideo.elt.muted = true;
  // fix for some mobile browsers
  myVideo.elt.setAttribute('playsinline', '');
  // loop the video, hide the original object and start the playback
  myVideo.loop(); myVideo.hide();
  myVideo.volume(0);
 // myVideo.loop();
  //img.position(10,10);
  //img.loop()
  myVideo.elt.muted = true; 
}

function gotFile(file) {
  myVideo.stop();

  myVideo = createVideo(file.data);
 myVideo.size(windowWidth/2,windowHeight/2);
  // workaround for browser autoplay restrictions
  //myVideo.elt.muted = true;
  // fix for some mobile browsers
  myVideo.elt.setAttribute('playsinline', '');
  // loop the video, hide the original object and start the playback
  myVideo.loop(); myVideo.hide();
 // myVideo.loop();
  //img.position(10,10);
  //img.loop()
  myVideo.elt.muted = true;
}




function highlight() {
  fill(233,0,0);
  dropzone.style('background','red');
}


function unhighlight() {
  dropzone.style('background','#ccc');
}


function draw() {
  if(myVideo !== null && myVideo !== undefined) { // safety first
    /*
      Wait for user interaction. Some browsers prevent video playback if the
      user does not interact with the webpage yet.
    */

    if(!interactionStartedFlag) {
      background(0);
      push();
      noStroke(); fill(255); textAlign(CENTER, CENTER);
      text('click or tap to start video playback', width / 2, height / 2);
      pop();
      
      return;
    }
 
    background(0, 0, 255);
    /*
      Call VIDA update function, to which we pass the current video frame as a
      parameter. Usually this function is called in the draw loop (once per
      repetition).
    */
    myVida.update(myVideo);
    /*
      Now we can display images: source video and subsequent stages of image
      transformations made by VIDA.
    */
    image(myVideo, 0, 0);
    //image(myVida.backgroundImage, 320, 0);
    //image(myVida.differenceImage, 0, 240);
    //image(myVida.thresholdImage, 320, 240);
    // let's also describe the displayed images
    noStroke(); fill(255, 255, 255);
    //text('raw wideo', 20, 20);
    //text('vida: progressive background image', 340, 20);
    //text('vida: difference image', 20, 260);
    //text('vida: threshold image', 340, 260);
    /*
      In this example, we use the built-in VIDA function for drawing zones. We
      use the version of the function with two parameters (given in pixels)
      which are the coordinates of the upper left corner of the graphic
      representation of zones. VIDA is also equipped with a version of this
      function with four parameters (the meaning of the first and second
      parameter does not change, and the third and fourth mean width and height
      respectively). For example, to draw the zones on the entire available
      surface, use the function in this way:
        [your vida object].drawActiveZones(0, 0, width, height);
    */
   

    //myVida.drawBlobs(0, 0);
    myVida.drawActiveZones(0, 0);
    fill(255,230,0);
    stroke(0,0,255);
    strokeWeight(2);
    line(linePoint1[0],linePoint1[1],linePoint2[0],linePoint2[1]);

    ellipse(linePoint1[0],linePoint1[1],20,20);
    ellipse(linePoint2[0],linePoint2[1],20,20);


  }
  else {
    /*
      If there are problems with the video file (it's a simple mechanism so not
      every problem with the video file will be detected, but it's better than
      nothing) we will change the background color to alarmistically red.
    */
    background(255, 0, 0);
  }
}


function playOscillator() {
  // starting an oscillator on a user gesture will enable audio
  // in browsers that have a strict autoplay policy.
  // See also: userStartAudio();
  let freq = 500;
  if (firstSound ==0){
  oscTest.start();
  oscTest.freq(freq);
  oscTest.amp(0.5, 0.1);

  oscTest.amp(0, 0.5);
  firstSound = 1;
}

}

/*
  This function is called by VIDA when one of the zones changes status (from
  triggered to free or vice versa). An object that stores zone data is passed
  as the parameter to the function.
*/
function onActiveZoneChange(_vidaActiveZone) {
  /*
    Having access directly to objects that store active zone data, we can read
    or modify the values of individual parameters. Here is a list of parameters
    to which we have access:
      normX, normY, normW, normH - normalized coordinates of the rectangle in
    which active zone is contained (bounding box); you can change these
    parameters if you want to move the zone or change it's size;
      isEnabledFlag - if you want to disable the processing of a given active
    zone without deleting it, this flag will definitely be useful to you; if
    it's value is "true", the zone will be tested, if the variable value is
    "false", the zone will not be tested;
      isMovementDetectedFlag - the value of this flag will be "true" if motion
    is detected within the zone; otherwise, the flag value will be "false";
      isChangedFlag - this flag will be set to "true" if the status (value of
    isMovementDetectedFlag) of the zone has changed in the current frame;
    otherwise, the flag value will be "false";
      changedTime, changedFrameCount - the moment - expressed in milliseconds
    and frames - in which the zone has recently changed it's status (value of
    isMovementDetectedFlag);
      normFillFactor - ratio of the area of the zone in which movement was
    detected to the whole surface of the zone
      normFillThreshold - ratio of the area of the zone in which movement
    was detected to the total area of the zone required to be considered that
    there was a movement detected in the zone; you can modify this parameter
    if you need to be able to set the threshold of the zone individually (as
    opposed to function
    [your vida object].setActiveZonesNormFillThreshold(normVal); 
    which sets the threshold value globally for all zones);
      id - zone identifier (integer or string);
      onChange - a function that will be called when the zone changes status
    (when value of this.isMovementDetectedFlag will be changed); the object
    describing the current zone will be passed to the function as a parameter.
  */
  // print zone id and status to console...
  console.log(
    'zone: ' + _vidaActiveZone.id +
    ' status: ' + _vidaActiveZone.isMovementDetectedFlag
  );
  // ... or do something else, e.g., use this information to control the sound:
  
  synth[_vidaActiveZone.id].amp(0.1 * _vidaActiveZone.isMovementDetectedFlag);
  synth[_vidaActiveZone.id].amp(0,0.02);
}

function touchEnded() {
  // init video (if needed)
  if(!interactionStartedFlag) safeStartVideo();

if(!interactionStartedFlag) safeStartVideo();
if(gBool){
if (linePoint1[0] != mouseX || linePoint1[1] != mouseY ){
linePoint1[0] = mouseX;
linePoint1[1] = mouseY;
}}
else {
if (linePoint2[0] != mouseX || linePoint2[1] != mouseY ){
linePoint2[0] = mouseX;
linePoint2[1] = mouseY;
}
}

gBool = 1 - gBool;


 var padding = 0.07; var n = 20;
var zoneWidth = 0.01; var zoneHeight = 0.01;
  var hOffset = (1.0 - (n * zoneWidth + (n - 1) * padding)) / 2.0;
  var vOffset = 0.25;
  var x1 = linePoint1[0]/width;   var x2 = linePoint2[0]/width;
 var y1 = linePoint1[1]/height;   var y2 = linePoint2[1]/height;

  for(var i = 0; i <n ; i++) {
  myVida.removeActiveZone(i);
  }

  for(var i = 0; i < n; i++) {

    myVida.addActiveZone(
      i,
      x1 + i * (x2 - x1) / n, y1 + i * (y2 - y1) / n, zoneWidth, zoneHeight,
      onActiveZoneChange
    );} 




}

/*
  Helper function that starts playback on browsers that require interaction
  with the user before playing video files.
*/
function safeStartVideo() {
  // safety first..
  if(myVideo === null || myVideo === undefined) return;
  // here we check if the video is already playing...
  if(!isNaN(myVideo.time())) {
    if(myVideo.time() < 1) {
      interactionStartedFlag = true;
      return;
    }
  }
  // if no, we will try to play it
  try {
    console.log("trying to loop video");
    myVideo.loop(); myVideo.hide();
    interactionStartedFlag = true;
  }
  catch(e) {
    console.log('[safeStartVideo] ' + e);
  }
}


function touchStarted() {
/*
if(!interactionStartedFlag) safeStartVideo();
if(gBool){
if (linePoint1[0] != mouseX || linePoint1[1] != mouseY ){
linePoint1[0] = mouseX;
linePoint1[1] = mouseY;
}}
else {
if (linePoint2[0] != mouseX || linePoint2[1] != mouseY ){
linePoint2[0] = mouseX;
linePoint2[1] = mouseY;
}
}

gBool = 1 - gBool;


 var padding = 0.07; var n = 20;
var zoneWidth = 0.01; var zoneHeight = 0.01;
  var hOffset = (1.0 - (n * zoneWidth + (n - 1) * padding)) / 2.0;
  var vOffset = 0.25;
  var x1 = linePoint1[0]/width;   var x2 = linePoint2[0]/width;
 var y1 = linePoint1[1]/height;   var y2 = linePoint2[1]/height;

  for(var i = 0; i <n ; i++) {
  myVida.removeActiveZone(i);
  }

  for(var i = 0; i < n; i++) {

    myVida.addActiveZone(
      i,
      x1 + i * (x2 - x1) / n, y1 + i * (y2 - y1) / n, zoneWidth, zoneHeight,
      onActiveZoneChange
    );} 

*/

}