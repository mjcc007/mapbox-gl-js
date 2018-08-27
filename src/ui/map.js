// @flow

import { extend, bindAll, warnOnce } from '../util/util';

import browser from '../util/browser';
import window from '../util/window';
const { HTMLImageElement, HTMLElement } = window;
import DOM from '../util/dom';
import { getImage, ResourceType } from '../util/ajax';
import Style from '../style/style';
import EvaluationParameters from '../style/evaluation_parameters';
import Painter from '../render/painter';
import Transform from '../geo/transform';
import Hash from './hash';
import bindHandlers from './bind_handlers';
import Camera from './camera';
import LngLat from '../geo/lng_lat';
import LngLatBounds from '../geo/lng_lat_bounds';
import Point from '@mapbox/point-geometry';
import AttributionControl from './control/attribution_control';
import LogoControl from './control/logo_control';
import isSupported from '@mapbox/mapbox-gl-supported';
import { RGBAImage } from '../util/image';
import { Event, ErrorEvent } from '../util/evented';
import { MapMouseEvent } from './events';
import TaskQueue from '../util/task_queue';

import type {LngLatLike} from '../geo/lng_lat';
import type {LngLatBoundsLike} from '../geo/lng_lat_bounds';
import type {RequestParameters} from '../util/ajax';
import type {StyleOptions} from '../style/style';
import type {MapEvent, MapDataEvent} from './events';

import type ScrollZoomHandler from './handler/scroll_zoom';
import type BoxZoomHandler from './handler/box_zoom';
import type DragRotateHandler from './handler/drag_rotate';
import type DragPanHandler from './handler/drag_pan';
import type KeyboardHandler from './handler/keyboard';
import type DoubleClickZoomHandler from './handler/dblclick_zoom';
import type TouchZoomRotateHandler from './handler/touch_zoom_rotate';
import type {TaskID} from '../util/task_queue';
import type {Cancelable} from '../types/cancelable';

type ControlPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/* eslint-disable no-use-before-define */
type IControl = {
    onAdd(map: Map): HTMLElement;
    onRemove(map: Map): void;

    +getDefaultPosition?: () => ControlPosition;
}
/* eslint-enable no-use-before-define */

type ResourceTypeEnum = $Keys<typeof ResourceType>;
export type RequestTransformFunction = (url: string, resourceType?: ResourceTypeEnum) => RequestParameters;

type MapOptions = {
    hash?: boolean,
    interactive?: boolean,
    container: HTMLElement | string,
    bearingSnap?: number,
    attributionControl?: boolean,
    logoPosition?: ControlPosition,
    failIfMajorPerformanceCaveat?: boolean,
    preserveDrawingBuffer?: boolean,
    refreshExpiredTiles?: boolean,
    maxBounds?: LngLatBoundsLike,
    scrollZoom?: boolean,
    minZoom?: ?number,
    maxZoom?: ?number,
    boxZoom?: boolean,
    dragRotate?: boolean,
    dragPan?: boolean,
    keyboard?: boolean,
    doubleClickZoom?: boolean,
    touchZoomRotate?: boolean,
    trackResize?: boolean,
    center?: LngLatLike,
    zoom?: number,
    bearing?: number,
    pitch?: number,
    renderWorldCopies?: boolean,
    maxTileCacheSize?: number,
    transformRequest?: RequestTransformFunction
};

const defaultMinZoom = 0;
const defaultMaxZoom = 22;
const defaultOptions = {
    center: [0, 0],
    zoom: 0,
    bearing: 0,
    pitch: 0,

    minZoom: defaultMinZoom,
    maxZoom: defaultMaxZoom,

    interactive: true,

    scrollZoom: true,
    boxZoom: true,
    dragRotate: true,
    dragPan: true,
    keyboard: true,
    doubleClickZoom: true,
    touchZoomRotate: true,

    bearingSnap: 7,

    clickTolerance: 3,

    hash: false,

    attributionControl: true,

    failIfMajorPerformanceCaveat: false,
    preserveDrawingBuffer: false,

    trackResize: true,

    renderWorldCopies: true,

    refreshExpiredTiles: true,

    maxTileCacheSize: null,

    transformRequest: null,
    fadeDuration: 300,
    crossSourceCollisions: true
};

/**
 * “Map”地图就是你在页面上的地图。它定义各种方法和属性使得你可以操控修改地图，
 * 或者触发事件与地图交互。
 *
 * 你可以创建一个地图图像作为一个容器。然后 Mapbox GL JS会初始化页面上的地图同时返回你的“Map”对象。
 *
 * @extends Evented
 * @param {Object} options
 * @param {HTMLElement|string} options.container Mapbox GL JS 绘制在地图上的 HTML 元素，或者是元素的“id”。这个元素不能含有子元素。
 * @param {number} [options.minZoom=0] 地图的最小缩放级别 (0-24).
 * @param {number} [options.maxZoom=22] 地图的最大缩放级别 (0-24).
 * @param {Object|string} [options.style] 地图的 Mapbox 样式。它必须是JSON对象，要符合规范
 * [Mapbox Style 规范](https://mapbox.com/mapbox-gl-style-spec/)，或者是一个JSON对象的URL地址。
 *
 * 从 Mapbox API加载样式，你可以使用`mapbox://styles/:owner/:style`表格中的URL，
 * 其中`:owner`是你Mapbox的账户名称，`:style`是样式的ID。或者你可以使用下列样式之一
 * [Mapbox 预定义样式](https://www.mapbox.com/maps/):
 *
 *  * `mapbox://styles/mapbox/streets-v10`
 *  * `mapbox://styles/mapbox/outdoors-v10`
 *  * `mapbox://styles/mapbox/light-v9`
 *  * `mapbox://styles/mapbox/dark-v9`
 *  * `mapbox://styles/mapbox/satellite-v9`
 *  * `mapbox://styles/mapbox/satellite-streets-v10`
 *  * `mapbox://styles/mapbox/navigation-preview-day-v2`
 *  * `mapbox://styles/mapbox/navigation-preview-night-v2`
 *  * `mapbox://styles/mapbox/navigation-guidance-day-v2`
 *  * `mapbox://styles/mapbox/navigation-guidance-night-v2`
 *
 * 如果你在样式的URL结尾加入`?optimize=true`，使用Mapbox的的瓦片可以被优化样式，例如`mapbox://styles/mapbox/streets-v9?optimize=true`。
 * 学习更多矢量瓦片的样式优化方法[API 文档](https://www.mapbox.com/api-documentation/#retrieve-tiles)。
 *
 * @param {boolean} [options.hash=false] 如果是“true”，地图的位置（缩放，中心维度，中心经度，方位，和斜度）将与页面的URL片段同步。
 *   例如, `http://path/to/my/page.html#2.59/39.26/53.07/-24.1/60`.
 * @param {boolean} [options.interactive=true] 如果设置为“false”，地图上的鼠标，触摸或者键盘事件将不会被监听，没有交互事件。
 * @param {number} [options.bearingSnap=7] 以度为单位的阈值，用于确定地图的方位何时会向北移动。
 * 例如，当`bearingSnap`为7时，如果用户在7度以内旋转地图，地图将自动转向北方。
 * @param {boolean} [options.pitchWithRotate=true] 如果为“false”，地图的倾斜控制“拖拽旋转”的交互事件监听将会被禁止。
 * @param {number} [options.clickTolerance=3] 用户可以在单击期间移动鼠标指针的最大像素数，用来确定是否是有效点击（与鼠标拖动相反）。
 * @param {boolean} [options.attributionControl=true] 如果为“true”，{@link AttributionControl}将会被添加到地图上。
 * @param {string | Array<string>} [options.customAttribution] 在{@link AttributionControl}中显示的字符串或字符串数组。仅当`options.attributionControls`为'true`时才有效。
 * @param {string} [options.logoPosition='bottom-left'] 设置地图上Mapbox水印的位置。有效的参数是：`top-left`,`top-right`, `bottom-left`, `bottom-right`
 * @param {boolean} [options.failIfMajorPerformanceCaveat=false] 如果为'true`，假如Mapbox GL JS的性能将比预期的差（即使用软件渲染器），则地图创建将失败。
 * @param {boolean} [options.preserveDrawingBuffer=false] 如果为`true`，当使用`map.getCanvas().toDataURL()`时地图的画布将会被导出成一张PNG图片。默认参数是`false`。
 * @param {boolean} [options.refreshExpiredTiles=true] 如果是`false`，在地图瓦片的HTTP`cacheControl`/`expires`标头到期后地图将不会尝试重新请求连接。
 * @param {LngLatBoundsLike} [options.maxBounds] 如果设置此参数，地图边界将限制在这个边界内。
 * @param {boolean|Object} [options.scrollZoom=true] 如果为“true”，“滚动缩放”的交互事件监听将会被激活。对象值参考{@link ScrollZoomHandler#enable}。
 * @param {boolean} [options.boxZoom=true] 如果为“true”，“矩形缩放”的交互事件监听将会被激活（参考 {@link BoxZoomHandler}）。
 * @param {boolean} [options.dragRotate=true] 如果为“true”，“拖动旋转”的交互事件监听将会被激活 (参考 {@link DragRotateHandler})
 * @param {boolean} [options.dragPan=true] 如果为“true”，“拖动平移”的交互事件监听将会被激活(参考 {@link DragPanHandler})。
 * @param {boolean} [options.keyboard=true] 如果为“true”，键盘快捷键将会被激活 (参考 {@link KeyboardHandler})。
 * @param {boolean} [options.doubleClickZoom=true] 如果为“true”，“双击缩放”的交互事件监听将会被激活 (参考 {@link DoubleClickZoomHandler})。
 * @param {boolean|Object} [options.touchZoomRotate=true] 如果为“true”，“触摸缩放旋转”的交互事件监听将会被激活。对象值参考{@link TouchZoomRotateHandler#enable}。
 * @param {boolean} [options.trackResize=true]  如果为“true”，当浏览器窗口改变大小时候地图自动重制大小。
 * @param {LngLatLike} [options.center=[0, 0]] 初始化地图中地理中心。如果构造参数中没有设置中心坐标，Mapbox GL JS 将会在地图的样式参数中寻找。如果样式参数中也没有设置，系统会默认`[0, 0]`。注意：Mapbox GL使用的是经度，纬度（而不是纬度，经度）来匹配GeoJSON数据。
 * @param {number} [options.zoom=0] 地图的初始化缩放级别。如果“zoom”在构造方法的参数中没有被设置，Mapbox GL JS 将会在地图的样式对象中查找。如果样式中也没有设置，那么默认值为“0”。
 * @param {number} [options.bearing=0] 地图的初始化方位（旋转），以逆时针方向从北方向来计算，度为单位。如果“bearing”在构造方法的参数中没有被设置，Mapbox GL JS 将会在地图的样式对象中查找。如果样式中也没有设置，那么默认值为“0”。
 * @param {number} [options.pitch=0] 地图的初始高度（倾斜），以远离屏幕平面（0～60）的度数来计算。如果“pitch”在构造方法的参数中没有被设置，Mapbox GL JS 将会在地图的样式对象中查找。如果样式中也没有设置，那么默认值为“0”。
 * @param {boolean} [options.renderWorldCopies=true] 如果为“true”，当缩放时候这个世界的多个副本会被绘制。
 * @param {number} [options.maxTileCacheSize=null]  资源的最大缓存瓦片数量。如果忽略设置，这个缓存会依据可视区域动态改变大小。
 * @param {string} [options.localIdeographFontFamily=null] 如果指定，则定义CSS字体样式用来覆盖本地'CJK Unified Ideographs'和'Hangul Syllables'范围内字体的生成。
 * 在这些范围内，地图样式中的字体设置将会被忽略，除了字体大小关键字(light/regular/medium/bold)。
 * 此选项的目的是避免发送带宽密集型字形请求，(参考 [使用本地生成的字体](https://www.mapbox.com/mapbox-gl-js/example/local-ideographs))
 * @param {RequestTransformFunction} [options.transformRequest=null] 地图在请求另外的URL的回调方法。这个回调方法可以修改url，设置头部，或者对请求进行跨域设置。预期的返回时是一个对象，包含`url`属性，`headers`属性和`credentials`属性。
 * @param {boolean} [options.collectResourceTiming=false] 如果为“true”，资源计时API的信息将会被GeoJSON和矢量瓦片网页进程发出的请求收集（此信息通常无法从主Javascript线程获取）。信息将会通过相关`data`事件的`resourceTiming`属性返回。
 * @param {number} [options.fadeDuration=300] 控制标签碰撞检测的淡入/淡出动画的持续时间（以毫秒为单位）。此设置会影响所有符号图层。此设置不会影响运行时样式转换或栅格图块交叉渐变的持续时间。
 * @param {boolean} [options.crossSourceCollisions=true] 如果为“true”，则在碰撞检测期间，来自多个源的符号可能会相互冲突。如果为“false”，则对每个源中的符号单独运行碰撞检测。
 * @example
 * var map = new mapboxgl.Map({
 *   container: 'map',
 *   center: [-122.420679, 37.772537],
 *   zoom: 13,
 *   style: style_object,
 *   hash: true,
 *   transformRequest: (url, resourceType)=> {
 *     if(resourceType === 'Source' && url.startsWith('http://myHost')) {
 *       return {
 *        url: url.replace('http', 'https'),
 *        headers: { 'my-custom-header': true},
 *        credentials: 'include'  // Include cookies for cross-origin requests
 *      }
 *     }
 *   }
 * });
 * @see [展示地图](https://www.mapbox.com/mapbox-gl-js/examples/)
 */
