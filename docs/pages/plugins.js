import React from 'react';
import slug from 'slugg';
import {prefixUrl} from '@mapbox/batfish/modules/prefix-url';
import md from '@mapbox/batfish/modules/md'; // eslint-disable-line import/no-unresolved
import PageShell from '../components/page_shell';
import LeftNav from "../components/left_nav";
import TopNav from "../components/top_nav";
import entries from 'object.entries';

const meta = {
    title: 'Mapbox GL JS Plugins',
    description: '',
    pathname: '/plugins'
};

const plugins = {
    "UI插件": {
        "mapbox-gl-accessibility": {
            "website": "https://github.com/mapbox/mapbox-gl-accessibility/",
            "description": "为视力障碍的用户集成ARIA屏幕阅读器"
        },
        "mapbox-gl-boundaries": {
            "website": "https://github.com/mapbox/mapbox-gl-boundaries",
            "description": "允许用户展示/隐藏有争议的地图边界"
        },
        "mapbox-gl-compare": {
            "website": "https://github.com/mapbox/mapbox-gl-compare",
            "description": "允许用户通过左右滑动，来比较两张地图",
            "example": "mapbox-gl-compare"
        },
        "mapbox-gl-directions": {
            "website": "https://github.com/mapbox/mapbox-gl-directions",
            "description": "添加控件，允许用户在地图上规划自驾、骑行、步行的路线",
            "example": "mapbox-gl-directions"
        },
        "mapbox-gl-draw": {
            "website": "https://github.com/mapbox/mapbox-gl-draw",
            "description": "在Mapbox GL JS地图上添加绘制和编辑功能",
            "example": "mapbox-gl-draw"
        },
        "mapbox-gl-geocoder": {
            "website": "https://github.com/mapbox/mapbox-gl-geocoder",
            "description": "为Mapbox GL JS添加Geocoder控制",
            "example": "mapbox-gl-geocoder"
        },
        "mapboxgl-minimap": {
            "website": "https://github.com/aesqe/mapboxgl-minimap",
            "description": "添加一个控件，展示当前地图的微型预览"
        }
    },
    "地图渲染插件": {
        "mapbox-gl-language": {
            "website": "https://github.com/mapbox/mapbox-gl-language/",
            "description": "自动将地名翻译为当前用户的语言"
        },
        "mapbox-gl-rtl-text": {
            "website": "https://github.com/mapbox/mapbox-gl-rtl-text",
            "description": "允许Mapbox GL JS支持添加，可读性为从右至左的文本",
            "example": "mapbox-gl-rtl-text"
        },
        "deck.gl": {
            "website": "https://github.com/uber/deck.gl",
            "description": "为Mapbox GL JS添加WebGl的可视化图层"
        }
    },
    "框架集成": {
        "echartslayer": {
            "website": "https://github.com/lzxue/echartLayer",
            "description": md`为Mapbox GL JS集成[echarts](https://ecomfe.github.io/echarts/index-en.html)`
        },
        "wtMapbox": {
            "website": "https://github.com/yvanvds/wtMapbox",
            "description": md`为Mapbox GL JS集成[Webtoolkit](https://www.webtoolkit.eu/wt)`
        },
        "react-mapbox-gl": {
            "website": "https://github.com/alex3165/react-mapbox-gl",
            "description": md`为Mapbox GL JS集成[React](https://facebook.github.io/react/)`
        },
        "angular-mapboxgl-directive": {
            "website": "https://github.com/Naimikan/angular-mapboxgl-directive",
            "description": md`为Mapbox GL JS提供[AngularJS](https://angularjs.org/)指令`
        },
        "ngx-mapbox-gl": {
            "website": "https://github.com/Wykks/ngx-mapbox-gl",
            "description": md`为Mapbox GL JS集成[Angular](https://angular.io/)`
        }
    },
    "实用工具库": {
        "turf": {
            "website": "http://turfjs.org/",
            "description": "提供高级的地理空间分析工具"
        },
        "mapbox-gl-layer-groups": {
            "website": "https://github.com/mapbox/mapbox-gl-layer-groups",
            "description": "在Mapbox GL JS上管理图层组"
        },
        "expression-jamsession": {
            "website": "https://github.com/mapbox/expression-jamsession/",
            "description": md`将[Mapbox Studio formulas](https://www.mapbox.com/help/studio-manual-styles/#use-a-formula)转变为[expressions](https://www.mapbox.com/mapbox-gl-js/style-spec/#expressions)`
        },
        "simplespec-to-gl-style": {
            "website": "https://github.com/mapbox/simplespec-to-gl-style",
            "description": md`通过[\`simplestyle-spec\`](https://github.com/mapbox/simplestyle-spec/)将GeoJSON转化为Mapbox GL Style`
        },
        "mapbox-gl-supported": {
            "website": "https://github.com/mapbox/mapbox-gl-supported",
            "description": "确认当前浏览器是否支持Mapbox GL JS",
            "example": "mapbox-gl-supported"
        },
        "mapbox-gl-sync-move": {
            "website": "https://github.com/mapbox/mapbox-gl-sync-move",
            "description": "在两张Mapbox GL JS地图同步移动"
        },
        "mapbox-choropleth": {
            "website": "https://github.com/stevage/mapbox-choropleth",
            "description": "通过CSV源和geometry源创建choropleth图层"
        }
    },
    "开发工具": {
        "mapbox-gl-js-mock": {
            "website": "https://github.com/mapbox/mapbox-gl-js-mock",
            "description": md`Mapbox GL JS的[mock](https://en.wikipedia.org/wiki/Mock_object)工具`
        },
        "mapbox-gl-inspect": {
            "website": "https://github.com/lukasmartinelli/mapbox-gl-inspect",
            "description": "添加一个检查控件，查看矢量源的功能与属性"
        },
        "mapbox-gl-fps": {
            "website": "https://github.com/MazeMap/mapbox-gl-fps",
            "description": "一个帧每秒的GUI控件，检测和输出统计报告"
        }
    }
};

export default class extends React.Component {
    render() {
        return (
            <PageShell meta={meta}>
                <LeftNav>
                    <div>
                        {entries(plugins).map(([title, plugins], i) =>
                            <div key={i} className="space-bottom">
                                <a href={prefixUrl(`/plugins/#${slug(title)}`)} className='dark-link block small truncate'>{title}</a>
                                {entries(plugins).map(([name], i) =>
                                    <a key={i} href={prefixUrl(`/plugins/#${slug(name)}`)} className='block small truncate'>{name}</a>
                                )}
                            </div>
                        )}
                    </div>
                </LeftNav>

                <div className='limiter clearfix'>
                    <TopNav current='plugins'/>

                    <div className='contain margin3 col9'>
                        <div id='plugins' className='doc' data-swiftype-index='true'>
                            {entries(plugins).map(([title, plugins], i) =>
                                <div key={i} className='space-bottom4'>
                                    <a id={slug(title)}/>
                                    <h2 className='space-bottom1'>{title}</h2>
                                    {entries(plugins).map(([name, plugin], i) =>
                                        <div key={i} className='space-bottom1 keyline-all pad2 fill-white'>
                                            <a id={slug(name)}/>
                                            <h3><a href={plugin.website}>{name}</a></h3>
                                            { plugin.example && <a
                                                className="small quiet rcon"
                                                href={prefixUrl(`/example/${plugin.example}`)}>查看示例</a> }
                                            <p>{ plugin.description }</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </PageShell>
        );
    }
}
