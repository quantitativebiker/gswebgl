var initialMeshData = null;
function initialiseMeshData(width, height,  bb_minx, bb_miny, bb_maxx, bb_maxy) {
    initialMeshData = new Float32Array(Array.from({length: width * height * 4}, (v,i) =>{
        var y = ( ( i - ( i % ( 4 * width ))) / 4) / width;
        var x = ( ( i - y * width * 4 ) - i % 4 ) / 4;
        switch(i % 4) {
            case 0: return bb_maxx * (x / (width-1))  + bb_minx * (1.0 - x / (width-1)); 
            case 1: return bb_maxy * (y / (height-1)) + bb_miny * (1.0 - y / (height-1)); 
            case 2: return 0.0; // reserved for later use
            case 3: return 0.0; // reserved for later use
        }
    }));
}

var boundaryConditionDataDirichlet = null;
var boundaryConditionDataNatural = null;
function initialiseBoundaryConditionData(width, height) {
    boundaryConditionDataDirichlet = new Float32Array(Array.from({length: width * height * 4}, (v,i) =>{
        var y = ( ( i - ( i % ( 4 * width ))) / 4) / width;
        var x = ((i - y * width * 4) - i % 4) / 4;

        var isBc = (x == 0) || (x == width - 1) || (y == 0) || (y == height - 1);
        
        switch(i % 4) {
            case 0: return isBc ? 0.0 : 1.0; 
            case 1: return isBc ? 0.0 : 1.0;  
            case 2: return 0.0; // reserved for later use
            case 3: return 0.0; // reserved for later use
        }
    }));

    boundaryConditionDataNatural = new Float32Array(Array.from({ length: width * height * 4 }, (v, i) => {
        var y = ((i - (i % (4 * width))) / 4) / width;
        var x = ((i - y * width * 4) - i % 4) / 4;

        switch (i % 4) {
            case 0: return (x == 0) ? 0.0 : (x == width - 1) ? 0.0 : 1.0;
            case 1: return (y == 0) ? 0.0 : (y == height - 1) ? 0.0 : 1.0;
            case 2: return 0.0; // reserved for later use
            case 3: return 0.0; // reserved for later use
        }
    }));

}
