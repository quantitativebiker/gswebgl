// Convection-reaction-diffusion FDM solver with non-conservative semi-ALE moving mesh formulation
// (on the Forward step, asymmetrically not matched on Backward step in this demo) 

const crdStepVertexShader = `
    attribute vec4 aVertexPosition;
    void main(void) {
        gl_Position = aVertexPosition;
    }`;

const crdStepFragmentShader = `
    precision highp float;

    uniform vec2 srcDimensions;
    
    uniform sampler2D in_u0;
    uniform sampler2D in_uk; 
    uniform sampler2D in_boundaryConditions;
    uniform sampler2D in_u;

    uniform sampler2D in_old_x;
    uniform sampler2D in_x;

    uniform float Du, Dv, k, f, dt;

    void main(void) {
        vec2 h = 1.0 / srcDimensions;
        vec2 ltextureCoord = gl_FragCoord.xy * h;
        float deta = h.y, dxi = h.x;

        vec2 c      = ltextureCoord;
        vec2 right  = c + vec2( 1, 0) * h;
        vec2 left   = c + vec2(-1, 0) * h;
        vec2 top    = c + vec2(0,  1) * h;
        vec2 bottom = c + vec2(0, -1) * h;
        vec2 tr     = c + vec2( 1, 1) * h;
        vec2 tl     = c + vec2(-1, 1) * h;
        vec2 br     = c + vec2(-1,  1) * h;
        vec2 bl     = c + vec2(-1, -1) * h;

        vec2 xTL = texture2D(in_old_x, tl).xy;
        vec2 xT  = texture2D(in_old_x, top).xy;
        vec2 xTR = texture2D(in_old_x, tr).xy;

        vec2 xL  = texture2D(in_old_x, left).xy;
        vec2 x0c = texture2D(in_x, ltextureCoord).xy;
        vec2 xc  = texture2D(in_old_x, ltextureCoord).xy;
        vec2 xR  = texture2D(in_old_x, right).xy;

        vec2 xBL = texture2D(in_old_x, bl).xy;
        vec2 xB  = texture2D(in_old_x, bottom).xy;
        vec2 xBR = texture2D(in_old_x, br).xy;

        vec4 u0c = texture2D(in_u0, c);

        vec4 ukTL = texture2D(in_uk, tl);
        vec4 ukT  = texture2D(in_uk, top);
        vec4 ukTR = texture2D(in_uk, tr);

        vec4 ukL  = texture2D(in_uk, left);
        vec4 ukc  = texture2D(in_uk, ltextureCoord);
        vec4 ukR  = texture2D(in_uk, right);

        vec4 ukBL = texture2D(in_uk, bl);
        vec4 ukB  = texture2D(in_uk, bottom);
        vec4 ukBR = texture2D(in_uk, br);

        float one_dxi  = 1.0 / dxi;
        float one_deta = 1.0 / deta;
        float one_dt   = 1.0 / dt;

        float x_xi   = 0.5 * (xR.x - xL.x) * one_dxi;
        float x_eta  = 0.5 * (xT.x - xB.x) * one_deta;
        float y_xi   = 0.5 * (xR.y - xL.y) * one_dxi;
        float y_eta  = 0.5 * (xT.y - xB.y) * one_deta;

        float cof1 = one_dxi * one_dxi;
        float cof2 = one_dxi * one_deta * 0.25;
        float cof4 = one_deta * one_deta;

        float y_xixi   = (xT.y  - xc.y  - xc.y  + xB.y)  * cof1;
        float y_etaxi  = (xTR.y - xBR.y - xTL.y + xBL.y) * cof2; // needs to be changed. address later.
        float y_xieta  = (xTR.y - xTL.y - xBR.y + xBL.y) * cof2; // ditto.
        float y_etaeta = (xT.y  - xc.y  - xc.y  + xB.y)  * cof4;

        float x_xixi   = (xR.x  - xc.x  - xc.x  + xL.x)  * cof1;
        float x_etaxi  = (xTR.x - xBR.x - xTL.x + xBL.x) * cof2; // ditto.
        float x_xieta  = (xTR.x - xTL.x - xBR.x + xBL.x) * cof2; // ditto.
        float x_etaeta = (xR.x  - xc.x  - xc.x  + xL.x)  * cof4;

        float j = x_xi * y_eta - x_eta * y_xi;
        float one_j  = 1.0 / j;
        float one_j2 = one_j * one_j;

        float xi_x  =  y_eta * one_j;
        float xi_y  = -x_eta * one_j;
        float eta_x = -y_xi  * one_j;
        float eta_y =  x_xi  * one_j;

        float j_xi  = x_xixi  * y_eta + x_xi * y_etaxi  - x_etaxi * y_xi - x_eta * y_xixi;
        float j_eta = x_xieta * y_eta + x_xi * y_etaeta - x_etaxi * y_xi - x_eta * y_xieta;

        float xi_x1  =   y_etaxi  * one_j - y_eta * one_j2 * j_xi;
        float xi_x2  =   y_etaeta * one_j - y_eta * one_j2 * j_eta;
        float xi_y1  = - x_etaxi  * one_j + x_eta * one_j2 * j_xi;
        float xi_y2  = - x_etaeta * one_j + x_eta * one_j2 * j_eta;
        float eta_x1 = - y_xixi   * one_j + y_xi  * one_j2 * j_xi;
        float eta_x2 = - y_xieta  * one_j + y_xi  * one_j2 * j_eta;
        float eta_y1 =   x_xixi   * one_j - x_xi  * one_j2 * j_xi;
        float eta_y2 =   x_xieta  * one_j - x_xi  * one_j2 * j_eta;

        float A  =  (xi_x  * xi_x  + xi_y  * xi_y)   * cof1;
        float B1 =  (xi_x  * eta_x + xi_y  * eta_y)  * cof2;
        float B2 =  (eta_x * xi_x  + eta_y * xi_y)   * cof2;
        float C  =  (eta_x * eta_x + eta_y * eta_y)  * cof4;
        float D  =  (xi_x * xi_x1  + xi_y * xi_y1  + eta_x * xi_x2  + eta_y * xi_y2  ) * one_dxi  * 0.5;
        float E  =  (xi_x * eta_x1 + xi_y * eta_y1 + eta_x * eta_x2 + eta_y * eta_y2 ) * one_deta * 0.5;

        float xi_t  = (xi_x  * (xc.x - x0c.x)   +xi_y  * (xc.y - x0c.y) ) * one_dt ;
        float eta_t = (eta_x * (xc.x - x0c.x)   +eta_y * (xc.y - x0c.y) ) * one_dt ;

        vec4 diffusivities = vec4(Du, Dv, 1.0, 1.0);
        vec4 ukTerm = - diffusivities * ( A  * (ukR + ukL) + B1 * (ukTR - ukBR - ukTL + ukBL)
                            + B2 * (ukTR - ukTL - ukBR + ukBL) + C  * (ukT + ukB)
                            + D  * (ukR - ukL) + E  * (ukT - ukB) )
                    + xi_t  * (ukR - ukL) * one_dxi  * 0.5
                    + eta_t * (ukT - ukB) * one_deta * 0.5 ;

        vec4 Dj  = one_dt + diffusivities * ( 2.0 * (A + C) ); 

        float u = u0c.r;
        float v = u0c.g;
        // To change from G-S dynamics to another model, make your change here.
        vec4 F   = vec4( -u * v * v + f * (1.0 - u),  u * v * v - (f + k) * v,   0.0, 0.0); 
        vec4 b   = u0c * one_dt + F;

        vec4 boundaryCondition = texture2D(in_boundaryConditions, ltextureCoord);
        vec4 bc = boundaryCondition.x * ukR + boundaryCondition.y * ukL + boundaryCondition.z * ukT + boundaryCondition.w * ukB;
        float bcm = boundaryCondition.x + boundaryCondition.y + boundaryCondition.z + boundaryCondition.w;

        float u1_xi  = (ukR.x - ukL.x) * one_dxi   * 0.5;
        float u1_eta = (ukT.x - ukB.x) * one_deta  * 0.5;

        const float beta = 1e0; // hardcoded for demo.
        float w = sqrt(1.0 + beta*beta * (u1_xi*u1_xi + u1_eta*u1_eta) );

        gl_FragColor = bc + (1.0 - bcm) * ( 0.7 * ( b - ukTerm ) / Dj + 0.3 * u0c ); // Silly SOR-like scheme to improve Jacobi stability.
        gl_FragColor.zw = vec2(1.0, w);
    }`;

