const express = require('express')
const { render } = require('@antv/gpt-vis-ssr')
const fs = require('fs-extra')
const path = require('path')
const { v4: uuidv4 } = require('uuid')

const app = express()
const port = process.env.PORT || 3000
const publicDir = path.join(__dirname, 'public')
const imagesDir = path.join(publicDir, 'images')

// 确保目录存在
fs.ensureDirSync(imagesDir)

app.use(express.json())
app.use('/images', express.static(imagesDir))

app.post('/render', async (req, res) => {
  try {
    const options = req.body

    // 验证必要的参数
    if (!options) {
      return res.status(400).json({
        success: false,
        errorMessage: '缺少必要的参数: type 或 data'
      })
    }

    // 渲染图表
    const vis = await render(options)
    const buffer = await vis.toBuffer()

    // 生成唯一文件名并保存图片
    const filename = `${uuidv4()}.png`
    const filePath = path.join(imagesDir, filename)
    await fs.writeFile(filePath, buffer)

    // 构建图片URL
    const host = req.get('host')
    const protocol = req.protocol
    const imageUrl = `${protocol}://${host}/images/${filename}`

    res.json({
      success: true,
      resultObj: imageUrl
    })
  } catch (error) {
    console.error('渲染图表时出错:', error)
    res.status(500).json({
      success: false,
      errorMessage: `渲染图表失败: ${error.message}`
    })
  }
})

app.post('/render-html', async (req, res) => {
  try {
    const options = req.body
    // 与 /render 接口一致的参数校验
    if (!options) {
      return res.status(400).json({
        success: false,
        errorMessage: '缺少必要的参数: type 或 data'
      })
    }

    // 转义 HTML 特殊字符，防止 XSS
    const chartConfigStr = JSON.stringify(options).replace(/</g, '\\u003c').replace(/>/g, '\\u003e')

    // 生成包含图表的 HTML 页面
    const html = `<!DOCTYPE html>
<html lang="zh">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>gpt-vis 示例柱状图</title>
    <!-- mapbox-gl CSS -->
    <link href="https://unpkg.com/mapbox-gl@2/dist/mapbox-gl.css" rel="stylesheet" />
    <!-- maplibre-gl CSS -->
    <link href="https://unpkg.com/maplibre-gl@2/dist/maplibre-gl.css" rel="stylesheet" />
  </head>

  <body>
    <div
      id="container"
      style="width: 800px; height: 500px; margin: 24px auto;"
    ></div>

    <!-- 引入依赖库 -->
    <!-- React -->
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <!-- lodash -->
    <script src="https://unpkg.com/lodash@4/lodash.min.js"></script>
    <!-- mapbox-gl -->
    <script src="https://unpkg.com/mapbox-gl@2/dist/mapbox-gl.js"></script>
    <!-- maplibre-gl -->
    <script src="https://unpkg.com/maplibre-gl@2/dist/maplibre-gl.js"></script>
    
    <!-- gpt-vis 运行时 -->
    <script src="./gpt-vis.min.js"></script>

    <script>
      // 等待所有脚本和 DOM 加载完成
      window.addEventListener('load', function() {
        // 确保全局变量正确映射（React 18 UMD 版本）
        if (typeof React !== 'undefined' && !window.React) {
          window.React = React;
        }
        if (typeof ReactDOM !== 'undefined' && !window.ReactDOM) {
          window.ReactDOM = ReactDOM;
        }
        // 数据
        var options = ${chartConfigStr};

        // 检查依赖是否加载完成
        if (!window.React || !window.ReactDOM) {
          console.error('React 或 ReactDOM 未加载');
          return;
        }
        if (!window._) {
          console.error('lodash 未加载');
          return;
        }

        // 尝试使用 gpt-vis 渲染
        // 注意：gpt-vis 可能暴露为 window.GPTVis（全大写）或 window.GptVis
        var gptVis = window.GPTVis || window.GptVis;
        if (gptVis && typeof gptVis.render === "function") {
          console.log('使用 gpt-vis 渲染:', gptVis);
          gptVis.render("#container", options);
        } else {
          console.error('gpt-vis 未正确加载或 render 方法不存在');
          console.log('可用的全局变量:', {
            React: !!window.React,
            ReactDOM: !!window.ReactDOM,
            _: !!window._,
            GPTVis: !!window.GPTVis,
            GptVis: !!window.GptVis
          });
        }
      });
    </script>
  </body>
</html>`

  // 生成唯一文件名并保存图片
    const filename = `${uuidv4()}.html`
    const filePath = path.join(imagesDir, filename)
    await fs.writeFile(filePath, html)

    // 构建图片URL
    const host = req.get('host')
    const protocol = req.protocol
    const imageUrl = `${protocol}://${host}/images/${filename}`

    res.json({
      success: true,
      resultObj: imageUrl
    })

  } catch (error) {
    console.error('渲染 HTML 图表时出错:', error)
    res.status(500).json({
      success: false,
      errorMessage: `渲染 HTML 图表失败: ${error.message}`
    })
  }
})

app.listen(port, () => {
  console.log(`GPT-Vis-SSR 服务运行在 http://localhost:${port}`)
})
