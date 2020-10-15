class PreloadImageWebpackPlugin {
  constructor(options) {
    this.options = {
      test: /\?.{0,}preload/,
      agentPreload: false,
      userPreoload: true,
      ref: 'preload',
      ...(options || {})
    }
  }

  injectPreloads(data, session, cb) {
    const preloads = []
    data.chunks.forEach((chunk) => {
      preloads.push(...(session[chunk.id] || []))
    })
    if (this.options.agentPreload) {
      const imgs = preloads.map((v) => ({
        tagName: 'link',
        selfClosingTag: true,
        voidTag: true,
        attributes: {
          ref: this.options.ref,
          href: v,
          as: 'image'
        }
      }))
      data.head = [...imgs, ...data.head]
    }
    const str = JSON.stringify(preloads)
    if (preloads.length && this.options.userPreoload) {
      data.body.push({
        tagName: 'script',
        closeTag: true,
        attributes: {
          type: 'text/javascript'
        },
        innerHTML: `window.addEventListener('load', function () {
                ${this.options.agentPreload ? `var preloadSupported = function() {
                    var link = document.createElement('link')
                    var relList = link.relList
                    if (!relList || !relList.supports)
                        return false
                    return relList.supports('${this.options.ref}')
                }
                if (preloadSupported()) {
                    return
                }` : ''}
                var checkWebp = function (cb) {
                    var img = new Image()
                    var dataUri = 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA'
                    img.onload = function () {
                        var result = (img.width > 0) && (img.height > 0)
                        cb(result)
                    }
                    img.onerror = function () {
                        cb(false)
                    }
                    img.src = dataUri
                }
                var cb = function(webp) {
                    ${str}.forEach(function (src) {
                        if (/\\.(webp)(\\?\\S*)?$/.test(src) && !webp) {
                            return
                        }
                        var img = new Image()
                        img.crossOrigin = "";
                        img.src = src
                    })
                }
                checkWebp(cb)
            })`
      })
    }
    cb(null, data)
  }

  apply(compiler) {
    const options = this.options
    const session = {}
    const collectSession = (chunks, publicPath) => {
      chunks.forEach((chunk) => {
        if (Array.isArray(options.chunks)) {
          if (!options.chunks.includes(chunk.id)) {
            return;
          }
        }
        const store = session[chunk.id] || new Set()
        session[chunk.id] = store
        chunk.getModules().filter((module) => {
          const test = options.test
          if (module.userRequest) {
            if (typeof test === 'function') {
              if (!options.test(module.userRequest)) {
                return
              }
            } else {
              if (!options.test.test(module.userRequest)) {
                return
              }
            }
            const assets = module.assets || module.buildInfo && module.buildInfo.assets
            if (assets) {
              store.add(...Object.keys(assets).map(v => publicPath + v))
            }
            return true
          }
        })
      })
    }
    if (compiler.hooks) {
      compiler.hooks.compilation.tap('MyPreloadImageWebpackPlugin', (compilation) => {
        const publicPath = compilation.options.output.publicPath || ''
        compilation.hooks.afterOptimizeChunkAssets.tap('MyPreloadImageWebpackPluginAssetPath', (chunks) => {
          collectSession(chunks, publicPath)
        })
        if (compilation.hooks.htmlWebpackPluginAlterAssetTags) {
          compilation.hooks.htmlWebpackPluginAlterAssetTags.tapAsync('MyPreloadImageWebpackPlugin', (htmlData, callback) => {
            this.injectPreloads(htmlData, session, callback)
          })
        } else {
          const HtmlWebpackPlugin = require('html-webpack-plugin')
          HtmlWebpackPlugin.getHooks(compilation).htmlWebpackPluginAlterAssetTags.tapAsync('MyPreloadImageWebpackPlugin', (htmlData, callback) => {
            this.injectPreloads(htmlData, session, callback)
          })
        }
      })
    } else {
      compiler.plugin('compilation', (compilation) => {
        const publicPath = compilation.options.output.publicPath || ''
        compilation.plugin('after-optimize-chunk-assets', (chunks) => {
          collectSession(chunks, publicPath)
        })
        compilation.plugin('html-webpack-plugin-alter-asset-tags', (htmlData, callback) => {
          this.injectPreloads(htmlData, session, callback)
        })
      })
    }
  }
}

module.exports = PreloadImageWebpackPlugin
