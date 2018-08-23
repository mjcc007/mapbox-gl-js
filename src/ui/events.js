// @flow

import { Event } from '../util/evented';

import DOM from '../util/dom';
import Point from '@mapbox/point-geometry';
import { extend } from '../util/util';

import type Map from './map';
import type LngLat from '../geo/lng_lat';
import type LngLatBounds from '../geo/lng_lat_bounds';

/**
 * `MapMouseEvent`是与鼠标相关的地图事件的事件类型。
 * @extends {Object}
 */
export class MapMouseEvent extends Event {
    /**
     * 事件类型。
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
     * 触发事件的`Map`对象。
     */
    target: Map;

    /**
     * 引起地图事件的 DOM 事件。
     */
    originalEvent: MouseEvent;

    /**
     * 鼠标事件的目标像素坐标，相对于地图而言，从左上角开始测量。
     */
    point: Point;

    /**
     * 地图上鼠标事件的目标地理位置。
     */
    lngLat: LngLat;

    /**
     * 防止地图对事件的后续默认处理。
     *
     * 调用此方法将防止以下默认的地图行为：
     *
     *   * 在`mousedown`事件中，{@link DragPanHandler}的行为
     *   * 在`mousedown`事件中，{@link DragRotateHandler}的行为
     *   * 在`mousedown`事件中，{@link BoxZoomHandler}的行为
     *   * 在`dblclick`事件中，{@link DoubleClickZoomHandler}的行为
     *
     */
    preventDefault() {
        this._defaultPrevented = true;
    }

    /**
     * 如果调用了`preventDefault`事件，则返回`true`。
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
 * `MapTouchEvent`是与触摸相关的地图事件的事件类型。
 * @extends {Object}
 */
export class MapTouchEvent extends Event {
    /**
     * 事件类型。
     */
    type: 'touchstart'
        | 'touchend'
        | 'touchcancel';

    /**
     * 触发事件的`Map`对象。
     */
    target: Map;

    /**
     * 引起地图事件的 DOM 事件。
     */
    originalEvent: TouchEvent;

    /**
     * 地图上触摸事件点中心的地理位置。
     */
    lngLat: LngLat;

    /**
     * 触摸事件点中心的像素坐标，相对于地图而言，从左上角开始测量。
     */
    point: Point;

    /**
     * 对应
     * [touch event's `touches`](https://developer.mozilla.org/en-US/docs/Web/API/TouchEvent/touches) 
     * 属性的像素坐标数组。
     */
    points: Array<Point>;

    /**
     * 地图上对应
     * [touch event's `touches`](https://developer.mozilla.org/en-US/docs/Web/API/TouchEvent/touches)
     * 属性的地理位置。
     */
    lngLats: Array<LngLat>;

    /**
     * 防止地图对事件的后续默认处理。
     *
     * 调用此方法将防止以下默认的地图行为：
     *
     *   * 在`touchstart`事件中，{@link DragPanHandler}的行为 
     *   * 在`touchstart`事件中，{@link TouchZoomRotateHandler}的行为
     *
     */
    preventDefault() {
        this._defaultPrevented = true;
    }

    /**
     * 如果调用了`preventDefault`事件，则返回`true`。
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
 * `MapWheelEvent`是`wheel`地图事件的事件类型。
 * @extends {Object}
 */
export class MapWheelEvent extends Event {
    /**
     * 事件类型。
     */
    type: 'wheel';

    /**
     * 触发事件的`Map`对象。
     */
    target: Map;

    /**
     * 引起地图事件的 DOM 事件。
     */
    originalEvent: WheelEvent;

    /**
     * 防止地图对事件的后续默认处理。
     *
     * 调用此方法将防止{@link ScrollZoomHandler}的行为。
     */
    preventDefault() {
        this._defaultPrevented = true;
    }

