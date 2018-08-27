// @flow

import assert from 'assert';
import supported from '@mapbox/mapbox-gl-supported';

import { version } from '../package.json';
import Map from './ui/map';
import NavigationControl from './ui/control/navigation_control';
import GeolocateControl from './ui/control/geolocate_control';
import AttributionControl from './ui/control/attribution_control';
import ScaleControl from './ui/control/scale_control';
import FullscreenControl from './ui/control/fullscreen_control';
import Popup from './ui/popup';
import Marker from './ui/marker';
import Style from './style/style';
import LngLat from './geo/lng_lat';
import LngLatBounds from './geo/lng_lat_bounds';
import Point from '@mapbox/point-geometry';
import {Evented} from './util/evented';
import config from './util/config';
import {setRTLTextPlugin} from './source/rtl_text_plugin';
import WorkerPool from './util/worker_pool';

const exported = {
    version,
    supported,
    setRTLTextPlugin: setRTLTextPlugin,
    Map,
    NavigationControl,
    GeolocateControl,
    AttributionControl,
    ScaleControl,
    FullscreenControl,
    Popup,
    Marker,
    Style,
    LngLat,
    LngLatBounds,
    Point,
    Evented,
    config,

    /**
     * 获取，设置地图的访问令牌 
     * [access token](https://www.mapbox.com/help/define-access-token/).
     *
     * @var {string} accessToken
     * @example
     * mapboxgl.accessToken = myAccessToken;
     * @see [Display a map](https://www.mapbox.com/mapbox-gl-js/examples/)
     */
    get accessToken() {
        return config.ACCESS_TOKEN;
    },

    set accessToken(token: string) {
        config.ACCESS_TOKEN = token;
    },

    get workerCount() {
        return WorkerPool.workerCount;
    },

    set workerCount(count: number) {
        WorkerPool.workerCount = count;
    },

    workerUrl: ''
};

/**
 * Mapbox GL JS 的版本号， 依照`package.json` 文件、`CHANGELOG.md`文件和 GitHub 发布中规定的使用 
 *
 * @var {string} version
 */

/**
 * 测试浏览器是否支持 Mapbox GL JS [supports Mapbox GL JS](https://www.mapbox.com/help/mapbox-browser-support/#mapbox-gl-js).
 *
 * @function supported
 * @param {Object} [options]
 * @param {boolean} [options.failIfMajorPerformanceCaveat=false] 
 * 如果为真，Mapbox GL JS 的性能明显低于预计，这个方法就会返回否（ 例如，将使用软件  WebGL 渲染 ）
 * @return {boolean}
 * @example
 * mapboxgl.supported() // = true
 * @see [Check for browser support](https://www.mapbox.com/mapbox-gl-js/example/check-for-support/)
 */

/**
 * 设置地图的文本 RTL [RTL text plugin](https://www.mapbox.com/mapbox-gl-js/plugins/#mapbox-gl-rtl-text).
 * 用于支持从右往左书写的语言，例如阿拉伯语、希伯来语
 *
 * @function setRTLTextPlugin
 * @param {string} pluginURL : 指向 Mapbox RTL 文本插件资源的 URL 
 * @param {Function} callback : 出错，就调用带有一个 error 错误参数的回调
 * @example
 * mapboxgl.setRTLTextPlugin('https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.2.0/mapbox-gl-rtl-text.js');
 * @see [Add support for right-to-left scripts](https://www.mapbox.com/mapbox-gl-js/example/mapbox-gl-rtl-text/)
 */

export default exported;

// canary assert 断言检查: 确认生产环境下断言都已移除
assert(true, 'canary assert');

