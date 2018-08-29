// @flow

import {
    bindAll,
    extend,
    deepEqual,
    warnOnce,
    clamp,
    wrap,
    ease as defaultEasing
} from '../util/util';
import { number as interpolate } from '../style-spec/util/interpolate';
import browser from '../util/browser';
import LngLat from '../geo/lng_lat';
import LngLatBounds from '../geo/lng_lat_bounds';
import Point from '@mapbox/point-geometry';
import { Event, Evented } from '../util/evented';

import type Transform from '../geo/transform';
import type {LngLatLike} from '../geo/lng_lat';
import type {LngLatBoundsLike} from '../geo/lng_lat_bounds';
import type {TaskID} from '../util/task_queue';
import type {PointLike} from '@mapbox/point-geometry';

/**
 * 照相机的常用选项，用于 {@link Map#jumpTo}, {@link Map#easeTo}, 和 {@link Map#flyTo} 。
 * 控制摄像机的期望位置、变焦、方位和俯仰角。
 * 属性都是可选的。 当省略某个属性时，该属性的当前相机设置会保持不变。
 *
 * @typedef {Object} CameraOptions
 * @property {LngLatLike} center 设置的中心点
 * @property {number} zoom 设置的变焦级别
 * @property {number} bearing 设置的方位，单位是角度。指针方位是朝上的指南针方向。
 * 例如，指向 90° 方位，表明地图上方是东部。
 * @property {number} pitch 设置的俯仰角。单位是角度。
 * @property {LngLatLike} around 设置了变焦级别，则 `around` 决定了焦点的周围点。
 */
export type CameraOptions = {
    center?: LngLatLike,
    zoom?: number,
    bearing?: number,
    pitch?: number,
    around?: LngLatLike
};

/**
 *  地图移动方法的常用选项， {@link Map#panBy} 、{@link Map#easeTo} 等方法有用到，控制动画的持续时间、动画的缓动函数。
 * 属性都是可选的。
 *
 * @typedef {Object} AnimationOptions
 * @property {number} duration 动画的持续时间，单位是毫秒
 * @property {Function} easing 缓动函数。函数的参数是时间值，值在0到1之间。
 * 返回一个数字，其中0是初始状态，1是最终状态。
 * @property {PointLike} offset 动画结束时，目标中心点相对实际地图容器中心点的偏移量
 * @property {boolean} animate 如果设置否，就不会出现动画。
 */
export type AnimationOptions = {
    duration?: number,
    easing?: (number) => number,
    offset?: PointLike,
    animate?: boolean
};

/**
 * 设置内边距的选项，调用 {@link Map#fitBounds} 用到。
 * 该对象的属性都必须是非负整数。
 *
 * @typedef {Object} PaddingOptions
 * @property {number} top 地图画布的上内边距，单位是像素
 * @property {number} bottom 地图画布的下内边距，单位是像素
 * @property {number} left 地图画布的左内边距，单位是像素
 * @property {number} right 地图画布的右内边距，单位是像素
 */

class Camera extends Evented {
    transform: Transform;
    _moving: boolean;
    _zooming: boolean;
    _rotating: boolean;
    _pitching: boolean;

    _bearingSnap: number;
    _easeEndTimeoutID: TimeoutID;
    _easeStart: number;
    _easeOptions: {duration: number, easing: (number) => number};

    _onEaseFrame: (number) => void;
    _onEaseEnd: () => void;
    _easeFrameId: ?TaskID;

    +_requestRenderFrame: (() => void) => TaskID;
    +_cancelRenderFrame: (TaskID) => void;

    constructor(transform: Transform, options: {bearingSnap: number}) {
        super();
        this._moving = false;
        this._zooming = false;
        this.transform = transform;
        this._bearingSnap = options.bearingSnap;

        bindAll(['_renderFrameCallback'], this);
    }
    /**
     * 返回地图的地理中心点。
     *
     * @memberof Map#
     * @returns 地图的地理中心点。
     */
    getCenter(): LngLat { return this.transform.center; }

    /**
     * 设置地图的地理中心点。相当于`jumpTo（{center：center}）`。
     *
     * @memberof Map＃
     * @param center 要设置的中心点。
     * @param eventData 要添加到此方法触发的事件的事件对象的其他属性。
     * @fires movestart
     * @fires moveend
     * @returns {Map}`this`
     * @example
     * map.setCenter（[ -  74,38]）;
     */
    setCenter(center: LngLatLike, eventData?: Object) {
        return this.jumpTo({center: center}, eventData);
    }

