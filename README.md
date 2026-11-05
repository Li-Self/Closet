# 我的衣橱

一个只给自己用的本地衣橱 PWA：管理单品、组合搭配、记录每天穿了什么。数据全部保存在手机浏览器的 IndexedDB 中，不上传云端，不需要账号。

## 功能

- 单品：拍照/相册双入口（vivo 相机兼容）、分类与颜色多选、季节、场合、品牌、备注、收藏、搜索筛选与长按拖动排序。
- 搭配：外卖式新建（左侧分类 + 右侧添加 + 底部汇总）、自动拼贴封面、全部/收藏/最近穿过标签、长按拖动排序，一键记录今天穿这套。
- 记录：穿搭日历、每日穿着记录、月度统计、闲置提醒。
- 备份：导出单个 JSON（含照片，schema v2），导入覆盖恢复，兼容 v1 旧备份。
- 视觉：柔粉奶油 + 白色大圆角卡片，4 栏底部导航 + 悬浮加号。
- 离线：首次加载后可断网使用，可添加到安卓主屏幕。

## 本地开发

需要 Node.js 18 以上（本项目无第三方依赖，无需 `npm install`）。

```bash
npm run dev      # http://localhost:5173
npm test         # 运行纯逻辑测试
npm run icons    # 重新生成 PWA 图标
```

## 部署到 GitHub Pages

1. 在 GitHub 新建一个仓库，把本目录内容推送到 `main` 分支。
2. 仓库 Settings → Pages → Build and deployment → Source 选择 `Deploy from a branch`，分支选 `main`，目录选 `/ (root)`。
3. 等待部署完成，打开 `https://<用户名>.github.io/<仓库名>/`。

## 部署到 Cloudflare Pages

1. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git（或直接上传）。
2. Build command 留空，Build output directory 填 `/`。
3. 部署完成后用分配的 HTTPS 地址访问。

## 安卓安装

用 Chrome 打开部署地址 → 右上角菜单 → 「安装应用」或「添加到主屏幕」。安装后从桌面图标启动，无浏览器地址栏。

## 数据与备份

- 数据保存在浏览器 IndexedDB，按站点隔离；清除浏览器数据、卸载浏览器或换手机都会丢失。
- 定期在「我的 → 数据备份」导出 JSON。备份文件包含个人照片，请妥善保管。
- 导入会覆盖当前全部数据，导入前建议先导出一份。
- 应用不发起任何业务网络请求，无统计、无账号、无云同步。

## 更新应用

修改任何 HTML/CSS/JS 后：

1. 把 `sw.js` 顶部的 `CACHE` 版本号加一（例如 `wardrobe-v7` → `wardrobe-v8`），否则已安装的旧缓存不会更新。
2. 如果新增了 JS 模块，必须同时把它加入 `sw.js` 的 `CORE` 预缓存清单，否则离线刷新会缺少模块。
3. 部署后重新打开应用，会提示有新版本。

## 项目结构

```
index.html            应用外壳
css/                  设计令牌与样式
js/app.js             启动与路由注册
js/router.js          哈希路由
js/store.js           内存状态
js/db/                IndexedDB 数据访问
js/views/             页面
js/components/        共享组件
js/utils/             纯逻辑工具
tests/                Node 内置测试
sw.js                 Service Worker
manifest.webmanifest  PWA 清单
icons/                图标
scripts/              本地服务器与图标生成
```

## 浏览器要求

主要目标为安卓 Chrome。iPhone Safari 也可打开，但未做专门适配。

## 版本

1.0.0
