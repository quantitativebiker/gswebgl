const checkersVertexShader = `
    attribute vec2 aVertexPosition;
    attribute vec4 x1Attrib;
    attribute vec4 x2Attrib;

    varying vec4 vVertexColor;

    void main(void) {
        vec4 pos     = x1Attrib;
        vVertexColor = x2Attrib;

       const mat4 pMatrix = mat4(
            2.0, 0.0, 0.0, 0.0,
            0.0, 2.0, 0.0, 0.0,
            0.0, 0.0, -1.0, 0.0,
            -1.0, -1.0, 0.0, 1.0);

        const mat4 mvMatrix = mat4( // should vary based on grid but only considering (-1,1)x(-1,1) for now
            0.5, 0.0, 0.0, 0.0,
            0.0, 0.5, 0.0, 0.0,
            0.0, 0.0, 1.0, 0.0,
            0.5, 0.5, -0.5, 1.0);

       gl_Position = pMatrix * mvMatrix * vec4(pos.x,pos.y, 0, 1); 
    }`;

const checkersFragmentShader = `
    precision highp float;
    uniform vec2 minmax;
    uniform int colorsid;
    varying vec4 vVertexColor;

    void main(void) {
        float u =  (vVertexColor.r - minmax.x) / (minmax.y - minmax.x);
        float mf = 50.0;

	    if (colorsid == 0) {
            vec4 c1 = vec4(1,0,1,0); float p1 = 0.2;
            vec4 c2 = vec4(0,1,1,0); float p2 = 0.4;
            vec4 c3 = vec4(0,0,0,0); float p3 = 0.6;
            vec4 c4 = vec4(0,1,1,0); float p4 = 0.8;
            vec4 c5 = vec4(0,0,1,0); float p5 = 1.0;
            vec4 c6 = vec4(1,0,1,0); float p6 = 1.2;
            gl_FragColor =  
               c1*exp(-mf*(u-p1)*(u-p1))
             + c2*exp(-mf*(u-p2)*(u-p2))
             + c3*exp(-mf*(u-p3)*(u-p3))    
             + c4*exp(-mf*(u-p4)*(u-p4))
             + c5*exp(-mf*(u-p5)*(u-p5))
             + c6*exp(-mf*(u-p6)*(u-p6))
             + vec4(0,0,0,1);
        }
        else if (colorsid == 1) {
            vec4 c1 = vec4(0,0,1,0); float p1 = 0.2;
            vec4 c2 = vec4(1,0,0,0); float p2 = 0.4;
            vec4 c3 = vec4(1,1,0,0); float p3 = 0.6;
            vec4 c4 = vec4(1,1,1,0); float p4 = 0.8;
            vec4 c5 = vec4(1,1,1,0); float p5 = 1.0;
            vec4 c6 = vec4(1,1,1,0); float p6 = 1.2;
            gl_FragColor =  
               c1*exp(-mf*(u-p1)*(u-p1))
             + c2*exp(-mf*(u-p2)*(u-p2))
             + c3*exp(-mf*(u-p3)*(u-p3))    
             + c4*exp(-mf*(u-p4)*(u-p4))
             + c5*exp(-mf*(u-p5)*(u-p5))
             + c6*exp(-mf*(u-p6)*(u-p6))
             + vec4(0,0,0,1);
        }
        else if (colorsid == 2) {
            vec4 c1 = vec4(0,0,0,0); float p1 = 0.2;
            vec4 c2 = vec4(1,1,1,0); float p2 = 0.4;
            vec4 c3 = vec4(1,1,1,0); float p3 = 0.6;
            vec4 c4 = vec4(1,1,1,0); float p4 = 0.8;
            vec4 c5 = vec4(1,0,0,0); float p5 = 1.0;
            vec4 c6 = vec4(1,0,0,0); float p6 = 1.2;
            gl_FragColor =  
               c1*exp(-mf*(u-p1)*(u-p1))
             + c2*exp(-mf*(u-p2)*(u-p2))
             + c3*exp(-mf*(u-p3)*(u-p3))    
             + c4*exp(-mf*(u-p4)*(u-p4))
             + c5*exp(-mf*(u-p5)*(u-p5))
             + c6*exp(-mf*(u-p6)*(u-p6))
             + vec4(0,0,0,1);
        }
        else if (colorsid == 4) {
            vec4 c1 = vec4(0,1,0,0); float p1 = 0.2;
            vec4 c2 = vec4(1,1,0,0); float p2 = 0.4;
            vec4 c3 = vec4(1,1,1,0); float p3 = 0.6;
            vec4 c4 = vec4(0,1,1,0); float p4 = 0.8;
            vec4 c5 = vec4(0,0,1,0); float p5 = 1.0;
            vec4 c6 = vec4(1,0,1,0); float p6 = 1.2;

            vec4 u2 = vec4((u - (-0.5))/(2.0 - (-0.5)),  (u - (-0.5))/(2.0 - (-0.5)),  (u - (-0.5))/(2.0 - (-0.5)),  (u - (-0.5))/(2.0 - (-0.5)) );

            float mf2 = 150.0;
            gl_FragColor = 
                c1*exp(-mf2*(u2.x-p1)*(u2.x-p1)) 
              + c2*exp(-mf2*(u2.x-p2)*(u2.x-p2))
              + c3*exp(-mf2*(u2.x-p3)*(u2.x-p3))
              + c4*exp(-mf2*(u2.x-p4)*(u2.x-p4)) 
              + c5*exp(-mf2*(u2.x-p5)*(u2.x-p5)) 
              + c6*exp(-mf2*(u2.x-p6)*(u2.x-p6)) 
              + vec4(0,0,0,1);
        }
    }`;

