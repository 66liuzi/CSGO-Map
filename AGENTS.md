# AGENTS.md —— 给以后接手这个项目的 AI 看

这是一个 **CS2 多地图道具点位查询库**（当前三张图：炽热沙城 Dust II / 炼狱小镇 Inferno / 荒漠迷城 Mirage）。
用户（华子）以后的用法是：**发一张准心瞄点图 + 一句人话说明**，由 AI 完成录入、测试、提交、部署。

请严格按下面的流程做，不要让用户自己改文件名、填 JSON 或操作 git。

## 0. 项目约定

- 数据与界面分离：点位数据只写在 `src/data/lineups.json`，搜索词库只在 `src/data/synonyms.ts`，
  地图表在 `src/data/maps.ts`。
- 一条点位 **只用一张图**：这张图就是「准心该对准哪里」的截图。
  不要索取站位图、落点图、效果图、多步骤图。
- 图片目录按地图分：`public/images/dust2/`、`public/images/inferno/`、`public/images/mirage/`，
  主图 `xxx.webp` + 列表缩略图 `xxx-thumb.webp`。
- 不引入数据库、后端、云服务、在线后台、上传功能、用户账号。
- 不引入需要持续付费的接口。

## 1. 收到「一张图 + 一句说明」后的标准流程

1. **先认地图**（`--map 沙二|小镇|迷城`，或图名/说明里带地图名，脚本会自己认）。
   实在认不出就问用户一句「这是哪张图」，别猜。
2. **提取字段**：阵营、起点、目标、道具、投法、操作说明。
   - 只从**用户的文字**里提取，**不要凭图片猜**点位信息。
   - 说明不完整时，只追问确实缺的关键内容（阵营 / 起点 / 目标 / 道具 / 投法），别问别的。
3. **调脚本录入**（会自动补别名、查重、处理图片、写数据）：

   ```bash
   node scripts/add-lineup.mjs --image "<图片绝对路径>" --desc "<用户原话>" --map 沙二
   ```

   - 图名规范时可以不写 `--desc`：`沙二_T_中门_警家_烟_跳投.jpg`
     （脚本按 `地图_阵营_起点_目标_道具_投法` 认，分隔符 `-` `_` 空格都行），
     但自动生成的说明很干，**建议 AI 还是自己写一句**。
   - 缺字段时脚本会退出并打印「需要向用户确认以下内容」，照它说的去问用户即可。
   - 用户说明里已经有信息但脚本没解析出来时，用参数补齐：
     `--side T --start A大外 --target 警家 --grenade 烟雾弹 --method 站投 --zone A`
   - 想先看不落盘的结果：加 `--dry-run`。
   - 如果提示可能重复：把重复记录读出来给用户看，确认是不同瞄点/投法后，加
     `--allow-duplicate`，并在说明里写清区别（如「蹲投版」「站投版」）。
     **绝对不要覆盖已有记录。**
4. **自检 + 构建**：

   ```bash
   npm run check      # 图片统计 + 数据体检 + 搜索测试
   npm run build
   ```

   任何一步失败都要修好，不要带着失败提交。
5. **测搜索**（`npm test` 已覆盖通用词；新增地图/位置时补断言）：
   标题、`目标+道具`、`阵营+道具`、`起点`、自然句「我在<起点>怎么封<目标>」、
   「<地图名> <位置>烟」都要能搜到。
6. **提交推送**：

   ```bash
   git add -A
   git commit -m "content(dust2): add T A Long to CT smoke"
   git push origin main
   ```

   提交信息格式：`content(<地图id>): add <阵营> <起点> to <目标> <道具英文>`，
   非内容改动（代码/样式）用 `chore:` / `feat:` / `fix:`。
   提交前先 `git status` 看有没有与本任务无关的改动，不要顺手提交别人的修改。
7. **更新线上**（两处，缺一不可）：
   - GitHub Pages：推送后等 Actions 跑完（仓库 Actions 页面），前提是仓库 Pages 的
     Source 已设为 GitHub Actions。
   - WorkBuddy 发布链接：重新发布 `dist/`（`workbuddy_sites_deploy`，directory 指向项目的 `dist/`，
     language=static，domainPrefix=`cs2-dust2-lineups`）。**重新发布需要用户在本轮明确要求上线。**