    /**
     * 按照指定的地图平移地图。
     *
     * @memberof Map＃
     * @param offset `x`和`y`坐标用于平移地图。
     * @param options
     * @param eventData 要添加到此方法触发的事件的事件对象的其他属性。
     * @fires movestart
     * @fires moveend
     * @returns {Map}`this`
     * @see [Navigate the map with game-like controls]（https://www.mapbox.com/mapbox-gl-js/example/game-controls/）
     */
    panBy(offset: PointLike, options?: AnimationOptions, eventData?: Object) {
        offset = Point.convert(offset).mult(-1);
        return this.panTo(this.transform.center, extend({offset}, options), eventData);
    }

    /**
     * 使用动画过渡将地图平移到指定位置。
     *
     * @memberof Map＃
     * @param lnglat 将地图平移到的位置。
     * @param选项
     * @param eventData 要添加到此方法触发的事件的事件对象的其他属性。
     * @fires movestart
     * @fires moveend
     * @returns {Map}`this`
     */
    panTo(lnglat: LngLatLike, options?: AnimationOptions, eventData?: Object) {
        return this.easeTo(extend({
            center: lnglat
        }, options), eventData);
    }
    /**
     * 返回地图当前的缩放等级。
     *
     * @memberof Map#
     * @returns 地图目前的缩放等级。
     */
    getZoom(): number { return this.transform.zoom; }

    /**
     * 设置地图的缩放等级。相当于`jumpTo({zoom: zoom})`。
     *
     * @memberof Map#
     * @param zoom (0-20)的缩放等级.
     * @param eventData 要添加到此方法触发的事件的事件对象的其他属性。
     * @fires movestart
     * @fires zoomstart
     * @fires move
     * @fires zoom
     * @fires moveend
     * @fires zoomend
     * @returns {Map} `this`
     * @example
     * // 缩放地图到等级
     * map.setZoom(5);
     */
    setZoom(zoom: number, eventData?: Object) {
        this.jumpTo({zoom: zoom}, eventData);
        return this;
    }
     /**
     * 使用动画过渡将地图缩放到指定的缩放级别。
     *
     * @memberof Map#
     * @param zoom 要转换到的缩放级别。
     * @param options
     * @param eventData 要添加到此方法触发的事件的事件对象的其他属性。
     * @fires movestart
     * @fires zoomstart
     * @fires move
     * @fires zoom
     * @fires moveend
     * @fires zoomend
     * @returns {Map} `this`
     */
    zoomTo(zoom: number, options: ? AnimationOptions, eventData?: Object) {
        return this.easeTo(extend({
            zoom: zoom
        }, options), eventData);
    }

    /**
     * 增加一个等级的地图缩放程度
     *
     * @memberof Map#
     * @param options
     * @param eventData 要添加到此方法触发的事件的事件对象的其他属性。
     * @fires movestart
     * @fires zoomstart
     * @fires move
     * @fires zoom
     * @fires moveend
     * @fires zoomend
     * @returns {Map} `this`
     */
    zoomIn(options?: AnimationOptions, eventData?: Object) {
        this.zoomTo(this.getZoom() + 1, options, eventData);
        return this;
    }

    /**
     * 减少地图的一个缩放等级。
     *
     * @memberof Map#
     * @param options
     * @param eventData 要添加到此方法触发的事件的事件对象的其他属性。
     * @fires movestart
     * @fires zoomstart
     * @fires move
     * @fires zoom
     * @fires moveend
     * @fires zoomend
     * @returns {Map} `this`
     */
    zoomOut(options?: AnimationOptions, eventData?: Object) {
        this.zoomTo(this.getZoom() - 1, options, eventData);
        return this;
    }

    /**
     *返回地图的当前方位。轴承是罗盘方向“向上”；例如，一个轴向90°定位地图以使东向上。
     *
     * @memberof Map＃
     * @returns 地图的当前方位。
     * @see [Navigate the map with game-like controls]（https://www.mapbox.com/mapbox-gl-js/example/game-controls/）
     */
    getBearing(): number { return this.transform.bearing; }

