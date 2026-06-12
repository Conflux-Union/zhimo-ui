/* ZhiMo UI 特效组件：my-ink-paper —— 墨滴入水的背景显影
   用法：<my-ink-paper image="bg.jpg"></my-ink-paper>

   背景图垫在页面最底层，纸面（--my-bg）盖在其上。
   内部跑一个 Stable Fluids 流体模拟（Jos Stam 算法）：
   鼠标移动把墨和动量一起注入流场，墨被水流推着卷出涡旋须，
   按下鼠标则滴一滴墨（径向外冲的速度场，像墨滴砸进水里炸开），
   墨蚀开纸面露出背景图，随时间稀释后纸面重新合拢。

   默认走 GPU（WebGL2 + 半精度浮点纹理）：墨浓度场跑全窗口分辨率、
   速度场跑 1/4 分辨率，每个模拟步骤一个 fragment shader。
   不支持 WebGL2 浮点渲染的环境自动回退到低分辨率 CPU canvas 版本。 */

/* ---------- 手感参数 ---------- */
const DYE_DISSIPATION = 0.988; // 墨每帧的稀释率（≈2 秒明显变淡，3 秒基本复原）
const VEL_DISSIPATION = 0.96; // 水流每帧的衰减率（粘滞：大尺度流快速耗散，只留涡旋）
const VEL_FLOOR = 0.008; // 速度线性衰减地板（texel/帧）：指数衰减永远到不了零，
                         // 而涡度增强会不断喂养残留噪声形成"幽灵水流"，
                         // 每帧直接减去这个量，低于它的微流彻底归零，水才会真正静下来
const VORTICITY = 0.15; // 涡度增强强度：墨水须状卷曲的来源。
                        // 它每帧注入与涡度成正比的能量，必须小到能被
                        // VEL_DISSIPATION 的耗散压住，否则流场会自激发散
const PRESSURE_ITER = 28; // 压力投影的 Jacobi 迭代次数（GPU）
const REF_SIM_H = 180; // 速度量纲的参考网格高度：速度单位是 texel/帧，
                       // 网格密度改变时所有速度相关常量按 simH/REF_SIM_H 缩放，手感不变
const INK_CURVE = 2.4; // 浓度→透明度的映射陡度

const clamp = (x, lo, hi) => (x < lo ? lo : x > hi ? hi : x);

/* ============================================================
   GPU 实现：每个模拟步骤一个 fragment shader
   ============================================================ */

const VERT = `
  attribute vec2 aPos;
  varying vec2 vUv;
  void main() {
    vUv = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
  }
`;

/* 半拉格朗日平流：顺着速度场倒推采样，无条件稳定。
   uFloor 只对速度场使用（染料场传 0）：每帧线性减去固定量，微流归零 */
const FRAG_ADVECT = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uVelocity;
  uniform sampler2D uSource;
  uniform vec2 uSimTexel;
  uniform float uDissipation;
  uniform float uFloor;
  uniform float uMaxVel;
  void main() {
    vec2 vel = texture2D(uVelocity, vUv).xy;
    vec2 coord = vUv - vel * uSimTexel;
    vec4 val = uDissipation * texture2D(uSource, coord);
    float m = length(val.xy);
    val.xy *= max(0.0, m - uFloor) / max(m, 1e-6);
    val.xy = clamp(val.xy, -uMaxVel, uMaxVel);
    gl_FragColor = val;
  }
`;

const FRAG_DIVERGENCE = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uVelocity;
  uniform vec2 uTexel;
  void main() {
    float L = texture2D(uVelocity, vUv - vec2(uTexel.x, 0.0)).x;
    float R = texture2D(uVelocity, vUv + vec2(uTexel.x, 0.0)).x;
    float B = texture2D(uVelocity, vUv - vec2(0.0, uTexel.y)).y;
    float T = texture2D(uVelocity, vUv + vec2(0.0, uTexel.y)).y;
    gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
  }
`;