8. **向用户汇报**（照这个顺序）：
   - 新增点位名称（`地图 · 起始 → 目标+道具`）
   - 可用的搜索词
   - 提交是否成功
   - 网站是否已更新（哪个链接）
   - 正式查询链接

## 2. 加新说法 / 新位置 / 新地图时

- 新叫法（同义外号）→ 加进 `src/data/synonyms.ts` 对应组的 `terms`。
- 新位置 → 加一条同义组（Dust II / Inferno / Mirage 专属的写 `maps: ['inferno']` 这样），
  并在 `ZONE_MAP` 里用 `'<地图id>:<标准词>'` 登记它属于 A / MID / B，
  否则 `add-lineup.mjs` 会因为判断不出区域而报错。
- 同一个词在两张图都有（例如「拱门」「下水道」「死点」）→ 写两条同 `canon` 的组、各自带 `maps`，
  搜索会按点位所属地图自动选；`ZONE_MAP` 也各写一条 `<地图id>:<词>`。
- **加整张新地图** → 见 `src/data/maps.ts` 顶部注释的四步（MapId / MAPS / 位置词 / ZONE_MAP），
  再建 `public/images/<dir>/` 目录并放一个 `.gitkeep`。
- 不要在词库里放「家」「区」这类单字（道具的「烟/闪/火/雷」除外），会导致搜索刷出一堆无关结果。
- 加完跑 `npm test`。

## 2.1 「待确认」标记怎么处理

新增点位默认 `needsReview: true`（界面显示「待确认」），因为阵营/起点可能是 AI 从一句话里推断的。

- 用户口头确认或纠正后，AI 执行：

  ```bash
  node scripts/confirm-review.mjs --list                       # 看还有哪些没确认
  node scripts/confirm-review.mjs --id <id>                    # 确认这一条
  node scripts/confirm-review.mjs --id <id> --side CT --method 蹲投   # 确认并修正
  node scripts/confirm-review.mjs --all                        # 全部确认
  ```

- 改完记得 `npm run check && npm run build` 再提交推送。
- 不要因为「待确认」就不展示这条点位，它本来就是为了让用户看到后纠错。

## 3. 图片处理要求（脚本已实现，别绕过）

- 依赖 Pillow：脚本会自动找带 Pillow 的 Python（优先 `/usr/bin/python3`）。
  报错找不到时执行：`/usr/bin/python3 -m pip install --user Pillow`。
- 自动修正手机图片方向（EXIF）。
- 主图最长边 1920，WebP 高质量（quality 90），保留准心、墙缝、屋檐、箱体边缘细节。
- 缩略图最长边 640 且固定 16:10：横屏图居中裁切，竖屏图补深色边（不裁掉准心所在的画面）。
- 文件名用稳定英文数字：`<图缩写>-<side>-<起点英文>-<目标英文>-<道具>-<序号>.webp`，
  图缩写是 `d2` / `inf` / `mrg`。
- 用户只给一张图，不要向用户索取站位图 / 落点图 / 效果图。

## 3.1 示例数据

交付时带 5 条 `isSample: true` 的示例（占位图，界面上标注「示例」），只有沙二有。
正式录入真实点位后可以清掉：

```bash
node scripts/remove-samples.mjs          # 预览
node scripts/remove-samples.mjs --yes    # 真删（连占位图一起删）
```

## 3.2 常用命令

```bash
npm run check                          # 图片统计 + 数据体检 + 搜索测试
npm run lineup -- --image x.jpg --desc "..." --map 迷城    # 录入点位
npm run confirm -- --list              # 看待确认清单
npm run build                          # 正式构建（含自检）
```

## 4. 不要做的事

- 不要新增宣传型首页、论坛、评论、点赞、社交功能。
- 不要把点位数据搬到数据库或云端。
- 不要要求用户自己改 JSON / 重命名图片 / 操作 git。
- 不要在仓库里写访问令牌。
- GitHub Pages 的首次启用只能用户手动点（Settings → Pages → Source 选 GitHub Actions），
  本机只有 SSH 推送权限，不要在这上面反复尝试自动化授权。