class Map extends Camera {
    style: Style;
    painter: Painter;

    _container: HTMLElement;
    _missingCSSCanary: HTMLElement;
    _canvasContainer: HTMLElement;
    _controlContainer: HTMLElement;
    _controlPositions: {[string]: HTMLElement};
    _interactive: ?boolean;
    _showTileBoundaries: ?boolean;
    _showCollisionBoxes: ?boolean;
    _showOverdrawInspector: boolean;
    _repaint: ?boolean;
    _vertices: ?boolean;
    _canvas: HTMLCanvasElement;
    _transformRequest: RequestTransformFunction;
    _maxTileCacheSize: number;
    _frame: ?Cancelable;
    _styleDirty: ?boolean;
    _sourcesDirty: ?boolean;
    _placementDirty: ?boolean;
    _loaded: boolean;
    _trackResize: boolean;
    _preserveDrawingBuffer: boolean;
    _failIfMajorPerformanceCaveat: boolean;
    _refreshExpiredTiles: boolean;
    _hash: Hash;
    _delegatedListeners: any;
    _fadeDuration: number;
    _crossSourceCollisions: boolean;
    _crossFadingFactor: number;
    _collectResourceTiming: boolean;
    _renderTaskQueue: TaskQueue;

    /**
     * 地图的 {@link ScrollZoomHandler}，通过鼠标滚轮或者触摸板实现缩放。
     */
    scrollZoom: ScrollZoomHandler;

    /**
     * 地图的{@link BoxZoomHandler}，通过按住Shift键结合拖拽手势实现缩放。
     */
    boxZoom: BoxZoomHandler;

    /**
     * 地图的{@link DragRotateHandler}，通过鼠标右键或者按住Control键旋转地图。
     */
    dragRotate: DragRotateHandler;

    /**
     * 地图的{@link DragPanHandler}，通过鼠标或触摸手势来拖动地图。
     */
    dragPan: DragPanHandler;

    /**
     * 地图的 {@link KeyboardHandler}，允许用户通过键盘快捷键缩放，旋转和平移地图。
     */
    keyboard: KeyboardHandler;

    /**
     * 地图的 {@link DoubleClickZoomHandler}，允许用户通过双击实现缩放。
     */
    doubleClickZoom: DoubleClickZoomHandler;

    /**
     * 地图的 {@link TouchZoomRotateHandler}，允许用户通过触摸手势缩放或者旋转地图。
     */
    touchZoomRotate: TouchZoomRotateHandler;

    constructor(options: MapOptions) {
        options = extend({}, defaultOptions, options);

        if (options.minZoom != null && options.maxZoom != null && options.minZoom > options.maxZoom) {
            throw new Error(`maxZoom must be greater than minZoom`);
        }

        const transform = new Transform(options.minZoom, options.maxZoom, options.renderWorldCopies);
        super(transform, options);

        this._interactive = options.interactive;
        this._maxTileCacheSize = options.maxTileCacheSize;
        this._failIfMajorPerformanceCaveat = options.failIfMajorPerformanceCaveat;
        this._preserveDrawingBuffer = options.preserveDrawingBuffer;
        this._trackResize = options.trackResize;
        this._bearingSnap = options.bearingSnap;
        this._refreshExpiredTiles = options.refreshExpiredTiles;
        this._fadeDuration = options.fadeDuration;
        this._crossSourceCollisions = options.crossSourceCollisions;
        this._crossFadingFactor = 1;
        this._collectResourceTiming = options.collectResourceTiming;
        this._renderTaskQueue = new TaskQueue();

        const transformRequestFn = options.transformRequest;
        this._transformRequest = transformRequestFn ?  (url, type) => transformRequestFn(url, type) || ({ url }) : (url) => ({ url });

        if (typeof options.container === 'string') {
            const container = window.document.getElementById(options.container);
            if (!container) {
                throw new Error(`Container '${options.container}' not found.`);
            } else {
                this._container = container;
            }
        } else if (options.container instanceof HTMLElement) {
            this._container = options.container;
        } else {
            throw new Error(`Invalid type: 'container' must be a String or HTMLElement.`);
        }

        if (options.maxBounds) {
            this.setMaxBounds(options.maxBounds);
        }

        bindAll([
            '_onWindowOnline',
            '_onWindowResize',
            '_contextLost',
            '_contextRestored',
            '_update',
            '_render',
            '_onData',
            '_onDataLoading'
        ], this);

        this._setupContainer();
        this._setupPainter();
        if (this.painter === undefined) {
            throw new Error(`Failed to initialize WebGL.`);
        }

        this.on('move', this._update.bind(this, false));
        this.on('zoom', this._update.bind(this, true));

        if (typeof window !== 'undefined') {
            window.addEventListener('online', this._onWindowOnline, false);
            window.addEventListener('resize', this._onWindowResize, false);
        }

        bindHandlers(this, options);

        this._hash = options.hash && (new Hash()).addTo(this);
        // don't set position from options if set through hash
        if (!this._hash || !this._hash._onHashChange()) {
            this.jumpTo({
                center: options.center,
                zoom: options.zoom,
                bearing: options.bearing,
                pitch: options.pitch
            });
        }

        this.resize();

        if (options.style) this.setStyle(options.style, { localIdeographFontFamily: options.localIdeographFontFamily });

        if (options.attributionControl) this.addControl(new AttributionControl());
        this.addControl(new LogoControl(), options.logoPosition);

        this.on('style.load', function() {
            if (this.transform.unmodified) {
                this.jumpTo(this.style.stylesheet);
            }
        });

        this.on('data', this._onData);
        this.on('dataloading', this._onDataLoading);
    }