var boundaryConditionDataForCRD = null;
function initialiseBoundaryConditionDataForCRD(width, height) {
    boundaryConditionDataForCRD = new Float32Array(Array.from({ length: width * height * 4 }, (v, i) => {
        var y = ((i - (i % (4 * width))) / 4) / width;
        var x = ((i - y * width * 4) - i % 4) / 4;

        var cornermultiplier = (x == 0 && y == 0) || (x == 0 && y == height - 1) || (x == width - 1 && y == height - 1) || (x == width - 1 && y == 0);
        cornermultiplier = cornermultiplier ? 0.5 : 1.0;

        switch (i % 4) {
            case 0: return (x == 0) ? cornermultiplier : 0.0;
            case 1: return (x == width - 1) ? cornermultiplier : 0.0;
            case 2: return (y == 0) ? cornermultiplier : 0.0;
            case 3: return (y == height - 1) ? cornermultiplier : 0.0; 
        }
    }));
}

var crdStepProgram = null;
function initialseCRDStepShader() { 
    initialiseCopyShader();

    if (crdStepProgram) {
        gl.deleteProgram(crdStepProgram);
    }
    crdStepProgram = loadShader(crdStepVertexShader, crdStepFragmentShader); 

    crdStepProgram.aVertexPosition = gl.getAttribLocation(crdStepProgram, "aVertexPosition");
    crdStepProgram.srcDimensions = gl.getUniformLocation(crdStepProgram, "srcDimensions");

    crdStepProgram.in_old_x = gl.getUniformLocation(crdStepProgram, "in_old_x");
    crdStepProgram.in_x = gl.getUniformLocation(crdStepProgram, "in_x");

    crdStepProgram.in_u0 = gl.getUniformLocation(crdStepProgram, "in_u0");
    crdStepProgram.in_uk = gl.getUniformLocation(crdStepProgram, "in_uk");
    crdStepProgram.in_boundaryConditions = gl.getUniformLocation(crdStepProgram, "in_boundaryConditions");

    crdStepProgram.dt = gl.getUniformLocation(crdStepProgram, "dt");
    crdStepProgram.Du = gl.getUniformLocation(crdStepProgram, "Du");
    crdStepProgram.Dv = gl.getUniformLocation(crdStepProgram, "Dv");
    crdStepProgram.f = gl.getUniformLocation(crdStepProgram, "f");
    crdStepProgram.k = gl.getUniformLocation(crdStepProgram, "k");
}

