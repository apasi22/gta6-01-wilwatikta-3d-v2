// Raw WebGL1 forward renderer: hand-rolled mat4 math, a mesh builder, one lit
// shader program plus a sky program. No libraries, no textures, no shadow maps —
// every effect is geometry, vertex colour, or a uniform. Face culling is off, so
// only the explicit per-face normals matter, never the winding.
export function matPerspective(fovDeg, aspect, near, far) {
  const f = 1 / Math.tan((fovDeg * Math.PI / 180) / 2);
  const d = 1 / (near - far);
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * d, -1, 0, 0, 2 * far * near * d, 0]);
}
export function matLookAt(ex, ey, ez, tx, ty, tz) {
  let fx = tx - ex, fy = ty - ey, fz = tz - ez;
  const fl = Math.hypot(fx, fy, fz) || 1; fx /= fl; fy /= fl; fz /= fl;
  let rx = -fz, ry = 0, rz = fx;
  const rl = Math.hypot(rx, ry, rz) || 1; rx /= rl; ry /= rl; rz /= rl;
  const ux = ry * fz - rz * fy, uy = rz * fx - rx * fz, uz = rx * fy - ry * fx;
  return new Float32Array([
    rx, ux, -fx, 0, ry, uy, -fy, 0, rz, uz, -fz, 0,
    -(rx * ex + ry * ey + rz * ez), -(ux * ex + uy * ey + uz * ez), fx * ex + fy * ey + fz * ez, 1]);
}
export function matMul(a, b) {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++)
    o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  return o;
}
export function matTrans(x, y, z) { return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]); }
export function matRotY(a) { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]); }
export function matRotX(a) { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]); }
export function matRotZ(a) { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); }
export function matModel(x, y, z, ry) { return matMul(matTrans(x, y, z), matRotY(ry)); }
export const IDENTITY = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