    /**
     * 设置地图的方位（旋转）。轴承是罗盘方向“向上”；例如，一个轴向90°定位地图以使东向上。
     *
     * 相当于`jumpTo（{bearing：bearing}）`。
     *
     * @memberof Map＃
     * @param bearing 所需的方位。
     * @param eventData 要添加到此方法触发的事件的事件对象的其他属性。
     * @fires movestart
     * @fires moveend
     * @returns {Map}`this`
     * @example
     * //将地图旋转到90度
     * map.setBearing（90）;
     */
    setBearing(bearing: number, eventData?: Object) {
        this.jumpTo({bearing: bearing}, eventData);
        return this;
    }

    /**
     * 使用动画过渡将地图旋转到指定的方位。方位是罗盘方向即“向上”；例如，90°的方位使地图定向，以便东向上。
     *
     * @memberof Map＃
     * @param bearing 所需的轴向角。
     * @param options
     * @param eventData 要添加到此方法触发的事件的事件对象的其他属性。
     * @fires movestart
     * @fires moveend
     * @returns {Map}`this`
     */
    rotateTo(bearing: number, options?: AnimationOptions, eventData?: Object) {
        return this.easeTo(extend({
            bearing: bearing
        }, options), eventData);
    }

    /**
     * 旋转地图以使北向上（0°方位），并带有动画过渡。
     *
     * @memberof Map＃
     * @param options
     * @param eventData 要添加到此方法触发的事件的事件对象的其他属性。
     * @fires movestart
     * @fires moveend
     * @returns {Map}`this`
     */
    resetNorth(options?: AnimationOptions, eventData?: Object) {
        this.rotateTo(0, extend({duration: 1000}, options), eventData);
        return this;
    }

    /**     
     * 如果当前方位足够接近（在bearingSnap` 的阈值），则将地图捕捉到北向上（0°方位）
     *
     * @memberof Map＃
     * @param options
     * @param eventData 要添加到此方法触发的事件的事件对象的其他属性。
     * @fires movestart
     * @fires moveend
     * @returns {Map}`this`
     */
    snapToNorth(options?: AnimationOptions, eventData?: Object) {
        if (Math.abs(this.getBearing()) < this._bearingSnap) {
            return this.resetNorth(options, eventData);
        }
        return this;
    }

    /**
     * 返回地图当前的轴向角（倾斜度）。
     *
     * @memberof Map#
     * @returns 地图的当前轴向角，以度数为单位，远离屏幕表面。
     */
    getPitch(): number { return this.transform.pitch; }

    /**
     * 设置地图的轴向角（倾斜度）。相当于`jumpTo（{pitch：pitch}）`。
     *
     * @memberof Map＃
     * @param pitch 要设置的轴向角，以度数为单位，远离屏幕平面（0-60）。
     * @param eventData 要添加到此方法触发的事件的事件对象的其他属性。
     * @fires pitchstart
     * @fires movestart
     * @fires moveend
     * @returns {Map}`this`
     */
    setPitch(pitch: number, eventData?: Object) {
        this.jumpTo({pitch: pitch}, eventData);
        return this;
    }

