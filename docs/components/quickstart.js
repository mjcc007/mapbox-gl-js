import React from 'react';
import {prefixUrl} from '@mapbox/batfish/modules/prefix-url';
import urls from './urls';
import {version} from '../../package.json';
import {highlightJavascript, highlightMarkup, highlightShell} from './prism_highlight';
import Copyable from './copyable';

class QuickstartCDN extends React.Component {
    render() {
        return (
            <div id='quickstart-cdn'>
                <p>引入 JavaScript 和 CSS 文件到你 HTML 文件<code>&lt;head&gt;</code>标签里</p>
                <Copyable>
                    {highlightMarkup(`
                        <script src='${urls.js()}'></script>
                        <link href='${urls.css()}' rel='stylesheet' />
                    `)}
                </Copyable>

                <p>将以下代码复制到你 HTML 文件的 <code>&lt;body&gt;</code></p>
                <Copyable>
                    {highlightMarkup(`
                        <div id='map' style='width: 400px; height: 300px;'></div>
                        <script>
                        mapboxgl.accessToken = '${this.props.token}';
                        var map = new mapboxgl.Map({
                            container: 'map',
                            style: 'mapbox://styles/mapbox/streets-v9'
                        });
                        </script>
                    `)}
                </Copyable>
            </div>
        );
    }
}

class QuickstartBundler extends React.Component {
    render() {
        return (
            <div id='quickstart-bundler'>
                <p>添加 npm 包.</p>
                {highlightShell(`npm install --save mapbox-gl`)}

                <p>引入 CSS 文件到你的 HTML 文件<code>&lt;head&gt;</code>标签里</p>
                <Copyable>
                    {highlightMarkup(`<link href='${urls.css()}' rel='stylesheet' />`)}
                </Copyable>

                <p>将以下代码复制到你 HTML 文件的 <code>&lt;body&gt;</code></p>
                <Copyable>
                    {highlightJavascript(`
                        import mapboxgl from 'mapbox-gl';
                        // or "const mapboxgl = require('mapbox-gl');"

                        mapboxgl.accessToken = '${this.props.token}';
                        const map = new mapboxgl.Map({
                            container: '<your HTML element id>',
                            style: 'mapbox://styles/mapbox/streets-v9'
                        });
                    `)}
                </Copyable>
            </div>
        );
    }
}

export default class extends React.Component {
    constructor() {
        super();
        this.state = {tab: 'cdn'};
    }

    render() {
        return (
            <section className='pad4 contain'>
                <h1 className=''>Mapbox GL JS</h1>
                <div className='pad1y quiet small'>Current version:
                    <span className='round fill-light pad0'><a href='https://github.com/mapbox/mapbox-gl-js/releases'>mapbox-gl.js v{version}</a></span>
                </div>
                <div className='prose space-bottom2'>

                    <p className='space-bottom2 pad1y'>Mapbox GL JS 是一个 Javascript 库，它使用 WebGL 技术渲染交互地图的 <a href='https://www.mapbox.com/help/define-vector-tiles'>矢量瓦片</a>与<a
                            href={prefixUrl('/style-spec')}>Mapbox styles</a>。
                        它是 Mapbox GL 生态中的一部分，中还包括 <a
                            href='https://www.mapbox.com/mobile/'>Mapbox Mobile</a>，一个基于 C++ 语言的桌面与移动端皆可使用的渲染器。想知道其他新功能？请关注我们的 <a href={prefixUrl('/roadmap')}>路线图</a>。</p>
                    <div className='col12 fill-light round pad2 clearfix space-top2'>
                        <div className='space-bottom2 space-left1 space-top1 contain'>
                            <div className='icon inline dark pad0 round fill-green space-bottom1 github space-right1'/>
                            <div className='pin-left pad0x space-left4'>
                                <a className='block line-height15' href='https://github.com/mapbox/mapbox-gl-js'>Github 上的项目</a>
                                <span className='quiet small'>查看源代码并贡献自己一份力</span>
                            </div>
                        </div>
                        <div className='space-bottom2 space-left1 contain'>
                            <div className='icon inline dark pad0 round fill-blue space-bottom1 document space-right1'/>
                            <div className='pin-left pad0x space-left4'>
                                <a className='block line-height15' href='https://www.mapbox.com/help/mapbox-gl-js-fundamentals/'>GL JS
                                    基础知识</a>
                                <span className='quiet small'>基本功能和常用模式</span>
                            </div>
                        </div>
                        <div className='contain space-left1'>
                            <div className='icon inline dark pad0 round fill-red space-bottom1 globe space-right1'/>
                            <div className='pin-left pad0x space-left4'>
                                <a className='block line-height15' href='https://www.mapbox.com/gallery/'>Gallery</a>
                                <span className='quiet small'>项目展示</span>
                            </div>
                        </div>
                    </div>

                    <h2 className='strong'>Quickstart</h2>
                    <div className='space-bottom1'>在开始之前，您需要获取 <a
                        href='https://www.mapbox.com/help/create-api-access-token/'>access token[访问令牌]</a> 和一个 <a
                        href='https://www.mapbox.com/help/define-style-url/'>style URL[地图样式链接]</a>。您可以从我们众多的 <a
                        href='https://www.mapbox.com/api-documentation/#styles'>专业地图样式</a> 中挑选心仪的一个，也可以使用
                        <a href="https://www.mapbox.com/studio">Mapbox Studio</a> 来创建自己独特的地图样式。
                    </div>

                    <div className='rounded-toggle space-bottom2 inline'>
                        <a onClick={() => this.setState({tab: 'cdn'})}
                            className={this.state.tab === 'cdn' ? 'active' : ''}>Mapbox CDN</a>
                        <a onClick={() => this.setState({tab: 'bundler'})}
                            className={this.state.tab !== 'cdn' ? 'active' : ''}>module bundler</a>
                    </div>

                    {this.state.tab === 'cdn' && <QuickstartCDN token={this.props.token}/>}
                    {this.state.tab !== 'cdn' && <QuickstartBundler token={this.props.token}/>}

                    <div>
                        <h2 className='strong' id='csp-directives'>CSP 指令</h2>

                        <p> 为了缓解跨站脚本（XSS）和数据注入等类型的 WEB 攻击，加强网站的安全性，您的网站可能已经使用了<a href='https://developer.mozilla.org/en-US/docs/Web/Security/CSP'>内容安全策略 (CSP)</a> 
                    。如果您的网站已经使用了 CSP，Mapbox GL JS 需要使用 CSP 指令来确保正常使用：</p>
                        <pre><code>{`worker-src blob: ;\nchild-src blob: ;\nimg-src data: blob: ;`}</code></pre>

                        <p>如果需要 Mapbox 或者服务器上请求样式将需要额外的指令，您可以使用 <code>connect-src</code> 指令：</p>
                        <pre><code>{`connect-src https://*.tiles.mapbox.com https://api.mapbox.com`}</code></pre>
                    </div>
                </div>
            </section>
        );
    }
}
