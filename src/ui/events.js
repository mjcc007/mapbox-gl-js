// @flow

import { Event } from '../util/evented';

import DOM from '../util/dom';
import Point from '@mapbox/point-geometry';
import { extend } from '../util/util';

import type Map from './map';
import type LngLat from '../geo/lng_lat';
import type LngLatBounds from '../geo/lng_lat_bounds';

/**
 * `MapMouseEvent` 是与鼠标相关的地图事件的事件类型。
 * @extends {Object}
 */
export class MapMouseEvent extends Event {
    /**
     * 事件的类型。
     */
    type: 'mousedown'
        | 'mouseup'
        | 'click'
        | 'dblclick'
        | 'mousemove'
        | 'mouseover'
        | 'mouseenter'
        | 'mouseleave'
        | 'mouseover'
        | 'mouseout'
        | 'contextmenu';

    /**
     * 响应事件的 `Map`对象。
     */
    target: Map;

    /**
     * 触发map事件的DOM事件。
     */
    originalEvent: MouseEvent;

    /**
     * 鼠标光标的像素坐标，该坐标是相对于当前的地图方向从左上角开始测量得到。
     */
    point: Point;

    /**
     * 鼠标光标在地图上的地理位置。
     * 
     */
    lngLat: LngLat;

    /**
     *  阻止地图响应后续的事件。
     *
     * 调用此方法将阻止以下默认映射行为：
     *
     *   * 在`mousedown`事件触发时的{@link DragPanHandler}行为。
     *   * 在`mousedown`事件触发时的{@link DragRotateHandler}行为。
     *   * 在`mousedown`事件触发时的{@link BoxZoomHandler}行为。
     *   * 在`dblclick`事件触发时的{@link DoubleClickZoomHandler}行为。
     *
     */
    preventDefault() {
        this._defaultPrevented = true;
    }

    /**
     * 如果 `preventDefault` 方法已经被调用则为`true` 。
     */
    get defaultPrevented(): boolean {
        return this._defaultPrevented;
    }

    _defaultPrevented: boolean;

    /**
     * @private
     */
    constructor(type: string, map: Map, originalEvent: MouseEvent, data: Object = {}) {
        const point = DOM.mousePos(map.getCanvasContainer(), originalEvent);
        const lngLat = map.unproject(point);
        super(type, extend({ point, lngLat, originalEvent }, data));
        this._defaultPrevented = false;
        this.target = map;
    }
}

/**
 * `MapTouchEvent` 是与触摸相关的地图事件的事件类型。
 * @extends {Object}
 */
export class MapTouchEvent extends Event {
    /**
     * 事件类型.
     */
    type: 'touchstart'
        | 'touchend'
        | 'touchcancel';

    /**
     * 响应事件的 `Map`对象。
     */
    target: Map;

    /**
     * 触发map事件的DOM事件。
     */
    originalEvent: TouchEvent;

    /**
     * 触摸事件中心地图上的地理位置指向。
     */
    lngLat: LngLat;

    /**
     * 触摸事件中心位置的坐标，该坐标是相对于当前的地图方向从左上角开始测量得到。
     */
    point: Point;

    /**
     * 与触摸事件[touch event's `touches`](https://developer.mozilla.org/en-US/docs/Web/API/TouchEvent/touches)的触摸属性对应的像素坐标阵列。
     */
    points: Array<Point>;

    /**
     * 与触摸事件[touch event's `touches`](https://developer.mozilla.org/en-US/docs/Web/API/TouchEvent/touches)的触摸属性对应的地理坐标阵列。
     * 
     */
    lngLats: Array<LngLat>;

    /**
     * 阻止地图响应后续的事件。
     *
     * 调用此方法将阻止以下默认映射行为：
     *
     *   * 在 `mousedown` 事件发生时, {@link DragPanHandler}行为
     *   * 在 `mousedown` 事件发生时, {@link DragRotateHandler}行为
     *
     */
    preventDefault() {
        this._defaultPrevented = true;
    }