    /**
     * 添加一个控制器 {@link IControl} 到地图上，回调方法“control.onAdd(this)”。
     *
     * @param {IControl} control 被添加的控制器{@link IControl}。
     * 
     * @param {string} [position] position 控制器被添加到地图的位置。有效的参数列表是：
     * `'top-left'`, `'top-right'`, `'bottom-left'`, 和 `'bottom-right'`. 默认值是 `'top-right'`。
     * 
     * @returns {Map} `this`
     * @see [显示地图导航控件](https://www.mapbox.com/mapbox-gl-js/example/navigation/)
     */
    addControl(control: IControl, position?: ControlPosition) {
        if (position === undefined && control.getDefaultPosition) {
            position = control.getDefaultPosition();
        }
        if (position === undefined) {
            position = 'top-right';
        }
        const controlElement = control.onAdd(this);
        const positionContainer = this._controlPositions[position];
        if (position.indexOf('bottom') !== -1) {
            positionContainer.insertBefore(controlElement, positionContainer.firstChild);
        } else {
            positionContainer.appendChild(controlElement);
        }
        return this;
    }

    /**
     * 移除地图的控制器。
     *
     * @param {IControl} control 被移除的控制器 {@link IControl}。
     * 
     * @returns {Map} `this`
     */
    removeControl(control: IControl) {
        control.onRemove(this);
        return this;
    }

    /**
     * 通过“容器”元素的大小调整地图的大小。
     * 
     * 当地图的“容器”被别的脚本重制大小或者当地图被CSS初始化隐藏后显示时候这个方法将会被调用。
     * 
     * @param eventData 该方法触发的事件对象的属性。
     * 
     * @returns {Map} `this`
     */
    resize(eventData?: Object) {
        const dimensions = this._containerDimensions();
        const width = dimensions[0];
        const height = dimensions[1];

        this._resizeCanvas(width, height);
        this.transform.resize(width, height);
        this.painter.resize(width, height);

        this.fire(new Event('movestart', eventData))
            .fire(new Event('move', eventData))
            .fire(new Event('resize', eventData))
            .fire(new Event('moveend', eventData));

        return this;
    }

    /**
     * 返回地图的地理边界。当方位或者定位数据是非零的数据，可见区域不是一个轴对称的矩形，其结果是可见区域的最小边界。
     * 
     */
    getBounds() {
        return new LngLatBounds()
            .extend(this.transform.pointLocation(new Point(0, 0)))
            .extend(this.transform.pointLocation(new Point(this.transform.width, 0)))
            .extend(this.transform.pointLocation(new Point(this.transform.width, this.transform.height)))
            .extend(this.transform.pointLocation(new Point(0, this.transform.height)));
    }

    /**
     * 返回地图的最大地理边界，如果没有设置，则返回“null”。
     */
    getMaxBounds () {
        if (this.transform.latRange && this.transform.latRange.length === 2 &&
            this.transform.lngRange && this.transform.lngRange.length === 2) {
            return new LngLatBounds([this.transform.lngRange[0], this.transform.latRange[0]],
                [this.transform.lngRange[1], this.transform.latRange[1]]);
        } else {
            return null;
        }
    }

    /**
     * 设置或者清理地图的地理边界。
     *
     * 平移和缩放操作受限于这些边界。
     * 如果执行平移或缩放以显示这些边界之外的区域，则地图依然会在边界内显示尽可能接近操作
     * 请求的位置和缩放级别。
     *
     * @param {LngLatBoundsLike | null | undefined} bounds 设置的最大边界。
     * 如果设置为“null”或者“undefined”，则这个方法将会移除地图的最大边界。
     * 
     * @returns {Map} `this`
     */
    setMaxBounds(lnglatbounds: LngLatBoundsLike) {
        if (lnglatbounds) {
            const b = LngLatBounds.convert(lnglatbounds);
            this.transform.lngRange = [b.getWest(), b.getEast()];
            this.transform.latRange = [b.getSouth(), b.getNorth()];
            this.transform._constrain();
            this._update();
        } else if (lnglatbounds === null || lnglatbounds === undefined) {
            this.transform.lngRange = null;
            this.transform.latRange = null;
            this._update();
        }
        return this;

    }

    /**
     * 设置或者清理地图的最小缩放级别。
     * 如果地图当前设置的级别比新的最小级别要小，那么地图将会缩放到新的最小级别。
     *
     * @param {number | null | undefined} minZoom 设置的最小级别（0-24）。
     * 如果设置为“null”或者“undefined”，这个方法会移除当前最小级别（换句话说，设置最小级别为0）。
     *   
     * @returns {Map} `this`
     */
    setMinZoom(minZoom?: ?number) {

        minZoom = minZoom === null || minZoom === undefined ? defaultMinZoom : minZoom;

        if (minZoom >= defaultMinZoom && minZoom <= this.transform.maxZoom) {
            this.transform.minZoom = minZoom;
            this._update();

            if (this.getZoom() < minZoom) this.setZoom(minZoom);

            return this;

        } else throw new Error(`minZoom must be between ${defaultMinZoom} and the current maxZoom, inclusive`);
    }

    /**
     * 返回地图的最小允许缩放级别。
     *
     * @returns {number} minZoom
     */
    getMinZoom() { return this.transform.minZoom; }

    /**
     * 设置或者清除地图的最大缩放级别。
     * 如果地图当前缩放级比设置的新最大级别要大，那么地图将要缩放到新设置的最大级别。
     *
     * @param {number | null | undefined} maxZoom 设置的最大级别。
     * 如果参数是 “null” 或者 "undefined"，这个方法会移除当前最大设置级别（换句话说，设置最大级别为22）
     * @returns {Map} `this`
     */
    setMaxZoom(maxZoom?: ?number) {

        maxZoom = maxZoom === null || maxZoom === undefined ? defaultMaxZoom : maxZoom;

        if (maxZoom >= this.transform.minZoom) {
            this.transform.maxZoom = maxZoom;
            this._update();

            if (this.getZoom() > maxZoom) this.setZoom(maxZoom);

            return this;

        } else throw new Error(`maxZoom must be greater than the current minZoom`);
    }

    /**
     * 返回绘制世界副本参数的值
     *
     * @returns {boolean} renderWorldCopies
     */
    getRenderWorldCopies() { return this.transform.renderWorldCopies; }

    /**
     * 设置绘制世界副本参数的值
     *
     * @param {boolean} renderWorldCopies 如果为“true”，当缩放时，世界的多个副本将会被绘制。
     * “undefined”将被视作“true”，“null”将被视为“false”。
     * @returns {Map} `this`
     */
    setRenderWorldCopies(renderWorldCopies?: ?boolean) {

        this.transform.renderWorldCopies = renderWorldCopies;
        this._update();

        return this;
    }

    /**
     * 返回地图的最大允许缩放级别。
     * 
     * @returns {number} maxZoom
     */
    getMaxZoom() { return this.transform.maxZoom; }

    /**
     * 指定{@link Point}的地理位置，返回其相对于地图的“容器”的像素坐标。
     *
     * @param {LngLatLike} lnglat 重投影的地理位置坐标。
     * 
     * @returns {Point} 这个{@link Point}相对于地图“容器”的位置。
     */
    project(lnglat: LngLatLike) {
        return this.transform.locationPoint(LngLat.convert(lnglat));
    }

    /**
     * 指定{@link LngLat}像素坐标，返回其对应的地理坐标。
     *
     * @param {PointLike} point 指定的像素坐标
     * @returns {LngLat} {@link LngLat}的地理坐标。
     * @see [显示点击的多边形信息](https://www.mapbox.com/mapbox-gl-js/example/polygon-popup-on-click/)
     */
    unproject(point: PointLike) {
        return this.transform.pointLocation(Point.convert(point));
    }

    /**
     * 如果由于相机动画或者用户手势造成地图移动，缩放，旋转或者上下摇晃，则返回 true。
     * 
     */
    isMoving(): boolean {
        return this._moving ||
            this.dragPan.isActive() ||
            this.dragRotate.isActive() ||
            this.scrollZoom.isActive();
    }

    /**
     * 如果由于相机动画或者用户手势造成地图缩放，则返回 true。
     * 
     */
    isZooming(): boolean {
        return this._zooming ||
            this.scrollZoom.isActive();
    }

    /**
     * 如果由于相机动画或者用户手势造成地图旋转，则返回 true。
     * 
     */
    isRotating(): boolean {
        return this._rotating ||
            this.dragRotate.isActive();
    }

