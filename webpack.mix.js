const mix = require('laravel-mix')
const LiveReloadPlugin = require('webpack-livereload-plugin')
require('laravel-mix-polyfill')

// 5.0 了, 还是无法单独关掉编译成功通知, 就整个关掉罢, 感觉编译出错自己去看终端看吧
mix.disableNotifications()

mix.webpackConfig({
  plugins: [
    new LiveReloadPlugin(),
  ],
})

mix.js('assets/js/app.js', 'dist')
  .sass('assets/sass/app.scss', 'dist')
  .polyfill({
    enabled: true,
    useBuiltIns: 'usage',
    targets: { 'ie': 11 },
  })