/* 压力 Jacobi 迭代：沿用上一帧压力作初值（热启动），收敛更快 */
const FRAG_PRESSURE = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uPressure;
  uniform sampler2D uDivergence;
  uniform vec2 uTexel;
  void main() {
    float L = texture2D(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
    float R = texture2D(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
    float B = texture2D(uPressure, vUv - vec2(0.0, uTexel.y)).x;
    float T = texture2D(uPressure, vUv + vec2(0.0, uTexel.y)).x;
    float div = texture2D(uDivergence, vUv).x;
    gl_FragColor = vec4((L + R + B + T - div) * 0.25, 0.0, 0.0, 1.0);
  }
`;

/* 减压力梯度：让流场无散度（水不可压缩），墨才会打转而不是堆积 */
const FRAG_GRADIENT = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uPressure;
  uniform sampler2D uVelocity;
  uniform vec2 uTexel;
  void main() {
    float L = texture2D(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
    float R = texture2D(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
    float B = texture2D(uPressure, vUv - vec2(0.0, uTexel.y)).x;
    float T = texture2D(uPressure, vUv + vec2(0.0, uTexel.y)).x;
    vec2 vel = texture2D(uVelocity, vUv).xy - 0.5 * vec2(R - L, T - B);
    gl_FragColor = vec4(vel, 0.0, 1.0);
  }
`;

const FRAG_CURL = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uVelocity;
  uniform vec2 uTexel;
  void main() {
    float L = texture2D(uVelocity, vUv - vec2(uTexel.x, 0.0)).y;
    float R = texture2D(uVelocity, vUv + vec2(uTexel.x, 0.0)).y;
    float B = texture2D(uVelocity, vUv - vec2(0.0, uTexel.y)).x;
    float T = texture2D(uVelocity, vUv + vec2(0.0, uTexel.y)).x;
    gl_FragColor = vec4(0.5 * ((R - L) - (T - B)), 0.0, 0.0, 1.0);
  }
`;

/* 涡度增强：把数值耗散掉的小涡旋补回来，墨须就是它卷出来的 */
const FRAG_VORTICITY = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uVelocity;
  uniform sampler2D uCurl;
  uniform vec2 uTexel;
  uniform float uVorticity;
  void main() {
    float L = abs(texture2D(uCurl, vUv - vec2(uTexel.x, 0.0)).x);
    float R = abs(texture2D(uCurl, vUv + vec2(uTexel.x, 0.0)).x);
    float B = abs(texture2D(uCurl, vUv - vec2(0.0, uTexel.y)).x);
    float T = abs(texture2D(uCurl, vUv + vec2(0.0, uTexel.y)).x);
    float C = texture2D(uCurl, vUv).x;
    vec2 grad = 0.5 * vec2(R - L, T - B);
    vec2 N = grad / (length(grad) + 1e-5);
    vec2 vel = texture2D(uVelocity, vUv).xy + uVorticity * C * vec2(N.y, -N.x);
    gl_FragColor = vec4(vel, 0.0, 1.0);
  }
`;

/* 注墨/注动量：高斯团叠加到目标场上 */
const FRAG_SPLAT = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTarget;
  uniform vec2 uPoint;
  uniform vec3 uValue;
  uniform float uRadius;
  uniform float uAspect;
  void main() {
    vec2 p = vUv - uPoint;
    p.x *= uAspect;
    float s = exp(-dot(p, p) / uRadius);
    gl_FragColor = vec4(texture2D(uTarget, vUv).xyz + uValue * s, 1.0);
  }
`;

/* 滴墨：径向外冲的速度环，sqrt(q) 让中心平静、外圈推力大 */
const FRAG_DROP = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTarget;
  uniform vec2 uPoint;
  uniform float uRadius;
  uniform float uStrength;
  uniform float uAspect;
  void main() {
    vec2 p = vUv - uPoint;
    p.x *= uAspect;
    float q = dot(p, p) / uRadius;
    vec2 dir = p / (length(p) + 1e-5);
    vec2 vel = texture2D(uTarget, vUv).xy + dir * uStrength * exp(-4.0 * q) * sqrt(q);
    gl_FragColor = vec4(vel, 0.0, 1.0);
  }
`;

/* 显影合成：输出纸色，墨浓处透明度降低、露出背景图（预乘 alpha） */
const FRAG_DISPLAY = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uDye;
  uniform vec3 uPaper;
  uniform float uCurve;
  void main() {
    float d = texture2D(uDye, vUv).x;
    float ink = 0.98 * (1.0 - exp(-uCurve * d));
    float a = 1.0 - ink;
    gl_FragColor = vec4(uPaper * a, a);
  }
`;

function compileShader(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(sh));
  }
  return sh;
}

function createProgram(gl, fragSrc) {
  const prog = gl.createProgram();
  gl.attachShader(prog, compileShader(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compileShader(gl, gl.FRAGMENT_SHADER, fragSrc));
  gl.bindAttribLocation(prog, 0, 'aPos');
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(prog));
  }
  const uniforms = {};
  const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const name = gl.getActiveUniform(prog, i).name;
    uniforms[name] = gl.getUniformLocation(prog, name);
  }
  return { prog, uniforms };
}

class InkGL {
  static supported() {
    try {
      const gl = document.createElement('canvas').getContext('webgl2');
      return !!(gl && gl.getExtension('EXT_color_buffer_float'));
    } catch {
      return false;
    }
  }

  constructor(canvas) {
    const gl = canvas.getContext('webgl2', {
      alpha: true, depth: false, stencil: false, antialias: false,
    });
    if (!gl || !gl.getExtension('EXT_color_buffer_float')) {
      throw new Error('WebGL2 float rendering unsupported');
    }
    this.gl = gl;

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.disable(gl.BLEND);

    this.pAdvect = createProgram(gl, FRAG_ADVECT);
    this.pDivergence = createProgram(gl, FRAG_DIVERGENCE);
    this.pPressure = createProgram(gl, FRAG_PRESSURE);
    this.pGradient = createProgram(gl, FRAG_GRADIENT);
    this.pCurl = createProgram(gl, FRAG_CURL);
    this.pVorticity = createProgram(gl, FRAG_VORTICITY);
    this.pSplat = createProgram(gl, FRAG_SPLAT);
    this.pDrop = createProgram(gl, FRAG_DROP);
    this.pDisplay = createProgram(gl, FRAG_DISPLAY);
    this._targets = [];
  }

  resize(w, h) {
    const gl = this.gl;
    this.w = w;
    this.h = h;
    // 速度场与墨浓度场同为全分辨率
    this.simW = w;
    this.simH = h;
    // 速度量纲缩放：让不同网格密度下的手感一致
    this.velScale = this.simH / REF_SIM_H;
    for (const t of this._targets) {
      gl.deleteTexture(t.tex);
      gl.deleteFramebuffer(t.fbo);
    }
    this._targets = [];
    this.velocity = this._double(this.simW, this.simH, gl.RG16F, gl.RG, gl.LINEAR);
    this.pressure = this._double(this.simW, this.simH, gl.R16F, gl.RED, gl.NEAREST);
    this.divergence = this._fbo(this.simW, this.simH, gl.R16F, gl.RED, gl.NEAREST);
    this.curl = this._fbo(this.simW, this.simH, gl.R16F, gl.RED, gl.NEAREST);
    this.dye = this._double(w, h, gl.R16F, gl.RED, gl.LINEAR);
  }

  _fbo(w, h, internal, format, filter) {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, gl.HALF_FLOAT, null);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const target = { tex, fbo, w, h };
    this._targets.push(target);
    return target;
  }

  _double(w, h, internal, format, filter) {
    const pair = {
      read: this._fbo(w, h, internal, format, filter),
      write: this._fbo(w, h, internal, format, filter),
      swap() { [this.read, this.write] = [this.write, this.read]; },
    };
    return pair;
  }

  _tex(t, unit) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t.tex);
    return unit;
  }

  _blit(target) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fbo : null);
    gl.viewport(0, 0, target ? target.w : this.w, target ? target.h : this.h);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /* x/y 为 UV 坐标（左下原点），dx/dy 为速度（模拟网格 texel/帧） */
  splat(x, y, dx, dy, amount, rVel, rDye) {
    const gl = this.gl;
    const P = this.pSplat;
    gl.useProgram(P.prog);
    gl.uniform1f(P.uniforms.uAspect, this.w / this.h);
    gl.uniform2f(P.uniforms.uPoint, x, y);
    gl.uniform1i(P.uniforms.uTarget, this._tex(this.velocity.read, 0));
    gl.uniform1f(P.uniforms.uRadius, rVel);
    gl.uniform3f(P.uniforms.uValue, dx, dy, 0);
    this._blit(this.velocity.write);
    this.velocity.swap();
    gl.uniform1i(P.uniforms.uTarget, this._tex(this.dye.read, 0));
    gl.uniform1f(P.uniforms.uRadius, rDye);
    gl.uniform3f(P.uniforms.uValue, amount, 0, 0);
    this._blit(this.dye.write);
    this.dye.swap();
  }

  drop(x, y, strength, radius, amount) {
    const gl = this.gl;
    const P = this.pDrop;
    gl.useProgram(P.prog);
    gl.uniform1f(P.uniforms.uAspect, this.w / this.h);
    gl.uniform2f(P.uniforms.uPoint, x, y);
    gl.uniform1f(P.uniforms.uRadius, radius);
    gl.uniform1f(P.uniforms.uStrength, strength);
    gl.uniform1i(P.uniforms.uTarget, this._tex(this.velocity.read, 0));
    this._blit(this.velocity.write);
    this.velocity.swap();
    const S = this.pSplat;
    gl.useProgram(S.prog);
    gl.uniform1f(S.uniforms.uAspect, this.w / this.h);
    gl.uniform2f(S.uniforms.uPoint, x, y);
    gl.uniform1i(S.uniforms.uTarget, this._tex(this.dye.read, 0));
    gl.uniform1f(S.uniforms.uRadius, radius * 0.6);
    gl.uniform3f(S.uniforms.uValue, amount, 0, 0);
    this._blit(this.dye.write);
    this.dye.swap();
  }

  step(paper) {
    const gl = this.gl;
    const tx = 1 / this.simW;
    const ty = 1 / this.simH;

    let P = this.pCurl;
    gl.useProgram(P.prog);
    gl.uniform2f(P.uniforms.uTexel, tx, ty);
    gl.uniform1i(P.uniforms.uVelocity, this._tex(this.velocity.read, 0));
    this._blit(this.curl);

    P = this.pVorticity;
    gl.useProgram(P.prog);
    gl.uniform2f(P.uniforms.uTexel, tx, ty);
    // 注意：涡度强度不随 velScale 缩放——它的稳定性条件是逐格噪声层面的，
    // 与网格密度无关；乘上去会直接进入自激发散区间
    gl.uniform1f(P.uniforms.uVorticity, VORTICITY);
    gl.uniform1i(P.uniforms.uVelocity, this._tex(this.velocity.read, 0));
    gl.uniform1i(P.uniforms.uCurl, this._tex(this.curl, 1));
    this._blit(this.velocity.write);
    this.velocity.swap();

    P = this.pDivergence;
    gl.useProgram(P.prog);
    gl.uniform2f(P.uniforms.uTexel, tx, ty);
    gl.uniform1i(P.uniforms.uVelocity, this._tex(this.velocity.read, 0));
    this._blit(this.divergence);

    P = this.pPressure;
    gl.useProgram(P.prog);
    gl.uniform2f(P.uniforms.uTexel, tx, ty);
    gl.uniform1i(P.uniforms.uDivergence, this._tex(this.divergence, 1));
    for (let i = 0; i < PRESSURE_ITER; i++) {
      gl.uniform1i(P.uniforms.uPressure, this._tex(this.pressure.read, 0));
      this._blit(this.pressure.write);
      this.pressure.swap();
    }

    P = this.pGradient;
    gl.useProgram(P.prog);
    gl.uniform2f(P.uniforms.uTexel, tx, ty);
    gl.uniform1i(P.uniforms.uPressure, this._tex(this.pressure.read, 0));
    gl.uniform1i(P.uniforms.uVelocity, this._tex(this.velocity.read, 1));
    this._blit(this.velocity.write);
    this.velocity.swap();

    P = this.pAdvect;
    gl.useProgram(P.prog);
    gl.uniform2f(P.uniforms.uSimTexel, tx, ty);
    gl.uniform1f(P.uniforms.uDissipation, VEL_DISSIPATION);
    gl.uniform1f(P.uniforms.uFloor, VEL_FLOOR * this.velScale);
    gl.uniform1f(P.uniforms.uMaxVel, 8 * this.velScale);
    gl.uniform1i(P.uniforms.uVelocity, this._tex(this.velocity.read, 0));
    gl.uniform1i(P.uniforms.uSource, this._tex(this.velocity.read, 0));
    this._blit(this.velocity.write);
    this.velocity.swap();

    gl.uniform1f(P.uniforms.uDissipation, DYE_DISSIPATION);
    gl.uniform1f(P.uniforms.uFloor, 0);
    gl.uniform1i(P.uniforms.uVelocity, this._tex(this.velocity.read, 0));
    gl.uniform1i(P.uniforms.uSource, this._tex(this.dye.read, 1));
    this._blit(this.dye.write);
    this.dye.swap();

    P = this.pDisplay;
    gl.useProgram(P.prog);
    gl.uniform1f(P.uniforms.uCurve, INK_CURVE);
    gl.uniform3f(P.uniforms.uPaper, paper[0], paper[1], paper[2]);
    gl.uniform1i(P.uniforms.uDye, this._tex(this.dye.read, 0));
    this._blit(null);
  }
}

/* ============================================================
   CPU 回退实现：低分辨率网格上的同一套算法
   ============================================================ */

const CPU_MAX_CELLS = 26000;
const CPU_PRESSURE_ITER = 14;

class FluidCPU {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    const n = w * h;
    this.u = new Float32Array(n);
    this.v = new Float32Array(n);
    this.u2 = new Float32Array(n);
    this.v2 = new Float32Array(n);
    this.d = new Float32Array(n);
    this.d2 = new Float32Array(n);
    this.p = new Float32Array(n);
    this.div = new Float32Array(n);
    this.curl = new Float32Array(n);
  }

  splat(x, y, dx, dy, amount, radius) {
    const { w, h, u, v, d } = this;
    const r2 = radius * radius;
    const x0 = Math.max(1, Math.floor(x - radius));
    const x1 = Math.min(w - 2, Math.ceil(x + radius));
    const y0 = Math.max(1, Math.floor(y - radius));
    const y1 = Math.min(h - 2, Math.ceil(y + radius));
    for (let j = y0; j <= y1; j++) {
      for (let i = x0; i <= x1; i++) {
        const q = ((i - x) * (i - x) + (j - y) * (j - y)) / r2;
        if (q >= 1) continue;
        const f = Math.exp(-4 * q);
        const k = i + j * w;
        d[k] += amount * f;
        u[k] += dx * f;
        v[k] += dy * f;
      }
    }
  }

  drop(x, y, strength, radius, amount) {
    const { w, h, u, v, d } = this;
    const r2 = radius * radius;
    const x0 = Math.max(1, Math.floor(x - radius));
    const x1 = Math.min(w - 2, Math.ceil(x + radius));
    const y0 = Math.max(1, Math.floor(y - radius));
    const y1 = Math.min(h - 2, Math.ceil(y + radius));
    for (let j = y0; j <= y1; j++) {
      for (let i = x0; i <= x1; i++) {
        const ox = i - x;
        const oy = j - y;
        const q = (ox * ox + oy * oy) / r2;
        if (q >= 1) continue;
        const k = i + j * w;
        d[k] += amount * Math.exp(-5 * q);
        const len = Math.sqrt(ox * ox + oy * oy) + 1e-5;
        const push = strength * Math.exp(-4 * q) * Math.sqrt(q);
        u[k] += (ox / len) * push;
        v[k] += (oy / len) * push;
      }
    }
  }

  step() {
    this._vorticity();
    this._advectVelocity();
    this._project();
    this._advectDye();
  }

  _vorticity() {
    const { w, h, u, v, curl } = this;
    for (let j = 1; j < h - 1; j++) {
      for (let i = 1; i < w - 1; i++) {
        const k = i + j * w;
        curl[k] = (v[k + 1] - v[k - 1] - u[k + w] + u[k - w]) * 0.5;
      }
    }
    for (let j = 2; j < h - 2; j++) {
      for (let i = 2; i < w - 2; i++) {
        const k = i + j * w;
        let gx = Math.abs(curl[k + 1]) - Math.abs(curl[k - 1]);
        let gy = Math.abs(curl[k + w]) - Math.abs(curl[k - w]);
        const len = Math.sqrt(gx * gx + gy * gy) + 1e-5;
        gx /= len;
        gy /= len;
        u[k] += VORTICITY * gy * curl[k];
        v[k] -= VORTICITY * gx * curl[k];
      }
    }
  }

  _project() {
    const { w, h, u, v, p, div } = this;
    for (let j = 1; j < h - 1; j++) {
      for (let i = 1; i < w - 1; i++) {
        const k = i + j * w;
        div[k] = -0.5 * (u[k + 1] - u[k - 1] + v[k + w] - v[k - w]);
        p[k] = 0;
      }
    }
    for (let it = 0; it < CPU_PRESSURE_ITER; it++) {
      for (let j = 1; j < h - 1; j++) {
        for (let i = 1; i < w - 1; i++) {
          const k = i + j * w;
          p[k] = (div[k] + p[k - 1] + p[k + 1] + p[k - w] + p[k + w]) * 0.25;
        }
      }
    }
    for (let j = 1; j < h - 1; j++) {
      for (let i = 1; i < w - 1; i++) {
        const k = i + j * w;
        u[k] -= 0.5 * (p[k + 1] - p[k - 1]);
        v[k] -= 0.5 * (p[k + w] - p[k - w]);
      }
    }
  }

  _advectVelocity() {
    const { w, h, u, v, u2, v2 } = this;
    for (let j = 1; j < h - 1; j++) {
      for (let i = 1; i < w - 1; i++) {
        const k = i + j * w;
        const x = clamp(i - u[k], 0.5, w - 1.5);
        const y = clamp(j - v[k], 0.5, h - 1.5);
        let nu = this._sample(u, x, y) * VEL_DISSIPATION;
        let nv = this._sample(v, x, y) * VEL_DISSIPATION;
        // 线性衰减地板：低于阈值的微流彻底归零
        const m = Math.sqrt(nu * nu + nv * nv);
        if (m < VEL_FLOOR) {
          nu = 0;
          nv = 0;
        } else {
          const f = (m - VEL_FLOOR) / m;
          nu *= f;
          nv *= f;
        }
        u2[k] = nu;
        v2[k] = nv;
      }
    }
    [this.u, this.u2] = [this.u2, this.u];
    [this.v, this.v2] = [this.v2, this.v];
  }

  _advectDye() {
    const { w, h, u, v, d, d2 } = this;
    for (let j = 1; j < h - 1; j++) {
      for (let i = 1; i < w - 1; i++) {
        const k = i + j * w;
        const x = clamp(i - u[k], 0.5, w - 1.5);
        const y = clamp(j - v[k], 0.5, h - 1.5);
        d2[k] = this._sample(d, x, y) * DYE_DISSIPATION;
      }
    }
    [this.d, this.d2] = [this.d2, this.d];
  }

  _sample(f, x, y) {
    const { w } = this;
    const i0 = x | 0;
    const j0 = y | 0;
    const sx = x - i0;
    const sy = y - j0;
    const k = i0 + j0 * w;
    const a = f[k] * (1 - sx) + f[k + 1] * sx;
    const b = f[k + w] * (1 - sx) + f[k + w + 1] * sx;
    return a * (1 - sy) + b * sy;
  }
}

/* ============================================================
   组件
   ============================================================ */

class MyInkPaper extends HTMLElement {
  static observedAttributes = ['image'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: fixed;
          inset: 0;
          z-index: -1;
          pointer-events: none;
        }
        .bg, canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }
        .bg { background-size: cover; background-position: center; }
      </style>
      <div class="bg" part="image"></div>
      <canvas></canvas>
    `;
    this._bg = this.shadowRoot.querySelector('.bg');
    this._canvas = this.shadowRoot.querySelector('canvas');
    this._last = null;
  }

  attributeChangedCallback(name, _old, val) {
    if (name === 'image') {
      this._bg.style.backgroundImage = val ? `url("${val}")` : 'none';
    }
  }

  connectedCallback() {
    this._still = matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (InkGL.supported()) {
      this._gl = new InkGL(this._canvas);
    } else {
      this._gl = null;
      this._ctx = this._canvas.getContext('2d');
      this._low = document.createElement('canvas');
      this._lctx = this._low.getContext('2d');
    }

    this._readPaper();
    this._themeObserver = new MutationObserver(() => this._readPaper());
    this._themeObserver.observe(document.documentElement, {
      attributes: true, attributeFilter: ['data-theme'],
    });

    this._onResize = () => this._resize();
    this._onMove = (e) => this._pointerMove(e.clientX, e.clientY);
    this._onDown = (e) => this._pointerDown(e.clientX, e.clientY);
    window.addEventListener('resize', this._onResize);
    window.addEventListener('pointermove', this._onMove);
    window.addEventListener('pointerdown', this._onDown);

    this._resize();
    this._raf = requestAnimationFrame(this._tick);
  }

  disconnectedCallback() {
    cancelAnimationFrame(this._raf);
    this._themeObserver.disconnect();
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('pointermove', this._onMove);
    window.removeEventListener('pointerdown', this._onDown);
  }

  _readPaper() {
    const str = getComputedStyle(document.documentElement)
      .getPropertyValue('--my-bg').trim() || '#faf7f0';
    this._paper = str;
    this._paperRGB = this._parseColor(str);
  }

  _parseColor(str) {
    if (str[0] === '#') {
      let hex = str.slice(1);
      if (hex.length === 3) hex = hex.replace(/./g, (c) => c + c);
      const n = parseInt(hex, 16);
      return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
    }
    const m = str.match(/[\d.]+/g);
    if (m && m.length >= 3) return [m[0] / 255, m[1] / 255, m[2] / 255];
    return [0.98, 0.968, 0.941];
  }

  _resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (this._gl) {
      // 全分辨率（含 dpr，长边上限 2048）
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const k = Math.min(1, 2048 / (Math.max(w, h) * dpr));
      this._canvas.width = Math.round(w * dpr * k);
      this._canvas.height = Math.round(h * dpr * k);
      this._gl.resize(this._canvas.width, this._canvas.height);
    } else {
      this._canvas.width = w;
      this._canvas.height = h;
      this._cpuScale = Math.max(4, Math.ceil(Math.sqrt((w * h) / CPU_MAX_CELLS)));
      const gw = Math.max(16, Math.round(w / this._cpuScale));
      const gh = Math.max(16, Math.round(h / this._cpuScale));
      this._fluid = new FluidCPU(gw, gh);
      this._low.width = gw;
      this._low.height = gh;
      this._image = this._lctx.createImageData(gw, gh);
    }
    this._last = null;
  }

  _pointerMove(x, y) {
    if (this._still) return;
    if (!this._last) {
      this._last = { x, y };
      return;
    }
    const dx = x - this._last.x;
    const dy = y - this._last.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const w = window.innerWidth;
    const h = window.innerHeight;

    if (this._gl) {
      // 鼠标速度 → 模拟网格 texel/帧
      // 墨沿轨迹铺，但动量只在指针当前位置注入一次：
      // 否则相邻墨团区域重叠、速度成倍叠加，会变成把墨吹飞的喷流
      const vs = this._gl.velScale;
      const vx = clamp(dx * (this._gl.simW / w) * 0.7, -6 * vs, 6 * vs);
      const vy = clamp(-dy * (this._gl.simH / h) * 0.7, -6 * vs, 6 * vs);
      const steps = Math.max(1, Math.ceil(dist / 8));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const ux = (this._last.x + dx * t) / w;
        const uy = 1 - (this._last.y + dy * t) / h;
        const isLast = i === steps;
        this._gl.splat(ux, uy, isLast ? vx : 0, isLast ? vy : 0,
          0.45 / steps + 0.08, 4e-4, 1.2e-4);
      }
    } else {
      const s = this._cpuScale;
      const vx = clamp((dx / s) * 0.8, -3, 3);
      const vy = clamp((dy / s) * 0.8, -3, 3);
      const gdist = dist / s;
      const steps = Math.max(1, Math.ceil(gdist / 1.5));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const isLast = i === steps;
        this._fluid.splat(
          (this._last.x + dx * t) / s,
          (this._last.y + dy * t) / s,
          isLast ? vx : 0, isLast ? vy : 0,
          0.55 / steps + 0.15,
          2.6,
        );
      }
    }
    this._last = { x, y };
  }

  _pointerDown(x, y) {
    if (this._still) return;
    if (this._gl) {
      const ux = x / window.innerWidth;
      const uy = 1 - y / window.innerHeight;
      this._gl.drop(ux, uy, 6 * this._gl.velScale, 2.5e-3, 1.5);
    } else {
      const s = this._cpuScale;
      this._fluid.drop(x / s, y / s, 3.6, 7, 1.8);
    }
  }

  _tick = () => {
    this._raf = requestAnimationFrame(this._tick);
    if (this._gl) {
      this._gl.step(this._paperRGB);
      return;
    }

    /* CPU 回退路径 */
    const fluid = this._fluid;
    fluid.step();
    const { d } = fluid;
    const px = this._image.data;
    for (let i = 0, n = d.length; i < n; i++) {
      px[i * 4 + 3] = 250 * (1 - Math.exp(-INK_CURVE * d[i]));
    }
    this._lctx.putImageData(this._image, 0, 0);
    const c = this._ctx;
    const cv = this._canvas;
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = this._paper;
    c.fillRect(0, 0, cv.width, cv.height);
    c.globalCompositeOperation = 'destination-out';
    c.imageSmoothingEnabled = true;
    c.drawImage(this._low, 0, 0, cv.width, cv.height);
  };
}

customElements.define('my-ink-paper', MyInkPaper);