function mix3(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
export function lerpPal(a, b, t) {
  const d = mix3(a.sunDir, b.sunDir, t), l = Math.hypot(d[0], d[1], d[2]) || 1;
  return {
    sunDir: [d[0] / l, d[1] / l, d[2] / l], sunCol: mix3(a.sunCol, b.sunCol, t),
    amb: a.amb + (b.amb - a.amb) * t, fogCol: mix3(a.fogCol, b.fogCol, t),
    fogNear: a.fogNear + (b.fogNear - a.fogNear) * t, fogFar: a.fogFar + (b.fogFar - a.fogFar) * t,
    glow: a.glow + (b.glow - a.glow) * t, skyTop: mix3(a.skyTop, b.skyTop, t),
    skyMid: mix3(a.skyMid, b.skyMid, t), skyHor: mix3(a.skyHor, b.skyHor, t),
    sunCol2: mix3(a.sunCol2, b.sunCol2, t), sunPos: [a.sunPos[0] + (b.sunPos[0] - a.sunPos[0]) * t, a.sunPos[1] + (b.sunPos[1] - a.sunPos[1]) * t],
    shaft: a.shaft + (b.shaft - a.shaft) * t,
  };
}

// Append-only mesh builder. Interleaved vertices: pos(3) normal(3) colour(3) glow(1).
export class Mesh {
  constructor() { this.v = []; this.buf = null; this.count = 0; }
  vert(x, y, z, nx, ny, nz, c, glow) { this.v.push(x, y, z, nx, ny, nz, c[0], c[1], c[2], glow); }
  tri(a, b, c, n, col, glow) {
    this.vert(a[0], a[1], a[2], n[0], n[1], n[2], col, glow);
    this.vert(b[0], b[1], b[2], n[0], n[1], n[2], col, glow);
    this.vert(c[0], c[1], c[2], n[0], n[1], n[2], col, glow);
  }
  quad(a, b, c, d, n, col, glow) { this.tri(a, b, c, n, col, glow); this.tri(a, c, d, n, col, glow); }
  box(cx, cy, cz, sx, sy, sz, col, glow, top) {
    const x0 = cx - sx / 2, x1 = cx + sx / 2, y0 = cy - sy / 2, y1 = cy + sy / 2, z0 = cz - sz / 2, z1 = cz + sz / 2;
    const T = top || col;
    this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], T, glow);
    this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], col, glow);
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], col, glow);
    this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], col, glow);
    this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], col, glow);
    this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], col, glow);
  }
  prism(cx, cy, cz, r, h, sides, col, glow) {
    const rim = [];
    for (let i = 0; i < sides; i++) { const a = (i / sides) * Math.PI * 2; rim.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); }
    for (let i = 0; i < sides; i++) {
      const j = (i + 1) % sides, mx = (rim[i][0] + rim[j][0]) / 2 - cx, mz = (rim[i][1] + rim[j][1]) / 2 - cz;
      const l = Math.hypot(mx, mz) || 1;
      this.quad([rim[i][0], cy, rim[i][1]], [rim[j][0], cy, rim[j][1]], [rim[j][0], cy + h, rim[j][1]], [rim[i][0], cy + h, rim[i][1]], [mx / l, 0, mz / l], col, glow);
    }
    for (let i = 0; i < sides; i++) {
      const j = (i + 1) % sides;
      this.tri([cx, cy + h, cz], [rim[i][0], cy + h, rim[i][1]], [rim[j][0], cy + h, rim[j][1]], [0, 1, 0], col, glow);
      this.tri([cx, cy, cz], [rim[j][0], cy, rim[j][1]], [rim[i][0], cy, rim[i][1]], [0, -1, 0], col, glow);
    }
  }
  cone(cx, cy, cz, r, h, sides, col, glow) {
    const rim = [];
    for (let i = 0; i < sides; i++) { const a = (i / sides) * Math.PI * 2; rim.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); }
    for (let i = 0; i < sides; i++) {
      const j = (i + 1) % sides, mx = (rim[i][0] + rim[j][0]) / 2 - cx, mz = (rim[i][1] + rim[j][1]) / 2 - cz;
      const l = Math.hypot(mx, mz, r * 0.4) || 1;
      this.tri([rim[i][0], cy, rim[i][1]], [rim[j][0], cy, rim[j][1]], [cx, cy + h, cz], [mx / l, r * 0.4 / l, mz / l], col, glow);
      this.tri([cx, cy, cz], [rim[j][0], cy, rim[j][1]], [rim[i][0], cy, rim[i][1]], [0, -1, 0], col, glow);
    }
  }
  disc(cx, cy, cz, r, col, glow, sides) {
    sides = sides || 14;
    for (let i = 0; i < sides; i++) {
      const a0 = (i / sides) * Math.PI * 2, a1 = ((i + 1) / sides) * Math.PI * 2;
      this.tri([cx, cy, cz], [cx + Math.cos(a0) * r, cy, cz + Math.sin(a0) * r], [cx + Math.cos(a1) * r, cy, cz + Math.sin(a1) * r], [0, 1, 0], col, glow);
    }
  }
  // Tapered palm frond: one triangle from a base segment to a drooping tip.
  frond(x, y, z, ang, len, wid, drop, col, glow) {
    const dx = Math.cos(ang), dz = Math.sin(ang), px = -dz, pz = dx;
    this.tri([x - px * wid, y, z - pz * wid], [x + px * wid, y, z + pz * wid], [x + dx * len, y - drop, z + dz * len], [0, 1, 0], col, glow);
  }
  // Extrude a convex side profile (x = length, y = height) across width w (z axis).
  profile(pts, w, col, glow) {
    const hw = w / 2;
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length, p = pts[i], q = pts[j];
      const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1;
      const nx = dy / l, ny = -dx / l;
      this.quad([p[0], p[1], -hw], [q[0], q[1], -hw], [q[0], q[1], hw], [p[0], p[1], hw], [nx, ny, 0], col, glow);
      this.tri([cx, cy, hw], [p[0], p[1], hw], [q[0], q[1], hw], [0, 0, 1], col, glow);
      this.tri([cx, cy, -hw], [q[0], q[1], -hw], [p[0], p[1], -hw], [0, 0, -1], col, glow);
    }
  }
  // Cylinder along the X axis (wheels): rings at x0/x1.
  cylX(cx, cy, cz, r, len, sides, col, glow) {
    const x0 = cx - len / 2, x1 = cx + len / 2;
    for (let i = 0; i < sides; i++) {
      const a0 = (i / sides) * Math.PI * 2, a1 = ((i + 1) / sides) * Math.PI * 2;
      const y0 = cy + Math.cos(a0) * r, z0 = cz + Math.sin(a0) * r, y1 = cy + Math.cos(a1) * r, z1 = cz + Math.sin(a1) * r;
      const ny = Math.cos((a0 + a1) / 2), nz = Math.sin((a0 + a1) / 2);
      this.quad([x0, y0, z0], [x1, y0, z0], [x1, y1, z1], [x0, y1, z1], [0, ny, nz], col, glow);
      this.tri([x1, cy, cz], [x1, y0, z0], [x1, y1, z1], [1, 0, 0], col, glow);
      this.tri([x0, cy, cz], [x0, y1, z1], [x0, y0, z0], [-1, 0, 0], col, glow);
    }
  }
  upload(gl) {
    if (this.buf) gl.deleteBuffer(this.buf);
    this.buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.v), gl.STATIC_DRAW);
    this.count = this.v.length / 10;
    return this;
  }
}

