# musicBox
This is the first version of a digital music box. 
This tool allows the sonification of every video that contains blobs or particle like shapes. It allows the user to move a line that will detect the blobs passing over it, and it will generate a filtered noise, whose lowcut frequency is related to the distance to the starting point of the line segment. 
**musicBox uses two main libraries of p5js: 
1) [Vida Library](https://www.tetoki.eu/vida/) for detecting blobs
2) [p5.sound](https://p5js.org/reference/#/libraries/p5.sound) for triggering sounds when blobs are detected