var checkersProgram = null;
var checkersVBO = null;
var solidVBO = null;
var x1Attrib = null;
var x2Attrib = null;
var x3Attrib = null;
function initialseCheckersShader() { 
    if (checkersProgram) {
        gl.deleteProgram(checkersProgram);
    }
    checkersProgram = loadShader(checkersVertexShader, checkersFragmentShader); 

    checkersProgram.aVertexPosition = gl.getAttribLocation(checkersProgram, "aVertexPosition");
    checkersProgram.x1Attrib = gl.getAttribLocation(checkersProgram, "x1Attrib");
    checkersProgram.x2Attrib = gl.getAttribLocation(checkersProgram, "x2Attrib");

    checkersProgram.minmax = gl.getUniformLocation(checkersProgram, "minmax");
    checkersProgram.colorsid = gl.getUniformLocation(checkersProgram, "colorsid");

    x1Attrib = gl.createBuffer();
    x2Attrib = gl.createBuffer();


var width = computeFrameBuffer.width;
var height = computeFrameBuffer.height;

    solidData = new Uint16Array(Array.from({length: (width-1) * (height-1) * 6}, (v,i) =>{
        var y = ( ( i - ( i % ( 6 * (width-1) ))) / 6) / (width -1);
        var x = ( ( i - y * (width-1) * 6) - i % 6 ) / 6;
        var elm = y * width + x;
        
        switch(i % 6) {
            case 0: return elm; 
            case 1: return elm + 1;  
            case 2: return elm + width;

            case 3: return elm + 1; 
            case 4: return elm + width + 1;  
            case 5: return elm + width;
        }
    }));

    var checkersData = new Uint16Array(Array.from({length: (width-1) * (height-1) * 6}, (v,i) =>{
        var y = ( ( i - ( i % ( 6 * (width-1) ))) / 6) / (width -1);
        var x = ( ( i - y * (width-1) * 6) - i % 6 ) / 6;
        var elm = y * width + x;
        
        switch(i % 12) {
            case 0: return elm; 
            case 1: return elm + 1;  
            case 2: return elm + width;

            case 3: return elm + 1; 
            case 4: return elm + width + 1;  
            case 5: return elm + width;
        }
    }));

    solidVBO = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, solidVBO);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, solidData, gl.STATIC_DRAW);
    solidVBO.idxLen = solidData.length;

    checkersVBO = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, checkersVBO);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, checkersData, gl.STATIC_DRAW);
    checkersVBO.idxLen = checkersData.length;
}

function checkersPlot() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0,0, gl.canvas.width, gl.canvas.height);

    gl.useProgram(checkersProgram);

    // consider vertex array object later.  demo.xData
    gl.uniform2f(checkersProgram.minmax, demo.uMin, demo.uMax);
    gl.uniform1i(checkersProgram.colorsid, demo.colorsid);

    gl.enableVertexAttribArray(checkersProgram.x1Attrib);
    gl.bindBuffer(gl.ARRAY_BUFFER, x1Attrib);
    gl.bufferData(gl.ARRAY_BUFFER, demo.xData, gl.STATIC_DRAW);
    gl.vertexAttribPointer(checkersProgram.x1Attrib, 4, gl.FLOAT, false, 0, 0);

    gl.enableVertexAttribArray(checkersProgram.x2Attrib);
    gl.bindBuffer(gl.ARRAY_BUFFER, x2Attrib);
    gl.bufferData(gl.ARRAY_BUFFER, demo.uData, gl.STATIC_DRAW);
    gl.vertexAttribPointer(checkersProgram.x2Attrib, 4, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, solidVBO);
    gl.drawElements(gl.TRIANGLES, solidVBO.idxLen, gl.UNSIGNED_SHORT, 0);

    gl.disableVertexAttribArray(checkersProgram.x2Attrib);
    gl.disableVertexAttribArray(checkersProgram.x1Attrib);
}