    /**
     * @memberof Map#
     * @param bounds 在视口中计算这些边界的中心并使用最高缩放级别，包括视口中适合的`Map#getMaxZoom()`。
     * @param options
     * @param {number | PaddingOptions} [options.padding] 要添加到给定边界的填充量（以像素为单位）。
     * @param {PointLike} [options.offset=[0, 0]] 相对于地图中心的给定边界的中心，以像素为单位。
     * @param {number} [options.maxZoom] 当摄像机转换到指定范围时允许的最大缩放级别。
     * @returns {CameraOptions | void} 如果地图能够适合提供的边界，则返回带有`center`，`zoom`，`bearing`，`offset`，`padding`和`maxZoom`的`CameraOptions`，以及任何其他
     *    参数中提供的`options`。如果地图无法拟合，则方法将发出警告并返回未定义
     * @example
     * var bbox = [[-79, 43], [-73, 45]];
     * var newCameraTransform = map.cameraForBounds(bbox, {
     *   padding: {top: 10, bottom:25, left: 15, right: 5}
     * });
     */
    cameraForBounds(bounds: LngLatBoundsLike, options?: CameraOptions): void | CameraOptions & AnimationOptions {
        options = extend({
            padding: {
                top: 0,
                bottom: 0,
                right: 0,
                left: 0
            },
            offset: [0, 0],
            maxZoom: this.transform.maxZoom
        }, options);

        if (typeof options.padding === 'number') {
            const p = options.padding;
            options.padding = {
                top: p,
                bottom: p,
                right: p,
                left: p
            };
        }
        if (!deepEqual(Object.keys(options.padding).sort((a, b) => {
            if (a < b) return -1;
            if (a > b) return 1;
            return 0;
        }), ["bottom", "left", "right", "top"])) {
            warnOnce(
                "options.padding must be a positive number, or an Object with keys 'bottom', 'left', 'right', 'top'"
            );
            return;
        }

        bounds = LngLatBounds.convert(bounds);
        
        // 我们将传递的填充选项分成两部分，即不影响地图中心的部分
        //（横向和垂直填充），以及执行的部分（paddingOffset）。我们添加填充偏移量
        // 选择`offset`对象，它可以在后续调用中改变地图的中心
        // `easeTo`和`flyTo`。
        const paddingOffset = [(options.padding.left - options.padding.right) / 2, (options.padding.top - options.padding.bottom) / 2],
            lateralPadding = Math.min(options.padding.right, options.padding.left),
            verticalPadding = Math.min(options.padding.top, options.padding.bottom);
        options.offset = [options.offset[0] + paddingOffset[0], options.offset[1] + paddingOffset[1]];

        const offset = Point.convert(options.offset),
            tr = this.transform,
            nw = tr.project(bounds.getNorthWest()),
            se = tr.project(bounds.getSouthEast()),
            size = se.sub(nw),
            scaleX = (tr.width - lateralPadding * 2 - Math.abs(offset.x) * 2) / size.x,
            scaleY = (tr.height - verticalPadding * 2 - Math.abs(offset.y) * 2) / size.y;

        if (scaleY < 0 || scaleX < 0) {
            warnOnce(
                'Map cannot fit within canvas with the given bounds, padding, and/or offset.'
            );
            return;
        }

        options.center = tr.unproject(nw.add(se).div(2));
        options.zoom = Math.min(tr.scaleZoom(tr.scale * Math.min(scaleX, scaleY)), options.maxZoom);
        options.bearing = 0;

        return options;
    }

    /**
     * 平移和缩放地图以包含指定地理范围内的可见区域。
     * 如果轴向角非零，此功能还会将地图的方位重置为0。
     *
     * @memberof Map#
     * @param bounds 将这些边界居中在视口中并使用最高的边界
     *   缩放级别，包括适合视口的“Map＃getMaxZoom（）”。
     * @param options
     * @param {number | PaddingOptions} [options.padding] 要添加到给定边界的填充量（以像素为单位）。
     * @param {boolean} [options.linear=false] 如果为“true”，则地图转换为
     *   {@link Map＃easeTo}。如果是`false`，则使用{@link Map＃flyTo}转换地图。
     *   这些函数和{@link AnimationOptions}提供有关可用选项的信息。
     * @param {Function} [options.easing] 动画过渡的缓动功能。请参阅{@link AnimationOptions}。
     * @param {PointLike} [options.offset=[0, 0]] 相对于地图中心的给定边界的中心，以像素为单位。
     * @param {number} [options.maxZoom] 地图视图转换为指定边界时允许的最大缩放级别。
     * @param eventData 要添加到此方法触发的事件的事件对象的其他属性。
     * @fires movestart
     * @fires moveend
     * @returns {Map} `this`
	 * @example
     * var bbox = [[-79, 43], [-73, 45]];
     * map.fitBounds(bbox, {
     *   padding: {top: 10, bottom:25, left: 15, right: 5}
     * });
     * @see [Fit a map to a bounding box](https://www.mapbox.com/mapbox-gl-js/example/fitbounds/)
     */
    fitBounds(bounds: LngLatBoundsLike, options?: AnimationOptions & CameraOptions, eventData?: Object) {
        const calculatedOptions = this.cameraForBounds(bounds, options);

        // cameraForBounds warns + returns undefined if unable to fit:
        if (!calculatedOptions) return this;

        options = extend(calculatedOptions, options);

        return options.linear ?
            this.easeTo(options, eventData) :
            this.flyTo(options, eventData);
    }

