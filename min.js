const minVertexShader = `
    attribute vec4 aVertexPosition;
    void main(void) {
        gl_Position = aVertexPosition;
    }`;

const minFragmentShader = `
    precision highp float;
    uniform vec2 srcDimensions;
    uniform sampler2D in_u;
    uniform float dw;

    void main(void) {
        vec2 ltextureCoord = gl_FragCoord.xy / srcDimensions;        

        vec4 u  = texture2D(in_u, ltextureCoord);
        vec4 uR = texture2D(in_u, ltextureCoord + vec2( 1, 0 ) * dw ); 
        vec4 uT = texture2D(in_u, ltextureCoord + vec2( 0, 1 ) * dw ); 
        vec4 uW = texture2D(in_u, ltextureCoord + vec2( 1, 1 ) * dw ); 

        gl_FragColor   = min(min(u,min(uR,uT)), uW); ; //vec4(0.1,0.1,0.1,0.1); //
    }`;

var minProgram = null;
function initialiseMinShader() {
    if (minProgram) {
        gl.deleteProgram(minProgram);
    }
    minProgram = loadShader(minVertexShader, minFragmentShader);

    minProgram.aVertexPosition = gl.getAttribLocation(minProgram, "aVertexPosition");
    minProgram.srcDimensions = gl.getUniformLocation(minProgram, "srcDimensions");
    minProgram.in_u = gl.getUniformLocation(minProgram, "in_u");
    minProgram.dw = gl.getUniformLocation(minProgram, "dw");
}

function computeMinU() {
    // Downsampling approach for a = min(u)
    gl.bindFramebuffer(gl.FRAMEBUFFER, computeFrameBuffer);
    gl.viewport(0,0, computeFrameBuffer.width,computeFrameBuffer.height);

    gl.useProgram(minProgram);
    gl.uniform2f(minProgram.srcDimensions, computeFrameBuffer.width,computeFrameBuffer.height);

    gl.enableVertexAttribArray(minProgram.aVertexPosition);
    gl.bindBuffer(gl.ARRAY_BUFFER, computeIndexBuffer);
    gl.vertexAttribPointer(minProgram.aVertexPosition, 2, gl.FLOAT, false, 0, 0);

    gl.uniform1i(minProgram.in_u, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, demo.b);

    var mul = 1;
    for (var its = computeFrameBuffer.width; its != 0; its >>= 1) {
        mul *= 2;
        gl.uniform1f(minProgram.dw, 1.0 / mul);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, computeFrameBuffer.width, computeFrameBuffer.height);
    }

    gl.readPixels(0,0, 1,1, gl.RGBA, gl.FLOAT, demo.dummyData);
    demo.uMin = demo.dummyData[0];
}

