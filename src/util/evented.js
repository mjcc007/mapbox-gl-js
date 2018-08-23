// @flow

import { extend } from './util';

type Listener = (Object) => any;
type Listeners = { [string]: Array<Listener> };

function _addEventListener(type: string, listener: Listener, listenerList: Listeners) {
    const listenerExists = listenerList[type] && listenerList[type].indexOf(listener) !== -1;
    if (!listenerExists) {
        listenerList[type] = listenerList[type] || [];
        listenerList[type].push(listener);
    }
}

function _removeEventListener(type: string, listener: Listener, listenerList: Listeners) {
    if (listenerList && listenerList[type]) {
        const index = listenerList[type].indexOf(listener);
        if (index !== -1) {
            listenerList[type].splice(index, 1);
        }
    }
}

export class Event {
    +type: string;

    constructor(type: string, data: Object = {}) {
        extend(this, data);
        this.type = type;
    }
}

export class ErrorEvent extends Event {
    error: Error;

    constructor(error: Error, data: Object = {}) {
        super('error', extend({error}, data));
    }
}

/**
 * 根据事件功能混合到其他类中的方法。
 *
 * @mixin Evented
 */
export class Evented {
    _listeners: Listeners;
    _oneTimeListeners: Listeners;
    _eventedParent: ?Evented;
    _eventedParentData: ?(Object | () => Object);

    /**
     * 为指定的事件类型添加监听器。
     *
     * @param {string} type 添加监听的事件类型。
     * @param {Function} listener 触发事件后要调用的函数。
     *   通过传递给`fire`的数据对象来调用监听功能，
     *   并根据`target`和`type`属性进行扩展。
     * @returns {Object} `this`
     */
    on(type: *, listener: Listener): this {
        this._listeners = this._listeners || {};
        _addEventListener(type, listener, this._listeners);

        return this;
    }

    /**
     * 移除先前注册的事件监听器。
     *
     * @param {string} type 需要移除监听器的事件类型。
     * @param {Function} listener 需要移除的监听器函数。
     * @returns {Object} `this`
     */
    off(type: *, listener: Listener) {
        _removeEventListener(type, listener, this._listeners);
        _removeEventListener(type, listener, this._oneTimeListeners);

        return this;
    }

    /**
     * 为指定事件类型添加一个一次性调用的监听器。
     *
     * 该监听器注册之后，会在事件第一次触发的时候被调用。
     *
     * @param {string} type 要监听的事件类型。
     * @param {Function} listener 事件第一次触发时要调用的函数。
     * @returns {Object} `this`
     */
    once(type: string, listener: Listener) {
        this._oneTimeListeners = this._oneTimeListeners || {};
        _addEventListener(type, listener, this._oneTimeListeners);

        return this;
    }

    fire(event: Event) {
        // Compatibility with (type: string, properties: Object) signature from previous versions.
        // See https://github.com/mapbox/mapbox-gl-js/issues/6522,
        //     https://github.com/mapbox/mapbox-gl-draw/issues/766
        if (typeof event === 'string') {
            event = new Event(event, arguments[1] || {});
        }

        const type = event.type;

        if (this.listens(type)) {
            (event: any).target = this;

            // make sure adding or removing listeners inside other listeners won't cause an infinite loop
            const listeners = this._listeners && this._listeners[type] ? this._listeners[type].slice() : [];
            for (const listener of listeners) {
                listener.call(this, event);
            }

            const oneTimeListeners = this._oneTimeListeners && this._oneTimeListeners[type] ? this._oneTimeListeners[type].slice() : [];
            for (const listener of oneTimeListeners) {
                _removeEventListener(type, listener, this._oneTimeListeners);
                listener.call(this, event);
            }

            const parent = this._eventedParent;
            if (parent) {
                extend(
                    event,
                    typeof this._eventedParentData === 'function' ? this._eventedParentData() : this._eventedParentData
                );
                parent.fire(event);
            }

        // To ensure that no error events are dropped, print them to the
        // console if they have no listeners.
        } else if (event instanceof ErrorEvent) {
            console.error(event.error);
        }

        return this;
    }

    /**
     * 如果事件的实例或事件的任何转发实例具有指定类型的监听器，则返回 true。
     * 
     * @param {string} type 事件类型。
     * @returns {boolean} 当指定事件类型拥有至少一个注册过的监听器时，为`true`，否则为`false`。
     * @private
     */
    listens(type: string) {
        return (
            (this._listeners && this._listeners[type] && this._listeners[type].length > 0) ||
            (this._oneTimeListeners && this._oneTimeListeners[type] && this._oneTimeListeners[type].length > 0) ||
            (this._eventedParent && this._eventedParent.listens(type))
        );
    }

    /**
     * 冒泡由这个事件实例触发的所有事件被事件的父实例触发。
     *
     * @private
     * @returns {Object} `this`
     * @private
     */
    setEventedParent(parent: ?Evented, data?: Object | () => Object) {
        this._eventedParent = parent;
        this._eventedParentData = data;

        return this;
    }
}