    /**
     * 不改变中心，变焦，方位和轴向的任何组合
     * 动画过渡。地图将保留其当前值
     * 详细信息未在`options`中指定。
     *
     * @memberof Map#
     * @param options
     * @param eventData 要添加到此方法触发的事件的事件对象的其他属性。
     * @fires movestart
     * @fires zoomstart
     * @fires pitchstart
     * @fires rotate
     * @fires move
     * @fires zoom
     * @fires pitch
     * @fires moveend
     * @fires zoomend
     * @fires pitchend
     * @returns {Map} `this`
     */
    jumpTo(options: CameraOptions, eventData?: Object) {
        this.stop();

        const tr = this.transform;
        let zoomChanged = false,
            bearingChanged = false,
            pitchChanged = false;

        if ('zoom' in options && tr.zoom !== +options.zoom) {
            zoomChanged = true;
            tr.zoom = +options.zoom;
        }

        if (options.center !== undefined) {
            tr.center = LngLat.convert(options.center);
        }

        if ('bearing' in options && tr.bearing !== +options.bearing) {
            bearingChanged = true;
            tr.bearing = +options.bearing;
        }

        if ('pitch' in options && tr.pitch !== +options.pitch) {
            pitchChanged = true;
            tr.pitch = +options.pitch;
        }

        this.fire(new Event('movestart', eventData))
            .fire(new Event('move', eventData));

        if (zoomChanged) {
            this.fire(new Event('zoomstart', eventData))
                .fire(new Event('zoom', eventData))
                .fire(new Event('zoomend', eventData));
        }

        if (bearingChanged) {
            this.fire(new Event('rotatestart', eventData))
                .fire(new Event('rotate', eventData))
                .fire(new Event('rotateend', eventData));
        }

        if (pitchChanged) {
            this.fire(new Event('pitchstart', eventData))
                .fire(new Event('pitch', eventData))
                .fire(new Event('pitchend', eventData));
        }

        return this.fire(new Event('moveend', eventData));
    }


     /**
     * 通过动画过渡更改中心，缩放，方位和轴向的任意组合
     * 新旧数值之间。地图将保留其当前值
     * 详细信息未在`options`中指定。
     *
     * @memberof Map#
     * @param options 描述转换的目标和动画的选项。接受{@link CameraOptions}和{@link AnimationOptions}。
     * @param eventData 要添加到此方法触发的事件的事件对象的其他属性。
     * @fires movestart
     * @fires zoomstart
     * @fires pitchstart
     * @fires rotate
     * @fires move
     * @fires zoom
     * @fires pitch
     * @fires moveend
     * @fires zoomend
     * @fires pitchend
     * @returns {Map} `this`
     * @see [Navigate the map with game-like controls](https://www.mapbox.com/mapbox-gl-js/example/game-controls/)
     */
    easeTo(options: CameraOptions & AnimationOptions & {delayEndEvents?: number}, eventData?: Object) {
        this.stop();

        options = extend({
            offset: [0, 0],
            duration: 500,
            easing: defaultEasing
        }, options);

        if (options.animate === false) options.duration = 0;

        const tr = this.transform,
            startZoom = this.getZoom(),
            startBearing = this.getBearing(),
            startPitch = this.getPitch(),

            zoom = 'zoom' in options ? +options.zoom : startZoom,
            bearing = 'bearing' in options ? this._normalizeBearing(options.bearing, startBearing) : startBearing,
            pitch = 'pitch' in options ? +options.pitch : startPitch;

        const pointAtOffset = tr.centerPoint.add(Point.convert(options.offset));
        const locationAtOffset = tr.pointLocation(pointAtOffset);
        const center = LngLat.convert(options.center || locationAtOffset);
        this._normalizeCenter(center);

        const from = tr.project(locationAtOffset);
        const delta = tr.project(center).sub(from);
        const finalScale = tr.zoomScale(zoom - startZoom);

        let around, aroundPoint;

        if (options.around) {
            around = LngLat.convert(options.around);
            aroundPoint = tr.locationPoint(around);
        }

        this._zooming = (zoom !== startZoom);
        this._rotating = (startBearing !== bearing);
        this._pitching = (pitch !== startPitch);

        this._prepareEase(eventData, options.noMoveStart);

        clearTimeout(this._easeEndTimeoutID);

        this._ease((k) => {
            if (this._zooming) {
                tr.zoom = interpolate(startZoom, zoom, k);
            }
            if (this._rotating) {
                tr.bearing = interpolate(startBearing, bearing, k);
            }
            if (this._pitching) {
                tr.pitch = interpolate(startPitch, pitch, k);
            }

            if (around) {
                tr.setLocationAtPoint(around, aroundPoint);
            } else {
                const scale = tr.zoomScale(tr.zoom - startZoom);
                const base = zoom > startZoom ?
                    Math.min(2, finalScale) :
                    Math.max(0.5, finalScale);
                const speedup = Math.pow(base, 1 - k);
                const newCenter = tr.unproject(from.add(delta.mult(k * speedup)).mult(scale));
                tr.setLocationAtPoint(tr.renderWorldCopies ? newCenter.wrap() : newCenter, pointAtOffset);
            }

            this._fireMoveEvents(eventData);

        }, () => {
            if (options.delayEndEvents) {
                this._easeEndTimeoutID = setTimeout(() => this._afterEase(eventData), options.delayEndEvents);
            } else {
                this._afterEase(eventData);
            }
        }, options);

        return this;
    }