    /**
     * 添加指定类型的监听事件。
     *
     * @method
     * @name on
     * @memberof Map
     * @instance
     * @param {string} type 监听事件类型
     * @param {Function} listener 当事件被触发后的回调监听方法。
     *   当事件被触发这个方法会被调用，带有“target”和“type”两个参数.
     * @returns {Map} `this`
     */

    /**
     * 添加图层上要素的监听事件。
     *
     * @param {string} type T监听事件的类型；`'mousedown'`, `'mouseup'`, `'click'`, `'dblclick'`,
     * `'mousemove'`, `'mouseenter'`, `'mouseleave'`, `'mouseover'`, `'mouseout'`, `'contextmenu'`, `'touchstart'`,
     * `'touchend'`, 或者 `'touchcancel'`其中之一。当鼠标从图层外部进入图层或者地图外面进入地图后触发事件`mouseenter` 和 `mouseover`。
     * 当鼠标离开图层可见部分或者移动到地图外部会触发`mouseleave` 和 `mouseout`事件。
     * 
     * @param {string} 图层的ID。只有位于此图层可见要素内的事件才会触发监听器。
     * 该事件有一个`features`属性，它包含所有相匹配要素的数组。
     * @param {Function} listener 事件被触发后回调方法。
     * @returns {Map} `this`
     */
    on(type: MapEvent, layer: any, listener: any) {
        if (listener === undefined) {
            return super.on(type, layer);
        }

        const delegatedListener = (() => {
            if (type === 'mouseenter' || type === 'mouseover') {
                let mousein = false;
                const mousemove = (e) => {
                    const features = this.getLayer(layer) ? this.queryRenderedFeatures(e.point, {layers: [layer]}) : [];
                    if (!features.length) {
                        mousein = false;
                    } else if (!mousein) {
                        mousein = true;
                        listener.call(this, new MapMouseEvent(type, this, e.originalEvent, {features}));
                    }
                };
                const mouseout = () => {
                    mousein = false;
                };
                return {layer, listener, delegates: {mousemove, mouseout}};
            } else if (type === 'mouseleave' || type === 'mouseout') {
                let mousein = false;
                const mousemove = (e) => {
                    const features = this.getLayer(layer) ? this.queryRenderedFeatures(e.point, {layers: [layer]}) : [];
                    if (features.length) {
                        mousein = true;
                    } else if (mousein) {
                        mousein = false;
                        listener.call(this, new MapMouseEvent(type, this, e.originalEvent));
                    }
                };
                const mouseout = (e) => {
                    if (mousein) {
                        mousein = false;
                        listener.call(this, new MapMouseEvent(type, this, e.originalEvent));
                    }
                };
                return {layer, listener, delegates: {mousemove, mouseout}};
            } else {
                const delegate = (e) => {
                    const features = this.getLayer(layer) ? this.queryRenderedFeatures(e.point, {layers: [layer]}) : [];
                    if (features.length) {
                        // Here we need to mutate the original event, so that preventDefault works as expected.
                        e.features = features;
                        listener.call(this, e);
                        delete e.features;
                    }
                };
                return {layer, listener, delegates: {[type]: delegate}};
            }
        })();

        this._delegatedListeners = this._delegatedListeners || {};
        this._delegatedListeners[type] = this._delegatedListeners[type] || [];
        this._delegatedListeners[type].push(delegatedListener);

        for (const event in delegatedListener.delegates) {
            this.on((event: any), delegatedListener.delegates[event]);
        }

        return this;
    }

    /**
     * 移除之前通过“Map#on”添加的事件监听器。
     *
     * @method
     * @name off
     * @memberof Map
     * @instance
     * @param {string} type 之前事件监听器的事件类型
     * @param {Function} listener 之前事件监听器的回调方法
     * @returns {Map} `this`
     */

    /**
     * 移除之前通过“Map#on”添加的图层事件监听器。
     *
     * @param {string} type 之前事件监听器的事件类型。
     * @param {string} layer 之前事件监听器的图层ID。
     * @param {Function} listener 之前事件监听器的回调方法
     * @returns {Map} `this`
     */
    off(type: MapEvent, layer: any, listener: any) {
        if (listener === undefined) {
            return super.off(type, layer);
        }

        if (this._delegatedListeners && this._delegatedListeners[type]) {
            const listeners = this._delegatedListeners[type];
            for (let i = 0; i < listeners.length; i++) {
                const delegatedListener = listeners[i];
                if (delegatedListener.layer === layer && delegatedListener.listener === listener) {
                    for (const event in delegatedListener.delegates) {
                        this.off((event: any), delegatedListener.delegates[event]);
                    }
                    listeners.splice(i, 1);
                    return this;
                }
            }
        }

        return this;
    }

    /**
     * 返回一个数组 [GeoJSON](http://geojson.org/)
     * [要素对象](https://tools.ietf.org/html/rfc7946#section-3.2)
     * 所有满足查询条件的可见要素。
     * 
     * @param {PointLike|Array<PointLike>} [geometry] - 查询区域的几何对象：是一个点或者一个包含西南点和东北点的矩形。
     * 忽略这个参数（换句话说，使用0个参数或者只有一个“可选”的参数来调用方法{@link Map#queryRenderedFeatures}）
     * 相当于传递了整个地图可视范围的边界作为参数。
     * @param {Object} [options]
     * @param {Array<string>} [options.layers] 查询的图层ID数组。只有这些图层的要素会被返回。如果这个参数是undefined，所有的图层都会被检查。
     * @param {Array} [options.filter] 制查询的过滤器[过滤器](https://www.mapbox.com/mapbox-gl-js/style-spec/#other-filter)
     *
     * @returns {Array<Object>} [GeoJSON](http://geojson.org/)
     * [要素对象](https://tools.ietf.org/html/rfc7946#section-3.2)数组。
     *
     * 每个返回的要素对象的“properties”值包含其资源要素的所有属性。对于GeoJSON源，仅支持字符串和数字属性值（即不支持“null”，“Array”和“Object”值）。
     *
     * 每一个要素对象都包含顶级“layer”，“source”和“sourceLayer”属性。这个“layer”属性表示该要素所属样式层的对象。
     * 这个对象包含在给定级别和要素的所有布局和绘制属性
     *
     * 不包括“visibility”属性为“none”的图层的要素，或者缩放范围不包括当前缩放级别的图层的要素。
     * 不包括因文本或图标碰撞而隐藏的符号要素。但是包括所有其他图层的要素，包括可能对渲染结果没有明显
     * 作用的要素;例如，因为图层的透明度或颜色alpha值被设置为0。
     *
     * 最顶层的渲染要素首先出现在返回的数组中，后续要素按Z方向降序排列。多次被渲染的特征（由于在较低的缩放级别穿
     * 过本初子午线）仅返回一次（但需遵守以下说明）。
     * 
     * 由于要素来自矢量瓦片数据或在内部转换为切片的GeoJSON数据，因此要素几何体可能会跨切片边界进行拆分或复制，
     * 因此，要素可能会在查询结果中多次出现。例如，假设有一条公路穿过查询的矩形边界。查询的结果将是位于覆盖边界
     * 矩形的地图瓦片内的高速公路的那些部分，即使高速公路延伸到其它瓦片中，并且每个地图瓦片内的高速公路部分将作
     * 为单独的特征被返回。类似地，由于缓冲影响瓦片边界附近的点特征可能出现在多个瓦片中。
     *
     * @example
     * // 查询点的所有要素
     * var features = map.queryRenderedFeatures(
     *   [20, 35],
     *   { layers: ['my-layer-name'] }
     * );
     *
     * @example
     * // 查询边界框内所有的要素
     * var features = map.queryRenderedFeatures(
     *   [[10, 20], [30, 50]],
     *   { layers: ['my-layer-name'] }
     * );
     *
     * @example
     * // 查找点周围的边界框内的所有要素
     * var width = 10;
     * var height = 20;
     * var features = map.queryRenderedFeatures([
     *   [point.x - width / 2, point.y - height / 2],
     *   [point.x + width / 2, point.y + height / 2]
     * ], { layers: ['my-layer-name'] });
     *
     * @example
     * // 查找单独图层内的所有渲染要素
     * var features = map.queryRenderedFeatures({ layers: ['my-layer-name'] });
     * @see [鼠标点击显示要素属性](https://www.mapbox.com/mapbox-gl-js/example/queryrenderedfeatures/)
     * @see [高亮要素的边界](https://www.mapbox.com/mapbox-gl-js/example/using-box-queryrenderedfeatures/)
     * @see [点击标志物使得地图居中](https://www.mapbox.com/mapbox-gl-js/example/center-on-symbol/)
     */
    queryRenderedFeatures(geometry?: PointLike | [PointLike, PointLike], options?: Object) {
        // The first parameter can be omitted entirely, making this effectively an overloaded method
        // with two signatures:
        //
        //     queryRenderedFeatures(geometry: PointLike | [PointLike, PointLike], options?: Object)
        //     queryRenderedFeatures(options?: Object)
        //
        // There no way to express that in a way that's compatible with both flow and documentation.js.
        // Related: https://github.com/facebook/flow/issues/1556
        if (arguments.length === 2) {
            geometry = arguments[0];
            options = arguments[1];
        } else if (arguments.length === 1 && isPointLike(arguments[0])) {
            geometry = arguments[0];
            options = {};
        } else if (arguments.length === 1) {
            geometry = undefined;
            options = arguments[0];
        } else {
            geometry = undefined;
            options = {};
        }

        if (!this.style) {
            return [];
        }

        return this.style.queryRenderedFeatures(
            this._makeQueryGeometry(geometry),
            options,
            this.transform
        );

        function isPointLike(input) {
            return input instanceof Point || Array.isArray(input);
        }
    }

