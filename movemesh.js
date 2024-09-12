// The method for moving the mesh here is based on the non-inverted variational 
// moving mesh approach by Hector Ceniceros and Thomas Hou with some light modifications
// 

const meshmoveStepVertexShader = `
    attribute vec4 aVertexPosition;
    void main(void) {
        gl_Position = aVertexPosition;
    }`;

const meshmoveStepFragmentShader = `
    precision highp float;

    uniform vec2 srcDimensions;
    
    uniform sampler2D in_x0;
    uniform sampler2D in_xk; 
    uniform sampler2D in_boundaryConditions;
    uniform sampler2D in_w;
    uniform float a ;
    uniform float dtau;

    void main(void) {
        vec2 h = 1.0 / srcDimensions;
        vec2 hsqr = h * h;

        vec2 ltextureCoord = gl_FragCoord.xy * h; 

        vec2 right  = ltextureCoord + vec2( 1, 0) * h;
        vec2 left   = ltextureCoord + vec2(-1, 0) * h;
        vec2 top    = ltextureCoord + vec2(0,  1) * h;
        vec2 bottom = ltextureCoord + vec2(0, -1) * h;

        vec2 x0  = texture2D(in_x0, ltextureCoord).xy;
        vec2 x0R = texture2D(in_x0, right).xy;
        vec2 x0L = texture2D(in_x0, left).xy;
        vec2 x0T = texture2D(in_x0, top).xy;
        vec2 x0B = texture2D(in_x0, bottom).xy;

        vec2 xk  = texture2D(in_xk, ltextureCoord).xy;
        vec2 xkR = texture2D(in_xk, right).xy;
        vec2 xkL = texture2D(in_xk, left).xy;
        vec2 xkT = texture2D(in_xk, top).xy;
        vec2 xkB = texture2D(in_xk, bottom).xy;

        vec4 w  = texture2D(in_w, ltextureCoord);
        vec4 wR = 0.5 * (texture2D(in_w, right)  + w);
        vec4 wL = 0.5 * (texture2D(in_w, left)   + w);
        vec4 wT = 0.5 * (texture2D(in_w, top)    + w);
        vec4 wB = 0.5 * (texture2D(in_w, bottom) + w);

        vec2 D = 1.0 / (1.0 + 4.0 * dtau * a / hsqr);
        vec2 wxTerm = wR.w * x0R + wL.w * x0L + wT.w * x0T + wB.w * x0B - (wR.w + wL.w + wT.w + wB.w) * x0;
        vec2 xkTerm = xkR + xkL + xkT + xkB;
        vec2 x0Term = x0R + x0L + x0T + x0B;        
        vec2 boundaryCondition = texture2D(in_boundaryConditions, ltextureCoord).xy;

        gl_FragColor.xy = x0 + boundaryCondition * ( D * ( 0.5 * (dtau / (4.0 * hsqr)) * wxTerm + (a * dtau / hsqr) * xkTerm - (a * dtau / hsqr) * x0Term ) );
        gl_FragColor.zw = vec2(0, 1);
    }`;

const copyFragmentShader = `
    precision highp float;

    uniform vec2 srcDimensions;
    uniform sampler2D inputtex;

    void main(void) {
        vec2 h = 1.0 / srcDimensions;
        vec2 ltextureCoord = gl_FragCoord.xy * h; 
        gl_FragColor = texture2D(inputtex, ltextureCoord);
    }`;


var copyProgram = null;
function initialiseCopyShader() {
    if (copyProgram) {
        gl.deleteProgram(copyProgram);
    }
    copyProgram = loadShader(meshmoveStepVertexShader, copyFragmentShader); 

    copyProgram.aVertexPosition = gl.getAttribLocation(copyProgram, "aVertexPosition");
    copyProgram.srcDimensions = gl.getUniformLocation(copyProgram, "srcDimensions");
    copyProgram.inputtex = gl.getUniformLocation(copyProgram, "inputtex");
}