    /**
     * 如果调用了`preventDefault`事件，则返回`true`。
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
 * @property {LngLatBounds} boxZoomBounds “box zoom”交互的边界框。
 *   该属性仅为 `boxzoomend` 事件提供。
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
 * `MapDataEvent`对象同 {@link Map.event:data}
 * 和 {@link Map.event:dataloading} 事件一起触发。
 * `dataType` 可能的值包括：
 *
 * - `'source'`: 与任意数据源相关的非切片数据
 * - `'style'`: 地图使用的样式[style](https://www.mapbox.com/mapbox-gl-style-spec/)
 *
 * @typedef {Object} MapDataEvent
 * @property {string} type 事件类型。
 * @property {string} dataType 已改变的数据类型。 `'source'`， `'style'`之一。
 * @property {boolean} [isSourceLoaded] 如果事件具有 `source` 的 `dataType`，并且数据源没有未完成的网络请求时，则该属性为 true。
 * @property {Object} [source] 如果事件具有 `source` 的 `dataType` ，[代表数据源的样式规范style spec representation of the source](https://www.mapbox.com/mapbox-gl-style-spec/#sources)。
 * @property {string} [sourceDataType] 如果事件具有 `source` 的 `dataType` ，并且事件表明内部数据已被接收或改变时，
 * 该属性将被包含在内。可能的值有 `metadata` 和 `content`。
 * @property {Object} [tile] 如果事件具有 `source` 的 `dataType` ，
 * 并且事件与加载切片相关时，是指正在加载或改变的切片。
 * @property {Coordinate} [coord] 如果事件具有 `source` 的 `dataType` ，
 * 并且事件与加载切片相关时，是指切片的坐标。
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
     * Fired when a pointing device (usually a mouse) is pressed within the map.
     *
     * @event mousedown
     * @memberof Map
     * @instance
     * @property {MapMouseEvent} data
     * @see [Highlight features within a bounding box](https://www.mapbox.com/mapbox-gl-js/example/using-box-queryrenderedfeatures/)
     * @see [Create a draggable point](https://www.mapbox.com/mapbox-gl-js/example/drag-a-point/)
     */
    | 'mousedown'

    /**
     * Fired when a pointing device (usually a mouse) is released within the map.
     *
     * @event mouseup
     * @memberof Map
     * @instance
     * @property {MapMouseEvent} data
     * @see [Highlight features within a bounding box](https://www.mapbox.com/mapbox-gl-js/example/using-box-queryrenderedfeatures/)
     * @see [Create a draggable point](https://www.mapbox.com/mapbox-gl-js/example/drag-a-point/)
     */
    | 'mouseup'

    /**
     * Fired when a pointing device (usually a mouse) is moved within the map.
     *
     * @event mouseover
     * @memberof Map
     * @instance
     * @property {MapMouseEvent} data
     * @see [Get coordinates of the mouse pointer](https://www.mapbox.com/mapbox-gl-js/example/mouse-position/)
     * @see [Highlight features under the mouse pointer](https://www.mapbox.com/mapbox-gl-js/example/hover-styles/)
     * @see [Display a popup on hover](https://www.mapbox.com/mapbox-gl-js/example/popup-on-hover/)
     */
    | 'mouseover'

    /**
     * Fired when a pointing device (usually a mouse) is moved within the map.
     *
     * @event mousemove
     * @memberof Map
     * @instance
     * @property {MapMouseEvent} data
     * @see [Get coordinates of the mouse pointer](https://www.mapbox.com/mapbox-gl-js/example/mouse-position/)
     * @see [Highlight features under the mouse pointer](https://www.mapbox.com/mapbox-gl-js/example/hover-styles/)
     * @see [Display a popup on over](https://www.mapbox.com/mapbox-gl-js/example/popup-on-hover/)
     */
    | 'mousemove'

    /**
     * Fired when a pointing device (usually a mouse) is pressed and released at the same point on the map.
     *
     * @event click
     * @memberof Map
     * @instance
     * @property {MapMouseEvent} data
     * @see [Measure distances](https://www.mapbox.com/mapbox-gl-js/example/measure/)
     * @see [Center the map on a clicked symbol](https://www.mapbox.com/mapbox-gl-js/example/center-on-symbol/)
     */
    | 'click'