    _prepareEase(eventData?: Object, noMoveStart: boolean) {
        this._moving = true;

        if (!noMoveStart) {
            this.fire(new Event('movestart', eventData));
        }
        if (this._zooming) {
            this.fire(new Event('zoomstart', eventData));
        }
        if (this._rotating) {
            this.fire(new Event('rotatestart', eventData));
        }
        if (this._pitching) {
            this.fire(new Event('pitchstart', eventData));
        }
    }

    _fireMoveEvents(eventData?: Object) {
        this.fire(new Event('move', eventData));
        if (this._zooming) {
            this.fire(new Event('zoom', eventData));
        }
        if (this._rotating) {
            this.fire(new Event('rotate', eventData));
        }
        if (this._pitching) {
            this.fire(new Event('pitch', eventData));
        }
    }

    _afterEase(eventData?: Object) {
        const wasZooming = this._zooming;
        const wasRotating = this._rotating;
        const wasPitching = this._pitching;
        this._moving = false;
        this._zooming = false;
        this._rotating = false;
        this._pitching = false;

        if (wasZooming) {
            this.fire(new Event('zoomend', eventData));
        }
        if (wasRotating) {
            this.fire(new Event('rotateend', eventData));
        }
        if (wasPitching) {
            this.fire(new Event('pitchend', eventData));
        }
        this.fire(new Event('moveend', eventData));
    }

