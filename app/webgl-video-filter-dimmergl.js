class DimmerglFilter {
    constructor(/*canvas*/) {
        this._canvas = null;
        this._gl = null;
        this._program = null;

        this._angle = 10
        this._w = -1
        this._h = -1
    }

    init() {
        ;
    }

    processVideoFrame(videoFrame) {
        if (++this._angle >= 80) this._angle = 10;
        const scale = Math.sin(this._angle / 180.0 * Math.PI);

        const size = videoFrame.height * videoFrame.width;

        let planeY = {
            data: videoFrame.data.subarray(0, size),
            width: videoFrame.width,
            height: videoFrame.height,
        };

        let planeUV = {
            data: videoFrame.data.subarray(size, size * 3 / 2),
            width: videoFrame.width,
            height: videoFrame.height / 2,
        };

        let plane = planeY;
        this._prepare(plane.width, plane.height);
        
        // this._op_set(plane.data, 240, plane.data)
        // this._op_scale(plane.data, 0.5, plane.data);
        
        this._op_scale_gl(this._gl, plane.data, scale, plane.data);
        
    }

    _op_set(ab, v, ab2) {
        const w = this._w;
        const h = this._h;
        for (let i = 0; i < w * h; ++i) {
            ab2[i] = v;
        }
    }

    _op_scale(ab, v, ab2) {
        const w = this._w;
        const h = this._h;
        for (let i = 0; i < w * h; ++i) {
            ab2[i] *= v;
        }
    }
    
    _op_scale_gl(gl, srcBytes, scale, dstBytes) {
        let program = this._program;
        const positionLoc = gl.getAttribLocation(program, 'position');
        const srcTexLoc = gl.getUniformLocation(program, 'srcTex');
        const srcDimensionsLoc = gl.getUniformLocation(program, 'srcDimensions');
        const u_scale = gl.getUniformLocation(program, 'u_scale');

        // setup a full canvas clip space quad
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1,
            1, -1,
            -1, 1,
            -1, 1,
            1, -1,
            1, 1,
        ]), gl.STATIC_DRAW);

        // setup our attributes to tell WebGL how to pull
        // the data from the buffer above to the position attribute
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(
            positionLoc,
            2,
            gl.FLOAT,
            false,
            0,
            0
        );

        // create our source texture
        const srcWidth = this._w;
        const srcHeight = this._h;
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); // see https://webglfundamentals.org/webgl/lessons/webgl-data-textures.html
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.LUMINANCE,
            srcWidth,
            srcHeight,
            0,
            gl.LUMINANCE,
            gl.UNSIGNED_BYTE,
            new Uint8Array(srcBytes));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        //gl.useProgram(program);
        gl.uniform1i(srcTexLoc, 0); // tell the shader the src texture is on texture unit 0
        gl.uniform2f(srcDimensionsLoc, srcWidth, srcHeight);
        gl.uniform1f(u_scale, scale);

        gl.drawArrays(gl.TRIANGLES, 0, 6); // draw 2 triangles (6 vertices)

        // get the result
        const dstWidth = this._w;
        const dstHeight = this._h;
        const results = new Uint8Array(dstWidth * dstHeight * 4);
        gl.readPixels(0, 0, dstWidth, dstHeight, gl.RGBA, gl.UNSIGNED_BYTE, results);
        // await readPixelsAsync(gl, 0, 0, dstWidth, dstHeight, gl.RGBA, gl.UNSIGNED_BYTE, results);

        // write(dstWidth, dstHeight, results, dstBytes);
        for (let i = 0; i < dstWidth * dstHeight; ++i) {
            // console.log(results[i * 4]);
            dstBytes[i] = results[i * 4];
        }
    }

    _prepare(w, h) {
        if (this._w == w && this._h == h) {
            return 0;
        }

        this._canvas = document.createElement('canvas');
        this._canvas.width = w;
        this._canvas.height = h;
        this._gl = this._canvas.getContext('webgl2');
        this._w = w;
        this._h = h;
        console.log(`this._canvas.width: ${this._canvas.width}`);
        console.log(`this._canvas.height: ${this._canvas.height}`);

        const vs = `
            attribute vec4 position;
            void main() {
            gl_Position = position;
            }
        `;

        const fs = `
            precision highp float;

            uniform sampler2D srcTex;
            uniform vec2 srcDimensions;
            uniform float u_scale;

            void main() {
            vec2 texcoord = gl_FragCoord.xy / srcDimensions;
            vec4 value = texture2D(srcTex, texcoord);
            gl_FragColor = value * u_scale;
            }
        `;

        let gl = this._gl;
        let program = this._createProgramFromSources(gl, vs, fs);
        gl.useProgram(program);
        this._program = program
    }

    _createShader(gl, type, source) {
        var shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
        if (success) {
            return shader;
        }

        console.log(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
    }

    _createProgramFromSources(gl, vs_src, fs_src) {
        var vertexShader = this._createShader(gl, gl.VERTEX_SHADER, vs_src);
        var fragmentShader = this._createShader(gl, gl.FRAGMENT_SHADER, fs_src);
        var program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        var success = gl.getProgramParameter(program, gl.LINK_STATUS);
        if (success) {
            return program;
        }
        console.log(gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
    }
}
