// @flow

import { getVideo, ResourceType } from '../util/ajax';

import ImageSource from './image_source';
import rasterBoundsAttributes from '../data/raster_bounds_attributes';
import VertexArrayObject from '../render/vertex_array_object';
import Texture from '../render/texture';
import { ErrorEvent } from '../util/evented';

import type Map from '../ui/map';
import type Dispatcher from '../util/dispatcher';
import type {Evented} from '../util/evented';

/**
 * 该数据源含有视频.
 * (在此查看可选项的详细文档说明. [Style Specification](https://www.mapbox.com/mapbox-gl-style-spec/#sources-video))
 *
 * @例子
 * // 添加到地图
 * map.addSource('some id', {
 *    type: 'video',
 *    url: [
 *        'https://www.mapbox.com/blog/assets/baltimore-smoke.mp4',
 *        'https://www.mapbox.com/blog/assets/baltimore-smoke.webm'
 *    ],
 *    coordinates: [
 *        [-76.54, 39.18],
 *        [-76.52, 39.18],
 *        [-76.52, 39.17],
 *        [-76.54, 39.17]
 *    ]
 * });
 *
 * // 更新
 * var mySource = map.getSource('some id');
 * mySource.setCoordinates([
 *     [-76.54335737228394, 39.18579907229748],
 *     [-76.52803659439087, 39.1838364847587],
 *     [-76.5295386314392, 39.17683392507606],
 *     [-76.54520273208618, 39.17876344106642]
 * ]);
 *
 * map.removeSource('some id');  // 移除
 * @见 [Add a video](https://www.mapbox.com/mapbox-gl-js/example/video-on-a-map/)
 */
class VideoSource extends ImageSource {
    options: VideoSourceSpecification;
    urls: Array<string>;
    video: HTMLVideoElement;
    roundZoom: boolean;

    /**
     * @私有的
     */
    constructor(id: string, options: VideoSourceSpecification, dispatcher: Dispatcher, eventedParent: Evented) {
        super(id, options, dispatcher, eventedParent);
        this.roundZoom = true;
        this.type = 'video';
        this.options = options;
    }

    load() {
        const options = this.options;

        this.urls = [];
        for (const url of options.urls) {
            this.urls.push(this.map._transformRequest(url, ResourceType.Source).url);
        }

        getVideo(this.urls, (err, video) => {
            if (err) {
                this.fire(new ErrorEvent(err));
            } else if (video) {
                this.video = video;
                this.video.loop = true;

                // Start repainting when video starts playing. hasTransition() will then return
                // true to trigger additional frames as long as the videos continues playing.
                this.video.addEventListener('playing', () => {
                    this.map._rerender();
                });

                if (this.map) {
                    this.video.play();
                }

                this._finishLoading();
            }
        });
    }

    /**
     * 返回HTML `video` 元素.
     *
     * @返回 {HTMLVideoElement} HTML的 `video`元素.
     */
    getVideo() {
        return this.video;
    }

    onAdd(map: Map) {
        if (this.map) return;
        this.map = map;
        this.load();
        if (this.video) {
            this.video.play();
            this.setCoordinates(this.coordinates);
        }
    }

    /**
     * 设置视频的坐标，并重新渲染地图.
     *
     * @方法 setCoordinates的方法
     * @例子
     * @VideoSource的成员
     * @param {Array<Array<number>>} coordinates 四个地理坐标,
     *   以经度和维度的数列方式，对视频框的四个角做定义.
     *   坐标从视频的左上角开始，并顺时针依次代表视频的其他角.
     *   视频可以是除正方形以外的形状.
     * @返回 {VideoSource} this
     */
    // setCoordinates 继承自 ImageSource

    prepare() {
        if (Object.keys(this.tiles).length === 0 || this.video.readyState < 2) {
            return; // not enough data for current position
        }

        const context = this.map.painter.context;
        const gl = context.gl;

        if (!this.boundsBuffer) {
            this.boundsBuffer = context.createVertexBuffer(this._boundsArray, rasterBoundsAttributes.members);
        }

        if (!this.boundsVAO) {
            this.boundsVAO = new VertexArrayObject();
        }

        if (!this.texture) {
            this.texture = new Texture(context, this.video, gl.RGBA);
            this.texture.bind(gl.LINEAR, gl.CLAMP_TO_EDGE);
        } else if (!this.video.paused) {
            this.texture.bind(gl.LINEAR, gl.CLAMP_TO_EDGE);
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.video);
        }

        for (const w in this.tiles) {
            const tile = this.tiles[w];
            if (tile.state !== 'loaded') {
                tile.state = 'loaded';
                tile.texture = this.texture;
            }
        }
    }

    serialize() {
        return {
            type: 'video',
            urls: this.urls,
            coordinates: this.coordinates
        };
    }

    hasTransition() {
        return this.video && !this.video.paused;
    }
}

export default VideoSource;