    _makeQueryGeometry(pointOrBox?: PointLike | [PointLike, PointLike]) {
        if (pointOrBox === undefined) {
            // bounds was omitted: use full viewport
            pointOrBox = [
                Point.convert([0, 0]),
                Point.convert([this.transform.width, this.transform.height])
            ];
        }

        let queryGeometry;

        if (pointOrBox instanceof Point || typeof pointOrBox[0] === 'number') {
            const point = Point.convert(pointOrBox);
            queryGeometry = [point];
        } else {
            const box = [Point.convert(pointOrBox[0]), Point.convert(pointOrBox[1])];
            queryGeometry = [
                box[0],
                new Point(box[1].x, box[0].y),
                box[1],
                new Point(box[0].x, box[1].y),
                box[0]
            ];
        }

        return {
            viewport: queryGeometry,
            worldCoordinate: queryGeometry.map((p) => {
                return this.transform.pointCoordinate(p);
            })
        };
    }

    /**
     * 
     * 返回满足条件的指定矢量切片或GeoJSON[GeoJSON](http://geojson.org/)源中的
     * 要素[要素对象](https://tools.ietf.org/html/rfc7946#section-3.2)的数组
     *
     * 
     * @param {string} sourceID 查询的矢量瓦片或者GeoJSON的资源ID。
     * @param {Object} [parameters]
     * @param {string} [parameters.sourceLayer] T查询的矢量瓦片图层的名称。*对于矢量资源，这个参数是必须的。*对于GeoJSON数据资源，它是可以忽略的。
     * @param {Array} [parameters.filter] 查询结果的过滤器[过滤器](https://www.mapbox.com/mapbox-gl-js/style-spec/#other-filter)
     *
     * @returns {Array<Object>} [GeoJSON](http://geojson.org/)
     * [要素对象](https://tools.ietf.org/html/rfc7946#section-3.2)的数组.
     *
     * 对比方法{@link Map#queryRenderedFeatures}，这个方法返回所有满足条件的要素值，无论它们是否被当前样式绘制
     * （比如可见属性）。查询的范围包括当前加载的矢量瓦片资源和GeoJSON瓦片资源：这个方法不检查瓦片是否在当前可视范围内。
     *
     * 由于要素来自矢量瓦片数据或在内部转换为切片的GeoJSON数据，因此要素几何体可能会跨切片边界进行拆分或复制，
     * 因此，要素可能会在查询结果中多次出现。例如，假设有一条公路穿过查询的矩形边界。查询的结果将是位于覆盖边界
     * 矩形的地图瓦片内的高速公路的那些部分，即使高速公路延伸到其它瓦片中，并且每个地图瓦片内的高速公路部分将作
     * 为单独的特征被返回。类似地，由于缓冲影响瓦片边界附近的点特征可能出现在多个瓦片中。
     * 
     * @see [通过地图视图过滤要素](https://www.mapbox.com/mapbox-gl-js/example/filter-features-within-map-view/)
     * @see [高亮包含相同数据的要素](https://www.mapbox.com/mapbox-gl-js/example/query-similar-features/)
     */
    querySourceFeatures(sourceID: string, parameters: ?{sourceLayer: ?string, filter: ?Array<any>}) {
        return this.style.querySourceFeatures(sourceID, parameters);
    }

    /**
     * 使用新的值更新地图的Mapbox样式对象。如果给定值是样式是JSON对象，则将其与当前状态进行比较，
     * 并仅执行发生修改的地方。
     *
     * @param style 符合规范的JSON对象[Mapbox Style 规范](https://mapbox.com/mapbox-gl-style-spec/)，或者是JSON的一个URL地址。
     * @param {Object} [options]
     * @param {boolean} [options.diff=true] 如果是“false”，强制全部更新，同时移除当前样式，并且使用新设置的样式。
     * @param {string} [options.localIdeographFontFamily=null] 如果非空，定义一个CSS的字体样式用啦覆盖生成的样式'CJK Unified Ideographs' 和 'Hangul Syllables'。强制全部更新。
     *   
     * @returns {Map} `this`
     * @see [改变地图样式](https://www.mapbox.com/mapbox-gl-js/example/setstyle/)
     */
    setStyle(style: StyleSpecification | string | null, options?: {diff?: boolean} & StyleOptions) {
        const shouldTryDiff = (!options || (options.diff !== false && !options.localIdeographFontFamily)) && this.style;
        if (shouldTryDiff && style && typeof style === 'object') {
            try {
                if (this.style.setState(style)) {
                    this._update(true);
                }
                return this;
            } catch (e) {
                warnOnce(
                    `Unable to perform style diff: ${e.message || e.error || e}.  Rebuilding the style from scratch.`
                );
            }
        }

        if (this.style) {
            this.style.setEventedParent(null);
            this.style._remove();
        }

        if (!style) {
            delete this.style;
            return this;
        } else {
            this.style = new Style(this, options || {});
        }

        this.style.setEventedParent(this, {style: this.style});

        if (typeof style === 'string') {
            this.style.loadURL(style);
        } else {
            this.style.loadJSON(style);
        }

        return this;
    }

    /**
     * 返回地图的 Mapbox 样式对象，它可以被用来创建地图的样式。
     * 
     * @returns {Object} 地图的样式对象。
     * 
     */
    getStyle() {
        if (this.style) {
            return this.style.serialize();
        }
    }

    /**
     * 返回地图的样式是否被完全加载的标识。
     *
     * @returns {boolean} 样式是否完全加载的标识。
     */
    isStyleLoaded() {
        if (!this.style) return warnOnce('There is no style added to the map.');
        return this.style.loaded();
    }

    /**
     * 将指定的资源添加到地图的样式中。
     *
     * @param {string} id 被添加的资源ID。不能和现有资源冲突。
     * 
     * @param {Object} source 资源的对象，样式规范参考 Mapbox Style [资源规范](https://www.mapbox.com/mapbox-gl-style-spec/#sources)或者{@link CanvasSourceOptions}.
     * 
     * @fires source.add
     * @returns {Map} `this`
     * @see [绘制GeoJson点集合](https://www.mapbox.com/mapbox-gl-js/example/geojson-markers/)
     * @see [使用数据驱动绘制的圆](https://www.mapbox.com/mapbox-gl-js/example/data-driven-circle-colors/)
     * @see [设置位置解析后的一个点](https://www.mapbox.com/mapbox-gl-js/example/point-from-geocoder-result/)
     */
    addSource(id: string, source: SourceSpecification) {
        this.style.addSource(id, source);
        this._update(true);
        return this;
    }

    /**
     * 返回指定的资源十分被加载的标识。
     *
     * @param {string} id 被检查的资源的ID。
     * 
     * @returns {boolean} 返回资源是否被加载的标识。
     * 
     */
    isSourceLoaded(id: string) {
        const source = this.style && this.style.sourceCaches[id];
        if (source === undefined) {
            this.fire(new ErrorEvent(new Error(`There is no source with ID '${id}'`)));
            return;
        }
        return source.loaded();
    }

    /**
     * 返回在样式中所有资源的视图中的瓦片是否被加载的标识。
     * 
     * @returns {boolean} 瓦片是否被全部加载的标识。
     */

    areTilesLoaded() {
        const sources = this.style && this.style.sourceCaches;
        for (const id in sources) {
            const source = sources[id];
            const tiles = source._tiles;
            for (const t in tiles) {
                const tile = tiles[t];
                if (!(tile.state === 'loaded' || tile.state === 'errored')) return false;
            }
        }
        return true;
    }

    /**
     * 添加[自定义资源类型](#Custom Sources), 并且使之可供使用{@link Map#addSource}.
     * 
     * @private
     * @param {string} name 资源类型的名称；使用“{type: ...}”字段定义资源类型对象
     * 
     * @param {Function} SourceType 构造函数{@link Source}
     * 
     * @param {Function} callback 当资源类型定义完成或者发生异常时候（带有异常参数）会被调用
     * 
     */
    addSourceType(name: string, SourceType: any, callback: Function) {
        return this.style.addSourceType(name, SourceType, callback);
    }

    /**
     * 从地图的样式中删除指定的资源。
     *
     * @param {string} id 指定删除的资源ID。
     * 
     * @returns {Map} `this`
     */
    removeSource(id: string) {
        this.style.removeSource(id);
        this._update(true);
        return this;
    }

    /**
     * 返回地图样式中对应ID的资源。
     *
     * @param {string} id 查找的资源ID。
     * @returns {?Object} 指定ID的资源，或者在资源中查找不到指定的ID，则返回“undefined”。
     *   
     * @see [创建可拖拽的点](https://www.mapbox.com/mapbox-gl-js/example/drag-a-point/)
     * @see [点动画](https://www.mapbox.com/mapbox-gl-js/example/animate-point-along-line/)
     * @see [添加实时数据](https://www.mapbox.com/mapbox-gl-js/example/live-geojson/)
     */
    getSource(id: string) {
        return this.style.getSource(id);
    }

