/* Minimal runtime for the exported pages: {{holes}}, <sc-if>, <sc-for>, on* handlers and setState. */
(function () {
  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  var handlers = {};
  var hid = 0;

  function resolve(expr, scope) {
    expr = expr.trim();
    if (expr === 'true') return true;
    if (expr === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(expr)) return Number(expr);
    var parts = expr.split('.');
    var v = scope;
    for (var i = 0; i < parts.length; i++) {
      if (v == null) return undefined;
      v = v[parts[i]];
    }
    return v;
  }

  function fill(str, scope) {
    return str.replace(HOLE, function (_, e) {
      var v = resolve(e, scope);
      return v == null ? '' : String(v);
    });
  }

  function single(str) {
    var m = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/.exec(str);
    return m ? m[1] : null;
  }

  function proc(node, scope) {
    var kids = Array.prototype.slice.call(node.childNodes);
    kids.forEach(function (n) {
      if (n.nodeType === 3) {
        if (n.nodeValue.indexOf('{{') > -1) n.nodeValue = fill(n.nodeValue, scope);
        return;
      }
      if (n.nodeType !== 1) return;
      var tag = n.tagName.toLowerCase();
      if (tag === 'sc-if') {
        var e = single(n.getAttribute('value') || '');
        var ok = e ? resolve(e, scope) : false;
        var frag = document.createDocumentFragment();
        if (ok) {
          proc(n, scope);
          while (n.firstChild) frag.appendChild(n.firstChild);
        }
        n.parentNode.replaceChild(frag, n);
        return;
      }
      if (tag === 'sc-for') {
        var le = single(n.getAttribute('list') || '');
        var list = (le && resolve(le, scope)) || [];
        var as = n.getAttribute('as') || 'item';
        var out = document.createDocumentFragment();
        list.forEach(function (item, idx) {
          var c = n.cloneNode(true);
          var sub = Object.create(scope);
          sub[as] = item;
          sub.index = idx;
          proc(c, sub);
          while (c.firstChild) out.appendChild(c.firstChild);
        });
        n.parentNode.replaceChild(out, n);
        return;
      }
      Array.prototype.slice.call(n.attributes).forEach(function (a) {
        var name = a.name;
        if (name.indexOf('hint-placeholder') === 0) { n.removeAttribute(name); return; }
        if (a.value.indexOf('{{') === -1) return;
        if (/^on[a-z]+$/i.test(name)) {
          var fe = single(a.value);
          var fn = fe ? resolve(fe, scope) : null;
          n.removeAttribute(name);
          if (typeof fn === 'function') {
            var id = 'h' + (hid++);
            handlers[id] = fn;
            n.setAttribute('data-' + name.toLowerCase(), id);
          }
          return;
        }
        n.setAttribute(name, fill(a.value, scope));
      });
      proc(n, scope);
    });
  }

  function sameNode(a, b) {
    return a.nodeType === b.nodeType && (a.nodeType !== 1 || a.tagName === b.tagName);
  }

  function morph(oldP, newP) {
    var o = Array.prototype.slice.call(oldP.childNodes);
    var n = Array.prototype.slice.call(newP.childNodes);
    for (var i = 0; i < n.length; i++) {
      var a = o[i], b = n[i];
      if (!a) { oldP.appendChild(b); continue; }
      if (!sameNode(a, b)) { oldP.replaceChild(b, a); continue; }
      if (a.nodeType === 3 || a.nodeType === 8) {
        if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue;
        continue;
      }
      if (a.nodeType !== 1) continue;
      Array.prototype.slice.call(a.attributes).forEach(function (at) {
        if (!b.hasAttribute(at.name)) a.removeAttribute(at.name);
      });
      Array.prototype.slice.call(b.attributes).forEach(function (at) {
        if (a.getAttribute(at.name) !== at.value) a.setAttribute(at.name, at.value);
      });
      if (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT') continue;
      morph(a, b);
    }
    for (var j = o.length - 1; j >= n.length; j--) oldP.removeChild(o[j]);
  }

  function DCLogic() { this.state = {}; this.props = {}; }
  DCLogic.prototype.renderVals = function () { return {}; };
  DCLogic.prototype.setState = function (patch) {
    var s = typeof patch === 'function' ? patch(this.state) : patch;
    this.state = Object.assign({}, this.state, s);
    this._render();
  };

  window.DCLogic = DCLogic;
  window.DCMount = function (Comp) {
    var app = document.getElementById('app');
    var tpl = document.getElementById('tpl').innerHTML;
    var inst = new Comp();
    if (!inst.state) inst.state = {};
    var first = true;
    inst._render = function () {
      handlers = {};
      hid = 0;
      var box = document.createElement('div');
      box.innerHTML = tpl;
      proc(box, inst.renderVals() || {});
      if (first) {
        while (box.firstChild) app.appendChild(box.firstChild);
        first = false;
      } else {
        morph(app, box);
      }
    };
    ['click', 'submit', 'change', 'input'].forEach(function (type) {
      app.addEventListener(type, function (ev) {
        var el = ev.target.closest ? ev.target.closest('[data-on' + type + ']') : null;
        if (!el || !app.contains(el)) return;
        var fn = handlers[el.getAttribute('data-on' + type)];
        if (fn) fn.call(inst, ev);
      });
    });
    inst._render();
  };
})();
