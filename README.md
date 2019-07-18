### For webpack 3, used to dynamic loading javascripts and stylesheets, javascripts can loading by order

#### extra: RegExp, not put in dynamic loading list
#### name: String, dynamic script name(default version)
#### insertAfter: String, the place to insert dynamic script, default in front of </body>
#### priority: Array, dynamic loading by order in priority

##### poor English, example:
```
// in webpack config
const dynamicLoadingPlugin = require('file_path/dynamicLoadingPlugin.js');
plugins: [
  new dynamicLoadingPlugin({
    extra: /chunk|hot-update/,
    insertAfter: '<div id="root"></div>',
    priority: ['mainfest']
  })
]
```