const SCENE_VS = 'attribute vec3 aPos;attribute vec3 aNorm;attribute vec3 aCol;attribute float aGlow;' +
  'uniform mat4 uMVP;uniform mat4 uModel;uniform vec3 uSunDir;uniform vec3 uSunCol;uniform float uAmb;' +
  'uniform vec3 uFogCol;uniform vec2 uFogRange;uniform float uGlow;uniform vec3 uCam;uniform float uShine;' +
  'varying vec3 vCol;' +
  'void main(){vec4 wp=uModel*vec4(aPos,1.0);vec3 n=normalize(mat3(uModel)*aNorm);' +
  'float diff=max(dot(n,uSunDir),0.0);' +
  'vec3 col=aCol*(uAmb+uSunCol*diff)+aCol*aGlow*uGlow;' +
  'vec3 vdir=normalize(uCam-wp.xyz);' +
  'float spec=pow(max(dot(reflect(-uSunDir,n),vdir),0.0),26.0)*uShine;' +
  'col+=uSunCol*spec;' +
  'float dist=length(uCam-wp.xyz);' +
  'float f=clamp((dist-uFogRange.x)/(uFogRange.y-uFogRange.x),0.0,1.0);' +
  'vCol=mix(col,uFogCol,f);gl_Position=uMVP*vec4(aPos,1.0);}';
const SCENE_FS = 'precision mediump float;varying vec3 vCol;uniform float uAlpha;' +
  'void main(){gl_FragColor=vec4(vCol,uAlpha);}';
