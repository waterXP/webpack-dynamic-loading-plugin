var path = require('path');

class DynamicLoadingPlugin {
  constructor(options) {
    this.options = {
      extra: options && options.extra && options.extra instanceof RegExp
        ? options.extra : null,
      name: options && options.name || 'version.js',
      insertAfter: options && options.insertAfter
        ? options.insertAfter : null,
      priority: options && options.priority && options.priority instanceof Array
        ? options.priority : null
    };
  }

  apply (compiler) {
    var publicPath = compiler.options.output.publicPath;
    var name = this.options.name;
    const extra = this.options.extra;
    const insertAfter = this.options.insertAfter;
    const priority = this.options.priority;
    // add scripts by order
    const hasPriority = priority && priority.length;

    let jsArray = [];

    compiler.plugin('emit', function (compilation, callback) {
      // Create a header string for the generated file:
      var source = '// creat at: ' + new Date() + '\n';
      source += '!(function () {\n'

      if (hasPriority) {
        source += '  function createXhr (src) {\n'
        source += '    var xhr = new XMLHttpRequest();\n'
        source += '    xhr.open(\'get\', src);\n'
        source += '    xhr.send();\n'
        source += '    return xhr;\n'
        source += '  }\n'
        source += '  function execXhr (xhr, callback) {\n'
        source += '    var blob, url, el;\n'
        source += '    blob = new Blob([xhr.responseText],{ type: "text/plain;charset=utf-8" });\n'
        source += '    url = URL.createObjectURL(blob);\n'
        source += '    el = document.createElement(\'script\');\n'
        source += '    el.setAttribute(\'src\', url);\n'
        source += '    el.onload = el.onreadystatechange = function () {\n'
        source += '      if (!this.readyState || \'loaded\' === this.readyState || \'complete\' === this.readyState) {\n'
        source += '        callback && callback();\n'
        source += '        this.onload = this.onreadystatechange = null;\n'
        source += '      }\n'
        source += '    };\n'
        source += '    document.body.appendChild(el);\n'
        source += '  }\n'
        source += '  function loadXhr (xhr, callback) {\n'
        source += '    if (xhr.readyState === 4 && xhr.status === 200) {\n'
        source += '      execXhr(xhr, callback);\n'
        source += '    } else {\n'
        source += '      xhr.onreadystatechange = function () {\n'
        source += '        if (xhr.readyState === 4 && xhr.status === 200) {\n'
        source += '          execXhr(xhr, callback);\n'
        source += '        }\n'
        source += '      };\n'
        source += '    }\n'
        source += '  }\n'
        source += '  var pScripts;\n'
        source += '  var restScripts;\n'
        source += '  var pXhr = [];\n'
        source += '  var restXhr = [];\n'
        source += '  var i;\n'
      }

      source += '  var elem;\n'

      var jsReg = new RegExp(/\.js$/);
      var cssReg = new RegExp(/\.css$/);

      // Loop through all compiled assets,
      // adding a new line item for each filename.
      for (var filename in compilation.assets) {
        let loaded = {};
        if (!loaded[filename]) {
          loaded[filename] = true;
          if (jsReg.test(filename)) {
            if (!extra || !extra.test(filename)) {
              jsArray.push(publicPath + filename);
            }
          } else if (cssReg.test(filename)) {
            source += '  elem = document.createElement(\'link\');\n';
            source += '  elem.setAttribute(\'href\', \'' + publicPath + filename + '\');\n';
            source += '  elem.setAttribute(\'rel\', \'stylesheet\');\n';
            source += '  document.head.appendChild(elem);\n';
          }
        }
      }

      if (hasPriority) {
        let orderArray = []
        for (let i = 0; i < priority.length; i++) {
          const index = jsArray.findIndex(v => ~v.indexOf(priority[i]))
          if (~index) {
            orderArray.push(jsArray[index])
            jsArray.splice(index, 1)
          }
        }
        const pStrings = orderArray.length ? '"' + orderArray.join('", "') + '"' : ''
        const rStrings = jsArray.length ? '"' + jsArray.join('", "') + '"' : ''
        source += '  pScripts = [' + pStrings + '];\n'
        source += '  restScripts = [' + rStrings + '];\n'
        source += '  for (i = 0; i < pScripts.length; i++) {\n'
        source += '    pXhr[i] = createXhr(pScripts[i]);\n'
        source += '  }\n'
        source += '  for (i = 0; i < restScripts.length; i++) {\n'
        source += '    restXhr[i] = createXhr(restScripts[i]);\n'
        source += '  }\n'
        source += '  i = 0;\n'
        source += '  !(function loadNext () {\n'
        source += '    if (pXhr[i]) {\n'
        source += '      loadXhr(pXhr[i++], loadNext);\n'
        source += '    } else {\n'
        source += '      for (i = 0; i < restXhr.length; i++) {\n'
        source += '        loadXhr(restXhr[i]);\n'
        source += '      }\n'
        source += '    }\n'
        source += '  })();\n'
      } else {
        jsArray.forEach(v => {
          source += '  elem = document.createElement(\'script\');\n';
          source += '  elem.setAttribute(\'src\', \'' + v + '\');\n';
          source += '  document.body.appendChild(elem);\n';
        })
      }

      source += '})();\n'

      // insert version.js into html
      const template = `<script>var el = document.createElement('script');` +
        `el.setAttribute('src', '${publicPath}${name}?tm=' + +new Date());` +
        `document.body.insertBefore(el, document.body.firstChild);</script>`
      let html = compilation.assets['index.html'].source()
      let insertIndex = insertAfter
        ? html.indexOf(insertAfter)
        : html.indexOf('</body>')
      if (~insertIndex) {
        if (insertAfter) {
          insertIndex += insertAfter.length
        }
        html = html.slice(0, insertIndex) + template + html.slice(insertIndex)
      }
      compilation.assets['index.html'] = {
        source: function () {
          return html;
        },
        size: function () {
          return html.length;
        }
      };
      // Insert this list into the webpack build as a new file asset:
      compilation.assets[name] = {
        source: function () {
          return source;
        },
        size: function () {
          return source.length;
        }
      };

      callback();
    })
  }
}

module.exports = DynamicLoadingPlugin;
