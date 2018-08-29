/*---
title: 使用本地生成的象形文字
description: >-
  中文/日文/韩文（CJK）的象形文字和预组合韩文音节的渲染，需要下载大量字体数据，这会显著地拖慢地图的加载时间。
  通过 `localIdeographFontFamily` 的配置，可以直接使用本地可用的字体而不需要拉取服务器的字体数据，来缩短地图的加载时间。
  该配置定义了一个 CSS 属性 'font-family'，用于在“中日韩统一象形文字”和“韩文音节”编码范围中本地生成的主要字符。
  在这些范围中，将忽略地图样式里的字体设置，以支持本地可用的字体。
  在地图样式（light/regular/medium/bold）内定义的字体栈里的关键词，将被转换成一个 CSS 属性 'font-weight'。
  当使用这个配置时，请记住，你所选择的字体不一定在所有用户的设备上都有效。
  最好是，至少指定一种广泛可用的后备字体类，例如 'sans-serif'。
tags:
  - internationalization
pathname: /mapbox-gl-js/example/local-ideographs/
---*/
import Example from '../../components/example';
import html from './local-ideographs.html';
export default Example(html);
