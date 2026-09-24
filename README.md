# CS2 道具查询库（沙二 / 小镇 / 迷城）

游戏里来不及翻视频？打开网页，输一句话就能看到准心该瞄哪儿。

- **纯静态**：React + TypeScript + Vite，构建产物是静态文件，托管在 GitHub Pages / 工作台发布链接。
- **无后端**：不需要数据库、不需要云服务、不需要在线管理后台，家里电脑关机也能访问。
- **一条点位一张图**：每张图就是「准心该对准哪里」的截图，不要求站位图/落点图/多步骤图。
- **多地图**：顶部一行切换地图，也可以用搜索词带地图（「迷城 拱门烟」）。
- **PWA**：可添加到手机主屏幕，像 App 一样打开；缓存后可离线查询。
- **搜索**：支持关键词、别名、自然句（「我在A大怎么封警家」），支持语音输入。

## 线上地址

当前可用（随时可访问，与本地电脑是否开机无关）：

- 主链接：**https://cs2-dust2-lineups.app.workbuddy.host/**

GitHub Pages 备用链接（需在仓库里把 Pages 的 Source 设为 GitHub Actions 后生效）：

- https://66liuzi.github.io/CSGO-Map/

两个地址内容一致，都是同一份 `dist/` 静态产物，手机、电脑都能打开，也可以「添加到主屏幕」。

## 仓库

- GitHub：https://github.com/66liuzi/CSGO-Map
- 推送到 `main` 会自动测试 + 构建 + 部署

## 界面预览

| 电脑 | 手机 | 准心大图 |
| --- | --- | --- |
| ![桌面](docs/screenshot-desktop.webp) | ![手机](docs/screenshot-mobile.webp) | ![详情](docs/screenshot-detail.webp) |

## 怎么用

1. 电脑/手机浏览器打开上面的网址。
2. 顶部「地图」选**沙二 / 小镇 / 迷城**（或「全部」跨图搜），下面再按阵营 / 道具 / 区域筛。
3. 搜索框直接输入：`警家烟`、`A大`、`Xbox`、`香蕉道火`、`拱门烟`、`B1`、
   `我在A大怎么封警家`、`CT在B门怎么防B洞Rush`、`迷城 拱门烟`。
4. 点结果卡片看大图，手机可双指缩放查看准心细节。
5. 手机想当 App 用：iPhone 用 Safari → 分享 → 添加到主屏幕；安卓用 Chrome → 菜单 → 添加到主屏幕 / 安装应用。
6. 断网也能查：先点底部「离线保存全部点位」，之后即使断网，搜索和已缓存的准心图都还能用。

## 支持的地图与报点

| 地图 | id | 简称 | 图片目录 | 已收录报点（部分） |
| --- | --- | --- | --- | --- |
| 炽热沙城 Dust II | `dust2` | 沙二 | `public/images/dust2/` | 警家、匪家、A大、A小、A平台、坑、中路、中门、Xbox、B洞、B门、B平台、B1、B2、车 |
| 炼狱小镇 Inferno | `inferno` | 小镇 | `public/images/inferno/` | 香蕉道、B平台、车、沙袋、树位、一箱/二箱/三箱、棺材、喷泉、花园、锅炉房、侧道、下水道、拱门、大坑、小坑、墓地、教堂、书房、A二楼、阳台、草车、长廊、凹槽、马棚 |
| 荒漠迷城 Mirage | `mirage` | 迷城 | `public/images/mirage/` | A1、A门、A二楼、跳台、忍者位、死点、三明治、售票亭、垃圾桶、拱门、VIP、小黑屋、下水道、超市、厨房、B小、B二楼、沙发、白车、长椅、草车 |

每个报点都挂了一堆口语别名（`B1`/`b一层`、`X箱`/`叉箱`、`图书馆`/`书房`、`VIP`/`窗房` 等），
加新说法只改 `src/data/synonyms.ts`。

## 目录结构

```
src/
  data/
    maps.ts           # 地图表（加新地图改这里）
    lineups.json      # 所有点位数据（唯一需要改的内容文件）
    synonyms.ts       # 同义词、区域映射（加新说法只改这里）
    types.ts          # 字段类型定义
    imageSizes.json   # 图片统计（脚本自动生成）
  lib/
    search.ts         # 分词 + 打分 + 排序（含地图词与按图区分的位置词）
    pwa.ts            # Service Worker / 安装 / 离线控制
    voice.ts          # 语音输入（含降级提示）
  components/         # 界面组件
public/
  images/dust2|inferno|mirage/   # 准心瞄点图（WebP 主图 + 缩略图）
  icons/              # PWA 图标
  manifest.webmanifest
  offline.html
scripts/
  add-lineup.mjs      # 新增点位助手（AI 用，支持多地图 + 图名识别）
  confirm-review.mjs  # 消掉「待确认」标记 / 顺手改字段
  process_image.py    # 图片优化：转正方向、压到 1920、生成 WebP 与缩略图
  validate-lineups.mjs# 数据体检（构建前自动跑）
  gen-image-sizes.mjs # 统计图片体积
  make_placeholders.py# 生成「示例占位图」
  remove-samples.mjs  # 一键删除示例数据
  make_icons.py       # 生成 PWA 图标
  sw.template.js      # Service Worker 源文件（构建时生成 public/sw.js）
```

