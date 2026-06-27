# BOSS直聘 一键拉黑公司 功能说明

*目前适用于电脑网页端*

在 BOSS 直聘**公司简介页**增加「拉黑该公司」按钮，点击后自动调用 BOSS 官方接口，将当前公司加入你的账号黑名单，无需再去一个一个的手动输入公司名。

## 功能说明

- 仅在公司简介页显示拉黑按钮（位于「收藏」按钮旁，URL 匹配 `/gongsi/`、`/gongsir/`）
- 自动读取页面上的企业全称（优先「工商信息 → 企业名称」）
- 调用 BOSS直聘 内部 API 完成拉黑
- 成功 / 失败均有顶部提示，约 3 秒后自动消失
- 支持 SPA 页面切换（同页跳转不同公司时按钮会更新）

## 安装方式（Chrome）

### 方式 A：直接使用（从 GitHub 下载 / 克隆，无需构建）

1. 下载 Code → Local → Download Zip (推荐) 或克隆本仓库：git clone [https://github.com/liudehuazw/BOSS-BAN.git](https://github.com/你的账号名/EMR.git)
2. 打开 Chrome，地址栏输入 `chrome://extensions/`
3. 开启右上角 **开发者模式**
4. 点击 **加载已解压的扩展程序**
5. 选择仓库中的 `**dist`** 文件夹

注意：

Chrome 在 **开发者模式** 下加载「非 Chrome 网上应用店」的扩展时，都会显示类似警告：

> 开启开发者模式即可使用此扩展程序，但请注意，Chrome 应用商店无法审核此扩展程序。

这是 Chrome 对「非应用商店扩展」的通用提醒，不是病毒报警。

扩展仅访问 [zhipin.com](http://zhipin.com)，不收集数据。确认是本项目下载的再安装即可。

### 方式 B：自行修改源码后安装

1. 在项目目录执行构建：

```powershell
cd .\你的目录\BOSS-BAN
npm install
npm run build
```

同上，在 Chrome 扩展页加载 `**dist**` 文件夹

## 使用方法

1. 在 Chrome 中登录 [BOSS 直聘](https://www.zhipin.com/)
2. 打开任意公司简介页，例如：`https://www.zhipin.com/gongsi/xxxxx.html`
3. 点击公司名称旁 **收藏** 后面的 **拉黑该公司**
4. 看到绿色成功提示后，可到 BOSS「设置 → 隐私保护 → 屏蔽公司」中确认

## 常见问题


| 现象               | 可能原因             | 处理方式                                          |
| ---------------- | ---------------- | --------------------------------------------- |
| 提示「请先登录 BOSS 直聘」 | 未登录或登录已过期        | 重新登录 BOSS 直聘后刷新页面                             |
| 提示「未找到该公司」       | 页面显示的品牌名与工商全称不一致 | 刷新页面，或到 BOSS 设置里手动添加(也侧面说明这公司不靠谱 [○･｀Д´･ ○] ) |
| 页面按钮显示灰色「已拉黑」    | 之前已屏蔽过           | 无需重复操作                                        |
| 按钮灰色不可点          | 页面公司信息尚未加载完成     | 等待 1～2 秒后刷新页面                                 |
| 点击无反应            | 扩展未加载或不在公司简介页    | 检查扩展是否启用，确认 URL 含 `/gongsi/`                  |


## 开发说明

### 目录结构

```
src/content/
  main.ts            # 入口，SPA 路由监听
  company-parser.ts  # 从 DOM 提取公司名
  blacklist-api.ts   # 调用 suggest / add API
  float-button.ts    # 浮动按钮
  toast.ts           # 提示组件
src/types/
  zhipin-api.ts      # API 类型定义
```

### 本地开发

```powershell
npm run dev
```

修改代码后重新构建，再到 `chrome://extensions/` 点击扩展的 **刷新** 按钮，并刷新 BOSS 页面。

### 插件图标

构建时会自动读取项目根目录的 `bossicon.jpg`，并生成 Chrome 所需的 `icons/icon16.png`、`icon48.png`、`icon128.png`。更换图标时替换 `bossicon.jpg` 后重新执行 `npm run build` 即可。

### 公司名提取优先级

1. `.business-detail-name`（工商信息 → 企业名称）
2. `.company-full-name span`
3. `h1.name` / `.info-primary .name`（品牌简称，兜底）

### API 说明

插件使用 BOSS 网页端同款接口（需登录态 Cookie）：

- `GET /wapi/zpgeek/maskcompany/suggest.json?query=公司名`
- `GET /wapi/zpgeek/maskcompany/add.json?comIds=...&checkall=1&totalCount=...&name=...`

请求会自动携带当前页面的 Cookie，并从 Cookie / `_PAGE.token` 读取 `zp_token`、`token` 请求头。

## 隐私说明

- 本扩展仅在 `www.zhipin.com` 域名下运行
- 不收集、不上传任何用户数据
- 与其他一键投递简历脚本插件不同，不会导致账号被ban
- 所有拉黑操作直接由你的浏览器向 BOSS 官方服务器发起，对账号安全

## 页面展示

<img width="2560" height="1239" alt="bossban" src="https://github.com/user-attachments/assets/614cad19-beb5-49cc-8e8e-6f5d7dfda305" />

## 咨询方式

如不会使用改项目，可添加我的wechat，本德华义务指导

<img width="649" height="657" alt="add my wechat" src="https://github.com/user-attachments/assets/7278bacc-950e-4ff6-96c7-88031d27c23a" />

## 版本记录

### v1.0.0

- 初始版本：公司简介页一键拉黑
- 支持成功 / 失败 Toast 提示
- 支持 SPA 路由切换

