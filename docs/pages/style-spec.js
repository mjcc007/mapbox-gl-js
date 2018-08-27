import React from 'react';
import slug from 'slugg';
import assert from 'assert';
import md from '../components/md';
import PageShell from '../components/page_shell';
import LeftNav from '../components/left_nav';
import TopNav from '../components/top_nav';
import SDKSupportTable from '../components/sdk_support_table';
import {highlightJavascript, highlightJSON} from '../components/prism_highlight';
import entries from 'object.entries';
import ref from '../../src/style-spec/reference/latest';

const meta = {
    title: 'Mapbox Style Specification',
    description: '',
    pathname: '/style-spec'
};

const navigation = [
    {
        "title": "Root",
        "subnav": [
            {
                "title": "version"
            },
            {
                "title": "name"
            },
            {
                "title": "metadata"
            },
            {
                "title": "center"
            },
            {
                "title": "zoom"
            },
            {
                "title": "bearing"
            },
            {
                "title": "pitch"
            },
            {
                "title": "light"
            },
            {
                "title": "sources"
            },
            {
                "title": "sprite"
            },
            {
                "title": "glyphs"
            },
            {
                "title": "transition"
            },
            {
                "title": "layers"
            }
        ]
    },
    {
        "title": "Light",
        "subnav": [
            {
                "title": "anchor"
            },
            {
                "title": "position"
            },
            {
                "title": "color"
            },
            {
                "title": "intensity"
            }
        ]
    },
    {
        "title": "Sources",
        "subnav": [
            {
                "title": "vector"
            },
            {
                "title": "raster"
            },
            {
                "title": "raster-dem"
            },
            {
                "title": "geojson"
            },
            {
                "title": "image"
            },
            {
                "title": "video"
            }
        ]
    },
    {
        "title": "Sprite"
    },
    {
        "title": "Glyphs"
    },
    {
        "title": "Transition",
        "subnav": [
            {
                "title": "duration"
            },
            {
                "title": "delay"
            }
        ]
    },
    {
        "title": "Layers",
        "subnav": [
            {
                "title": "background"
            },
            {
                "title": "fill"
            },
            {
                "title": "line"
            },
            {
                "title": "symbol"
            },
            {
                "title": "raster"
            },
            {
                "title": "circle"
            },
            {
                "title": "fill-extrusion"
            },
            {
                "title": "heatmap"
            },
            {
                "title": "hillshade"
            }
        ]
    },
    {
        "title": "Types",
        "subnav": [
            {
                "title": "Color"
            },
            {
                "title": "String"
            },
            {
                "title": "Boolean"
            },
            {
                "title": "Number"
            },
            {
                "title": "Array"
            }
        ]
    },
    {
        "title": "Expressions",
        "subnav": [
            {
                "title": "Types"
            },
            {
                "title": "Feature data"
            },
            {
                "title": "Lookup"
            },
            {
                "title": "Decision"
            },
            {
                "title": "Ramps, scales, curves"
            },
            {
                "title": "Variable binding"
            },
            {
                "title": "String"
            },
            {
                "title": "Color"
            },
            {
                "title": "Math"
            },
            {
                "title": "Zoom"
            },
            {
                "title": "Heatmap"
            }
        ]
    },
    {
        "title": "Other",
        "subnav": [
            {
                "title": "Function"
            },
            {
                "title": "Filter"
            }
        ]
    }
];

const sourceTypes = ['vector', 'raster', 'raster-dem', 'geojson', 'image', 'video'];
const layerTypes = ['background', 'fill', 'line', 'symbol', 'raster', 'circle', 'fill-extrusion', 'heatmap', 'hillshade'];

import {expressions, expressionGroups} from '../components/expression-metadata';

const groupedExpressions = [
    'Types',
    'Feature data',
    'Lookup',
    'Decision',
    'Ramps, scales, curves',
    'Variable binding',
    'String',
    'Color',
    'Math',
    'Zoom',
    'Heatmap'
].map(group => ({
    name: group,
    expressions: expressionGroups[group]
        .sort((a, b) => a.localeCompare(b))
        .map(name => expressions[name])
}));

assert(groupedExpressions.length === Object.keys(expressionGroups).length, 'All expression groups accounted for in generated docs');

function renderSignature(name, overload) {
    name = JSON.stringify(name);
    const maxLength = 80 - name.length - overload.type.length;
    const params = renderParams(overload.parameters, maxLength);
    return `[${name}${params}]: ${overload.type}`;
}

function renderParams(params, maxLength) {
    const result = [''];
    for (const t of params) {
        if (typeof t === 'string') {
            result.push(t);
        } else if (t.repeat) {
            const repeated = renderParams(t.repeat, Infinity);
            result.push(`${repeated.slice(2)}${repeated}, ...`);
        }
    }

    // length of result = each (', ' + item)
    const length = result.reduce((l, s) => l + s.length + 2, 0);
    return (!maxLength || length <= maxLength) ?
        result.join(', ') :
        `${result.join(',\n    ')}\n`;
}

class Item extends React.Component {
    type(spec = this.props, plural = false) {
        switch (spec.type) {
        case null:
        case '*':
            return;
        case 'light':
            return <span> <a href='#light'>light</a></span>;
        case 'transition':
            return <span> <a href='#transition'>transition</a></span>;
        case 'sources':
            return <span> object with <a href='#sources'>source</a> values</span>;
        case 'layer':
            return <span> <a href='#layers'>layer{plural && 's'}</a></span>;
        case 'array':
            return <span> <a href='#types-array'>array</a>{spec.value && <span> of {this.type(typeof spec.value === 'string' ? {type: spec.value} : spec.value, true)}</span>}</span>;
        case 'filter':
            return <span> <a href='#expressions'>expression{plural && 's'}</a></span>;
        default:
            return <span> <a href={`#types-${spec.type}`}>{spec.type}{plural && 's'}</a></span>;
        }
    }

    requires(req, i) {
        if (typeof req === 'string') {
            return <span key={i}><em>Requires</em> <var>{req}</var>. </span>;
        } else if (req['!']) {
            return <span key={i}><em>Disabled by</em> <var>{req['!']}</var>. </span>;
        } else {
            const [name, value] = entries(req)[0];
            if (Array.isArray(value)) {
                return <span key={i}><em>Requires</em> <var>{name}</var> to be {
                    value
                        .map((r, i) => <code key={i}>{JSON.stringify(r)}</code>)
                        .reduce((prev, curr) => [prev, ', or ', curr])}. </span>;
            } else {
                return <span key={i}><em>Requires</em> <var>{name}</var> to be <code>{JSON.stringify(value)}</code>. </span>;
            }
        }
    }

    render() {
        return (
            <div className='col12 clearfix pad0y pad2x'>
                <div className='code space-bottom1'>
                    <a id={this.props.id} href={`#${this.props.id}`}>{this.props.name}</a>
                </div>

                <div className='space-bottom1'>
                    {this.props.kind === 'paint' &&
                    <em className='quiet'><a href='#paint-property'>Paint</a> property. </em>}
                    {this.props.kind === 'layout' &&
                    <em className='quiet'><a href='#layout-property'>Layout</a> property. </em>}

                    <em className='quiet'>
                        {this.props.required ? 'Required' : 'Optional'}
                        {this.type()}
                        {'minimum' in this.props && 'maximum' in this.props &&
                        <span> between <code>{this.props.minimum}</code> and <code>{this.props.maximum}</code> inclusive</span>}
                        {'minimum' in this.props && !('maximum' in this.props) &&
                        <span> greater than or equal to <code>{this.props.minimum}</code></span>}
                        {!('minimum' in this.props) && 'maximum' in this.props &&
                        <span> less than or equal to <code>{this.props.minimum}</code></span>}. </em>

                    {this.props.values && !Array.isArray(this.props.values) && // skips $root.version
                    <em className='quiet'>
                        One of {Object.keys(this.props.values)
                            .map((opt, i) => <code key={i}>{JSON.stringify(opt)}</code>)
                            .reduce((prev, curr) => [prev, ', ', curr])}. </em>}

                    {this.props.units &&
                    <em className='quiet'>
                        Units in <var>{this.props.units}</var>. </em>}

                    {this.props.default !== undefined &&
                    <em className='quiet'>
                        Defaults to <code>{JSON.stringify(this.props.default)}</code>. </em>}

                    {this.props.requires &&
                    <em className='quiet'>
                        {this.props.requires.map((r, i) => this.requires(r, i))} </em>}

                    {this.props.function === "interpolated" &&
                    <em className='quiet'>
                        Supports <a href='#expressions-interpolate'><span className='icon smooth-ramp inline'/><code>interpolate</code></a> expressions. </em>}

                    {this.props.transition &&
                    <em className='quiet'><span className='icon opacity inline quiet' />Transitionable. </em>}
                </div>

                {this.props.doc &&
                <div className='space-bottom1'>{md(this.props.doc)}</div>}

                {this.props.values && !Array.isArray(this.props.values) && // skips $root.version
                <div className='space-bottom1'>
                    <dl>
                        {entries(this.props.values).map(([v, {doc}], i) =>
                            [<dt key={`${i}-dt`}><code>{JSON.stringify(v)}</code>:</dt>, <dd key={`${i}-dd`} className='space-bottom1'>{md(doc)}</dd>]
                        )}
                    </dl>
                </div>}

                {this.props.example &&
                <div className='space-bottom1 clearfix'>
                    {highlightJSON(`"${this.props.name}": ${JSON.stringify(this.props.example, null, 2)}`)}
                </div>}

                {this.props['sdk-support'] &&
                <div className='space-bottom2'>
                    <SDKSupportTable {...this.props['sdk-support']} />
                </div>}
            </div>
        );
    }
}