var meshmoveStepProgram = null;
function initialseMeshmoveStepShader() { 
    initialiseCopyShader();

    if (meshmoveStepProgram) {
        gl.deleteProgram(meshmoveStepProgram);
    }
    meshmoveStepProgram = loadShader(meshmoveStepVertexShader, meshmoveStepFragmentShader); 

    meshmoveStepProgram.aVertexPosition = gl.getAttribLocation(meshmoveStepProgram, "aVertexPosition");
    meshmoveStepProgram.srcDimensions = gl.getUniformLocation(meshmoveStepProgram, "srcDimensions");
    meshmoveStepProgram.in_x0 = gl.getUniformLocation(meshmoveStepProgram, "in_x0");
    meshmoveStepProgram.in_xk = gl.getUniformLocation(meshmoveStepProgram, "in_xk");
    meshmoveStepProgram.in_boundaryConditions = gl.getUniformLocation(meshmoveStepProgram, "in_boundaryConditions");
    meshmoveStepProgram.in_w = gl.getUniformLocation(meshmoveStepProgram, "in_w");
    meshmoveStepProgram.a = gl.getUniformLocation(meshmoveStepProgram, "a");
    meshmoveStepProgram.dtau = gl.getUniformLocation(meshmoveStepProgram, "dtau");
}

function computeMeshmoveStep_usejacobi() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, computeFrameBuffer);
    gl.viewport(0, 0, computeFrameBuffer.width, computeFrameBuffer.height);

    gl.useProgram(copyProgram);
    gl.uniform2f(copyProgram.srcDimensions, computeFrameBuffer.width, computeFrameBuffer.height);

    gl.enableVertexAttribArray(copyProgram.aVertexPosition);
    gl.bindBuffer(gl.ARRAY_BUFFER, computeIndexBuffer);
    gl.vertexAttribPointer(copyProgram.aVertexPosition, 2, gl.FLOAT, false, 0, 0);

    if (demo.jacobiX0Option == 'xinit') { // if initial xk is taken to be the inital grid
        gl.activeTexture(gl.TEXTURE0);
        gl.uniform1i(copyProgram.inputtex, 0);
        gl.bindTexture(gl.TEXTURE_2D, demo.x00);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        gl.bindTexture(gl.TEXTURE_2D, demo.xk);
        gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, computeFrameBuffer.width, computeFrameBuffer.height);
    }

    // previousX
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(copyProgram.inputtex, 0);
    gl.bindTexture(gl.TEXTURE_2D, demo.x);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindTexture(gl.TEXTURE_2D, demo.previousX); 
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, computeFrameBuffer.width, computeFrameBuffer.height);

    if (!demo.adaptiveMeshCheck) {
        gl.bindTexture(gl.TEXTURE_2D, demo.xk);
        gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, computeFrameBuffer.width, computeFrameBuffer.height);

        gl.bindTexture(gl.TEXTURE_2D, demo.x);
        gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, computeFrameBuffer.width, computeFrameBuffer.height);

        gl.readPixels(0, 0, computeFrameBuffer.width, computeFrameBuffer.height, gl.RGBA, gl.FLOAT, demo.xData);

        return;
    }

    gl.useProgram(meshmoveStepProgram);
    gl.uniform2f(meshmoveStepProgram.srcDimensions, computeFrameBuffer.width, computeFrameBuffer.height);

    gl.enableVertexAttribArray(meshmoveStepProgram.aVertexPosition);
    gl.bindBuffer(gl.ARRAY_BUFFER, computeIndexBuffer);
    gl.vertexAttribPointer(meshmoveStepProgram.aVertexPosition, 2, gl.FLOAT, false, 0, 0);

    gl.uniform1i(meshmoveStepProgram.in_x, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, demo.x);

    gl.uniform1i(meshmoveStepProgram.in_w, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, demo.u);

    gl.uniform1i(meshmoveStepProgram.in_boundaryConditions, 2);
    gl.activeTexture(gl.TEXTURE2);
    if (demo.bcOption == "natural") {
        gl.bindTexture(gl.TEXTURE_2D, demo.boundaryConditionNatural);
    } else if (demo.bcOption == "dirichlet") {
        gl.bindTexture(gl.TEXTURE_2D, demo.boundaryConditionDirichlet); 
    }

    gl.uniform1i(meshmoveStepProgram.in_xk, 3);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, demo.xk);

    gl.uniform1f(meshmoveStepProgram.a, demo.aMax);
    gl.uniform1f(meshmoveStepProgram.dtau, demo.dtau);

    const ITERATIONS = demo.jacobiIterationCount;    
    for (var iteration = 0; iteration < ITERATIONS; ++iteration) {
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.copyTexSubImage2D(gl.TEXTURE_2D, 0,0,0,0,0, computeFrameBuffer.width,computeFrameBuffer.height);
    }

    gl.bindTexture(gl.TEXTURE_2D, demo.x);
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0,0,0,0,0, computeFrameBuffer.width,computeFrameBuffer.height);

    gl.activeTexture(gl.TEXTURE0);
    gl.readPixels(0, 0, computeFrameBuffer.width, computeFrameBuffer.height, gl.RGBA, gl.FLOAT, demo.xData);
}