    /**

     * 改变中心，缩放，方位和轴向的任意组合，使曲线的过渡动画化
     * 唤起飞行，动画无缝地结合缩放和平移来提供帮助
     * 即使经过很远的距离，用户也能保持轴向。
     *
     * @memberof Map#
     * @param {Object} options描述转换的目标和动画的选项。接受{@link CameraOptions}，{@ link AnimationOptions}，和以下附加选项。
     * @param {number} [options.curve=1.42] 缩放的“曲线”将沿着飞行路径。较高的值可以最大化缩放动画，而夸张的动画则较低。
     * 值最小化缩放效果，接近{@link Map＃easeTo}。 1.42是平均值。
     * 参与者在用户研究中选择的价值
     * [van Wijk（2003）]（https://www.win.tue.nl/~vanwijk/zoompan.pdf）。价值`Math.pow（6,0.25）`相当于均方根平均速度。值为1会产生圆周运动。
     * @param {number} [options.minZoom] 飞行路径峰值处的从零开始的缩放级别。如果指定了`options.curve`，忽略此选项。
     * @param {number} [options.speed=1.2] 相对于动画定义的平均动画速度`options.curve`。速度为1.2意味着地图似乎沿着飞行路径移动
     * 每秒1.2次`options.curve`屏幕。 _screenful_是地图的可见范围。
     * 它与固定的物理距离不对应，但因缩放级别而异。
     * @param {number} [options.screenSpeed] 在屏幕中测量动画的平均速度
     * 每秒，假设线性时序曲线。如果指定了“options.speed”，则忽略此选项。
     * @param {number} [options.maxDuration] 动画的最大持续时间，以毫秒为单位。
     *   如果持续时间超过最大持续时间，则重置为0。
     * @param eventData 要添加到此方法触发的事件的事件对象的其他属性。
     * @fires movestart
     * @fires zoomstart
     * @fires pitchstart
     * @fires move
     * @fires zoom
     * @fires rotate
     * @fires pitch
     * @fires moveend
     * @fires zoomend
     * @fires pitchend
     * @returns {Map} `this`
     * @example
     * // fly with default options to null island
     * map.flyTo({center: [0, 0], zoom: 9});
     * // using flyTo options
     * map.flyTo({
     *   center: [0, 0],
     *   zoom: 9,
     *   speed: 0.2,
     *   curve: 1,
     *   easing(t) {
     *     return t;
     *   }
     * });
     * @see [Fly to a location](https://www.mapbox.com/mapbox-gl-js/example/flyto/)
     * @see [Slowly fly to a location](https://www.mapbox.com/mapbox-gl-js/example/flyto-options/)
     * @see [Fly to a location based on scroll position](https://www.mapbox.com/mapbox-gl-js/example/scroll-fly-to/)
     */
    flyTo(options: Object, eventData?: Object) {
         //此方法实现“最佳路径”动画，详见：
        //
        // Van Wijk，Jarke J.; Nuij，Wim A. A.“平滑有效的缩放和平移。”INFOVIS
        // '03第15-22页。 <https://www.win.tue.nl/~vanwijk/zoompan.pdf#page=5>。
        //
        // 在适用的情况下，局部变量文档以关联的变量或开头
        // 在van Wijk（2003）中的功能。

        this.stop();

        options = extend({
            offset: [0, 0],
            speed: 1.2,
            curve: 1.42,
            easing: defaultEasing
        }, options);

        const tr = this.transform,
            startZoom = this.getZoom(),
            startBearing = this.getBearing(),
            startPitch = this.getPitch();

        const zoom = 'zoom' in options ? clamp(+options.zoom, tr.minZoom, tr.maxZoom) : startZoom;
        const bearing = 'bearing' in options ? this._normalizeBearing(options.bearing, startBearing) : startBearing;
        const pitch = 'pitch' in options ? +options.pitch : startPitch;

        const scale = tr.zoomScale(zoom - startZoom);
        const pointAtOffset = tr.centerPoint.add(Point.convert(options.offset));
        const locationAtOffset = tr.pointLocation(pointAtOffset);
        const center = LngLat.convert(options.center || locationAtOffset);
        this._normalizeCenter(center);

        const from = tr.project(locationAtOffset);
        const delta = tr.project(center).sub(from);

        let rho = options.curve;

        // w₀: 初始可见跨度，以初始比例的像素为单位。
        const w0 = Math.max(tr.width, tr.height),
            // w₁: 最终可见跨度，以像素为单位测量初始比例。
            w1 = w0 / scale,
            // 投影到地平面上的飞行路径长度，以像素为单位测量
            // 世界图像起源于初始尺度。
            u1 = delta.mag();

        if ('minZoom' in options) {
            const minZoom = clamp(Math.min(options.minZoom, startZoom, zoom), tr.minZoom, tr.maxZoom);
            // w<sub>m</sub>: 最大可见跨度，以像素为单位，相对于初始值
            // 规模
            const wMax = w0 / tr.zoomScale(minZoom - startZoom);
            rho = Math.sqrt(wMax / u1 * 2);
        }

        // ρ²
        const rho2 = rho * rho;

        /**
         * rᵢ: 返回动画一端的缩小系数。
         *
         * @param i 0 for the ascent or 1 for the descent.
         * @private
         */
        function r(i) {
            const b = (w1 * w1 - w0 * w0 + (i ? -1 : 1) * rho2 * rho2 * u1 * u1) / (2 * (i ? w1 : w0) * rho2 * u1);
            return Math.log(Math.sqrt(b * b + 1) - b);
        }

        function sinh(n) { return (Math.exp(n) - Math.exp(-n)) / 2; }
        function cosh(n) { return (Math.exp(n) + Math.exp(-n)) / 2; }
        function tanh(n) { return sinh(n) / cosh(n); }

        // r₀: 上升时的缩小系数。
        const r0 = r(0);

        // w(s): 返回地面上的可见范围，以像素为单位测量
        // 初始比例假设2arctan½≈53°的角视场。
        let w: (number) => number = function (s) {
            return (cosh(r0) / cosh(r0 + rho * s));
        };

        // u(s): 返回投影到地平面上沿飞行路径的距离，
        //以初始比例从世界图像原点以像素为单位进行测量。
        let u: (number) => number = function (s) {
            return w0 * ((cosh(r0) * tanh(r0 + rho * s) - sinh(r0)) / rho2) / u1;
        };

        // S: 飞行路径的总长度，以ρ-screenfuls为单位。
        let S = (r(1) - r0) / rho;

        // 当u₀ = u₁时，最佳路径不需要上升和下降。
        if (Math.abs(u1) < 0.000001 || !isFinite(S)) {
            // 如果路径太短，则执行或多或少的瞬时转换。
            if (Math.abs(w0 - w1) < 0.000001) return this.easeTo(options, eventData);

            const k = w1 < w0 ? -1 : 1;
            S = Math.abs(Math.log(w1 / w0)) / rho;

            u = function() { return 0; };
            w = function(s) { return Math.exp(k * rho * s); };
        }

        if ('duration' in options) {
            options.duration = +options.duration;
        } else {
            const V = 'screenSpeed' in options ? +options.screenSpeed / rho : +options.speed;
            options.duration = 1000 * S / V;
        }

        if (options.maxDuration && options.duration > options.maxDuration) {
            options.duration = 0;
        }

        this._zooming = true;
        this._rotating = (startBearing !== bearing);
        this._pitching = (pitch !== startPitch);

        this._prepareEase(eventData, false);

        this._ease((k) => {
            // s: 沿着飞行路径行进的距离，以ρ-屏幕测量。
            const s = k * S;
            const scale = 1 / w(s);
            tr.zoom = k === 1 ? zoom : startZoom + tr.scaleZoom(scale);

            if (this._rotating) {
                tr.bearing = interpolate(startBearing, bearing, k);
            }
            if (this._pitching) {
                tr.pitch = interpolate(startPitch, pitch, k);
            }

            const newCenter = tr.unproject(from.add(delta.mult(u(s))).mult(scale));
            tr.setLocationAtPoint(tr.renderWorldCopies ? newCenter.wrap() : newCenter, pointAtOffset);

            this._fireMoveEvents(eventData);

        }, () => this._afterEase(eventData), options);

        return this;
    }

