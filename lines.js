// Rather unfortunately webgl only supports lines of width 1.0 so we need to 
// make our own polygons to represent the lines of different widths. Because  
// the number of polygons we need to create is quite large we'll again utilise  
// the GPU for the computing rather than javascript.

const linesVertexShader = `
    attribute vec4 aVertexPosition;
    void main(void) {
        gl_Position = aVertexPosition;
    }`;

const linesFragmentShader = `
    precision highp float;

    uniform vec2 srcDimensions;

    uniform sampler2D in_x;
    uniform float lineWidth;
    uniform float a,b;

    void main(void) {
        vec2 ij = gl_FragCoord.xy;
        vec2 h = 1.0 / srcDimensions;
        vec2 texcoord = gl_FragCoord.xy * h;
        vec4 x = texture2D(in_x, texcoord);

        vec2 right = vec2(1, 0) * h;
        vec2 top = vec2(0, 1) * h;

        vec2 d = right * mod(ij.x, 2.0);

        vec4 xk  = texture2D(in_x, texcoord - d + a * right);
        vec4 xkR = texture2D(in_x, texcoord + right - d + (1.0-b)*a*right);
        vec4 xkT = texture2D(in_x, texcoord + top   - d + b*a*right);

        vec4 dxR = xkR - xk;
        vec4 dxT = xkT - xk;

        float rot = (mod(ij.x, 2.0) - 1.0)*2.0; // -1 or 1 (ij.x is at centre origin i.e. 0.5)

        // a bit lazy I know...
        vec4 p1pre = xk
            + rot*lineWidth*vec4(dxR.y,-dxR.x, 0.0,0.0)*(1.0-b)
            + rot*lineWidth*vec4(dxT.y,-dxT.x, 0.0,0.0)*b;
        vec4 p2pre = 
             (xkR + rot*lineWidth*vec4(dxR.y,-dxR.x, 0.0,0.0))*(1.0-b)
            +(xkT + rot*lineWidth*vec4(dxT.y,-dxT.x, 0.0,0.0))*b;

        float line_mag = sqrt((p2pre.x-p1pre.x)*(p2pre.x-p1pre.x) + (p2pre.y-p1pre.y)*(p2pre.y-p1pre.y));

        // but we get to where we need to be in the end...
        vec4 p1 = xk  
            + rot*(lineWidth/line_mag)*vec4(dxR.y,-dxR.x, 0.0,0.0)*(1.0-b)
            + rot*(lineWidth/line_mag)*vec4(dxT.y,-dxT.x, 0.0,0.0)*b;
        vec4 p2 = 
             (xkR + rot*(lineWidth/line_mag)*vec4(dxR.y,-dxR.x, 0.0,0.0))*(1.0-b)
            +(xkT + rot*(lineWidth/line_mag)*vec4(dxT.y,-dxT.x, 0.0,0.0))*b;

        gl_FragColor = vec4(p1.x, p1.y, p2.x, p2.y);
    }`;

const linesRenderingVertexShader = `
    attribute vec3 aVertexPosition;
    void main(void) {
        const mat4 pMatrix = mat4(
            2.0, 0.0, 0.0, 0.0,
            0.0, 2.0, 0.0, 0.0,
            0.0, 0.0, -1.0, 0.0,
            -1.0, -1.0, 0.0, 1.0);

        const mat4 mvMatrix = mat4( // should vary based on grid but only considering (-1,1)x(-1,1) domain for webgl example anyway
            0.5, 0.0, 0.0, 0.0,
            0.0, 0.5, 0.0, 0.0,
            0.0, 0.0, 1.0, 0.0,
            0.5, 0.5, -0.5, 1.0);

       gl_Position = pMatrix * mvMatrix * vec4(aVertexPosition, 1.0);
    }`;

const linesRenderingFragmentShader = `
    precision mediump float;
    uniform vec4 rgba;
    void main(void) {
        gl_FragColor = rgba;
    }`;

var linesProgram = null;
var linesRenderingProgram = null;
function initialiseLinesShader() {
    if (linesProgram) {
        gl.deleteProgram(linesProgram);
    }
    if (linesRenderingProgram) {
        gl.deleteProgram(linesRenderingProgram);
    }
    linesProgram = loadShader(linesVertexShader, linesFragmentShader);
    linesRenderingProgram = loadShader(linesRenderingVertexShader, linesRenderingFragmentShader);

    linesProgram.aVertexPosition = gl.getAttribLocation(linesProgram, "aVertexPosition");
    linesProgram.srcDimensions = gl.getUniformLocation(linesProgram, "srcDimensions");
    linesProgram.in_x = gl.getUniformLocation(linesProgram, "in_x");
    linesProgram.lineWidth = gl.getUniformLocation(linesProgram, "lineWidth");
    
    linesProgram.b = gl.getUniformLocation(linesProgram, "b");
    linesProgram.a = gl.getUniformLocation(linesProgram, "a");

    linesRenderingProgram.aVertexPosition = gl.getAttribLocation(linesRenderingProgram, "aVertexPosition");
    linesRenderingProgram.srcDimensions = gl.getUniformLocation(linesRenderingProgram, "srcDimensions");
    linesRenderingProgram.rgba = gl.getUniformLocation(linesRenderingProgram, "rgba");    
}

