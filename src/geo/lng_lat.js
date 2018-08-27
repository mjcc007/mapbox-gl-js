// @flow

import { wrap } from '../util/util';
import LngLatBounds from './lng_lat_bounds';

/**
 * 一个`LngLat`对象代表着已给定的经度和维度坐标, 以度为衡量单位.
 *
 * Mapbox GL使用先经度、再纬度的坐标显示方式 (与先纬度、再经度相反) ，以配合GeoJSON的应用.
 *
 * 可以注意到，Mapbox GL方法既可接收`LngLat`对象形式的声明，也可接收包含两个数值的数组，并直接对其进行隐式转换.
 * 这种灵活的的接收方法可以在 {@link LngLatLike}文档部分找到说明.
 *
 * @param {number} lng 经度, 以度为衡量单位.
 * @param {number} lat 纬度, 以度为衡量单位.
 * @example
 * var ll = new mapboxgl.LngLat(-73.9749, 40.7736);
 * @see [得到鼠标箭头指针的坐标](https://www.mapbox.com/mapbox-gl-js/example/mouse-position/)
 * @see [呈现弹出框效果](https://www.mapbox.com/mapbox-gl-js/example/popup/)
 * @see [突出显示一个边界框内的某些区域特征](https://www.mapbox.com/mapbox-gl-js/example/using-box-queryrenderedfeatures/)
 * @see [创建一个动态时间轴](https://www.mapbox.com/mapbox-gl-js/example/timeline-animation/)
 */
class LngLat {
    lng: number;
    lat: number;

    constructor(lng: number, lat: number) {
        if (isNaN(lng) || isNaN(lat)) {
            throw new Error(`Invalid LngLat object: (${lng}, ${lat})`);
        }
        this.lng = +lng;
        this.lat = +lat;
        if (this.lat > 90 || this.lat < -90) {
            throw new Error('Invalid LngLat latitude value: must be between -90 and 90');
        }
    }

    /**
     * 返回一个新的`LngLat`对象，其经度范围被限定为(-180, 180).
     *
     * @returns {LngLat} 指定的`LngLat`对象.
     * @example
     * var ll = new mapboxgl.LngLat(286.0251, 40.7736);
     * var wrapped = ll.wrap();
     * wrapped.lng; // = -73.9749
     */
    wrap() {
        return new LngLat(wrap(this.lng, -180, 180), this.lat);
    }

    /**
     * 返回以数组形式显示的一组坐标信息.
     *
     * @returns {Array<number>} 坐标以包含着经度和纬度坐标的数组形式呈现.
     * @example
     * var ll = new mapboxgl.LngLat(-73.9749, 40.7736);
     * ll.toArray(); // = [-73.9749, 40.7736]
     */
    toArray() {
        return [this.lng, this.lat];
    }

    /**
     * 返回一组字符串形式的坐标信息.
     *
     * @returns {string} 坐标信息以此类字符串格式返回 `'LngLat(lng, lat)'`.
     * @example
     * var ll = new mapboxgl.LngLat(-73.9749, 40.7736);
     * ll.toString(); // = "LngLat(-73.9749, 40.7736)"
     */
    toString() {
        return `LngLat(${this.lng}, ${this.lat})`;
    }

    /**
     * 根据指定的距离参数 `radius`扩展坐标，并返回一个 `LngLatBounds`.
     *
     * @param {number} radius 以米为单位，从原有坐标向外扩展的距离.
     * @returns {LngLatBounds} 通过`radius`参数从原有坐标扩展得到一个新的`LngLatBounds`对象.
     * @example
     * var ll = new mapboxgl.LngLat(-73.9749, 40.7736);
     * ll.toBounds(100).toArray(); // = [[-73.97501862141328, 40.77351016847229], [-73.97478137858673, 40.77368983152771]]
     */
    toBounds(radius: number) {
        const earthCircumferenceInMetersAtEquator = 40075017;
        const latAccuracy = 360 * radius / earthCircumferenceInMetersAtEquator,
            lngAccuracy = latAccuracy / Math.cos((Math.PI / 180) * this.lat);

        return new LngLatBounds(new LngLat(this.lng - lngAccuracy, this.lat - latAccuracy),
            new LngLat(this.lng + lngAccuracy, this.lat + latAccuracy));
    }

    /**
     * 把包含着两个坐标数值的数组 转化为一个`LngLat`对象.
     *
     * 如果本身传入的就是`LngLat`对象, 此方法会把传入的参数值保持原样返回
     *
     * @param {LngLatLike} 传入一个需转换的数组, 或一个无需转换的`LngLat`对象.
     * @returns {LngLat} 如方法执行，则会返回一个新的`LngLat`对象，或是原有传入的未转换`LngLat`对象.
     * @example
     * var arr = [-73.9749, 40.7736];
     * var ll = mapboxgl.LngLat.convert(arr);
     * ll;   // = LngLat {lng: -73.9749, lat: 40.7736}
     */
    static convert(input: LngLatLike): LngLat {
        if (input instanceof LngLat) {
            return input;
        }
        if (Array.isArray(input) && (input.length === 2 || input.length === 3)) {
            return new LngLat(Number(input[0]), Number(input[1]));
        }
        if (!Array.isArray(input) && typeof input === 'object' && input !== null) {
            return new LngLat(Number(input.lng), Number(input.lat));
        }
        throw new Error("`LngLatLike` argument must be specified as a LngLat instance, an object {lng: <lng>, lat: <lat>}, or an array of [<lng>, <lat>]");
    }
}

/**
 * 可能是一个 {@link LngLat} object, 对象, 一个包含着两个数值(分别为经纬度)的数组,
 * 亦或是一个包含着两个名为`lng`和`lat`变量值的对象.
 *
 * @typedef {LngLat | {lng: number, lat: number} | [number, number]} LngLatLike
 * @example
 * var v1 = new mapboxgl.LngLat(-122.420679, 37.772537);
 * var v2 = [-122.420679, 37.772537];
 */
export type LngLatLike = LngLat | {lng: number, lat: number} | [number, number];

export default LngLat;
