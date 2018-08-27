// @flow

import { bindAll } from '../../util/util';

import type Map from '../map';
import type {MapMouseEvent, MapTouchEvent} from '../events';

/**
 * `DoubleClickZoomHandler` 允许用户通过鼠标双击或者手指双击屏幕上的一个点来缩放地图
 * 
 */
class DoubleClickZoomHandler {
    _map: Map;
    _enabled: boolean;
    _active: boolean;
    _tapped: ?TimeoutID;

    /**
     * @private
     */
    constructor(map: Map) {
        this._map = map;

        bindAll([
            '_onDblClick',
            '_onZoomEnd'
        ], this);
    }

    /**
     * 返回一个布尔值，指示是否启用了“双击缩放”交互.
     *
     * @返回 {boolean} `true`如果启用了“双击缩放”交互.
     */
    isEnabled() {
        return !!this._enabled;
    }

    /**
     * 返回一个布尔值，指示“双击缩放”交互是否处于激活状态，即当前正在使用.
     *
     * @返回 {boolean} `true` 如果“双击缩放”交互处于激活状态.
     */
    isActive() {
        return !!this._active;
    }

    /**
     * 启用“双击缩放”交互.
     *
     * @代码样例
     * map.doubleClickZoom.enable();
     */
    enable() {
        if (this.isEnabled()) return;
        this._enabled = true;
    }

    /**
     * 禁用“双击缩放”交互.
     *
     * @代码样例
     * map.doubleClickZoom.disable();
     */
    disable() {
        if (!this.isEnabled()) return;
        this._enabled = false;
    }

    onTouchStart(e: MapTouchEvent) {
        if (!this.isEnabled()) return;
        if (e.points.length > 1) return;

        if (!this._tapped) {
            this._tapped = setTimeout(() => { this._tapped = null; }, 300);
        } else {
            clearTimeout(this._tapped);
            this._tapped = null;
            this._zoom(e);
        }
    }

    onDblClick(e: MapMouseEvent) {
        if (!this.isEnabled()) return;
        e.originalEvent.preventDefault();
        this._zoom(e);
    }

    _zoom(e: MapMouseEvent | MapTouchEvent) {
        this._active = true;
        this._map.on('zoomend', this._onZoomEnd);
        this._map.zoomTo(
            this._map.getZoom() + (e.originalEvent.shiftKey ? -1 : 1),
            {around: e.lngLat},
            e
        );
    }

    _onZoomEnd() {
        this._active = false;
        this._map.off('zoomend', this._onZoomEnd);
    }
}

export default DoubleClickZoomHandler;
