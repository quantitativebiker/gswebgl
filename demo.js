
// demo: x, u, w,  etc
var demo = class {};
var time = 0.0;
var reset = false;
var useIc = 0;
var randomKick = false;

function updateScene() {

    var dtTextBoxValue = document.getElementById("dtTextBox").value;
    if (dtTextBoxValue.length > 0) {
        dtTextBoxValue = Number(dtTextBoxValue);
        if (dtTextBoxValue === Number(dtTextBoxValue)) {
            demo.dt = dtTextBoxValue;
        }
    }
    if (demo.dt < 1e-6) {
        demo.dt = 1e-6; // Maybe someone accidentally enters 0, since we divide by dt later we clamp it at a small value.
    }

    var kickTextBox = document.getElementById("kickTextBox").value;
    if (kickTextBox.length > 0) {
        kickTextBox = Number(kickTextBox);
        if (kickTextBox === Number(kickTextBox)) {
            demo.kickValue = kickTextBox;
        }
    }

    // G-S Parameters
    var duTextBoxValue = document.getElementById("duTextBox").value;
    if (duTextBoxValue.length > 0) {
        duTextBoxValue = Number(duTextBoxValue);
        if (duTextBoxValue === Number(duTextBoxValue)) {
            demo.duValue = duTextBoxValue;
        }
    }

    var dvTextBoxValue = document.getElementById("dvTextBox").value;
    if (dvTextBoxValue.length > 0) {
        dvTextBoxValue = Number(dvTextBoxValue);
        if (dvTextBoxValue === Number(dvTextBoxValue)) {
            demo.dvValue = dvTextBoxValue;
        }
    }

    var fTextBoxValue = document.getElementById("fTextBox").value;
    if (fTextBoxValue.length > 0) {
        fTextBoxValue = Number(fTextBoxValue);
        if (fTextBoxValue === Number(fTextBoxValue)) {
            demo.fValue = fTextBoxValue;
        }
    }

    var kTextBoxValue = document.getElementById("kTextBox").value;
    if (kTextBoxValue.length > 0) {
        kTextBoxValue = Number(kTextBoxValue);
        if (kTextBoxValue === Number(kTextBoxValue)) {
            demo.kValue = kTextBoxValue;
        }
    }

    demo.showMeshChecked = document.getElementById("showMeshChecked").checked;
    demo.adaptiveMeshCheck = document.getElementById("adaptiveMeshCheck").checked;

    var nX = 256; // document.getElementById("nXTextBox").value;
    if (nX.length > 0) {
        nX = Number(nX);
    }

    var nY = 256; // document.getElementById("nYTextBox").value;
    if (nY.length > 0) {
        nY = Number(nY);
    }

    if (nX != demo.nX || nY != demo.nY) {
        demo.nX = nX;
        demo.nY = nY;

        createComputeBuffers(demo.nX, demo.nY); 

        initialseMeshmoveStepShader();
        initialiseMaxShader();
        initialiseMinShader();
        initialiseLinesShader();

        initialiseLinesProgram();
        initialiseMeshData(computeFrameBuffer.width, computeFrameBuffer.height,  -1.0,-1.0, 1.0,1.0);
        initialiseBoundaryConditionData(computeFrameBuffer.width, computeFrameBuffer.height);
        resetStateVariables();
        initialseCheckersShader();
    }

    demo.bcOption = 'natural'; // document.querySelector('input[name="bcOption"]:checked').value;

    var dtauTextBox = 0.1; // document.getElementById("dtauTextBox").value;
    if (dtauTextBox.length > 0) {
        demo.dtau = Number(dtauTextBox);
    }
    demo.dtau = 10000.0;

    var betaTextBox = 0.1; // document.getElementById("betaTextBox").value;
    if (betaTextBox.length > 0) {
        demo.beta = Number(betaTextBox);
    }
    demo.beta = 0.1;

    /*if (demo.beta < 1e-3) {
        document.getElementById("betaTextBox").style.backgroundColor = '#ff5';
    } else {
        document.getElementById("betaTextBox").style.backgroundColor = '#fff';
    }*/

    var alphaTextBox = 0.1;// document.getElementById("alphaTextBox").value;
    if (alphaTextBox.length > 0) {
        demo.alpha = Number(alphaTextBox);
    }

    demo.jacobiIterationCount = 32;
    /*var jacobiIterationTextBox = 32;// document.getElementById("jacobiIterationTextBox");
    if (jacobiIterationTextBox.value.length > 0){
        demo.jacobiIterationCount = Number(jacobiIterationTextBox.value);
        if (demo.jacobiIterationCount <= 1){
            demo.jacobiIterationCount = 1;
        }
    }*/

    demo.jacobiX0Option = 1;// document.querySelector('input[name="jacobiX0Option"]:checked').value;
    demo.gridColorOption = 'white';// 'black';// document.querySelector('input[name="gridColorOption"]:checked').value;
    demo.colorsid = '4'; // 1 5

    // document.querySelector('input[name="colorOption"]:checked').value;

    demo.gridLineWidth = 0.001;

    if (randomKick) {
        var width = demo.nX, height = demo.nY;
        for (var i = 0; i < demo.uData.length; ++i) { // slow but intermitten one time thing.
            var y = ((i - (i % (4 * width))) / 4) / width;
            var x = ((i - y * width * 4) - i % 4) / 4;

            var perturbation = demo.kickValue;

            switch (i % 4) {
                case 0: demo.uData[i] -= perturbation * Math.random();
                case 1: demo.uData[i] += perturbation * Math.random();
            }
        }

        gl.bindTexture(gl.TEXTURE_2D, demo.u);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.FLOAT, demo.uData);

        randomKick = false;
    }
    
    time += demo.dt;

    crdStep_usejacobi();
    computeMaxU();
    computeMinU();

    var uInfo = document.getElementById("uInfo");
    uInfo.innerHTML =
          "t = " + Number(time).toFixed(2)
        + ",<br/>uMin = " + Number(demo.uMin).toFixed(4)
        + ",<br/>uMax = " + Number(demo.uMax).toFixed(4) 
        + ",<br/>u (range) = " + Number(demo.uMax - demo.uMin).toFixed(4);

    computeMeshmoveStep_usejacobi();
}

