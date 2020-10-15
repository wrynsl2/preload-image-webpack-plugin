# preload-image-webpack-plugin

## Quick Start

``` shell
var PreloadImageWebpackPlugin = require('preload-image-webpack-plugin');
var webpackConfig = {
  entry: 'index.js',
  output: {
    path: __dirname + '/dist',
    filename: 'index_bundle.js'
  },
  plugins: [new PreloadImageWebpackPlugin({})]
}
```


### API

- `test`: function | regex， 需要preload的图片, 默认值：/\?.{0,}preload/
- `chunks`: array, 缓存哪个webpack chunk图片, 默认值：undefined，所有chunk
- `agentPreload`: 是否使用link标签预加载, 默认值：false
- `agentPreload`: 是否注入脚本到html,使用img标签预加载, 默认值：true
- `ref`: link标签的预加载方式, 默认值：preload