    /**
     * Fired when a pointing device (usually a mouse) is clicked twice at the same point on the map.
     *
     * @event dblclick
     * @memberof Map
     * @instance
     * @property {MapMouseEvent} data
     */
    | 'dblclick'

    /**
     * Fired when a pointing device (usually a mouse) enters a visible portion of a specified layer from
     * outside that layer or outside the map canvas. This event can only be listened for via the three-argument
     * version of {@link Map#on}, where the second argument specifies the desired layer.
     *
     * @event mouseenter
     * @memberof Map
     * @instance
     * @property {MapMouseEvent} data
     */
    | 'mouseenter'

    /**
     * Fired when a pointing device (usually a mouse) leaves a visible portion of a specified layer, or leaves
     * the map canvas. This event can only be listened for via the three-argument version of {@link Map#on},
     * where the second argument specifies the desired layer.
     *
     * @event mouseleave
     * @memberof Map
     * @instance
     * @property {MapMouseEvent} data
     * @see [Highlight features under the mouse pointer](https://www.mapbox.com/mapbox-gl-js/example/hover-styles/)
     */
    | 'mouseleave'

    /**
     * Synonym for `mouseenter`.
     *
     * @event mouseover
     * @memberof Map
     * @instance
     * @property {MapMouseEvent} data
     */
    | 'mouseover'

    /**
     * Fired when a point device (usually a mouse) leaves the map's canvas.
     *
     * @event mouseout
     * @memberof Map
     * @instance
     * @property {MapMouseEvent} data
     */
    | 'mouseout'

    /**
     * Fired when the right button of the mouse is clicked or the context menu key is pressed within the map.
     *
     * @event contextmenu
     * @memberof Map
     * @instance
     * @property {MapMouseEvent} data
     */
    | 'contextmenu'

    /**
     * Fired when a [`wheel`](https://developer.mozilla.org/en-US/docs/Web/Events/wheel) event occurs within the map.
     *
     * @event wheel
     * @memberof Map
     * @instance
     * @property {MapWheelEvent} data
     */
    | 'wheel'

    /**
     * Fired when a [`touchstart`](https://developer.mozilla.org/en-US/docs/Web/Events/touchstart) event occurs within the map.
     *
     * @event touchstart
     * @memberof Map
     * @instance
     * @property {MapTouchEvent} data
     */
    | 'touchstart'

    /**
     * Fired when a [`touchend`](https://developer.mozilla.org/en-US/docs/Web/Events/touchend) event occurs within the map.
     *
     * @event touchend
     * @memberof Map
     * @instance
     * @property {MapTouchEvent} data
     */
    | 'touchend'

    /**
     * Fired when a [`touchmove`](https://developer.mozilla.org/en-US/docs/Web/Events/touchmove) event occurs within the map.
     *
     * @event touchmove
     * @memberof Map
     * @instance
     * @property {MapTouchEvent} data
     */
    | 'touchmove'

    /**
     * Fired when a [`touchcancel`](https://developer.mozilla.org/en-US/docs/Web/Events/touchcancel) event occurs within the map.
     *
     * @event touchcancel
     * @memberof Map
     * @instance
     * @property {MapTouchEvent} data
     */
    | 'touchcancel'

    /**
     * Fired just before the map begins a transition from one
     * view to another, as the result of either user interaction or methods such as {@link Map#jumpTo}.
     *
     * @event movestart
     * @memberof Map
     * @instance
     * @property {{originalEvent: DragEvent}} data
     */
    | 'movestart'

    /**
     * Fired repeatedly during an animated transition from one view to
     * another, as the result of either user interaction or methods such as {@link Map#flyTo}.
     *
     * @event move
     * @memberof Map
     * @instance
     * @property {MapMouseEvent | MapTouchEvent} data
     */
    | 'move'

    /**
     * Fired just after the map completes a transition from one
     * view to another, as the result of either user interaction or methods such as {@link Map#jumpTo}.
     *
     * @event moveend
     * @memberof Map
     * @instance
     * @property {{originalEvent: DragEvent}} data
     * @see [Play map locations as a slideshow](https://www.mapbox.com/mapbox-gl-js/example/playback-locations/)
     * @see [Filter features within map view](https://www.mapbox.com/mapbox-gl-js/example/filter-features-within-map-view/)
     */
    | 'moveend'

