let dropzone; 

function setup() {
	createCanvas(200,200);
	background(0);

	dropzone = select('#dropzone');
	dropzone.dragOver(highlight);
	dropzone.dragLeave(unhighlight);
	dropzone.drop(gotFile,unhighlight);
}


function gotFile(file) {
	img = createVideo(file.data);
	img.position(10,10);
	img.loop()
	img.elt.muted = true;
}

function highlight() {
	dropzone.style('background','red');
}


function unhighlight() {
	dropzone.style('background','#ccc');
}



