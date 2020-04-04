let osc, playing, freq, amp;

function setup() {
  canvasVOffset = 100;
  c = createCanvas(3 * windowWidth/6, 3 * windowHeight/6); // we need some space...
  c.position(windowWidth/2 - width/2,canvasVOffset);
  c.mousePressed(playOscillator);
  osc = new p5.Oscillator('sine');
  myVideo = createVideo(['AntLine.mp4']);

  myVideo.size(windowWidth/2,windowHeight/2);
  // workaround for browser autoplay restrictions
  
  // fix for some mobile browsers
  myVideo.elt.setAttribute('playsinline', '');
  // loop the video, hide the original object and start the playback
  myVideo.loop(); myVideo.hide();
  myVideo.elt.muted = true;
  
}

function draw() {
  background(220)
  freq = constrain(map(mouseX, 0, width, 100, 500), 100, 500);
  amp = constrain(map(mouseY, height, 0, 0, 1), 0, 1);

  text('tap to play', 20, 20);
  text('freq: ' + freq, 20, 40);
  text('amp: ' + amp, 20, 60);

  if (playing) {
    // smooth the transitions by 0.1 seconds
    osc.freq(freq, 0.1);
    osc.amp(amp, 0.1);
  }
}

function playOscillator() {
  // starting an oscillator on a user gesture will enable audio
  // in browsers that have a strict autoplay policy.
  // See also: userStartAudio();
  osc.start();
  playing = true;
}

function mouseReleased() {
  // ramp amplitude to 0 over 0.5 seconds
  osc.amp(0, 0.5);
  playing = false;
}