    /**
     * 添加一张图片到样式中。这张图片可以被用来作为“icon-image”，“background-pattern”，
     * “fill-pattern”，或者“line-pattern”。如果在精灵上没有足够的空间添加这张图片将会触发
     * {@link Map#error} 事件。
     * 
     *
     * @see [添加一个图标到地图上](https://www.mapbox.com/mapbox-gl-js/example/add-image/)
     * @see [添加一个生成的图片到地图上](https://www.mapbox.com/mapbox-gl-js/example/add-image-generated/)
     * 
     * @param id 图片的ID。
     * @param image 这张图片将被作为`HTMLImageElement`, `ImageData`或者是类似`ImageData`包含有`width`, `height`, 和 `data`属性的对象。
     * @param options
     * @param options.pixelRatio 图片中像素与屏幕上物理像素的比率。
     * @param options.sdf 图片是否会被当作为SDF格式图片。
     * 
     */
    addImage(id: string,
             image: HTMLImageElement | ImageData | {width: number, height: number, data: Uint8Array | Uint8ClampedArray},
             {pixelRatio = 1, sdf = false}: {pixelRatio?: number, sdf?: boolean} = {}) {
        if (image instanceof HTMLImageElement) {
            const {width, height, data} = browser.getImageData(image);
            this.style.addImage(id, { data: new RGBAImage({width, height}, data), pixelRatio, sdf });
        } else if (image.width === undefined || image.height === undefined) {
            return this.fire(new ErrorEvent(new Error(
                'Invalid arguments to map.addImage(). The second argument must be an `HTMLImageElement`, `ImageData`, ' +
                'or object with `width`, `height`, and `data` properties with the same format as `ImageData`')));
        } else {
            const {width, height, data} = image;
            this.style.addImage(id, { data: new RGBAImage({width, height}, new Uint8Array(data)), pixelRatio, sdf });
        }
    }

    /**
     * 定义图片是否已经被添加
     * 
     * @param id 图片的ID
     * 
     */
    hasImage(id: string): boolean {
        if (!id) {
            this.fire(new ErrorEvent(new Error('Missing required image id')));
            return false;
        }

        return !!this.style.getImage(id);
    }

    /**
     * 从样式中删除指定的图片（例如被用来作为“icon-image”或者“background-pattern”的图片）。
     * 
     * @param id 图片的ID。
     * 
     */
    removeImage(id: string) {
        this.style.removeImage(id);
    }

    /**
     * 通过包含“Map#addImage”的外部URL加载图片。外部资源必须支持[跨域](https://developer.mozilla.org/en-US/docs/Web/HTTP/Access_control_CORS).
     * 
     * @param {string} url 图片的URL地址。图片资源必须是png，webp，或者jpg格式。
     * @param {Function} callback 回调方法“callback(error, data)”。当图片加载完成或者加载发生错误时候调用该方法。
     * @see [添加一个icon到地图上](https://www.mapbox.com/mapbox-gl-js/example/add-image/)
     */
    loadImage(url: string, callback: Function) {
        getImage(this._transformRequest(url, ResourceType.Image), callback);
    }

    /**
    * 返回当前地图上所有可用的精灵或者图片的名字列表。
    * 
    * @returns {Array<string>} 当前地图上所有可用的精灵或者图片的名字列表。
    */
    listImages() {
        return this.style.listImages();
    }

    /**
     * 添加一个[Mapbox 样式图层](https://www.mapbox.com/mapbox-gl-style-spec/#layers)到地图上
     *
     * 图层的样式来自于一个指定资源。
     * 
     * @param {Object} layer 添加的图层。必须符合Mapbox样式定义[图层定义](https://www.mapbox.com/mapbox-gl-style-spec/#layers)。
     * @param {string} [before] T一个已经存在的图层，用于插入到新的图层上一层。
     *   如果这个参数被忽略，新的图层将会被放置在图层数组的末尾。
     * 
     * @returns {Map} `this`
     * @see [创建聚合样式](https://www.mapbox.com/mapbox-gl-js/example/cluster/)
     * @see [添加矢量瓦片资源](https://www.mapbox.com/mapbox-gl-js/example/vector-source/)
     * @see [添加WMS服务资源](https://www.mapbox.com/mapbox-gl-js/example/wms/)
     */
    addLayer(layer: LayerSpecification, before?: string) {
        this.style.addLayer(layer, before);
        this._update(true);
        return this;
    }

    /**
     * 移动图层到别的层级。
     *
     * @param {string} id 被移动的图层ID。
     * @param {string} [beforeId] 要插入图层位置的上一级图层的ID。
     * 如果这个参数被忽略，这个图层将会被添加到图层组的最后。
     *   
     * @returns {Map} `this`
     */
    moveLayer(id: string, beforeId?: string) {
        this.style.moveLayer(id, beforeId);
        this._update(true);
        return this;
    }

    /**
     * 从地图的样式中移除指定ID的图层。
     *
     * 如果指定的图层不存在，将会触发`error`事件。
     *
     * @param {string} id 需要移除图层的ID。
     * 
     * @fires error
     */
    removeLayer(id: string) {
        this.style.removeLayer(id);
        this._update(true);
        return this;
    }

    /**
     * 返回地图样式中指定ID的图层。
     *
     * @param {string} id 图层的ID。
     * 
     * @returns {?Object} 指定ID的图层，或者是如果指定的ID查找不到图层，则返回`undefined`。
     * 
     * @see [通过列表切换显示不同符号](https://www.mapbox.com/mapbox-gl-js/example/filter-markers/)
     * @see [通过输入文本切换显示不同符号](https://www.mapbox.com/mapbox-gl-js/example/filter-markers-by-input/)
     */
    getLayer(id: string) {
        return this.style.getLayer(id);
    }

    /**
     * 设置指定图层的过滤器。
     *
     * @param {string} layer 图层的ID。
     * @param {Array | null | undefined} filter 符合Mapbox Style规范[过滤器定义](https://www.mapbox.com/mapbox-gl-js/style-spec/#other-filter)的过滤器。
     *   如果设置为`null` 或者 `undefined`，这个方法会移除图层的所有过滤器。
     * @returns {Map} `this`
     * @example
     * map.setFilter('my-layer', ['==', 'name', 'USA']);
     * @see [通过地图视图过滤要素](https://www.mapbox.com/mapbox-gl-js/example/filter-features-within-map-view/)
     * @see [高亮包含相同属性的要素](https://www.mapbox.com/mapbox-gl-js/example/query-similar-features/)
     * @see [创建时间线动画](https://www.mapbox.com/mapbox-gl-js/example/timeline-animation/)
     */
    setFilter(layer: string, filter: ?FilterSpecification) {
        this.style.setFilter(layer, filter);
        this._update(true);
        return this;
    }

    /**
     * 设置指定图层的缩放范围。
     *
     * @param {string} layerId 需要设置缩放范围的图层ID。
     * @param {number} minzoom 最小缩放级别（0-24）。
     * @param {number} maxzoom 最大缩放级别（0-24）。
     * 
     * @returns {Map} `this`
     * @example
     * map.setLayerZoomRange('my-layer', 2, 5);
     */
    setLayerZoomRange(layerId: string, minzoom: number, maxzoom: number) {
        this.style.setLayerZoomRange(layerId, minzoom, maxzoom);
        this._update(true);
        return this;
    }

    /**
     * 返回指定图层的过滤条件。
     *
     * @param {string} layer 图层的ID。
     * 
     * @returns {Array} 图层的过滤器。
     */
    getFilter(layer: string) {
        return this.style.getFilter(layer);
    }

    /**
     * 设置指定图层的绘制属性。
     *
     * @param {string} layer 图层的ID。
     * @param {string} name 绘制属性的名称。
     * @param {*} value 绘制属性的值。
     * 必须符合属性值规范定义，[Mapbox Style 规范](https://www.mapbox.com/mapbox-gl-style-spec/).
     * @returns {Map} `this`
     * @example
     * map.setPaintProperty('my-layer', 'fill-color', '#faafee');
     * @see [通过按钮改变图层的颜色](https://www.mapbox.com/mapbox-gl-js/example/color-switcher/)
     * @see [修改图层的透明度](https://www.mapbox.com/mapbox-gl-js/example/adjust-layer-opacity/)
     * @see [创建可拖动的点](https://www.mapbox.com/mapbox-gl-js/example/drag-a-point/)
     */
    setPaintProperty(layer: string, name: string, value: any) {
        this.style.setPaintProperty(layer, name, value);
        return this._update(true);
    }

    /**
     * 返回指定图层的绘制属性。
     *
     * @param {string} layer 图层的ID。
     * @param {string} name 绘制属性的属性名称。
     * 
     * @returns {*} 指定属性的值。
     * 
     */
    getPaintProperty(layer: string, name: string) {
        return this.style.getPaintProperty(layer, name);
    }

    /**
     * 设置指定样式图层的布局属性。
     *
     * @param {string} layer 设置属性的图层ID。
     * @param {string} name 设置的布局属性的名称。
     * @param {*} value 布局属性的值。
     * 必须符合属性值的定义规范[Mapbox Style 规范](https://www.mapbox.com/mapbox-gl-style-spec/).
     * 
     * @returns {Map} `this`
     * @example
     * map.setLayoutProperty('my-layer', 'visibility', 'none');
     */
    setLayoutProperty(layer: string, name: string, value: any) {
        this.style.setLayoutProperty(layer, name, value);
        this._update(true);
        return this;
    }

