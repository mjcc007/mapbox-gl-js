/*---
title: 匹配LineString的边界
description: >-
  通过将第一个坐标传递给
  [`LngLatBounds`](/mapbox-gl-js/api/#lnglatbounds)
  并链接 [`extend`](/mapbox-gl-js/api/#lnglatbounds#extend)
  以包含最后一个坐标来获取LineString的边界。
tags:
  - user-interaction
pathname: /mapbox-gl-js/example/zoomto-linestring/
---*/
import Example from '../../components/example';
import html from './zoomto-linestring.html';
export default Example(html);
