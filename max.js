const maxVertexShader = `
    attribute vec4 aVertexPosition;
    void main(void) {
        gl_Position = aVertexPosition;
    }`;

const maxFragmentShader = `
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

        gl_FragColor   = max(max(u,max(uR,uT)), uW);
    }`;

var maxProgram = null;
function initialiseMaxShader() {
    if (maxProgram) {
        gl.deleteProgram(maxProgram);
    }
    maxProgram = loadShader(maxVertexShader, maxFragmentShader);

    maxProgram.aVertexPosition = gl.getAttribLocation(maxProgram, "aVertexPosition");
    maxProgram.srcDimensions = gl.getUniformLocation(maxProgram, "srcDimensions");
    maxProgram.in_u = gl.getUniformLocation(maxProgram, "in_u");
    maxProgram.dw = gl.getUniformLocation(maxProgram, "dw");
}

function computeMaxU() {
    // Downsampling approach for a = max(u)
    gl.bindFramebuffer(gl.FRAMEBUFFER, computeFrameBuffer);
    gl.viewport(0,0, computeFrameBuffer.width,computeFrameBuffer.height);

    gl.useProgram(maxProgram);
    gl.uniform2f(maxProgram.srcDimensions, computeFrameBuffer.width,computeFrameBuffer.height);

    gl.enableVertexAttribArray(maxProgram.aVertexPosition);
    gl.bindBuffer(gl.ARRAY_BUFFER, computeIndexBuffer);
    gl.vertexAttribPointer(maxProgram.aVertexPosition, 2, gl.FLOAT, false, 0, 0);

    gl.uniform1i(maxProgram.in_u, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, demo.a);

    var mul = 1;
    for (var its = computeFrameBuffer.width; its != 0 ; its >>= 1) { 
        mul *= 2;
        gl.uniform1f(maxProgram.dw, 1.0/mul);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.copyTexSubImage2D(gl.TEXTURE_2D, 0,0,0,0,0, computeFrameBuffer.width,computeFrameBuffer.height);
    }

    gl.readPixels(0,0, 1,1, gl.RGBA, gl.FLOAT, demo.dummyData);
    demo.uMax = demo.dummyData[0];
    demo.aMax = demo.dummyData[3]; // 'w'
}