    isEasing() {
        return !!this._easeFrameId;
    }

    /**
     * 停止正在进行的任何动画过渡。
     *
     * @memberof Map#
     * @returns {Map} `this`
     */
    stop(): this {
        if (this._easeFrameId) {
            this._cancelRenderFrame(this._easeFrameId);
            delete this._easeFrameId;
            delete this._onEaseFrame;
        }

        if (this._onEaseEnd) {
             // _onEaseEnd函数可能会发出触发new的事件
            // 动画，它设置一个新的_onEaseEnd。确保我们不删除
            // t unintentionally.
            const onEaseEnd = this._onEaseEnd;
            delete this._onEaseEnd;
            onEaseEnd.call(this);
        }
        return this;
    }

    _ease(frame: (number) => void,
          finish: () => void,
          options: {animate: boolean, duration: number, easing: (number) => number}) {
        if (options.animate === false || options.duration === 0) {
            frame(1);
            finish();
        } else {
            this._easeStart = browser.now();
            this._easeOptions = options;
            this._onEaseFrame = frame;
            this._onEaseEnd = finish;
            this._easeFrameId = this._requestRenderFrame(this._renderFrameCallback);
        }
    }

    // Callback for map._requestRenderFrame
    _renderFrameCallback() {
        const t = Math.min((browser.now() - this._easeStart) / this._easeOptions.duration, 1);
        this._onEaseFrame(this._easeOptions.easing(t));
        if (t < 1) {
            this._easeFrameId = this._requestRenderFrame(this._renderFrameCallback);
        } else {
            this.stop();
        }
    }

    // 转换方位，使其在数值上接近当前方位，以便正确插补
    _normalizeBearing(bearing: number, currentBearing: number) {
        bearing = wrap(bearing, -180, 180);
        const diff = Math.abs(bearing - currentBearing);
        if (Math.abs(bearing - 360 - currentBearing) < diff) bearing -= 360;
        if (Math.abs(bearing + 360 - currentBearing) < diff) bearing += 360;
        return bearing;
    }


    //如果穿过antimeridian的路径较短，则扩展最终坐标
    //在两个端点之间插值将穿过它。
    _normalizeCenter(center: LngLat) {
        const tr = this.transform;
        if (!tr.renderWorldCopies || tr.lngRange) return;

        const delta = center.lng - tr.center.lng;
        center.lng +=
            delta > 180 ? -360 :
            delta < -180 ? 360 : 0;
    }
}

export default Camera;