    /**
     * Fired when a "drag to pan" interaction starts. See {@link DragPanHandler}.
     *
     * @event dragstart
     * @memberof Map
     * @instance
     * @property {{originalEvent: DragEvent}} data
     */
    | 'dragstart'

    /**
     * Fired repeatedly during a "drag to pan" interaction. See {@link DragPanHandler}.
     *
     * @event drag
     * @memberof Map
     * @instance
     * @property {MapMouseEvent | MapTouchEvent} data
     */
    | 'drag'

    /**
     * Fired when a "drag to pan" interaction ends. See {@link DragPanHandler}.
     *
     * @event dragend
     * @memberof Map
     * @instance
     * @property {{originalEvent: DragEvent}} data
     */
    | 'dragend'

    /**
     * Fired just before the map begins a transition from one zoom level to another,
     * as the result of either user interaction or methods such as {@link Map#flyTo}.
     *
     * @event zoomstart
     * @memberof Map
     * @instance
     * @property {MapMouseEvent | MapTouchEvent} data
     */
    | 'zoomstart'

    /**
     * Fired repeatedly during an animated transition from one zoom level to another,
     * as the result of either user interaction or methods such as {@link Map#flyTo}.
     *
     * @event zoom
     * @memberof Map
     * @instance
     * @property {MapMouseEvent | MapTouchEvent} data
     * @see [Update a choropleth layer by zoom level](https://www.mapbox.com/mapbox-gl-js/example/updating-choropleth/)
     */
    | 'zoom'

    /**
     * Fired just after the map completes a transition from one zoom level to another,
     * as the result of either user interaction or methods such as {@link Map#flyTo}.
     *
     * @event zoomend
     * @memberof Map
     * @instance
     * @property {MapMouseEvent | MapTouchEvent} data
     */
    | 'zoomend'

    /**
     * Fired when a "drag to rotate" interaction starts. See {@link DragRotateHandler}.
     *
     * @event rotatestart
     * @memberof Map
     * @instance
     * @property {MapMouseEvent | MapTouchEvent} data
     */
    | 'rotatestart'

    /**
     * Fired repeatedly during a "drag to rotate" interaction. See {@link DragRotateHandler}.
     *
     * @event rotate
     * @memberof Map
     * @instance
     * @property {MapMouseEvent | MapTouchEvent} data
     */
    | 'rotate'

    /**
     * Fired when a "drag to rotate" interaction ends. See {@link DragRotateHandler}.
     *
     * @event rotateend
     * @memberof Map
     * @instance
     * @property {MapMouseEvent | MapTouchEvent} data
     */
    | 'rotateend'

    /**
     * Fired whenever the map's pitch (tilt) begins a change as
     * the result of either user interaction or methods such as {@link Map#flyTo} .
     *
     * @event pitchstart
     * @memberof Map
     * @instance
     * @property {MapEventData} data
     */
    | 'pitchstart'

    /**
     * Fired whenever the map's pitch (tilt) changes as.
     * the result of either user interaction or methods such as {@link Map#flyTo}.
     *
     * @event pitch
     * @memberof Map
     * @instance
     * @property {MapEventData} data
     */
    | 'pitch'

    /**
     * Fired immediately after the map's pitch (tilt) finishes changing as
     * the result of either user interaction or methods such as {@link Map#flyTo}.
     *
     * @event pitchend
     * @memberof Map
     * @instance
     * @property {MapEventData} data
     */
    | 'pitchend'

    /**
     * Fired when a "box zoom" interaction starts. See {@link BoxZoomHandler}.
     *
     * @event boxzoomstart
     * @memberof Map
     * @instance
     * @property {MapBoxZoomEvent} data
     */
    | 'boxzoomstart'

    /**
     * Fired when a "box zoom" interaction ends.  See {@link BoxZoomHandler}.
     *
     * @event boxzoomend
     * @memberof Map
     * @instance
     * @type {Object}
     * @property {MapBoxZoomEvent} data
     */
    | 'boxzoomend'