const SKY_VS = 'attribute vec2 aXY;varying vec2 vUV;void main(){vUV=aXY*0.5+0.5;gl_Position=vec4(aXY,0.999,1.0);}';
const SKY_FS = 'precision mediump float;varying vec2 vUV;' +
  'uniform vec3 uTop;uniform vec3 uMid;uniform vec3 uHor;uniform vec3 uSun;uniform vec2 uSunPos;uniform float uAspect;' +
  'void main(){vec3 col=mix(uHor,uMid,smoothstep(0.42,0.62,vUV.y));col=mix(col,uTop,smoothstep(0.60,0.88,vUV.y));' +
  'vec2 p=vec2(vUV.x*uAspect,vUV.y),s=vec2(uSunPos.x*uAspect,uSunPos.y);float d=length(p-s);' +
  'col+=uSun*(smoothstep(0.075,0.05,d)+exp(-d*8.0)*0.5);gl_FragColor=vec4(col,1.0);}';

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src); gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error('shader: ' + gl.getShaderInfoLog(sh));
  return sh;
}
function program(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(p));
  return p;
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl', { antialias: true, alpha: false });
    if (!this.gl) throw new Error('WebGL unavailable');
    const gl = this.gl;
    this.prog = program(gl, SCENE_VS, SCENE_FS);
    this.skyProg = program(gl, SKY_VS, SKY_FS);
    this.u = {};
    for (const n of ['uMVP', 'uModel', 'uSunDir', 'uSunCol', 'uAmb', 'uFogCol', 'uFogRange', 'uGlow', 'uCam', 'uShine', 'uAlpha'])
      this.u[n] = gl.getUniformLocation(this.prog, n);
    this.a = {};
    for (const n of ['aPos', 'aNorm', 'aCol', 'aGlow']) this.a[n] = gl.getAttribLocation(this.prog, n);
    this.su = {};
    for (const n of ['uTop', 'uMid', 'uHor', 'uSun', 'uSunPos', 'uAspect']) this.su[n] = gl.getUniformLocation(this.skyProg, n);
    this.saXY = gl.getAttribLocation(this.skyProg, 'aXY');
    this.skyBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.skyBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    this.view = IDENTITY; this.proj = IDENTITY; this.cam = [0, 0, 0];
  }
  resize(w, h) {
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    this.gl.viewport(0, 0, w, h);
    this.aspect = w / h;
  }
  frame(view, proj, cam, pal) {
    const gl = this.gl;
    this.view = view; this.proj = proj; this.cam = cam;
    gl.clearColor(pal.skyHor[0], pal.skyHor[1], pal.skyHor[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.useProgram(this.skyProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.skyBuf);
    gl.enableVertexAttribArray(this.saXY);
    gl.vertexAttribPointer(this.saXY, 2, gl.FLOAT, false, 0, 0);
    gl.uniform3fv(this.su.uTop, pal.skyTop); gl.uniform3fv(this.su.uMid, pal.skyMid);
    gl.uniform3fv(this.su.uHor, pal.skyHor); gl.uniform3fv(this.su.uSun, pal.sunCol2);
    gl.uniform2fv(this.su.uSunPos, pal.sunPos); gl.uniform1f(this.su.uAspect, this.aspect || 1.78);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.DEPTH_TEST);
    gl.useProgram(this.prog);
    gl.uniform3fv(this.u.uSunDir, pal.sunDir); gl.uniform3fv(this.u.uSunCol, pal.sunCol);
    gl.uniform1f(this.u.uAmb, pal.amb); gl.uniform3fv(this.u.uFogCol, pal.fogCol);
    gl.uniform2f(this.u.uFogRange, pal.fogNear, pal.fogFar); gl.uniform1f(this.u.uGlow, pal.glow);
    gl.uniform3fv(this.u.uCam, cam);
  }
  draw(mesh, model, alpha, shine) {
    const gl = this.gl;
    if (!mesh.buf || !mesh.count) return;
    if (alpha < 1) { gl.enable(gl.BLEND); gl.depthMask(false); } else { gl.disable(gl.BLEND); gl.depthMask(true); }
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buf);
    gl.enableVertexAttribArray(this.a.aPos); gl.vertexAttribPointer(this.a.aPos, 3, gl.FLOAT, false, 40, 0);
    gl.enableVertexAttribArray(this.a.aNorm); gl.vertexAttribPointer(this.a.aNorm, 3, gl.FLOAT, false, 40, 12);
    gl.enableVertexAttribArray(this.a.aCol); gl.vertexAttribPointer(this.a.aCol, 3, gl.FLOAT, false, 40, 24);
    gl.enableVertexAttribArray(this.a.aGlow); gl.vertexAttribPointer(this.a.aGlow, 1, gl.FLOAT, false, 40, 36);
    gl.uniformMatrix4fv(this.u.uModel, false, model);
    gl.uniformMatrix4fv(this.u.uMVP, false, matMul(this.proj, matMul(this.view, model)));
    gl.uniform1f(this.u.uAlpha, alpha === undefined ? 1 : alpha);
    gl.uniform1f(this.u.uShine, shine || 0);
    gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
  }
  end() { const gl = this.gl; gl.disable(gl.BLEND); gl.depthMask(true); }
}