    /**
     * 返回指定样式图层中的布局属性。
     *
     * @param {string} layer 指定图层的ID。
     * @param {string} name 指定布局属性名称。
     * @returns {*} 指定布局属性值。
     */
    getLayoutProperty(layer: string, name: string) {
        return this.style.getLayoutProperty(layer, name);
    }

    /**
     * 设置浅色样式组合值。
     *
     * @param light 设置的浅色样式属性。
     * 必须符合[Mapbox Style规范](https://www.mapbox.com/mapbox-gl-style-spec/#light)。
     * @returns {Map} `this`
     */
    setLight(light: LightSpecification) {
        this.style.setLight(light);
        this._update(true);
        return this;
    }

    /**
     * 返回浅色样式对象值。
     *
     * @returns {Object} light 样式的浅色属性值。
     */
    getLight() {
        return this.style.getLight();
    }

    /**
     * 设置要素的状态。这个`state`对象将会和要素中已经存在的状态合并。
     *
     * @param {Object} [feature] 要素标识。
     * 从方法{@link Map#queryRenderedFeatures}返回的要素对象，或者是事件控制器中被用来作为要素对象的标识对象。
     * @param {string} [feature.id] 要素唯一的ID。
     * @param {string} [feature.source] 要素中的矢量资源或者GeoJSON资源。
     * @param {string} [feature.sourceLayer] （可选项）*矢量资源的资源图层是必须的。*
     * @param {Object} state 对象键值对。所有的值必须是有效的JSON可解析类型。
     *
     * 这个方法需要设置资源的`feature.id`属性。对于没有要素id的GeoJSON资源，设置`GeoJSONSourceSpecification`
     * 中的`generateIds`来自动匹配它们。这个可选项的id基于要素在资源中的索引值。
     * 
     */
    setFeatureState(feature: { source: string; sourceLayer?: string; id: string; }, state: Object) {
        this.style.setFeatureState(feature, state);
        this._update();
    }

    /**
     * 获取要素的状态
     *
     * @param {Object} [feature] 要素标识。
     * 从方法{@link Map#queryRenderedFeatures}返回的要素对象，或者是事件控制器中被用来作为要素对象的标识对象。
     * @param {string} [feature.source] 要素中的矢量资源或者GeoJSON资源。
     * @param {string} [feature.sourceLayer] （可选项）*矢量资源的资源图层是必须的。*
     * @param {string} [feature.id] 要素唯一的ID。
     *
     * @returns {Object} 要素的状态。
     * 
     */
    getFeatureState(feature: { source: string; sourceLayer?: string; id: string; }): any {
        return this.style.getFeatureState(feature);
    }

    /**
     * 返回地图包含的HTML元素。
     *
     * @returns {HTMLElement} 地图对象容器。
     */
    getContainer() {
        return this._container;
    }

    /**
     * 返回包含地图`<canvas>`元素的HTML元素。
     * 
     * 如果你想要添加非-GL的覆盖在这个地图上，你应该将这些内容添加在这个元素中。
     * 
     * 这个元素绑定了地图操作（如平移和缩放）事件。它接受子元素例如`<canvas>`的冒泡事件，但是不接受地图控制的冒泡事件。
     *
     * @returns {HTMLElement} 地图`<canvas>`的容器。
     * @see [创建可拖动的点](https://www.mapbox.com/mapbox-gl-js/example/drag-a-point/)
     * @see [高亮元素边界](https://www.mapbox.com/mapbox-gl-js/example/using-box-queryrenderedfeatures/)
     */
    getCanvasContainer() {
        return this._canvasContainer;
    }

    /**
     * 返回地图的“<canvas>”元素
     *
     * @returns {HTMLCanvasElement} 地图的“<canvas>”元素
     * @see [测量距离](https://www.mapbox.com/mapbox-gl-js/example/measure/)
     * @see [显示悬停弹出窗口](https://www.mapbox.com/mapbox-gl-js/example/popup-on-hover/)
     * @see [点击标志使得地图居中显示](https://www.mapbox.com/mapbox-gl-js/example/center-on-symbol/)
     */
    getCanvas() {
        return this._canvas;
    }

    _containerDimensions() {
        let width = 0;
        let height = 0;

        if (this._container) {
            width = this._container.offsetWidth || 400;
            height = this._container.offsetHeight || 300;
        }

        return [width, height];
    }

    _detectMissingCSS(): void {
        const computedColor = window.getComputedStyle(this._missingCSSCanary).getPropertyValue('background-color');
        if (computedColor !== 'rgb(250, 128, 114)') {
            warnOnce('This page appears to be missing CSS declarations for ' +
                'Mapbox GL JS, which may cause the map to display incorrectly. ' +
                'Please ensure your page includes mapbox-gl.css, as described ' +
                'in https://www.mapbox.com/mapbox-gl-js/api/.');
        }
    }

    _setupContainer() {
        const container = this._container;
        container.classList.add('mapboxgl-map');

        const missingCSSCanary = this._missingCSSCanary = DOM.create('div', 'mapboxgl-canary', container);
        missingCSSCanary.style.visibility = 'hidden';
        this._detectMissingCSS();

        const canvasContainer = this._canvasContainer = DOM.create('div', 'mapboxgl-canvas-container', container);
        if (this._interactive) {
            canvasContainer.classList.add('mapboxgl-interactive');
        }

        this._canvas = DOM.create('canvas', 'mapboxgl-canvas', canvasContainer);
        this._canvas.style.position = 'absolute';
        this._canvas.addEventListener('webglcontextlost', this._contextLost, false);
        this._canvas.addEventListener('webglcontextrestored', this._contextRestored, false);
        this._canvas.setAttribute('tabindex', '0');
        this._canvas.setAttribute('aria-label', 'Map');

        const dimensions = this._containerDimensions();
        this._resizeCanvas(dimensions[0], dimensions[1]);

        const controlContainer = this._controlContainer = DOM.create('div', 'mapboxgl-control-container', container);
        const positions = this._controlPositions = {};
        ['top-left', 'top-right', 'bottom-left', 'bottom-right'].forEach((positionName) => {
            positions[positionName] = DOM.create('div', `mapboxgl-ctrl-${positionName}`, controlContainer);
        });
    }

    _resizeCanvas(width: number, height: number) {
        const pixelRatio = window.devicePixelRatio || 1;

        // Request the required canvas size taking the pixelratio into account.
        this._canvas.width = pixelRatio * width;
        this._canvas.height = pixelRatio * height;

        // Maintain the same canvas size, potentially downscaling it for HiDPI displays
        this._canvas.style.width = `${width}px`;
        this._canvas.style.height = `${height}px`;
    }

    _setupPainter() {
        const attributes = extend({
            failIfMajorPerformanceCaveat: this._failIfMajorPerformanceCaveat,
            preserveDrawingBuffer: this._preserveDrawingBuffer
        }, isSupported.webGLContextAttributes);

        const gl = this._canvas.getContext('webgl', attributes) ||
            this._canvas.getContext('experimental-webgl', attributes);

        if (!gl) {
            this.fire(new ErrorEvent(new Error('Failed to initialize WebGL')));
            return;
        }

        this.painter = new Painter(gl, this.transform);
    }

    _contextLost(event: *) {
        event.preventDefault();
        if (this._frame) {
            this._frame.cancel();
            this._frame = null;
        }
        this.fire(new Event('webglcontextlost', {originalEvent: event}));
    }

    _contextRestored(event: *) {
        this._setupPainter();
        this.resize();
        this._update();
        this.fire(new Event('webglcontextrestored', {originalEvent: event}));
    }

    /**
     * 返回地图是否完全加载的标识。
     *
     * 如果样式没有完全加载，或者资源或样式没有被完全加载时候发生了修改，则返回“false“
     *
     * @returns {boolean} 地图是否被完全加载的标识。
     */
    loaded() {
        if (this._styleDirty || this._sourcesDirty)
            return false;
        if (!this.style || !this.style.loaded())
            return false;
        return true;
    }

    /**
     * 更新地图的样式和资源，同时重绘地图。
     *
     * @param {boolean} 地图的重新绘制的样式资源
     *  
     * @returns {Map} this
     * @private
     */
    _update(updateStyle?: boolean) {
        if (!this.style) return;

        this._styleDirty = this._styleDirty || updateStyle;
        this._sourcesDirty = true;

        this._rerender();
    }

    /**
     * 下一帧绘制时候会被调用。如果尚未开始渲染则开始渲染。
     * 
     * @returns 用来取消回调的一个ID。
     * @private
     */
    _requestRenderFrame(callback: () => void): TaskID {
        this._update();
        return this._renderTaskQueue.add(callback);
    }

    _cancelRenderFrame(id: TaskID) {
        this._renderTaskQueue.remove(id);
    }