    /**
     * 如果`preventDefault`被调用后将为true。
     */
    get defaultPrevented(): boolean {
        return this._defaultPrevented;
    }

    _defaultPrevented: boolean;

    /**
     * @private
     */
    constructor(type: string, map: Map, originalEvent: TouchEvent) {
        const points = DOM.touchPos(map.getCanvasContainer(), originalEvent);
        const lngLats = points.map((t) => map.unproject(t));
        const point = points.reduce((prev, curr, i, arr) => {
            return prev.add(curr.div(arr.length));
        }, new Point(0, 0));
        const lngLat = map.unproject(point);
        super(type, { points, point, lngLats, lngLat, originalEvent });
        this._defaultPrevented = false;
    }
}


/**
 * `MapWheelEvent` 是在地图上产生`wheel`事件所导致的事件.
 * @extends {Object}
 */
export class MapWheelEvent extends Event {
    /**
     * 事件类型。
     */
    type: 'wheel';

    /**
     * 响应`Map`对象的事件
     */
    target: Map;

    /**
     * 触发map事件的DOM事件。
     */
    originalEvent: WheelEvent;

    /**
     * 阻止地图响应后续的事件。
     *
     * 调用此方法将阻止{@link ScrollZoomHandler}行为.
     */
    preventDefault() {
        this._defaultPrevented = true;
    }

    /**
     * 如果调用了`preventDefault`方法将会被置为`true`。
     */
    get defaultPrevented(): boolean {
        return this._defaultPrevented;
    }

    _defaultPrevented: boolean;

    /**
     * @private
     */
    constructor(type: string, map: Map, originalEvent: WheelEvent) {
        super(type, { originalEvent });
        this._defaultPrevented = false;
    }
}

/**
 * @typedef {Object} MapBoxZoomEvent
 * @property {MouseEvent} originalEvent
 * @property {LngLatBounds} boxZoomBounds "box zoom"交互的范围.
 *   该属性只适用于`boxzoomend`事件.
 */
export type MapBoxZoomEvent = {
    type: 'boxzoomstart'
        | 'boxzoomend'
        | 'boxzoomcancel',
    map: Map,
    originalEvent: MouseEvent,
    boxZoomBounds: LngLatBounds
};

/**
 * `MapDataEvent`事件对象是由{@link Map.event:data}和{@link Map.event:dataloading}事件产生的。
 * `dataType`的值可能是：
 *
 * - `'source'`: 与任何source关联的non-tile数据
 * - `'style'`: 地图使用的 [样式](https://www.mapbox.com/mapbox-gl-style-spec/)。
 *
 * @typedef {Object} MapDataEvent
 * @property {string} type 事件类型.
 * @property {string} dataType 已经被修改的数据类型，可能是`'source'`, `'style'`.
 * @property {boolean} [isSourceLoaded] 如果事件的`dataType`是`source`类型并且source还未完成网络请求则为true.
 * @property {Object} [source] 如果事件的datatype是source，那么source需要遵守样式规范[遵守样式规范](https://www.mapbox.com/mapbox-gl-style-spec/#sources) if the event has a `dataType` of `source`.
 * @property {string} [sourceDataType] 如果事件的datatype是source，并且该事件明确的表明内部数据已经被接收或者被改变，该属性将会被赋值。该值可能是
 * `metadata`和`content`。
 * @property {Object} [tile] 这里的切片指的是： 一个加载切片相关的事件，并且该事件的dataType是source，此时正在被加载或者改变的切片。
 * @property {Coordinate} [coord] 如果一个事件的dataType是source，并且该事件是和加载切片相关的，此时切片的坐标就是coord.
 */
export type MapDataEvent = {
    type: string,
    dataType: string
};

export type MapContextEvent = {
    type: 'webglcontextlost' | 'webglcontextrestored',
    originalEvent: WebGLContextEvent
}

