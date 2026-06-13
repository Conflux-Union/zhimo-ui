/* ZhiMo UI 统一入口：引入即注册全部组件并注入设计令牌 */
import './base.js';
import './layout.js';
import './nav.js';
import './menu.js';
import './ink.js';
import { toast } from './feedback.js';

// tokens.css 定义全局 :root 变量，组件（含 Shadow DOM）靠 CSS 自定义属性继承取色。
// new URL(..., import.meta.url) 在原生浏览器与打包器（Vite/webpack/Rollup）下都成立，
// 故零依赖、无构建步骤即可让消费者 `import 'zhimo-ui'` 后样式直接生效，无需手动引样式。
if (typeof document !== 'undefined' && !document.querySelector('[data-zhimo-tokens]')) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('./tokens.css', import.meta.url).href;
  link.dataset.zhimoTokens = '';
  document.head.prepend(link);
}

export { toast };

// 方便在控制台或非模块脚本里调用：ZhiMo.toast('你好')
globalThis.ZhiMo = { toast };