function renderScene() {
    // Lines and background visuals generated here
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    checkersPlot();

    if (demo.showMeshChecked) {
        renderLines(demo.x, .3, .3, .3, 1, demo.gridLineWidth, 1);
    }
}

function tick() {

    if (reset) {
        resetStateVariables();
        reset = false;
    }

    updateScene();
    renderScene();

    requestAnimationFrame(tick);
}

function resetStateVariables() {
    time = 0.0;

    var width = computeFrameBuffer.width, height = computeFrameBuffer.height;
    demo.dummyData = new Float32Array(Array.from({ length: width * height * 4 }, (v, i) => { return 1.0; }));

    demo.uData = new Float32Array(Array.from({ length: width * height * 4 }, (v, i) => {
        var y = ((i - (i % (4 * width))) / 4) / width;
        var x = ((i - y * width * 4) - i % 4) / 4;

        var perturbation = 0.3;

        if (useIc == 0) {
            if (0.45 * width < x && x < 0.55 * width && 0.45 * height < y && y < 0.55 * height) {
                switch (i % 4) {
                    case 0: return 1.0 - perturbation * Math.random();
                    case 1: return 0.0 + perturbation * Math.random();
                    case 2: return 0.0; // reserved for later use
                    case 3: return 0.0; // reserved for later use
                }
            }
        }

        else if (useIc == 1) {

            if (0.35 * width < x && x < 0.45 * width && 0.75 * height < y && y < 0.85 * height) {
                switch (i % 4) {
                    case 0: return 1.0 - perturbation * Math.random();
                    case 1: return 0.0 + perturbation * Math.random();
                    case 2: return 0.0; // reserved for later use
                    case 3: return 0.0; // reserved for later use
                }
            } else if (0.65 * width < x && x < 0.75 * width && 0.15 * height < y && y < 0.25 * height) {
                switch (i % 4) {
                    case 0: return 1.0 - perturbation * Math.random();
                    case 1: return 0.0 + perturbation * Math.random();
                    case 2: return 0.0; // reserved for later use
                    case 3: return 0.0; // reserved for later use
                }
            }

        } else if (useIc == 2) {

            if (0.2 * width < x && x < 0.4 * width && 0.7 * height < y && y < 0.9 * height) {
                switch (i % 4) {
                    case 0: return 1.0 - perturbation * Math.random();
                    case 1: return 0.0 + perturbation * Math.random();
                    case 2: return 0.0; // reserved for later use
                    case 3: return 0.0; // reserved for later use
                }
            } else if (0.6 * width < x && x < 0.8 * width && 0.1 * height < y && y < 0.3 * height) {
                switch (i % 4) {
                    case 0: return 1.0 - perturbation * Math.random();
                    case 1: return 0.0 + perturbation * Math.random();
                    case 2: return 0.0; // reserved for later use
                    case 3: return 0.0; // reserved for later use
                }
            }
        }

        switch (i % 4) {
            case 0: return 1.0;
            case 1: return 0.0;
            case 2: return 0.0; // reserved for later use
            case 3: return 0.0; // reserved for later use
        }
    }));


    demo.xData = new Float32Array(Array.from({length: width * height * 4}, (v,i) => { return 1.0; }));
    
    demo.x00 = createComputeTexture(width, height, initialMeshData);
    demo.previousX = createComputeTexture(width, height, initialMeshData);
    demo.x = createComputeTexture(width, height, initialMeshData);
    demo.xk = createComputeTexture(width, height, initialMeshData);
    demo.w = createComputeTexture(width, height, demo.dummyData); 

    demo.boundaryConditionDirichlet = createComputeTexture(width, height, boundaryConditionDataDirichlet);
    demo.boundaryConditionNatural = createComputeTexture(width, height, boundaryConditionDataNatural);

    demo.u0 = createComputeTexture(width, height, demo.uData);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); // for periodic BCs
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    demo.u = createComputeTexture(width, height, demo.uData); 
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    demo.uk = createComputeTexture(width, height, demo.uData); 
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    demo.renderTex = createComputeTexture(width, height, demo.dummyData);
    demo.crdBCs = createComputeTexture(width, height, boundaryConditionDataForCRD);
    
    demo.a = createComputeTexture(width, height, demo.dummyData); 
    demo.b = createComputeTexture(width, height, demo.dummyData); 
    demo.uMin = 0.0;
    demo.uMax = 1.0;
    demo.dt = 0.03;
    demo.beta = 0.0; 
    demo.alpha = 0.0;
    demo.jacobiIterationCount = 64;

    demo.randomKick = false;
}

function startDemo() {
    var canvas = document.getElementById("democanvas");

    initGL(canvas);

    demo.nX = 256;
    demo.nY = 256;
    createComputeBuffers(demo.nX, demo.nY);

    initialseCRDStepShader();
    initialiseBoundaryConditionDataForCRD(computeFrameBuffer.width, computeFrameBuffer.height);

    initialseMeshmoveStepShader();
    initialiseMaxShader();
    initialiseMinShader();
    initialiseLinesShader();

    initialiseLinesProgram();
    initialiseMeshData(computeFrameBuffer.width, computeFrameBuffer.height,  -1.0,-1.0, 1.0,1.0);
    initialiseBoundaryConditionData(computeFrameBuffer.width, computeFrameBuffer.height);
    resetStateVariables();
    initialseCheckersShader();

    tick();
}