    /**
     * 地图绘制时候会调用这个方法。
     * - 样式改变（`setPaintProperty()`，等）
     * - 资源被修改（例如，瓦片加载完毕后）
     * - 地图被移动（或者刚刚完成移动）
     * - 进度改变
     *
     * @returns {Map} this
     * @private
     */
    _render() {
        this._renderTaskQueue.run();

        let crossFading = false;

        // If the style has changed, the map is being zoomed, or a transition or fade is in progress:
        //  - Apply style changes (in a batch)
        //  - Recalculate paint properties.
        if (this.style && this._styleDirty) {
            this._styleDirty = false;

            const zoom = this.transform.zoom;
            const now = browser.now();
            this.style.zoomHistory.update(zoom, now);

            const parameters = new EvaluationParameters(zoom, {
                now,
                fadeDuration: this._fadeDuration,
                zoomHistory: this.style.zoomHistory,
                transition: this.style.getTransition()
            });

            const factor = parameters.crossFadingFactor();
            if (factor !== 1 || factor !== this._crossFadingFactor) {
                crossFading = true;
                this._crossFadingFactor = factor;
            }

            this.style.update(parameters);
        }

        // If we are in _render for any reason other than an in-progress paint
        // transition, update source caches to check for and load any tiles we
        // need for the current transform
        if (this.style && this._sourcesDirty) {
            this._sourcesDirty = false;
            this.style._updateSources(this.transform);
        }

        this._placementDirty = this.style && this.style._updatePlacement(this.painter.transform, this.showCollisionBoxes, this._fadeDuration, this._crossSourceCollisions);

        // Actually draw
        this.painter.render(this.style, {
            showTileBoundaries: this.showTileBoundaries,
            showOverdrawInspector: this._showOverdrawInspector,
            rotating: this.isRotating(),
            zooming: this.isZooming(),
            fadeDuration: this._fadeDuration
        });

        this.fire(new Event('render'));

        if (this.loaded() && !this._loaded) {
            this._loaded = true;
            this.fire(new Event('load'));
        }

        if (this.style && (this.style.hasTransitions() || crossFading)) {
            this._styleDirty = true;
        }

        // Schedule another render frame if it's needed.
        //
        // Even though `_styleDirty` and `_sourcesDirty` are reset in this
        // method, synchronous events fired during Style#update or
        // Style#_updateSources could have caused them to be set again.
        if (this._sourcesDirty || this._repaint || this._styleDirty || this._placementDirty) {
            this._rerender();
        }

        return this;
    }

    /**
     * 清理释放地图的所有内置资源。
     *
     * 这包含 DOM元素，事件绑定，网页进程，和 WebGL资源。
     *
     * 当你确定不在使用地图同时需要释放浏览器资源时候使用这个方法。之后，你将不能调用地图上的任何方法。
     */
    remove() {
        if (this._hash) this._hash.remove();
        if (this._frame) {
            this._frame.cancel();
            this._frame = null;
        }
        this._renderTaskQueue.clear();
        this.setStyle(null);
        if (typeof window !== 'undefined') {
            window.removeEventListener('resize', this._onWindowResize, false);
            window.removeEventListener('online', this._onWindowOnline, false);
        }
        const extension = this.painter.context.gl.getExtension('WEBGL_lose_context');
        if (extension) extension.loseContext();
        removeNode(this._canvasContainer);
        removeNode(this._controlContainer);
        removeNode(this._missingCSSCanary);
        this._container.classList.remove('mapboxgl-map');
        this.fire(new Event('remove'));
    }

    _rerender() {
        if (this.style && !this._frame) {
            this._frame = browser.frame(() => {
                this._frame = null;
                this._render();
            });
        }
    }

    _onWindowOnline() {
        this._update();
    }

    _onWindowResize() {
        if (this._trackResize) {
            this.resize()._update();
        }
    }

    /**
     * 获取和设置一个布尔值标识，控制地图是否绘制每一个瓦片的外边界。
     * 这些外边界对于调试非常有用。
     * 
     * @name showTileBoundaries
     * @type {boolean}
     * @instance
     * @memberof Map
     */
    get showTileBoundaries(): boolean { return !!this._showTileBoundaries; }
    set showTileBoundaries(value: boolean) {
        if (this._showTileBoundaries === value) return;
        this._showTileBoundaries = value;
        this._update();
    }

    /**
     * 获取和设置一个布尔值标识，控制地图是否绘制资源中所有标志的外边界，
     * 当标志被绘制的时候显示或者当碰撞时候隐藏。
     * 这条信息对于调试非常有用。
     *
     * @name showCollisionBoxes
     * @type {boolean}
     * @instance
     * @memberof Map
     */
    get showCollisionBoxes(): boolean { return !!this._showCollisionBoxes; }
    set showCollisionBoxes(value: boolean) {
        if (this._showCollisionBoxes === value) return;
        this._showCollisionBoxes = value;
        if (value) {
            // When we turn collision boxes on we have to generate them for existing tiles
            // When we turn them off, there's no cost to leaving existing boxes in place
            this.style._generateCollisionBoxes();
        } else {
            // Otherwise, call an update to remove collision boxes
            this._update();
        }
    }

    /*
     * 获取和设置一个布尔值标识，控制地图是否应对每一个片段显示被遮盖的次数。
     * 白色片段被遮盖 8次或者更多次。
     * 黑色片段被遮盖 0次。
     * 这条信息对于调试非常有用。
     *
     * @name showOverdraw
     * @type {boolean}
     * @instance
     * @memberof Map
     */
    get showOverdrawInspector(): boolean { return !!this._showOverdrawInspector; }
    set showOverdrawInspector(value: boolean) {
        if (this._showOverdrawInspector === value) return;
        this._showOverdrawInspector = value;
        this._update();
    }

    /**
     * 获取和设置一个布尔值标识，控制地图是否连续重新绘制。这个信息对于分析工作非常有用。
     * 
     * @name repaint
     * @type {boolean}
     * @instance
     * @memberof Map
     */
    get repaint(): boolean { return !!this._repaint; }
    set repaint(value: boolean) { this._repaint = value; this._update(); }

    // show vertices
    get vertices(): boolean { return !!this._vertices; }
    set vertices(value: boolean) { this._vertices = value; this._update(); }

    _onData(event: MapDataEvent) {
        this._update(event.dataType === 'style');
        this.fire(new Event(`${event.dataType}data`, event));
    }

    _onDataLoading(event: MapDataEvent) {
        this.fire(new Event(`${event.dataType}dataloading`, event));
    }
}

export default Map;

function removeNode(node) {
    if (node.parentNode) {
        node.parentNode.removeChild(node);
    }
}

/**
 * 添加到地图的交互式控件。这是实施者模型一个范例：它不是一个可导出的方法或者类。
 *
 * 控制器必须继承`onAdd` 和 `onRemove`，同时必须拥有一个元素，通常是“div”元素。使用Mapbox GL JS
 * 的默认控制器样式，需要为自己的控制节点添加`mapboxgl-ctrl`类。
 *
 * @interface IControl
 * @example
 * // 使用 ES6 实现的控件
 * class HelloWorldControl {
 *     onAdd(map) {
 *         this._map = map;
 *         this._container = document.createElement('div');
 *         this._container.className = 'mapboxgl-ctrl';
 *         this._container.textContent = 'Hello, world';
 *         return this._container;
 *     }
 *
 *     onRemove() {
 *         this._container.parentNode.removeChild(this._container);
 *         this._map = undefined;
 *     }
 * }
 *
 * // 使用 ES5 的原型类型实现控件
 * function HelloWorldControl() { }
 *
 * HelloWorldControl.prototype.onAdd = function(map) {
 *     this._map = map;
 *     this._container = document.createElement('div');
 *     this._container.className = 'mapboxgl-ctrl';
 *     this._container.textContent = 'Hello, world';
 *     return this._container;
 * };
 *
 * HelloWorldControl.prototype.onRemove = function () {
 *      this._container.parentNode.removeChild(this._container);
 *      this._map = undefined;
 * };
 */

/**
 * 为地图注册一个控制器，同时为它注册一个事件监听器和资源。这个方法被 {@link Map#addControl}回调。
 *
 * @function
 * @memberof IControl
 * @instance
 * @name onAdd
 * @param {Map} map 添加控制器的地图。
 * 
 * @returns {HTMLElement} 这应该由控件创建，并由onAdd返回而不附加到DOM：地图将根据需要将控件的元素插入DOM。
 */

/**
 * 为地图取消注册一个控制器，同时为它取消一个事件监听器和资源。这个方法被 {@link Map#removeControl}回调。
 *
 * @function
 * @memberof IControl
 * @instance
 * @name onRemove
 * @param {Map} map 移除注册的地图
 * 
 * @returns {undefined} 这个方法没有必须的返回值。
 */

/**
 * 为控制器提供一个默认的位置。如果这个方法被继承，同时不包含“position”参数的方法
 * {@link Map#addControl}将会被调用，方法getDefaultPosition返回值将会作为控制器的位置参数。、
 *
 * @function
 * @memberof IControl
 * @instance
 * @name getDefaultPosition
 * @returns {string} 控制器的位置，addControl的一个有效值。
 * 
 */

/**
 * [点对象](https://github.com/mapbox/point-geometry)，以像素为单位的屏幕x和y坐标。
 * 

 * @typedef {Object} Point
 */

/**
 * 点对象{@link Point} 或者是以像素为单位的屏幕x和y坐标的数组。
 * @typedef {(Point | Array<number>)} PointLike
 */