export type MapEvent =
    /**
     * 在地图内按下一个点击设备(通常是鼠标)时触发。
     *
     * @event mousedown
     * @memberof Map
     * @instance
     * @property {MapMouseEvent} data
     * @see [高亮显示边框内的features要素](https://www.mapbox.com/mapbox-gl-js/example/using-box-queryrenderedfeatures/)
     * @see [创建一个可拖拽的点](https://www.mapbox.com/mapbox-gl-js/example/drag-a-point/)
     */
    | 'mousedown'

    /**
     * 在地图中松开一个点击设备(通常是鼠标)时被触发。
     *
     * @event mouseup
     * @memberof Map
     * @instance
     * @property {MapMouseEvent} data
     * @see [高亮显示边框内的features要素](https://www.mapbox.com/mapbox-gl-js/example/using-box-queryrenderedfeatures/)
     * @see [创建一个可拖拽的点](https://www.mapbox.com/mapbox-gl-js/example/drag-a-point/)
     */
    | 'mouseup'

    /**
     * 当一个指点设备(通常是鼠标)移动覆盖到元素上时被触发。
     *
     * @event mouseover
     * @memberof Map
     * @instance
     * @property {MapMouseEvent} data
     * @see [获取鼠标指针的坐标](https://www.mapbox.com/mapbox-gl-js/example/mouse-position/)
     * @see [高亮显示鼠标覆盖的features区域](https://www.mapbox.com/mapbox-gl-js/example/hover-styles/)
     * @see [鼠标覆盖上后弹出一个popup框](https://www.mapbox.com/mapbox-gl-js/example/popup-on-hover/)
     */
    | 'mouseover'

    /**
     * 当一个指点设备（通常是鼠标）移动的时候被触发。
     *
     * @event mousemove
     * @memberof Map
     * @instance
     * @property {MapMouseEvent} data
     * @see [获取鼠标指针的坐标](https://www.mapbox.com/mapbox-gl-js/example/mouse-position/)
     * @see [高亮显示鼠标覆盖的features区域](https://www.mapbox.com/mapbox-gl-js/example/hover-styles/)
     * @see [鼠标覆盖上后弹出一个popup框](https://www.mapbox.com/mapbox-gl-js/example/popup-on-hover/)
     */
    | 'mousemove'

    /**
     * 当指点设备（通常是鼠标）在地图上点击时触发。
     *
     * @event click
     * @memberof Map
     * @instance
     * @property {MapMouseEvent} data
     * @see [测量距离](https://www.mapbox.com/mapbox-gl-js/example/measure/)
     * @see [点击一个符号让其位于地图视图中央](https://www.mapbox.com/mapbox-gl-js/example/center-on-symbol/)
     */
    | 'click'

    /**
     * 当一个指点设备（通常是鼠标）双击时触发
     *
     * @event dblclick
     * @memberof Map
     * @instance
     * @property {MapMouseEvent} data
     */
    | 'dblclick'

    /**
     * 当指点设备（通常是鼠标）从该图层外部或地图画布外部进入指定图层的可见部分时触发。 
     * 此事件只能通过{@link Map#on}的三参数版本的时候进行监听，其中第二个参数为指定所需的图层。
     * 
     * @event mouseenter
     * @memberof Map
     * @instance
     * @property {MapMouseEvent} data
     */
    | 'mouseenter'

    /**
     * 
     * 当指点设备（通常是鼠标）离开指定图层的可见部分或离开地图画布时触发。 
     * 此事件只能通过Map#on的三参数版本时进行监听，其中第二个参数指定所需的图层。 
     * 
     * @event mouseleave
     * @memberof Map
     * @instance
     * @property {MapMouseEvent} data
     * @see [高亮显示鼠标覆盖的features区域](https://www.mapbox.com/mapbox-gl-js/example/hover-styles/)
     */
    | 'mouseleave'

    /**
     * 和 `mouseenter`类似.
     *
     * @event mouseover
     * @memberof Map
     * @instance
     * @property {MapMouseEvent} data
     */
    | 'mouseover'

    /**
     * 当点设备（通常是鼠标）离开地图的画布时触发。
     *
     * @event mouseout
     * @memberof Map
     * @instance
     * @property {MapMouseEvent} data
     */
    | 'mouseout'

    /**
     * 单击鼠标右键或在地图中按下context menu键时触发。
     *
     * @event contextmenu
     * @memberof Map
     * @instance
     * @property {MapMouseEvent} data
     */
    | 'contextmenu'

    /**
     * 当 [`wheel`](https://developer.mozilla.org/en-US/docs/Web/Events/wheel) 事件发生的时候触发.
     *
     * @event wheel
     * @memberof Map
     * @instance
     * @property {MapWheelEvent} data
     */
    | 'wheel'

    /**
     * 当地图中触发了[`touchstart`](https://developer.mozilla.org/en-US/docs/Web/Events/touchstart)事件时触发 .
     *
     * @event touchstart
     * @memberof Map
     * @instance
     * @property {MapTouchEvent} data
     */
    | 'touchstart'

    /**
     * 在地图中发生[`touchend`](https://developer.mozilla.org/en-US/docs/Web/Events/touchend) 事件时触发.
     *
     * @event touchend
     * @memberof Map
     * @instance
     * @property {MapTouchEvent} data
     */
    | 'touchend'

    /**
     * 地图中发生[`touchmove`](https://developer.mozilla.org/en-US/docs/Web/Events/touchmove)事件时触发.
     *
     * @event touchmove
     * @memberof Map
     * @instance
     * @property {MapTouchEvent} data
     */
    | 'touchmove'

    /**
     * 当地图中产生[`touchcancel`](https://developer.mozilla.org/en-US/docs/Web/Events/touchcancel)事件时触发.
     *
     * @event touchcancel
     * @memberof Map
     * @instance
     * @property {MapTouchEvent} data
     */
    | 'touchcancel'

    /**
     * 在地图开始从一个视图转换到另一个视图之前，由于用户交互或诸如使用了{@link Map#jumpTo}之类的方法时而被触发。
     * 
     * @event movestart
     * @memberof Map
     * @instance
     * @property {{originalEvent: DragEvent}} data
     */
    | 'movestart'

    /**
     * 在从一个视图到另一个视图的动画过渡期间反复触发，作为用户交互或诸如{@link Map#flyTo}之类的方法的结果。
     *
     * @event move
     * @memberof Map
     * @instance
     * @property {MapMouseEvent | MapTouchEvent} data
     */
    | 'move'

    /**
     * 在地图完成从一个视图到另一个视图的转换之后，由于用户交互或诸如{@link Map#jumpTo}之类的方法而被触发。
     * 
     * @event moveend
     * @memberof Map
     * @instance
     * @property {{originalEvent: DragEvent}} data
     * @see [以幻灯片形式展示地图位置](https://www.mapbox.com/mapbox-gl-js/example/playback-locations/)
     * @see [对地图中的features做过滤](https://www.mapbox.com/mapbox-gl-js/example/filter-features-within-map-view/)
     */
    | 'moveend'

    /**
     * 当“拖动平移”交互事件开始时触发。请参见{@link DragPanHandler}。
     *
     * @event dragstart
     * @memberof Map
     * @instance
     * @property {{originalEvent: DragEvent}} data
     */
    | 'dragstart'

    /**
     * 在“拖拽平移”互动期间反复触发。请参见{@link DragPanHandler}。
     * 
     * @event drag
     * @memberof Map
     * @instance
     * @property {MapMouseEvent | MapTouchEvent} data
     */
    | 'drag'

    /**
     * 在“拖拽平移”交互结束时触发。请参见{@link DragPanHandler}.
     *
     * @event dragend
     * @memberof Map
     * @instance
     * @property {{originalEvent: DragEvent}} data
     */
    | 'dragend'

    /**
     * 在地图开始从一个缩放级别转换到另一个缩放级别之前，由于用户交互或调用了诸如{@link Map#flyTo}之类的方法而被触发。
     *
     * @event zoomstart
     * @memberof Map
     * @instance
     * @property {MapMouseEvent | MapTouchEvent} data
     */
    | 'zoomstart'

    /**
     * 在从一个缩放级别到另一个缩放级别的动画过渡期间反复触发，作为用户交互或调用了诸如{@link Map#flyTo}之类的方法的结果。
     * 
     * @event zoom
     * @memberof Map
     * @instance
     * @property {MapMouseEvent | MapTouchEvent} data
     * @see [通过缩放级别来更新等值区图层](https://www.mapbox.com/mapbox-gl-js/example/updating-choropleth/)
     */
    | 'zoom'

    /**
     * 在地图完成从一个缩放级别到另一个缩放级别的转换之后，由于用户交互或调用诸如{@link Map＃flyTo}之类的方法时被触发。
     * 
     * @event zoomend
     * @memberof Map
     * @instance
     * @property {MapMouseEvent | MapTouchEvent} data
     */
    | 'zoomend'

    /**
     * “拖动旋转”交互事件开始时触发。请参照{@link DragRotateHandler}。
     *
     * @event rotatestart
     * @memberof Map
     * @instance
     * @property {MapMouseEvent | MapTouchEvent} data
     */
    | 'rotatestart'

    /**
     * 在“拖动旋转”交互期间反复触发。请参见{@link DragRotateHandler}。
     *
     * @event rotate
     * @memberof Map
     * @instance
     * @property {MapMouseEvent | MapTouchEvent} data
     */
    | 'rotate'

    /**
     * 在“拖动旋转”交互结束时触发。请参见{@link DragRotateHandler}。
     *
     * @event rotateend
     * @memberof Map
     * @instance
     * @property {MapMouseEvent | MapTouchEvent} data
     */
    | 'rotateend'

    /**
     * 由于用户交互或调用了{@link Map#flyTo}等方法导致地图的倾斜程度开始发生变化时触发。
     *
     * @event pitchstart
     * @memberof Map
     * @instance
     * @property {MapEventData} data
     */
    | 'pitchstart'

    /**
     * 由于用户交互或者调用了{@link Map#flyTo}等方法导致地图的倾斜程度改变时触发.
     *
     * @event pitch
     * @memberof Map
     * @instance
     * @property {MapEventData} data
     */
    | 'pitch'

    /**
     * 在发生用户交互或者调用了{@link Map#flyTo}等方法使地图的倾斜程度改变完成后立即触发。
     * 
     * @event pitchend
     * @memberof Map
     * @instance
     * @property {MapEventData} data
     */
    | 'pitchend'

    /**
     * "box zoom" 交互开始的时候会触发该事件. 详细可以参考{@link BoxZoomHandler}。
     *
     * @event boxzoomstart
     * @memberof Map
     * @instance
     * @property {MapBoxZoomEvent} data
     */
    | 'boxzoomstart'

    /**
     * "box zoom" 交互结束的时候会触发该事件. 详细可以参考{@link BoxZoomHandler}。
     *
     * @event boxzoomend
     * @memberof Map
     * @instance
     * @type {Object}
     * @property {MapBoxZoomEvent} data
     */
    | 'boxzoomend'

    /**
     * 当用户取消“box zoom”交互时，或当边界框不满足最小尺寸阈值时触发。详见{@link BoxZoomHandler}。
     * 
     *
     * @event boxzoomcancel
     * @memberof Map
     * @instance
     * @property {MapBoxZoomEvent} data
     */
    | 'boxzoomcancel'

    /**
     * 在地图调整大小后立即触发.
     *
     * @event resize
     * @memberof Map
     * @instance
     */
    | 'resize'

    /**
     * 当检测到没有WebGL的上下文环境的时候会触发。
     *
     * @event webglcontextlost
     * @memberof Map
     * @instance
     */
    | 'webglcontextlost'

    /**
     * 在WebGL上下文环境恢复时触发
     *
     * @event webglcontextrestored
     * @memberof Map
     * @instance
     */
    | 'webglcontextrestored'

    /**
     * 当必要资源被完全加载后地图被完整的渲染成可视状态后立即触发该事件。
     *
     * @event load
     * @memberof Map
     * @instance
     * @type {Object}
     * @see [使用GeoJson数据绘制点](https://www.mapbox.com/mapbox-gl-js/example/geojson-markers/)
     * @see [动态添加实时数据](https://www.mapbox.com/mapbox-gl-js/example/live-geojson/)
     * @see [运动的点](https://www.mapbox.com/mapbox-gl-js/example/animate-point-along-line/)
     */
    | 'load'

    /**
     * 当地图被绘制到屏幕时触发，像下面这些情况：
     *
     * - 更改地图的位置，缩放，俯仰或方位
     * - 改变地图的风格
     * - 对GeoJSON source的更改
     * - 加载矢量图块，GeoJSON文件，字形或sprite
     *
     * @event render
     * @memberof Map
     * @instance
     */
    | 'render'

    /**
     * 在使用{@link Map.event:remove}删除映射后立即触发.
     *
     * @event remove
     * @memberof Map
     * @instance
     */
    | 'remove'

    /**
     * 发生错误时触发。这是GL JS的主要错误报告机制。我们使用事件的方式而通过`throw`来抛出错误，
     * 这样可以更好地适应异步操作。如果没有绑定到错误事件的侦听器，错误信息将打印到控制台。
     *
     * @event error
     * @memberof Map
     * @instance
     * @property {{error: {message: string}}} data
     */
    | 'error'

    /**
     * 任何地图数据加载或更改时触发。有关更多信息，请参见{@link MapDataEvent}
     *
     * @event data
     * @memberof Map
     * @instance
     * @property {MapDataEvent} data
     */
    | 'data'

    /**
     * 在地图的样式加载或更改时触发。有关更多信息，请参见{@link MapDataEvent}来获取更多信息。
     *
     * @event styledata
     * @memberof Map
     * @instance
     * @property {MapDataEvent} data
     */
    | 'styledata'

    /**
     * 在地图的某个源加载或更改时触发，包括属于某个源的切片是否加载或更改。有关更多信息，
     * 请参见{@link MapDataEvent}。
     *
     * @event sourcedata
     * @memberof Map
     * @instance
     * @property {MapDataEvent} data
     */
    | 'sourcedata'

    /**
     * 当任何地图数据（样式，源，磁贴等）开始异步加载或更改时触发。所有dataloading事件后触发的
     * `data`或`error`事件发生时会触发。有关更多信息，请参照 {@link MapDataEvent} 。
     *
     * @event dataloading
     * @memberof Map
     * @instance
     * @property {MapDataEvent} data
     */
    | 'dataloading'

    /**
     * 当任何地图样式开始加载或异步更改时触发。所有styledataloading事件后触发的
     * `styledata`或`error`事件发生时会触发。有关更多信息，请参照 {@link MapDataEvent} 。
     *
     * @event styledataloading
     * @memberof Map
     * @instance
     * @property {MapDataEvent} data
     */
    | 'styledataloading'

    /**
     * 当地图的某个source开始加载或异步更改时触发。所有sourcedataloading事件触发后
     * `sourcedata`或`error`事件发生时会触发。有关更多信息，请参照 {@link MapDataEvent} 。
     *
     *
     * @event sourcedataloading
     * @memberof Map
     * @instance
     * @property {MapDataEvent} data
     */
    | 'sourcedataloading'

    /**
     * @event style.load
     * @memberof Map
     * @instance
     * @private
     */
    | 'style.load';