function crdStep_usejacobi() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, computeFrameBuffer);
    gl.viewport(0, 0, computeFrameBuffer.width, computeFrameBuffer.height);

    gl.useProgram(crdStepProgram);
    gl.uniform2f(crdStepProgram.srcDimensions, computeFrameBuffer.width, computeFrameBuffer.height);
    
    gl.uniform1f(crdStepProgram.dt, demo.dt);
    gl.uniform1f(crdStepProgram.Du, demo.duValue);
    gl.uniform1f(crdStepProgram.Dv, demo.dvValue);
    gl.uniform1f(crdStepProgram.k, demo.kValue);
    gl.uniform1f(crdStepProgram.f, demo.fValue);

    gl.enableVertexAttribArray(crdStepProgram.aVertexPosition);
    gl.bindBuffer(gl.ARRAY_BUFFER, computeIndexBuffer);
    gl.vertexAttribPointer(crdStepProgram.aVertexPosition, 2, gl.FLOAT, false, 0, 0);

    gl.uniform1i(crdStepProgram.in_x, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, demo.x);

    gl.uniform1i(crdStepProgram.in_old_x, 4);
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, demo.previousX);

    gl.uniform1i(crdStepProgram.in_u0, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, demo.u);

    gl.uniform1i(crdStepProgram.in_boundaryConditions, 2);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, demo.crdBCs);

    gl.uniform1i(crdStepProgram.in_uk, 3);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, demo.uk);

    const ITERATIONS = demo.jacobiIterationCount;
    for (var iteration = 0; iteration < ITERATIONS; ++iteration) {
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.copyTexSubImage2D(gl.TEXTURE_2D, 0,0,0,0,0, computeFrameBuffer.width,computeFrameBuffer.height);
    }

    gl.activeTexture(gl.TEXTURE0);

    gl.bindTexture(gl.TEXTURE_2D, demo.u);
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, computeFrameBuffer.width, computeFrameBuffer.height);

    gl.bindTexture(gl.TEXTURE_2D, demo.w); 
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, computeFrameBuffer.width, computeFrameBuffer.height);

    // copied into demo.a for use in finding maximum
    gl.bindTexture(gl.TEXTURE_2D, demo.a);
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, computeFrameBuffer.width, computeFrameBuffer.height);

    // and b for min
    gl.bindTexture(gl.TEXTURE_2D, demo.b);
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, computeFrameBuffer.width, computeFrameBuffer.height);

    gl.readPixels(0, 0, computeFrameBuffer.width, computeFrameBuffer.height, gl.RGBA, gl.FLOAT, demo.uData);
}