## 本地开发

```bash
npm install
npm run dev        # 本地预览
npm test           # 搜索逻辑测试（含验收用例 + 多地图用例）
npm run check      # 图片统计 + 数据体检 + 搜索测试
npm run build      # 正式构建（先自检再打包）
npm run preview    # 预览构建结果
```

## 新增一个点位（推荐交给 AI）

把**一张准心图和一句说明**发给 AI 即可，例如：

> 这张图是小镇 T 方从香蕉道扔棺材火，燃烧弹，站投，按图片准心直接左键。

AI 会自动完成：认地图 → 解析字段 → 补充搜索别名 → 查重 → 优化图片（转正方向 / WebP / 缩略图）→
写入 `lineups.json` → 跑测试与构建 → 提交推送 → 更新线上 → 告诉你搜索词和链接。

**图片命名建议**（这样 AI 不看说明也能认字段）：

```
沙二_T_中门_警家_烟_跳投.jpg
小镇_CT_警家_A平台_闪_跳投.jpg
迷城_T_B二楼_沙发_火_站投.jpg
```

分隔符用 `_` `-` 空格都行，顺序是 `地图_阵营_起点_目标_道具_投法`。
写得随意也能用（AI 会读你发的说明），只是图名规范时更省事。

手动执行等价于：

```bash
node scripts/add-lineup.mjs \
  --image ~/Downloads/小镇_T_香蕉道_棺材_火_站投.jpg \
  --desc "T方从香蕉道扔棺材火，站投，贴住木桶按图片准心直接左键" \
  --map 小镇
```

信息不全时脚本会明确列出缺什么（阵营 / 起点 / 目标 / 道具 / 投法），只问这些。
`--dry-run` 可以先看结果不落盘。

### 「待确认」是什么意思

新录入的点位默认带 `needsReview: true`，卡片右上角会显示黄色「待确认」角标。
这是因为阵营 / 起点等信息是 AI 从你那一句话里提取的，可能有推断成分。

看完图觉得没问题，或者发现哪里错了，直接跟 AI 说一句就行：

> 「中门警家烟那条确认没问题」
> 「中门警家烟其实是 CT 扔的，改成蹲投」

AI 会执行 `node scripts/confirm-review.mjs` 改字段、去掉标记、重新构建发布。

## 数据字段

| 字段 | 说明 |
| --- | --- |
| id | 唯一编号，如 `d2-t-mid-ctspawn-smoke-0001` / `inf-t-banana-coffin-molotov-0001` |
| map | `dust2` / `inferno` / `mirage` |
| side | `T` / `CT` |
| startLocation | 起始位置 |
| targetLocation | 投掷目标 |
| grenadeType | 烟雾弹 / 闪光弹 / 燃烧弹 / 手雷 |
| throwMethod | 站投 / 跳投 / 跑投 / 跑跳投 / 蹲投 / 其他 |
| description | 简短操作说明 |
| aliases | 搜索别名数组（自动补充） |
| image | 准心图（`images/<地图>/xxx.webp`） |
| thumbnail | 列表缩略图 |
| zone | `A` / `MID` / `B`（用于筛选） |
| createdAt / updatedAt | 录入 / 更新日期 |
| source | 可选，原始视频或网页 |
| needsReview | 是否待人工确认 |
| isSample | 是否示例数据（界面会明显标注，可一键隐藏） |

## 搜索排序规则

1. 标题或别名完全匹配
2. 起点 + 目标同时匹配
3. 目标位置匹配
4. 起始位置匹配
5. 道具类型匹配
6. 投掷方法匹配
7. 说明文字匹配

分词只认词库里的词，并且会自动丢掉「我在 / 怎么 / 有没有 / 帮我找 / 用什么 / 扔一个 / 给我看 / 哪里有」这类废话词，所以搜「家」不会刷出一堆无关点位。

搜索里提到地图（「迷城 拱门烟」）时只出那张图的点位；同一个词在不同图意思不同（拱门 / 下水道 / 死点 / 车）时，按点位所属地图自动选对应词库。

## 部署

已配置 `.github/workflows/deploy.yml`：推送到 `main` 分支后自动测试、构建、发布到 GitHub Pages。
Pages 的 Source 需要设为 **GitHub Actions**（仓库 Settings → Pages）。
另外每次内容更新后，工作台发布链接需要重新发布 `dist/` 才会同步。

## 示例数据

首次体验包含 5 条明显标注为「示例占位图」的记录（都在沙二），图片是程序生成的占位图，**不是真实教学截图**。
界面可勾选「隐藏示例数据」；正式录入真实点位后，一条命令即可清掉示例（连占位图一起删）：

```bash
node scripts/remove-samples.mjs --yes
```

## 依赖说明

- 构建/运行：Node 18+。
- 图片处理脚本：Python 3 + Pillow（macOS 自带 `/usr/bin/python3` 已具备；缺失时
  `/usr/bin/python3 -m pip install --user Pillow`）。
- 新增点位脚本 `scripts/add-lineup.mjs` 需要 Node 22.18+（直接读 `maps.ts` / `synonyms.ts`）。

## 许可

点位数据与图片归作者所有，仅供个人查询使用。