var lineFragmentIndexBuffer = null;
var lineFragmentVertexBuffer = null;
var lineFragmentVerticies = [null, null, null, null];
var lineFragmentVerticies0 = null;
function initialiseLinesProgram() {
    lineFragmentVerticies0 = new Float32Array(Array.from({length: computeFrameBuffer.width * computeFrameBuffer.height * 4}, (v,i) => { return 1.0; }));

    for (var i = 0; i < lineFragmentVerticies.length; ++ i) {
        lineFragmentVerticies[i] = new Float32Array(Array.from({length: computeFrameBuffer.width * computeFrameBuffer.height * 4}, (v,i) => { return 1.0; }));
    }

const gridN = computeFrameBuffer.width; // Could fix this but for my purposes this is fine

    var indicies = [];
    var k = 0, m = 0;
    for (var i = 0; i < (gridN/2)*(gridN/1); ++i ) {
        indicies.push(k + 0);
        indicies.push(k + 1);
        indicies.push(k + 2);

        indicies.push(k + 2);
        indicies.push(k + 3);
        indicies.push(k + 1);

        k += 4;
        m += 2;
    }
    lineFragmentIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, lineFragmentIndexBuffer); 
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indicies), gl.STATIC_DRAW);

    lineFragmentIndexBuffer.itemSize = 1;
    lineFragmentIndexBuffer.numItems = m * 3;

    lineFragmentVertexBuffer = gl.createBuffer(); 
    gl.bindBuffer(gl.ARRAY_BUFFER, lineFragmentVertexBuffer);
}

function renderLines(x, r,g,b,a, lineWidth, depth) {
    // generate line polygon fragments
    gl.bindFramebuffer(gl.FRAMEBUFFER, computeFrameBuffer);
    gl.viewport(0,0, computeFrameBuffer.width,computeFrameBuffer.height);

    gl.useProgram(linesProgram);
    gl.uniform2f(linesProgram.srcDimensions, computeFrameBuffer.width >> depth, computeFrameBuffer.height >> depth);

    gl.enableVertexAttribArray(linesProgram.aVertexPosition);
    gl.bindBuffer(gl.ARRAY_BUFFER, computeIndexBuffer);
    gl.vertexAttribPointer(linesProgram.aVertexPosition, 2, gl.FLOAT, false, 0, 0);

    gl.uniform1i(linesProgram.in_x, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, x);

    // Since not every browser implements rendering to multiple frame buffers I'll do this in 4 steps
    gl.uniform1f(linesProgram.lineWidth, lineWidth);
    gl.uniform1f(linesProgram.b, 0.0);
    gl.uniform1f(linesProgram.a, 0.0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.readPixels(0, 0, computeFrameBuffer.width,computeFrameBuffer.height, gl.RGBA, gl.FLOAT, lineFragmentVerticies[0]);

    gl.uniform1f(linesProgram.lineWidth, lineWidth);
    gl.uniform1f(linesProgram.b, 0.0);
    gl.uniform1f(linesProgram.a, 1.0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.readPixels(0, 0, computeFrameBuffer.width,computeFrameBuffer.height, gl.RGBA, gl.FLOAT, lineFragmentVerticies[1]);

    gl.uniform1f(linesProgram.lineWidth, lineWidth);
    gl.uniform1f(linesProgram.b, 1.0);
    gl.uniform1f(linesProgram.a, 0.0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.readPixels(0, 0, computeFrameBuffer.width,computeFrameBuffer.height, gl.RGBA, gl.FLOAT, lineFragmentVerticies[2]);

    gl.uniform1f(linesProgram.lineWidth, lineWidth);
    gl.uniform1f(linesProgram.b, 1.0);
    gl.uniform1f(linesProgram.a, 1.0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.readPixels(0, 0, computeFrameBuffer.width,computeFrameBuffer.height, gl.RGBA, gl.FLOAT, lineFragmentVerticies[3]);

    // Render "lines"
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0,0, gl.canvas.width, gl.canvas.height);

    gl.useProgram(linesRenderingProgram);
    gl.uniform2f(linesRenderingProgram.srcDimensions, computeFrameBuffer.width,computeFrameBuffer.height);

    gl.uniform4f(linesRenderingProgram.rgba, r,g,b,a);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, lineFragmentIndexBuffer);

    gl.enableVertexAttribArray(linesRenderingProgram.aVertexPosition);
    gl.bindBuffer(gl.ARRAY_BUFFER, lineFragmentVertexBuffer);
    gl.vertexAttribPointer(linesRenderingProgram.aVertexPosition, 2, gl.FLOAT, false, 0, 0);

    gl.bufferData(gl.ARRAY_BUFFER, lineFragmentVerticies[0], gl.STATIC_DRAW);
    gl.drawElements(gl.TRIANGLES, lineFragmentIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

    gl.bufferData(gl.ARRAY_BUFFER, lineFragmentVerticies[1], gl.STATIC_DRAW);
    gl.drawElements(gl.TRIANGLES, lineFragmentIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

    gl.bufferData(gl.ARRAY_BUFFER, lineFragmentVerticies[2], gl.STATIC_DRAW);
    gl.drawElements(gl.TRIANGLES, lineFragmentIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

    gl.bufferData(gl.ARRAY_BUFFER, lineFragmentVerticies[3], gl.STATIC_DRAW);
    gl.drawElements(gl.TRIANGLES, lineFragmentIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
}