    /**
     * Fired when the user cancels a "box zoom" interaction, or when the bounding box does not meet the minimum size threshold.
     * See {@link BoxZoomHandler}.
     *
     * @event boxzoomcancel
     * @memberof Map
     * @instance
     * @property {MapBoxZoomEvent} data
     */
    | 'boxzoomcancel'

    /**
     * Fired immediately after the map has been resized.
     *
     * @event resize
     * @memberof Map
     * @instance
     */
    | 'resize'

    /**
     * Fired when the WebGL context is lost.
     *
     * @event webglcontextlost
     * @memberof Map
     * @instance
     */
    | 'webglcontextlost'

    /**
     * Fired when the WebGL context is restored.
     *
     * @event webglcontextrestored
     * @memberof Map
     * @instance
     */
    | 'webglcontextrestored'

    /**
     * Fired immediately after all necessary resources have been downloaded
     * and the first visually complete rendering of the map has occurred.
     *
     * @event load
     * @memberof Map
     * @instance
     * @type {Object}
     * @see [Draw GeoJSON points](https://www.mapbox.com/mapbox-gl-js/example/geojson-markers/)
     * @see [Add live realtime data](https://www.mapbox.com/mapbox-gl-js/example/live-geojson/)
     * @see [Animate a point](https://www.mapbox.com/mapbox-gl-js/example/animate-point-along-line/)
     */
    | 'load'

    /**
     * Fired whenever the map is drawn to the screen, as the result of
     *
     * - a change to the map's position, zoom, pitch, or bearing
     * - a change to the map's style
     * - a change to a GeoJSON source
     * - the loading of a vector tile, GeoJSON file, glyph, or sprite
     *
     * @event render
     * @memberof Map
     * @instance
     */
    | 'render'

    /**
     * Fired immediately after the map has been removed with {@link Map.event:remove}.
     *
     * @event remove
     * @memberof Map
     * @instance
     */
    | 'remove'

    /**
     * Fired when an error occurs. This is GL JS's primary error reporting
     * mechanism. We use an event instead of `throw` to better accommodate
     * asyncronous operations. If no listeners are bound to the `error` event, the
     * error will be printed to the console.
     *
     * @event error
     * @memberof Map
     * @instance
     * @property {{error: {message: string}}} data
     */
    | 'error'

    /**
     * Fired when any map data loads or changes. See {@link MapDataEvent}
     * for more information.
     *
     * @event data
     * @memberof Map
     * @instance
     * @property {MapDataEvent} data
     */
    | 'data'

    /**
     * Fired when the map's style loads or changes. See
     * {@link MapDataEvent} for more information.
     *
     * @event styledata
     * @memberof Map
     * @instance
     * @property {MapDataEvent} data
     */
    | 'styledata'

    /**
     * Fired when one of the map's sources loads or changes, including if a tile belonging
     * to a source loads or changes. See {@link MapDataEvent} for more information.
     *
     * @event sourcedata
     * @memberof Map
     * @instance
     * @property {MapDataEvent} data
     */
    | 'sourcedata'

    /**
     * Fired when any map data (style, source, tile, etc) begins loading or
     * changing asyncronously. All `dataloading` events are followed by a `data`
     * or `error` event. See {@link MapDataEvent} for more information.
     *
     * @event dataloading
     * @memberof Map
     * @instance
     * @property {MapDataEvent} data
     */
    | 'dataloading'

    /**
     * Fired when the map's style begins loading or changing asyncronously.
     * All `styledataloading` events are followed by a `styledata`
     * or `error` event. See {@link MapDataEvent} for more information.
     *
     * @event styledataloading
     * @memberof Map
     * @instance
     * @property {MapDataEvent} data
     */
    | 'styledataloading'

    /**
     * Fired when one of the map's sources begins loading or changing asyncronously.
     * All `sourcedataloading` events are followed by a `sourcedata` or `error` event.
     * See {@link MapDataEvent} for more information.
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