export default class extends React.Component {
    render() {
        return (
            <PageShell meta={meta}>
                <style>{`
                .fill-gradient { background-image: linear-gradient( to bottom right, #7474BF, #348AC7); }
                .doc .property p { margin-bottom:0; }
                .doc .space-right { padding-right:10px; }
                .doc .icon.inline:before { vertical-align:middle; }
                .doc .uppercase { text-transform: uppercase; }
                .doc .indented { border-left: 4px solid rgba(255,255,255,0.2); }
                .doc.dark .keyline-bottom { border-color: rgba(0,0,0,0.15); }

                /* Supress \`err\` styling rouge applies from
                 * mapbox.com/base/ to favor shorthand documentation
                 * that doesn't always support formal syntax */
                pre .err {
                  background-color:transparent;
                  color:inherit;
                  }
                `}</style>

                <LeftNav>
                    {navigation.map(({title, subnav}, i) =>
                        <div key={i} className='space-bottom1'>
                            <a className='block truncate strong quiet' href={`#${slug(title)}`}>{title}</a>
                            {subnav && subnav.map(({title: subtitle}, i) =>
                                <a key={i} className='block truncate'
                                    href={`#${slug(title)}-${slug(subtitle)}`}>{subtitle}</a>
                            )}
                        </div>
                    )}
                </LeftNav>

                <div className='limiter clearfix'>
                    <TopNav current='style-spec'/>

                    <div className='contain margin3 col9'>
                        <div className='prose'>
                            <h1>{meta.title}</h1>
                            <p>Mapbox 样式是确定地图的文件：画地图用的数据，画地图的顺序，以及地图的样式。样式文件为<a href="http://www.json.org/">JSON</a>物体带特定的根级和嵌套的属性。该规范确定这些属性。
                            </p>
                            <p>该属性的目标受众包括：</p>
                            <ul>
                                <li>资深设计师和地图设计师想手工绘制地图样式，而不是用 <a href='https://www.mapbox.com/studio'>Mapbox Studio</a></li>
                                <li>利用 <a
                                    href='https://www.mapbox.com/mapbox-gl-js/'>Mapbox GL JS</a> 或 <a
                                    href='https://www.mapbox.com/android-sdk/'>Mapbox Maps SDK for Android</a>样式特点的地图开发者</li>
                                <li>生成或处理Mapbox样式的软件作者</li>
                            </ul>
                            <p> 使用 <a href='https://www.mapbox.com/ios-sdk/'>Mapbox Maps SDK for iOS</a> 或 <a
                                href='https://github.com/mapbox/mapbox-gl-native/tree/master/platform/macos/'>
                                Mapbox Maps SDK for macOS</a> 的开发者应参考 iOS SDK API ，确定适合平台文档的样式特点。</p>
                        </div>

                        <div className='prose'>
                            <a id='root' className='anchor'/>
                            <h2><a href='#root' title='link to root'>根的属性</a></h2>
                            <p>Mapbox样式的根级属性指定地图的层级、名称来源和其他来源，并在其他地方未指定初始摄像机位置时确定默认值。</p>
                            <div className='space-bottom1 clearfix'>
                                {highlightJSON(`
                                {
                                    "version": ${ref.$version},
                                    "name": "Mapbox Streets",
                                    "sprite": "mapbox://sprites/mapbox/streets-v${ref.$version}",
                                    "glyphs": "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
                                    "sources": {...},
                                    "layers": [...]
                                }
                                `)}
                            </div>
                            <div className='pad2 keyline-all fill-white'>
                                {entries(ref.$root).map(([name, prop], i) =>
                                    <Item key={i} id={`root-${name}`} name={name} {...prop}/>)}
                            </div>
                        </div>

                        <div className='pad2 prose'>
                            <a id='light' className='anchor'/>
                            <h2><a href='#light' title='link to light'>Light</a></h2>
                            <p>
                                A style's <code>light</code> property provides global light source for that style.
                            </p>
                            <div className='space-bottom1 pad2x clearfix'>
                                {highlightJSON(`"light": ${JSON.stringify(ref.$root.light.example, null, 2)}`)}
                            </div>
                            <div className='pad2 keyline-all fill-white'>
                                {entries(ref.light).map(([name, prop], i) =>
                                    <Item key={i} id={`light-${name}`} name={name} {...prop} />)}
                            </div>
                        </div>

                        <div className='pad2 prose'>
                            <a id='sources' className='anchor'/>
                            <h2><a href='#sources' title='link to sources'>Sources</a></h2>
                            <p>
                                Sources提供了地图的数据来源。我们通过
                                <code>"类型"</code> 属性确定来源的类型, 并且必须为 {sourceTypes.map((t, i) => <var key={i}>{t}</var>).reduce((prev, curr) => [prev, ', ', curr])}.
                                增加数据来源
                                不会立刻显示在地图上，因为数据来源未包含颜色或宽度等样式详情。 层级
                               是指来源，并且显示样式。所以，用不同的方式表示数据来源的样式成为可能，如用高速公路层级区分不同的公路。
                            </p>
                            <p>
                                平铺的数据来源（矢量和光栅） 必须用
                                 <a href="https://github.com/mapbox/tilejson-spec">TileJSON
                                specification</a>的方式指定细节。
                                可通过几种方式：
                            </p>
                            <ul>
                                <li>
                                    通过提供 TileJSON 属性，如 <code>"tiles"</code>, <code>"minzoom"</code>, 以及直接在数据来源中的
                                    <code>"maxzoom"</code> ：
                                    <div className='space-bottom1 clearfix'>
                                        {highlightJSON(`
                                            "mapbox-streets": {
                                                "type": "vector",
                                                "tiles": [
                                                "http://a.example.com/tiles/{z}/{x}/{y}.pbf",
                                                "http://b.example.com/tiles/{z}/{x}/{y}.pbf"
                                                ],
                                                "maxzoom": 14
                                            }`)}
                                    </div>
                                </li>
                                <li>
                                    通过向TileJSON数据来源提供 <code>"url"</code> ：
                                    <div className='space-bottom1 clearfix'>
                                        {highlightJSON(`
                                            "mapbox-streets": {
                                                "type": "vector",
                                                "url": "http://api.example.com/tilejson.json"
                                            }`)}
                                    </div>
                                </li>
                                <li>
                                    通过向支持
                                    EPSG:3857 (or EPSG:900913)的WMS服务器提供url，作为平铺数据的来源。 
                                    服务器 url 应包括<code>"{`{bbox-epsg-3857}`}"</code>
                                    替换标识提供  <code>bbox</code> 参数。
                                    {highlightJSON(`
                                        "wms-imagery": {
                                            "type": "raster",
                                            "tiles": [
                                            'http://a.example.com/wms?bbox={bbox-epsg-3857}&format=image/png&service=WMS&version=1.1.1&request=GetMap&srs=EPSG:3857&width=256&height=256&layers=example'
                                            ],
                                            "tileSize": 256
                                        }`)}
                                </li>
                            </ul>

                            <div className='space-bottom4 fill-white keyline-all'>
                                <div id='sources-vector' className='pad2 keyline-bottom'>
                                    <h3 className='space-bottom1'><a href='#sources-vector' title='link to vector'>vector</a></h3>
                                    <p>
                                        矢量平铺数据来源。 平铺数据格式须为 <a
                                            href="https://www.mapbox.com/developers/vector-tiles/">Mapbox
                                        矢量平铺格式 </a>. 矢量平铺数据的所有地理坐标必须在
                                        <code>-1 * extent</code> 和 <code>(extent * 2) - 1</code> 之间。
                                        使用矢量来源的所有层级必须指定 <a href='#layer-source-layer'><code>"source-layer"</code></a>
                                        数值。
                                        对于Mapbox确定的矢量平铺数据来源,  <code>"url"</code> 数值格式必须为
                                         <code>mapbox://<var>mapid</var></code>。
                                    </p>
                                    <div className='space-bottom1 clearfix'>
                                        {highlightJSON(`
                                            "mapbox-streets": {
                                                "type": "vector",
                                                "url": "mapbox://mapbox.mapbox-streets-v6"
                                            }`)}
                                    </div>
                                    <div className='space-bottom1 clearfix'>
                                        { entries(ref.source_vector).map(([name, prop], i) =>
                                            name !== '*' && name !== 'type' &&
                                            <Item key={i} id={`sources-vector-${name}`} name={name} {...prop}/>)}
                                    </div>
                                    <SDKSupportTable {...{
                                        'basic functionality': {
                                            js: '0.10.0',
                                            android: '2.0.1',
                                            ios: '2.0.0',
                                            macos: '0.1.0'
                                        }
                                    }}/>
                                </div>

                                <div id='sources-raster' className='pad2 keyline-bottom'>
                                    <h3 className='space-bottom1'><a href='#sources-raster' title='link to raster'>raster</a></h3>
                                    <p>
                                        光栅平铺数据来源。对于Mapbox确定的矢量平铺数据来源, <code>"url"</code> 数值格式必须为<code>mapbox://<var>mapid</var></code>.
                                    </p>
                                    <div className='space-bottom1 clearfix'>
                                        {highlightJSON(`
                                            "mapbox-satellite": {
                                                "type": "raster",
                                                "url": "mapbox://mapbox.satellite",
                                                "tileSize": 256
                                            }`)}
                                    </div>
                                    <div className='space-bottom1 clearfix'>
                                        { entries(ref.source_raster).map(([name, prop], i) =>
                                            name !== '*' && name !== 'type' &&
                                            <Item key={i} id={`sources-raster-${name}`} name={name} {...prop}/>)}
                                    </div>
                                    <SDKSupportTable {...{
                                        'basic functionality': {
                                            js: '0.10.0',
                                            android: '2.0.1',
                                            ios: '2.0.0',
                                            macos: '0.1.0'
                                        }
                                    }}/>
                                </div>

                                <div id='sources-raster-dem' className='pad2 keyline-bottom'>
                                    <h3 className='space-bottom1'><a href='#sources-raster-dem' title='link to raster-dem'>raster-dem</a></h3>
                                    <p>
                                        光栅DEM 数据来源。 目前仅支持 <a href="https://blog.mapbox.com/global-elevation-data-6689f1d0ba65">Mapbox Terrain RGB</a> (<code>mapbox://mapbox.terrain-rgb</code>)
                                    </p>
                                    <div className='space-bottom1 clearfix'>
                                        {highlightJSON(`
                                            "mapbox-terrain-rgb": {
                                                "type": "raster-dem",
                                                "url": "mapbox://mapbox.terrain-rgb"
                                            }`)}
                                    </div>
                                    <div className='space-bottom1 clearfix'>
                                        { entries(ref.source_raster_dem).map(([name, prop], i) =>
                                            name !== '*' && name !== 'type' &&
                                            <Item key={i} id={`sources-raster-dem-${name}`} name={name} {...prop}/>)}
                                    </div>
                                    <SDKSupportTable {...{
                                        'basic functionality': {
                                            js: '0.43.0'
                                        }
                                    }}/>
                                </div>

                                <div id='sources-geojson' className='pad2 keyline-bottom'>
                                    <h3 className='space-bottom1'><a href='#sources-geojson' title='link to geojson'>geojson</a></h3>
                                    <p>
                                         <a href="http://geojson.org/">GeoJSON</a> 数据来源。数据必须通过 <code>"data"</code>
                                        属性提供，其数值可为URL 或 inline GeoJSON。
                                    </p>
                                    <div className='space-bottom1 clearfix'>
                                        {highlightJSON(`
                                            "geojson-marker": {
                                                "type": "geojson",
                                                "data": {
                                                    "type": "Feature",
                                                    "geometry": {
                                                        "type": "Point",
                                                        "coordinates": [-77.0323, 38.9131]
                                                    },
                                                    "properties": {
                                                        "title": "Mapbox DC",
                                                        "marker-symbol": "monument"
                                                    }
                                                }
                                            }`)}
                                    </div>
                                    <p>
                                         GeoJSON 数据来源的例子是指通过其 URL的外部GeoJSON文件. 
                                        GeoJSON 文件必须在同一域名或通过  <a href='http://enable-cors.org/'>CORS</a>获取。
                                    </p>
                                    <div className='space-bottom1 clearfix'>
                                        {highlightJSON(`
                                            "geojson-lines": {
                                                "type": "geojson",
                                                "data": "./lines.geojson"
                                            }`)}
                                    </div>
                                    <div className='space-bottom1 clearfix'>
                                        { entries(ref.source_geojson).map(([name, prop], i) =>
                                            name !== '*' && name !== 'type' &&
                                            <Item key={i} id={`sources-geojson-${name}`} name={name} {...prop}/>)}
                                    </div>
                                    <SDKSupportTable {...{
                                        'basic functionality': {
                                            js: '0.10.0',
                                            android: '2.0.1',
                                            ios: '2.0.0',
                                            macos: '0.1.0'
                                        },
                                        'clustering': {
                                            js: '0.14.0',
                                            android: '4.2.0',
                                            ios: '3.4.0',
                                            macos: '0.3.0'
                                        }
                                    }}/>
                                </div>

                                <div id='sources-image' className='pad2 keyline-bottom'>
                                    <h3 className='space-bottom1'><a href='#sources-image' title='link to image'>image</a></h3>
                                    <p>
                                        图像来源。 <code>"url"</code> 数值包括图像位置。
                                    </p>
                                    <p>
                                        <code>"coordinates"</code> 数组包括 <code>[longitude, latitude]</code>顺时针顺序排列的图像拐角： 左上、右上、右下、左下。
                                    </p>
                                    <div className='space-bottom1 clearfix'>
                                        {highlightJSON(`
                                            "image": {
                                                "type": "image",
                                                "url": "https://www.mapbox.com/mapbox-gl-js/assets/radar.gif",
                                                "coordinates": [
                                                    [-80.425, 46.437],
                                                    [-71.516, 46.437],
                                                    [-71.516, 37.936],
                                                    [-80.425, 37.936]
                                                ]
                                            }`)}
                                    </div>
                                    <div className='space-bottom1 clearfix'>
                                        { entries(ref.source_image).map(([name, prop], i) =>
                                            name !== '*' && name !== 'type' &&
                                            <Item key={i} id={`sources-image-${name}`} name={name} {...prop}/>)}
                                    </div>
                                    <SDKSupportTable {...{
                                        'basic functionality': {
                                            js: '0.10.0',
                                            android: '5.2.0',
                                            ios: '3.7.0',
                                            macos: '0.6.0'
                                        }
                                    }}/>
                                </div>

                                <div id='sources-video' className='pad2 keyline-bottom'>
                                    <h3 className='space-bottom1'><a href='#sources-video' title='link to video'>video</a></h3>
                                    <p>
                                        视频来源。  <code>"urls"</code> 数值 为数组。对于数组中的每个 URL，
                                        会创建 <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Element/source">source</a> 
                                        视频元素，为了支持不同浏览器支持的多种格式的同一媒介。
                                   </p>
                                    <p>
                                         <code>"coordinates"</code> 数组包括 <code>[longitude, latitude]</code> 顺时针顺序排列的视频拐角： 左上、右上、右下、左下。 
                                    </p>
                                    <div className='space-bottom1 clearfix'>
                                        {highlightJSON(`
                                            "video": {
                                                "type": "video",
                                                "urls": [
                                                    "https://www.mapbox.com/drone/video/drone.mp4",
                                                    "https://www.mapbox.com/drone/video/drone.webm"
                                                ],
                                                "coordinates": [
                                                    [-122.51596391201019, 37.56238816766053],
                                                    [-122.51467645168304, 37.56410183312965],
                                                    [-122.51309394836426, 37.563391708549425],
                                                    [-122.51423120498657, 37.56161849366671]
                                                ]
                                            }`)}
                                    </div>
                                    <div className='space-bottom1 clearfix'>
                                        { entries(ref.source_video).map(([name, prop], i) =>
                                            name !== '*' && name !== 'type' &&
                                            <Item key={i} id={`sources-video-${name}`} name={name} {...prop}/>)}
                                    </div>
                                    <SDKSupportTable {...{
                                        'basic functionality': {
                                            js: '0.10.0'
                                        }
                                    }}/>
                                </div>
                            </div>
                        </div>

                        <div className='pad2 prose'>
                            <a id='sprite' className='anchor'></a>
                            <h2><a href='#sprite' title='link to sprite'>Sprite</a></h2>
                            <p>
                                 样式的<code>sprite</code> 属性提供下载渲染
                                <code>background-pattern</code>, <code>fill-pattern</code>, <code>line-pattern</code>,
                                和<code>icon-image</code> 样式属性使用的小图像的URL模板。
                            </p>
                            <div className='space-bottom1 pad2x clearfix'>
                                {highlightJSON(`"sprite": ${JSON.stringify(ref.$root.sprite.example, null, 2)}`)}
                            </div>
                            <p>
                                有效的来源必须提供两类文档：
                            </p>
                            <ul>
                                <li>
                                    <em>index file</em>为含有每张图像描述的JSON 文件。本文件的内容 
                                    必须为 JSON 物体，物体的主要格式标识用作上述样式属性的数值，并且其数值为描述(<code>width</code> and
                                    <code>height</code> properties) 在(<code>x</code> and <code>y</code>)之内的图像和图像位置尺寸和像素比例 (<code>pixelRatio</code>) 。例如，包括单张图像的来源可能有下述索引文件内容：                    
                                    <div className='space-bottom1 clearfix'>
                                        {highlightJSON(`
                                            {
                                                "poi": {
                                                    "width": 32,
                                                    "height": 32,
                                                    "x": 0,
                                                    "y": 0,
                                                    "pixelRatio": 1
                                                }
                                            }`)}
                                    </div>
                                    然后样式可通过创建带布局属性
                                    <code>"icon-image": "poi"</code>, 或 带标记化数值 <code>"icon-image": "{`{icon}`}"</code> 和 矢量平铺特征
                                    <code>icon</code> 带数值<code>poi</code>属性的符号图层参考该sprite 图像。
                                </li>
                                <li>
                                    <em>Image files</em>, which are PNG images containing the sprite data.
                                </li>
                            </ul>
                            <p>
                                Mapbox SDKs 会在样式中使用<code>sprite</code> 属性的数值 生成下载两类文档的 URLs 。首选，对两类文档来说， 会在高密度装置上的URL添加<code>@2x</code> to。
                                其次，会为索引文档添加 文件扩展名：<code>.json</code>，并且为图像文件添加 <code>.png</code> 。例如，如果指定 <code>"sprite": "https://example.com/sprite"</code>, 渲染设计师会下载
                                <code>https://example.com/sprite.json</code> 和<code>https://example.com/sprite.png</code>，或
                                <code>https://example.com/sprite@2x.json</code> 和 <code>https://example.com/sprite@2x.png</code>.
                            </p>
                            <p>
                                如有您正在使用 Mapbox Studio，您会使用Mapbox提供的预先创建的sprites, 或者可以上传定制的 SVG
                                图像创建您自己的 sprite。无论哪种情况，APIs会自动创建或提供sprite。如想想在自己的文件里手动创建sprite ，可以使用
                               <a href="https://github.com/mapbox/spritezero-cli">spritezero-cli</a>, 这是一个创建Mapbox
                                GL 兼容 sprite PNGs和从SVGs目录中创建索引文件的命令行实用程序。
                             </p>
                        </div>

                        <div className='pad2 prose'>
                            <a id='glyphs' className='anchor'></a>
                            <h2><a href='#glyphs' title='link to glyphs'>Glyphs</a></h2>
                            <p>
                                样式的 <code>glyphs</code> 属性提供下载PBF格式的有向距离场符号集合的URL 模板。
                            </p>
                            <div className='space-bottom1 pad2x clearfix'>
                                {highlightJSON(`"glyphs": ${JSON.stringify(ref.$root.glyphs.example, null, 2)}`)}
                            </div>
                            <p>
                                这一URL模板应包括两个符号：
                            </p>
                            <ul>
                                <li><code>{`{fontstack}`}</code>
                                    需要符号时，用符号图层的 <a href="#layout-symbol-text-font"><code>text-font</code></a> 属性中规定的字体栈的逗号分隔列表替换。
                                </li>
                                <li><code>{`{range}`}</code>
                                    请求字形时，此标记将替换为256个Unicode代码点。例如，加载<a href="https://en.wikipedia.org/wiki/Unicode_block">的Unicode Basic Latin字形和
                                    Basic Latin-1的Supplement blocks</a>, 这个范围是 <code>0-255</code>. 实际加载范围 
                                    是根据需要显示的文本在运行时确定的。
                                </li>
                            </ul>
                        </div>

                        <div className='pad2 prose'>
                            <a id='transition' className='anchor'></a>
                            <h2><a href='#transition' title='link to transition'>Transition</a></h2>
                            <p>
                               <code>转换</code> 属性控制可转换样式属性的之前数值和当前数值之间的插值时间。
                                样式的 <a href='#root-transition' title='link to root-transition'>
                                根 <code>transition</code></a> 属性提供岩石全球转换默认值。 任何可转换的样式
                                属性也可有自己的 <code>-transition</code> 定义特别图层特征的特别转换时间的属性，重新定义全球<code>transition</code> 数值。
                            </p>
                            <div className='space-bottom1 pad2x clearfix'>
                                {highlightJSON(`"transition": ${JSON.stringify(ref.$root.transition.example, null, 2)}`)}
                            </div>
                            <div className='pad2 keyline-all fill-white'>
                                { entries(ref.transition).map(([name, prop], i) =>
                                    <Item key={i} id={`transition-${name}`} name={name} {...prop}/>)}
                            </div>
                        </div>

                        <div className='pad2 prose'>
                            <a id='layers' className='anchor'></a>
                            <h2><a href='#layers' title='link to layers'>Layers</a></h2>
                            <p>
                                样式的 <code>layers</code>属性列出该样式中所有的图层。 
                                <code>"type"</code> 属性确定图层类型，同时该图层也必须为{layerTypes.map((t, i) => <var key={i}>{t}</var>).reduce((prev, curr) => [prev, ', ', curr])} 之一。
                            </p>
                            <p>
                                除了<var>背景</var> 类型的图层，每个图层需参考数据来源。图层取来源处的数据，选择性地过滤特征，然后确定样式。
                            </p>
                            <div className='space-bottom1 pad2x clearfix'>
                                {highlightJSON(`"layers": ${JSON.stringify(ref.$root.layers.example, null, 2)}`)}
                            </div>
                            <div className='pad2 keyline-all fill-white'>
                                { entries(ref.layer).map(([name, prop], i) =>
                                    <Item key={i} id={`layer-${name}`} name={name} {...prop}/>)}
                            </div>
                        </div>

                        <div className='pad2 prose'>
                            <p>
                                图层有两个决定如何渲染该图层上的数据的子属性： <code>layout</code> 和
                                <code>paint</code> 属性。
                            </p>
                            <p>
                                <em id="layout-property">布局属性</em> 出现在图层的 <code>"layout"</code> 物体。 它们应用于渲染过程中的早期，并且确定如何将该图层的数据传至GPU。布局属性的变动需要异步的“布局”步骤。
                            </p>
                            <p>
                                 <em id="paint-property">绘画属性</em> 应用在渲染过程的后期。绘画属性出现在图层的 P
                                <code>"paint"</code> 物体。绘画属性变动花费小， 并且可同步进行。
                             </p>
                            <div className='space-bottom4 fill-white keyline-all'>
                                {layerTypes.map((type, i) =>
                                    <div key={i} id={`layers-${type}`} className='pad2 keyline-bottom'>
                                        <h3 className='space-bottom1'><a href={`#layers-${type}`}>{type}</a></h3>

                                        { entries(ref[`layout_${type}`]).map(([name, prop], i) =>
                                            <Item key={i} id={`layout-${type}-${name}`} name={name} kind="layout" {...prop}/>)}

                                        { entries(ref[`paint_${type}`]).map(([name, prop], i) =>
                                            <Item key={i} id={`paint-${type}-${name}`} name={name} kind="paint" {...prop}/>)}
                                    </div>)}
                            </div>
                        </div>

                        <div className='pad2 prose'>
                            <a id='types' className='anchor'/>
                            <h2><a href='#types' title='link to types'>Types</a></h2>
                             <p>Mapbox 样式包含各种类型的数值，大部分通常为图层样式属性的数值。</p>

                            <div className='keyline-all fill-white'>
                                <div className='pad2 keyline-bottom'>
                                    <a id='types-color' className='anchor'/>
                                    <h3 className='space-bottom1'><a href='#types-color' title='link to color'>Color</a></h3>
                                    <p>
                                        <code>color</code> 类型表示 在 <a href="https://en.wikipedia.org/wiki/SRGB">sRGB color space</a>中的颜色。 颜色用各种经过许可的格式写为JSON 字符串： i HTML-style hex 数值， rgb, rgba, hsl, 和hsla. <code>黄色</code> 和 <code>blue</code>等预先确定的HTML颜色名称也是允许的。
                                    </p>
                                    {highlightJSON(`
                                        {
                                            "line-color": "#ff0",
                                            "line-color": "#ffff00",
                                            "line-color": "rgb(255, 255, 0)",
                                            "line-color": "rgba(255, 255, 0, 1)",
                                            "line-color": "hsl(100, 50%, 50%)",
                                            "line-color": "hsla(100, 50%, 50%, 1)",
                                            "line-color": "yellow"
                                        }`)}
                                   <p>特别注意hsl支持， 可为 <a href='http://mothereffinghsl.com/'>比rgb()</a>.</p>更容易推出
                                </div>

                                <div className='pad2 keyline-bottom'>
                                    <a id='types-string' className='anchor'/>
                                    <h3 className='space-bottom1'><a href='#types-string' title='link to string'>String</a></h3>
                                    <p>字符串基本上只是文本。在Mapbox样式中，您应把它放在引号中。</p>
                                    {highlightJSON(`
                                        {
                                            "icon-image": "marker"
                                        }`)}
                                </div>

                                <div className='pad2 keyline-bottom'>
                                    <a id='types-boolean' className='anchor'/>
                                    <h3 className='space-bottom1'><a href='#types-boolean' title='link to boolean'>Boolean</a></h3>
                                    <p>Boolean代表是或否, 所以它接受<code>true</code>或<code>false</code>两种值。</p>
                                    {highlightJSON(`
                                        {
                                            "fill-enabled": true
                                        }`)}
                                </div>

                                <div className='pad2 keyline-bottom'>
                                    <a id='types-number' className='anchor'/>
                                    <h3 className='space-bottom1'><a href='#types-number' title='link to number'>Number</a></h3>
                                    <p>数值通常是浮点数（小数）的整数。不加引号。</p>
                                    {highlightJSON(`
                                        {
                                            "text-size": 24
                                        }`)}
                                </div>

                                <div className='pad2 keyline-bottom'>
                                    <a id='types-array' className='anchor'/>
                                    <h3 className='space-bottom1'><a href='#types-array' title='link to array'>Array</a></h3>
                                    <p>数组是按特定顺序以逗号隔开的一个或多个数字列表。例如，可在虚线数组中使用，其中数字指定线的间隔，线之间有空格。</p>
                                    {highlightJSON(`
                                        {
                                            "line-dasharray": [2, 4]
                                        }`)}
                                </div>
                            </div>
                        </div>

                        <div className='pad2 prose'>
                            <a id='expressions' className='anchor'/>
                            <h2><a href='#expressions' title='link to expressions'>Expressions</a></h2>

                            <p><p><a href="#layout-property">布局属性</a>, <a
                                href="#paint-property">paint property</a>或 <a href="#layer-filter">filter</a> 的任何数值可被指定为
                                <em>expression</em>。 表达确定下文使用<em>operators</em> 属性计算数值的公式。Mapbox GL提供的表达运算符集合包括：
                            </p>

                            <ul>
                                <li>在数值上进行算法和其他运算的数学运算符</li>
                                <li>计算布尔值和做条件决定的逻辑运算符 </li>
                                <li>计算字符串的字符串运算符</li>
                                <li>数据运算符，能获取数据来源特点的属性</li>
                                <li>摄像机运算符，能获取确定当前地图视图的参数</li>
                            </ul>

                            <p>表达式表示为 JSON 数组。 表达式数组的第一个元素是
                                名称为表达式运算符的字符串，如 <a href="#expressions-*"><code>"*"</code></a>
                                或 <a href="#expressions-case"><code>"case"</code></a>. 后续元素（如有） 
                                为 <em>arguments</em> 表达式。参数为字面值
                                (字符串, 数字, 布尔值, 或 <code>null</code>), 或其他表达式数组 。</p>

                            <div className='col12 space-bottom'>
                                {highlightJSON(`[expression_name, argument_0, argument_1, ...]`)}
                            </div>

                            <h3>Data expressions</h3>
                            <p>A <em>data expression</em> is any expression that access feature data -- that is, any
                                expression that uses one of the data operators:
                                <a href="#expressions-get"><code>get</code></a>,
                                <a href="#expressions-has"><code>has</code></a>,
                                <a href="#expressions-id"><code>id</code></a>,
                                <a href="#expressions-geometry-type"><code>geometry-type</code></a>,
                                <a href="#expressions-properties"><code>properties</code></a>, or
                                <a href="#expressions-feature-state"><code>feature-state</code></a>. 数据表达式允许决定其出现的特征属性或状态。 
                                它们用于区分同一图层内的特征，并且进行数据可视化。</p>

                            <div className='col12 space-bottom'>
                                {highlightJSON(`
                                    {
                                        "circle-color": [
                                            "rgb",
                                            // feature.properties.temperature较高时，红色更高 
                                            ["get", "temperature"],
                                            // 绿色总是为零
                                            0,
                                            // feature.properties.temperature较低时，蓝色更高
                                            ["-", 100, ["get", "temperature"]]
                                        ]
                                    }`)}
                            </div>

                              <p>该例子使用 <a href="#expressions-get"><code>get</code></a> 运算符得到每个特征的
                                <code>温度</code> 数值。数值用于计算 
                                <a href="#expressions-rgb"><code>rgb</code></a> 运算符的参数，确定红色、绿色、蓝色。</p>
                             <p><a href="#layer-filter"><code>filter</code></a> 属性数值，和大部分绘画和布局属性的数值。
                             但是，有些绘画和布局属性还不能支持表达式。每个属性“SDK Support”表的“数据驱动样式”行显示支持的层次带
                                <a href="#expressions-feature-state"><code>feature-state</code></a> 运算符的数据表达式仅在绘画属性上显示。</p>


                            <p>数据表达式的值可以是
                                <a href="#layer-filter"><code>filter</code></a> 属性, 以及大多数绘图的值
                                和布局属性。但是，某些绘制和布局属性尚不支持数据
                                表达式。由“data-driven styling”的“SDK Support”行来表示对每个属性的支持情况。拥有<a href="#expressions-feature-state"><code>feature-state</code></a>运算符的数据表达式仅适用于
                                paint属性。</p>

                            <h3>相机表达式</h3>
                            <p><a id="camera-expression" className="anchor"></a><em>camera expression</em>是 使用 <a href="#expressions-zoom"><code>zoom</code></a> 运算符的任何表达式。此类表达式显示图层随着地图缩放比例变动。 摄像机表达式用于表达深度和控制数据密度。
                            </p>

                            <div className='col12 space-bottom'>
                                {highlightJSON(`
                                    {
                                        "circle-radius": [
                                            "interpolate", ["linear"], ["zoom"],
                                            // zoom is 5 (or less) -> circle radius will be 1px
                                            5, 1,
                                            // zoom is 10 (or greater) -> circle radius will be 5px
                                            10, 5
                                        ]
                                    }`)}
                            </div>

                            <p>该例子使用<a
                                href="#expressions-interpolate"><code>interpolate</code></a>
                                运算符确定使用输入输出的缩放比例和循环范围之间的线性关系。在这种情况下，表达式显示圆的半径在缩放比例为5或5以下时应为1像素，缩放比例为10或10以上时，圆的半径应为5像素。 在这之间，半径会在1-5像素之间线性分布。
                              </p>

                            <p>摄像机表达式可用在任何地方。但是，当摄像机表达式用作布局或绘画特性的数值时，必须为下列形式之一：</p>

                            <div className='col12 space-bottom'>
                                {highlightJSON(`[ "interpolate", interpolation, ["zoom"], ... ]`)}
                            </div>

                            <p>Or:</p>

                            <div className='col12 space-bottom'>
                                {highlightJSON(`[ "step", ["zoom"], ... ]`)}
                            </div>

                            <p>Or:</p>

                            <div className='col12 space-bottom'>
                                {highlightJSON(`
                                    [
                                        "let",
                                        ... variable bindings...,
                                        [ "interpolate", interpolation, ["zoom"], ... ]
                                    ]`)}
                            </div>

                            <p>Or:</p>

                            <div className='col12 space-bottom'>
                                {highlightJSON(`
                                    [
                                        "let",
                                        ... variable bindings...,
                                        [ "step", ["zoom"], ... ]
                                    ]`)}
                            </div>

                            <p>即，在布局或绘画属性中， <code>["zoom"]</code> 可作为外部 <a href="#expressions-interpolate"><code>interpolate</code></a> 或 <a
                                    href="#expressions-step"><code>step</code></a> 表达式的输入或
                                <a href="#expressions-let"><code>let</code></a> 表达式内的表达式出现。</p>
                             <p>摄像机表达式求值的时间中布局和绘图属性之间有很大的不同。随着缩放比例变动，对绘画属性的摄像机表达式重新求值，即使微小的变动，也需要重新求值。例如，地图缩放比例在4.1 和 4.6之间变动时，也会对绘画属性的摄像机表达式重新求值。而在另一方面，只有缩放比例为整数时，才对布局属性摄像机表达式重新求值。缩放比例在4.1 和 4.6之间之间变动-只有超过5或低于4时，才对<em>not</em>重新求值。
                            </p>

                            <h3>Composition</h3>
                             <p>单个表达式可使用数据运算符、摄像机运算符和其他运算符的混合。这个复合表达式让缩放比例<em>和</em>单个特征属性的组合决定图层是否出现。
                            </p>

                            <div className='col12 space-bottom'>
                                {highlightJSON(`
                                    {
                                        "circle-radius": [
                                            "interpolate", ["linear"], ["zoom"],
                                            // when zoom is 0, set each feature's circle radius to the value of its "rating" property
                                            0, ["get", "rating"],
                                            // when zoom is 10, set each feature's circle radius to four times the value of its "rating" property
                                            10, ["*", 4, ["get", "rating"]]
                                        ]
                                    }`)}
                            </div>

                             <p>使用数据和摄像机运算符的表达式被视为数据表达式和摄像机表达式，必须遵守上文规定的限制。</p>

                            <h3>类型系统/h3>
                           <p>表达式的输入参数以及其结果数值用<a
                                href="#types">types</a>的同一集合作为样式规范的其他部分： 这些类型的布尔值、字符串、颜色和数组。此外， 表达式为： <em>type safe</em>:
                                表达式的每次使用均有结果类型和要求的参数类型，并且
                                SDKs验证表达式的结果类型适合其所用的场景。例如， 
                                <a
                                href="#layer-filter"><code>filter</code></a> 属性中的表达式结果类型必须为<a
                                href="#types-boolean">boolean</a>，并且 <a
                                href="#expressions-+"><code>+</code></a>运算符的参数必须为<a
                                href="#types-number">numbers</a>。
                            </p>

                            <p>使用特征数据时，SDK一般不能提前知道特征属性数值的类型。为了保护类型的安全性，对数据表达式求值时，SDK会检查属性数值是否适合情景。
                            例如，如果使用表达式
                               <code>["get", "feature-color"]</code> 作为 <a
                                    href="#paint-circle-circle-color"><code>circle-color</code></a>属性， SDK会验证
                                <code>feature-color</code> 每个特征的数值是否为有效的
                                <a href="#types-color">color</a>的字符串。如果不是，会以SDK特定的方式 （一般为日志信息）
                            显示错误, 会用属性的默认值替代。
                            </p>

                            <p>在大多数情况下，需要时会自动验证。但是，在某些情况下，SDK不可能从周围的情景中自动决定数据表达式的预期结果类型。 例如， 
                                表达式 <code>["&lt;", ["get", "a"], ["get", "b"]]</code>是否对比字符串或数字尚不清楚。
                                在这种情况下，可以使用
                                 <em>type assertion</em> 表达式运算符之一显示
                                数据表达式 <code>["&lt;", ["number", ["get", "a"]], ["number", ["get", "b"]]]</code>的预期类型。检查类型确认特征数据确实与数据表达式的预期类型匹配。
                               如果不匹配，就会出现错误，导致整个表达式回到确认属性的默认值。确认运算符为<a
                                    href="#expressions-types-array"><code>array</code></a>, <a
                                    href="#expressions-types-boolean"><code>boolean</code></a>, <a
                                    href="#expressions-types-number"><code>number</code></a>, and <a
                                    href="#expressions-types-string"><code>string</code></a>.
                            </p>

                            <p>表达式仅执行一类隐含的类型转换： 
                                用于 <a href="#types-color">color</a>情景的数据表达式预计能将颜色的字符串表示转换为颜色数值。 在所有其他情况下，如果想在不同类型间转换，必须使用
                                <em>type conversion</em> 表达式运算符：
                                    <a
                                    href="#expressions-types-to-boolean"><code>to-boolean</code></a>, <a
                                    href="#expressions-types-to-number"><code>to-number</code></a>, <a
                                    href="#expressions-types-to-string"><code>to-string</code></a>, or <a
                                    href="#expressions-types-to-color"><code>to-color</code></a>. 例如，如果有以字符串格式储存数值的特征属性， if you
                               并且想将这些数值 
                                数字，而不是字符串， 可使用如
                                <code>["to-number", ["get", "property-name"]]</code>的表达式。
                            </p>

                            <h3>Expression reference</h3>

                            <div className='keyline-all fill-white'>
                                {groupedExpressions.map((group, i) =>
                                    <div key={i} className='pad2 keyline-bottom'>
                                        <h4 className="pad2x" style={{fontSize: '100%'}}>
                                            <a id={`expressions-${slug(group.name)}`} href={`#expressions-${slug(group.name)}`}>{group.name}</a>
                                        </h4>

                                        {group.name === "Types" &&
                                            <div>
                                                 <p>本章节中的表达式是为了测试并在字符串、数字和布尔值等不同的数据类型之间转换
                                                 </p>
                                                 <p>通常情况下，此类测试和转换并不是必须的，但是某种子表达式的类型模糊不清是，某些表达式需要此类测试和转换。特征数据类型不一致的情况下，此类测试和转换也非常有用；例如，
                                                 可以使用 <code>数字</code> 确保
                                                   <code>"1.5"</code>这样的数值 (而不是<code>1.5</code>) 被当做数宇值。

                                                </p>
                                            </div>}

                                        {group.name === "Decision" &&
                                            <p>
                                                本章节中的表达式可被用作样式增添的条件逻辑。例如，
                                                <a
                                                    href="#expressions-case"><code>'case'</code></a> expression
                                                提供基本的 "if/then/else" 逻辑，并且 <a
                                                    href="#expressions-match"><code>'match'</code></a> 可以绘制不同输出表达式的输入表达式的特定数值。
                                            </p>}

                                        {group.expressions.map(({name, doc, type, sdkSupport}, i) =>
                                            <div key={i} className='col12 clearfix pad0y pad2x space-top0'>
                                                <span className='space-right'>
                                                    <a className='code'
                                                        id={`expressions-${group.name === "Types" ? "types-" : ""}${name}`}
                                                        href={`#expressions-${group.name === "Types" ? "types-" : ""}${name}`}>{name}</a>
                                                    {doc && <div>{md(doc)}</div>}
                                                </span>
                                                {type.map((overload, i) =>
                                                    <div key={i}>{highlightJavascript(renderSignature(name, overload))}</div>)}
                                                {sdkSupport && <div className='space-top2 space-bottom2'><SDKSupportTable {...sdkSupport} /></div>}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className='pad2 prose'>
                            <a id='other' className='anchor'/>
                            <h2><a href='#other' title='link to other'>Other</a></h2>
                            <div className='keyline-all fill-white'>
                                <div className='pad2 keyline-bottom'>
                                    <a id='other-function' className='anchor'/>
                                    <h3 className='space-bottom1'><a href='#other-function' title='link to function'>Function</a></h3>

                                    <p>任何布局或绘画属性的数值可被指定为 <em>函数</em>。函数可以呈现地图特征随着当前缩放比例和/或特征属性变动。</p>
                                    <div className='col12 pad1x'>
                                        <div className="col12 clearfix pad0y pad2x space-bottom2">
                                            <div><span className='code'><a id="function-stops" href="#function-stops">stops</a></span>
                                            </div>
                                            <div><em className='quiet'>Required (except
                                                for <var>identity</var> functions) <a href='#types-array'>array</a>.</em></div>
                                            <div>函数定义为输入和输出数值。一个输入数值和一个输出数值的集合称为“停止”。停止输出数值必须为文字值（如非函数或表达式），并且适合属性。例如
                                               用于 <code>fill-color</code> 属性函数的停止输出数值必须为<a href="#types-color">colors</a>。
                                            </div>
                                        </div>
                                        <div className="col12 clearfix pad0y pad2x space-bottom2">
                                            <div><span className='code'><a id="function-property"
                                                href="#function-property">property</a></span>
                                            </div>
                                            <div><em className='quiet'>Optional <a href='#types-string'>string</a>.</em>
                                            </div>
                                            <div>如指定，函数会将特定的特征属性作为输入。更多信息，见
                                              <a href="#types-function-zoom-property">缩放函数和属性函数</a> 。
                                            </div>
                                        </div>
                                        <div className="col12 clearfix pad0y pad2x space-bottom2">
                                            <div><span className='code'><a id="function-base"
                                                href="#function-base">base</a></span></div>
                                            <div><em className='quiet'>Optional <a href='#types-number'>number</a>.
                                                Default is {ref.function.base.default}.</em></div>
                                            <div>插值曲线的指数基。函数值增大时。指数基控制大小。较大的数值输出朝范围的顶端增大。数值接近1时，输出呈直线形增大。
                                            </div>
                                        </div>
                                        <div className="col12 clearfix pad0y pad2x space-bottom2">
                                            <div><span className='code'><a id="function-type"
                                                href="#function-type">type</a></span></div>
                                            <div><em className='quiet'>Optional <a href='#types-string'>string</a>. One
                                                of <code>"identity"</code>, <code>"exponential"</code>, <code>"interval"
                                                </code>, or <code>"categorical"</code>.</em>
                                            </div>
                                            <dl>
                                                <dt><code>"identity"</code></dt>
                                                <dd>A function that returns its input as the output.</dd>
                                                <dt><code>"exponential"</code></dt>
                                                <dd>通过停止之间插值生成输出的函数正好小于和大于函数输入。域名（输入数值）必须是数字，样式属性必须支持插值。样式属性以
                                                <span
                                                        className='icon smooth-ramp quiet micro space-right indivne'
                                                        title='continuous'/>标记，
                                                    "exponential" 符号，和<var>exponential</var> 是这些属性的默认函数类型。
                                                </dd>
                                                <dt><code>"interval"</code></dt>
                                                <dd>返回停止输出数值的函数正好小于函数输入。域名（输入数值）必须为数字。
                                                    任何式样属性可用区间函数。对于标记 
                                                    <span className='icon step-ramp quiet micro space-right indivne'
                                                        title='discrete'/>的属性，“interval” 符号即为默认函数类型。
                                                </dd>
                                                <dt><code>"categorical"</code></dt>
                                                <dd>返回停止输出数值的函数等于函数输入。
                                                </dd>
                                            </dl>
                                        </div>
                                        <div className="col12 clearfix pad0y pad2x space-bottom2">
                                            <div><span className='code'><a id="function-default"
                                                href="#function-default">default</a></span>
                                            </div>
                                            <div>没有其他数值时，数值为后退函数结果，用于以下情形：
                                            </div>
                                            <ul>
                                                <li>在分类函数中，特征数值与任何停止域名数值不匹配时。
                                                </li>
                                                <li>在属性和缩放属性函数中，特征不含特定属性的数值。
                                                </li>
                                                <li>在恒等函数中，特征数值对样式属性取消时（例如，如果函数用于<var>circle-color</var>属性，但是特征属性数值不是字符串或有效颜色）。
                                                </li>
                                                <li>在区间或指数属性和缩放特定函数中，特征数值为数字时。
                                                </li>
                                            </ul>
                                            <div>若未提供默认值，样式属性的默认值用于这些情形。
                                            </div>
                                        </div>
                                        <div className="col12 clearfix pad0y pad2x space-bottom2">
                                            <div><span className='code'><a id="function-colorSpace"
                                                href="#function-colorSpace">colorSpace</a></span>
                                            </div>
                                            <div><em className='quiet'>Optional <a href='#types-string'>string</a>. One of
                                                <code>"rgb"</code>, <code>"lab"</code>, <code>"hcl"</code>.</em></div>
                                            <div className=' space-bottom1'>颜色插值的颜色空间。与在RGB空间内插值的颜色相比，
                                             在LAB和HCL等感性颜色空间内插值的颜色倾向生成看起来更加一致的颜色渐变以及更容易区分的颜色。
                                            </div>
                                            <dl className="space-bottom">
                                                <dt><code>"rgb"</code></dt>
                                                <dd>使用RGB颜色空间插值颜色数值</dd>
                                                <dt><code>"lab"</code></dt>
                                                <dd>使用LAB 颜色空间插值颜色数值</dd>
                                                <dt><code>"hcl"</code></dt>
                                                <dd>使用HCL颜色空间插值颜色数值，分别插值色调、色度和亮度通道。
                                                </dd>
                                            </dl>
                                        </div>
                                    </div>

                                    <div className="space-bottom">
                                        <SDKSupportTable {...{
                                            'basic functionality': {
                                                js: '0.10.0',
                                                android: '2.0.1',
                                                ios: '2.0.0',
                                                macos: '0.1.0'
                                            },
                                            '`property`': {
                                                js: '0.18.0',
                                                android: '5.0.0',
                                                ios: '3.5.0',
                                                macos: '0.4.0'
                                            },
                                            '`code`': {
                                                js: '0.18.0',
                                                android: '5.0.0',
                                                ios: '3.5.0',
                                                macos: '0.4.0'
                                            },
                                            '`exponential` type': {
                                                js: '0.18.0',
                                                android: '5.0.0',
                                                ios: '3.5.0',
                                                macos: '0.4.0'
                                            },
                                            '`interval` type': {
                                                js: '0.18.0',
                                                android: '5.0.0',
                                                ios: '3.5.0',
                                                macos: '0.4.0'
                                            },
                                            '`categorical` type': {
                                                js: '0.18.0',
                                                android: '5.0.0',
                                                ios: '3.5.0',
                                                macos: '0.4.0'
                                            },
                                            '`identity` type': {
                                                js: '0.26.0',
                                                android: '5.0.0',
                                                ios: '3.5.0',
                                                macos: '0.4.0'
                                            },
                                            '`default`': {
                                                js: '0.33.0',
                                                android: '5.0.0',
                                                ios: '3.5.0',
                                                macos: '0.4.0'
                                            },
                                            '`colorSpace`': {
                                                js: '0.26.0'
                                            }
                                        }}/>
                                    </div>

                                    <p><strong>Zoom functions</strong> 呈现地图特征随着地图缩放比例变动而变动。缩放函数可用于产生立体感效应并控制数据密度。每个停顿是带两个元素的数组：第一个元素是缩放比例，第二个是函数输出数值。</p>

                                    <div className='col12 space-bottom'>
                                        {highlightJSON(`
                                            {
                                                "circle-radius": {
                                                    "stops": [
                                                        // zoom is 5 -> circle radius will be 1px
                                                        [5, 1],
                                                        // zoom is 10 -> circle radius will be 2px
                                                        [10, 2]
                                                    ]
                                                }
                                            }`)}
                                    </div>

                                    <p> <a href='#types-color'>color</a>的渲染数值， <a href='#types-number'>number</a>和 <a href='#types-array'>array</a> 属性在停顿之间插值。 <a href='#types-boolean'>Boolean</a> 和 <a href='#types-string'>string</a> 属性数值不能被插值，，因此其渲染数值仅在特定停顿时变动。 </p>

                                    <p><em>layout</em> 和 <em>paint</em>特性的缩放函数渲染方式存在很大的不同。缩放比例变动时，即使是微小的变动，也要对绘画特性继续重新计算数值。 例如，随着地图在缩放比例<code>4.1</code> 和 <code>4.6</code>之间变动，绘画特性的渲染数值也会变动。在另一方面，每个整数缩放比例，只对布局属性计算一次。继续上面的例子：无论指定什么停顿，布局属性的渲染会在<em>not</em> 缩放比例 <code>4.1</code> 和 <code>4.6</code>之间变动；但是缩放比例为 <code>5</code>，会根据函数重新计算函数，并且属性的渲染值会变动。（可在布局属性缩放函数中包括小数缩放比例，并且会将影响生成的数值；但是，渲染仍只有是缩放比例为整数时变动。）</p>
                                    
                                    <p><strong>属性函数</strong>呈现地图特征随着其属性变动而变动。 属性函数可用作可视化区分同一层级内的特征类型或进行数据可视化。每个停顿为带两个元素的数组：第一个元素是属性输入数值，第二个是函数输出数值。注意此时所有属性和平台不能使用属性函数支持。

                                    <div className='col12 space-bottom'>
                                        {highlightJSON(`
                                            {
                                                "circle-color": {
                                                    "property": "temperature",
                                                    "stops": [
                                                        // "temperature" is 0   -> circle color will be blue
                                                        [0, 'blue'],
                                                        // "temperature" is 100 -> circle color will be red
                                                        [100, 'red']
                                                    ]
                                                }
                                            }`)}
                                    </div>

                                    <p><a id='types-function-zoom-property' className='anchor'></a><strong>Zoom-and-property functions</strong> 显示地图特征随着其特性 <em>和</em> 缩放变动而变动。每个停顿是带两个元素的数组：第一个元素是带属性输入数值和缩放的物体，第二个是函数输出数值。注意属性函数的支持尚不完整。 </p>

                                    <div className='col12 space-bottom'>
                                        {highlightJSON(`
                                            {
                                                "circle-radius": {
                                                    "property": "rating",
                                                    "stops": [
                                                        // zoom is 0 and "rating" is 0 -> 圆弧半径会为 0px
                                                        [{zoom: 0, value: 0}, 0],

                                                        // zoom is 0 and "rating" is 5 -> 圆弧半径会为 5px
                                                        [{zoom: 0, value: 5}, 5],

                                                        // zoom is 20 and "rating" is 0 -> 圆弧半径会为 0px
                                                        [{zoom: 20, value: 0}, 0],

                                                        // zoom is 20 and "rating" is 5 -> 圆弧半径会为20px
                                                        [{zoom: 20, value: 5}, 20]
                                                    ]
                                                }
                                            }`)}
                                    </div>
                                </div>

                                <div className='pad2'>
                                    <a id='other-filter' className='anchor'></a>
                                    <h3 className='space-bottom1'><a href='#other-filter' title='link to filter'>Filter (deprecated syntax)</a></h3>
                                    <p>在样式规格之前的版本中，用下述弃用的句法定义<a href="#layer-filter">filters</a> 。虽然用该句法确定的过滤继续有效，建议采用更灵活的<a href="#expressions">expression</a> 句法。在单独的过滤定义中不能混淆表达式句法和弃用句法 。</p>

                                    <div className='col12 clearfix space-bottom2'>

                                        <h4>Existential Filters</h4>

                                        <div className='space-bottom1'>
                                            <code>["has", <var>key</var>]</code> <span className='quiet pad1x strong small'><var>feature[key]</var> exists</span>
                                        </div>
                                        <div className='space-bottom1'>
                                            <code>["!has", <var>key</var>]</code> <span className='quiet pad1x strong small'><var>feature[key]</var> does not exist</span>
                                        </div>

                                        <h4>Comparison Filters</h4>

                                        <div className='space-bottom1'>
                                            <code>["==", <var>key</var>, <var>value</var>]</code> <span className='quiet pad1x strong small'>equality: <var>feature[key]</var> = <var>value</var></span>
                                        </div>
                                        <div className='space-bottom1'>
                                            <code>["!=", <var>key</var>, <var>value</var>]</code> <span className='quiet pad1x strong small'>inequality: <var>feature[key]</var> ≠ <var>value</var></span>
                                        </div>
                                        <div className='space-bottom1'>
                                            <code>["&gt;", <var>key</var>, <var>value</var>]</code> <span className='quiet pad1x strong small'>greater than: <var>feature[key]</var> > <var>value</var></span>
                                        </div>
                                        <div className='space-bottom1'>
                                            <code>["&gt;=", <var>key</var>, <var>value</var>]</code> <span className='quiet pad1x strong small'>greater than or equal: <var>feature[key]</var> ≥ <var>value</var></span>
                                        </div>
                                        <div className='space-bottom1'>
                                            <code>["&lt;", <var>key</var>, <var>value</var>]</code> <span className='quiet pad1x strong small'>less than: <var>feature[key]</var> &lt; <var>value</var></span>
                                        </div>
                                        <div className='space-bottom1'>
                                            <code>["&lt;=", <var>key</var>, <var>value</var>]</code> <span className='quiet pad1x strong small'>less than or equal: <var>feature[key]</var> ≤ <var>value</var></span>
                                        </div>

                                        <h4>Set Membership Filters</h4>

                                        <div className='space-bottom1'>
                                            <code>["in", <var>key</var>, <var>v0</var>, ..., <var>vn</var>]</code> <span className='quiet pad1x strong small'>set inclusion: <var>feature[key]</var> ∈ {`{`}<var>v0</var>, ..., <var>vn</var>{`}`}</span>
                                        </div>
                                        <div className='space-bottom1'>
                                            <code>["!in", <var>key</var>, <var>v0</var>, ..., <var>vn</var>]</code> <span className='quiet pad1x strong small'>set exclusion: <var>feature[key]</var> ∉ {`{`}<var>v0</var>, ..., <var>vn</var>{`}`}</span>
                                        </div>

                                        <h4>Combining Filters</h4>

                                        <div className='space-bottom1'>
                                            <code>["all", <var>f0</var>, ..., <var>fn</var>]</code> <span className='quiet pad1x strong small'>logical <code>AND</code>: <var>f0</var> ∧ ... ∧ <var>fn</var></span>
                                        </div>
                                        <div className='space-bottom1'>
                                            <code>["any", <var>f0</var>, ..., <var>fn</var>]</code> <span className='quiet pad1x strong small'>logical <code>OR</code>: <var>f0</var> ∨ ... ∨ <var>fn</var></span>
                                        </div>
                                        <div className='space-bottom1'>
                                            <code>["none", <var>f0</var>, ..., <var>fn</var>]</code> <span className='quiet pad1x strong small'>logical <code>NOR</code>: ¬<var>f0</var> ∧ ... ∧ ¬<var>fn</var></span>
                                        </div>
                                    </div>

                                    <p>
                                       <var>key</var> 必须是能明确特征属性的字符串或者是下述特殊键：
                                    </p>
                                    <ul>
                                        <li><code>"$type"</code>：特征类型。 该键可与  <code>"=="</code>,
                                            <code>"!="</code>、 <code>"in"</code>、和 <code>"!in"</code> 运算符一起使用。可能的数值为 
                                            <code>"Point"</code>, <code>"LineString"</code>, and <code>"Polygon"</code>.</li>
                                        <li><code>"$id"</code>：特征 标识符。该键可与 <code>"=="</code>,
                                            <code>"!="</code>, <code>"has"</code>, <code>"!has"</code>, <code>"in"</code>,
                                            和<code>"!in"</code> 运算符一起使用。</li>
                                    </ul>
                                    <p>
                                        <var>value</var> (and <var>v0</var>, ..., <var>vn</var> 集合运算符) 必须是与属性数值对比的
                                        <a href="#string">string</a>, <a href="#number">number</a>, or <a href="#boolean">boolean</a> 。
                                    </p>

                                    <p>
                                        设置成员关系过滤是测试字段是否与多个数值匹配的简单而有效的方式。
                                    </p>

                                    <p>
                                        对比和设置成员关系过滤是严格类型化对比。例如，所有下述求值不成立：
                                        <code>0 &lt; "1"</code>, <code>2 == "2"</code>, <code>"true" in [true, false]</code>。
                                    </p>

                                    <p>
                                       <code>0 &lt; "1"</code>, <code>2 == "2"</code>, <code>"true" in [true, false]</code>。
                                       <code>"all"</code>, <code>"any"</code>和 <code>"none"</code> 过滤运算符用作创建复合过滤器。 数值  <var>f0</var>, ..., <var>fn</var> 必须自行过滤表达式。
                                    </p>

                                    <div className='space-bottom1 clearfix'>
                                        {highlightJSON(`["==", "$type", "LineString"]`)}
                                    </div>

                                    <p>
                                        该过滤要求 <code>class</code> 每个特征的属性等于 "street_major", "street_minor",
                                        或 "street_limited"。
                                    </p>

                                    <div className='space-bottom1 clearfix'>
                                        {highlightJSON(`["in", "class", "street_major", "street_minor", "street_limited"]`)}
                                    </div>

                                    <p>
                                        复合过滤器将其他三个过滤器“全都”组合并且要求它们都包含一个特征：
                                        <code>class</code> 等于 "street_limited"的特征，其 <code>admin_level</code> 必须大于或等于 3，并且其类型不能为多边形。 可将复合过滤器变成“任何”Y含有匹配那些标准特征的过滤器-多边形特征，但是有不同的
                                        <code>class</code> 数值，等等。 
                                    </p>

                                    <div className='space-bottom1 clearfix'>
                                        {highlightJSON(`
                                            [
                                                "all",
                                                ["==", "class", "street_limited"],
                                                [">=", "admin_level", 3],
                                                ["!in", "$type", "Polygon"]
                                            ]`)}
                                    </div>

                                    <SDKSupportTable {...{
                                        'basic functionality': {
                                            js: '0.10.0',
                                            android: '2.0.1',
                                            ios: '2.0.0',
                                            macos: '0.1.0'
                                        },
                                        '`has` / `!has`': {
                                            js: '0.19.0',
                                            android: '4.1.0',
                                            ios: '3.3.0',
                                            macos: '0.1.0'
                                        }
                                    }}/>
                                </div>
                            </div>

                        </div>

                    </div>
                </div>
            </PageShell>
        );
    }
}
