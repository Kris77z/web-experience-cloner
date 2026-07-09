// gl-interceptor.js — 注入到 navigate_page 的 initScript 参数中（页面脚本之前运行）
// 用途：拦截 WebGL/WebGL2，捕获着色器源码、program、uniform 实参、FBO/draw 计数。
// 捕获结果挂在 window.__GLCAP，之后用 evaluate_script 读取（建议落盘，不要塞进上下文）。
(function () {
  if (window.__GLCAP) return;
  var cap = (window.__GLCAP = {
    programs: [],   // [[{type:'vert'|'frag', src}], ...] 每个 linkProgram 一项
    shaders: [],    // {type, len} 调试用
    fbos: 0,        // bindFramebuffer 次数
    draws: 0,       // drawElements 次数
    uniforms: {},   // { uniformName: lastValue }  —— 注意是“最后一次写入值”
  });
  var locName = new WeakMap();

  function hook(proto) {
    if (!proto || proto.__hooked) return;
    proto.__hooked = true;

    var _cs = proto.createShader;
    proto.createShader = function (t) {
      var s = _cs.apply(this, arguments);
      try { s.__type = t === this.VERTEX_SHADER ? 'vert' : 'frag'; } catch (e) {}
      return s;
    };
    var _ss = proto.shaderSource;
    proto.shaderSource = function (s, src) {
      try { s.__src = src; cap.shaders.push({ type: s.__type, len: src.length }); } catch (e) {}
      return _ss.apply(this, arguments);
    };
    var _at = proto.attachShader;
    proto.attachShader = function (p, s) {
      try { (p.__sh || (p.__sh = [])).push(s); } catch (e) {}
      return _at.apply(this, arguments);
    };
    var _lp = proto.linkProgram;
    proto.linkProgram = function (p) {
      try { cap.programs.push((p.__sh || []).map(function (s) { return { type: s.__type, src: s.__src }; })); } catch (e) {}
      return _lp.apply(this, arguments);
    };
    var _bf = proto.bindFramebuffer;
    proto.bindFramebuffer = function () { cap.fbos++; return _bf.apply(this, arguments); };
    var _de = proto.drawElements;
    if (_de) proto.drawElements = function () { cap.draws++; return _de.apply(this, arguments); };

    var _gul = proto.getUniformLocation;
    proto.getUniformLocation = function (p, n) {
      var l = _gul.apply(this, arguments);
      try { if (l) locName.set(l, n); } catch (e) {}
      return l;
    };
    ['uniform1f','uniform1i','uniform2f','uniform3f','uniform4f',
     'uniform2fv','uniform3fv','uniform4fv','uniformMatrix3fv','uniformMatrix4fv']
    .forEach(function (fn) {
      var o = proto[fn];
      if (!o) return;
      proto[fn] = function (loc) {
        try {
          var nm = locName.get(loc);
          if (nm) {
            var a = [].slice.call(arguments, 1);
            cap.uniforms[nm] = a.length === 1 ? a[0]
              : (a[a.length - 1] && a[a.length - 1].length !== undefined
                  ? Array.prototype.slice.call(a[a.length - 1]).slice(0, 16) : a);
          }
        } catch (e) {}
        return o.apply(this, arguments);
      };
    });
  }

  var _gc = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type) {
    var ctx = _gc.apply(this, arguments);
    try { if (ctx && /webgl/.test(type)) hook(Object.getPrototypeOf(ctx)); } catch (e) {}
    return ctx;
  };
})();
