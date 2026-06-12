/* ZhiMo UI 统一入口：引入即注册全部组件 */
import './base.js';
import './layout.js';
import './nav.js';
import './menu.js';
import './ink.js';
import { toast } from './feedback.js';

export { toast };

// 方便在控制台或非模块脚本里调用：ZhiMo.toast('你好')
globalThis.ZhiMo = { toast };
