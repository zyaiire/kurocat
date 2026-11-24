import type { TailKeyMode } from '../../src/catEngine';

export type Locale = 'zh' | 'en' | 'ja';

export const LANG_STORAGE_KEY = 'qianyi_lang';

export function normalizeLocale(raw: string | null | undefined): Locale | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (v === 'zh' || v.startsWith('zh-')) return 'zh';
  if (v === 'en' || v.startsWith('en-')) return 'en';
  if (v === 'ja' || v === 'jp' || v.startsWith('ja-')) return 'ja';
  return null;
}

export function detectInitialLocale(): Locale {
  try {
    const param = new URLSearchParams(window.location.search).get('lang');
    const fromQuery = normalizeLocale(param);
    if (fromQuery) {
      localStorage.setItem(LANG_STORAGE_KEY, fromQuery);
      return fromQuery;
    }
    const saved = normalizeLocale(localStorage.getItem(LANG_STORAGE_KEY));
    if (saved) return saved;
  } catch {
    // Ignore storage/URL access errors in restricted contexts
  }
  const nav = normalizeLocale(navigator.language);
  return nav ?? 'en';
}

export function persistLocale(locale: Locale): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, locale);
    const url = new URL(window.location.href);
    if (url.searchParams.has('lang')) {
      url.searchParams.set('lang', locale);
      window.history.replaceState(null, '', url.toString());
    }
  } catch {
    // Ignore restricted history/storage environments
  }
}

export interface KuroCatI18nBundle {
  htmlLang: string;
  docTitle: string;
  metaDesc: string;
  text: Record<string, string>;
  html: Record<string, string>;
  placeholders: Record<string, string>;
  titles: Record<string, string>;
  prompts: Record<string, string>;
  skins: Record<string, string>;
  tailModeShort: Record<TailKeyMode, string>;
  mcpSnippets: Record<'win' | 'mac' | 'http', { raw: string; html: string }>;
  fmt: {
    latestVersion: (tag: string) => string;
    heroDownloadWin: (size: string) => string;
    heroDownloadMac: (size: string) => string;
    layout: (id: '65' | '108' | 'k98m') => string;
    orient: (o: 'cat' | 'viewer') => string;
    tailPickerBtn: (open: boolean, count: number) => string;
    tailPickerTitleDefault: (count: number) => string;
    tailKeyAdded: (key: string, count: number) => string;
    tailKeyRemoved: (key: string, count: number) => string;
    tailPresetApplied: (preset: 'office' | 'rightFn' | 'edgeMods', count: number) => string;
    tailCleared: () => string;
    autoDemoBtn: (running: boolean) => string;
    privacyBtn: (active: boolean) => string;
    whaleSoundBtn: (muted: boolean) => string;
    copied: () => string;
    copyConfig: () => string;
    copyCmd: () => string;
    copyShort: () => string;
    totalDownloads: (count: string) => string;
    statsUpdated: (timePart: string) => string;
  };
}

export const KUROCAT_I18N: Record<Locale, KuroCatI18nBundle> = {
  zh: {
    htmlLang: 'zh-CN',
    docTitle: 'KuroCat · 免费开源桌面打字小黑猫桌宠（Win/Mac/Linux/Android · OBS · AI 捏猫）— 谦一',
    metaDesc:
      'KuroCat 是一款免费开源、轻量透明置顶的桌面打字猫咪伴侣（Desktop Typing Cat / Bongo Cat 开源替代），支持 Windows 11/10/7、macOS、Linux 与 Android。内置 6 款手绘猫咪 + 大肥鱼鲸鱼娘、自定义尾巴拍键、OBS 原生透明直播源、输密码自动闭眼防偷窥与内置 MCP 协议 AI 捏猫。',
    text: {
      'nav.back': '← 谦一',
      'nav.playground': '在线试玩',
      'nav.whale': '鲸鱼娘视频',
      'nav.download': '立即下载',
      'nav.features': '核心特性',
      'nav.mcp': 'AI 捏猫',
      'hero.eyebrow': 'Windows · macOS · Linux · Open Source',
      'hero.allPlatforms': '全部平台与版本',
      'hero.ghSource': 'GitHub 源码 ›',
      'hero.spec1Lbl': '原生 Rust 安装包体积',
      'hero.spec2Val': '7 款 + MCP',
      'hero.spec2Lbl': '猫咪 & 鲸鱼娘 · AI 定制',
      'hero.spec3Val': 'Win / Mac / Linux',
      'hero.spec3Lbl': '支持 Apple Silicon · Win7 · 麒麟',
      'pg.title': '实时网页引擎 · 直接敲键盘或摸猫头',
      'pg.bgDark': '深色桌布',
      'pg.bgLight': '浅色桌布',
      'pg.hintKey': '⌨️ 敲键盘',
      'pg.hintMouse': '🖱️ 点左/右键',
      'pg.hintPet': '🤚 来回摸猫头',
      'pg.done': '完成',
      'pg.presetOffice': '回车空格',
      'pg.presetRightFn': '方向/小键盘',
      'pg.presetEdgeMods': '外侧功能键',
      'pg.presetClear': '清空',
      'pg.lblSkin': '切换皮肤',
      'pg.layout65': '65% 紧凑',
      'pg.layout108': '108 全尺寸',
      'pg.orientCat': '面向猫咪',
      'pg.orientViewer': '面向观众',
      'pg.btnMouse': '🖱️ 左右键',
      'pg.btnCurious': '👀 好奇眼',
      'pg.btnCross': '💢 尾巴捶桌',
      'pg.btnSleep': '💤 打瞌睡',
      'pg.btnBubbles': '💬 气泡',
      'pg.btnPurr': '🔊 呼噜',
      'pg.lblTail': '尾巴拍键',
      'pg.tailSmart': '智能第三只手',
      'pg.tailCustom': '自定义',
      'pg.tailEdge': '近尾边缘',
      'pg.tailOff': '仅摆动',
      'pg.lblPwd': '密码测试',
      'pg.lblScale': '无级缩放',
      'dl.eyebrow': 'Direct Downloads · Cloudflare Edge CDN',
      'dl.title': '免费下载，3 秒住进你的桌面',
      'dl.winName': 'Windows 65% 经典安装版',
      'dl.winSub': 'Windows 10 / 11 (x64)',
      'dl.winTag': '推荐',
      'dl.primaryBtn': '高速直链下载',
      'dl.ghBtn': 'GitHub 官方源 ›',
      'dl.macName': 'macOS 通用版（M 芯片 & Intel）',
      'dl.macSub': 'macOS 10.15+ (Catalina 及以上) Universal DMG',
      'dl.tipWinTitle': '🛡️ Windows 浏览器提示「通常不会下载 .exe / 保护你的电脑」怎么办？',
      'dl.tipMacTitle': '🍎 macOS 首次打开说明（仅需一次 · 无需开着终端）',
      'dl.copyCmd': '复制命令',
      'dl.tipWv2Title': '🪟 Windows 提示「Could not find the WebView2 Runtime」怎么办？',
      'dl.tipWv2Btn': '下载微软 WebView2 运行环境 ›',
      'dl.win7Title': '🖥️ Windows 7 SP1（64 位）专属兼容绿包版（内置 WebView2 109）',
      'dl.win7Btn': '下载 Win7 兼容绿包版（178.94 MB）',
      'dl.win7Gh': 'GitHub 官方源（Win7 绿包）›',
      'dl.linuxTitle': '🐧 Linux / Ubuntu 22.04+ / 银河麒麟 V11+ / 优麒麟（x86_64 & ARM64）',
      'dl.linuxArmDeb': 'ARM64 飞腾/麒麟 .deb（2.19 MB）',
      'dl.tipGameTitle': '🎮 游戏全屏 / OBS 直播怎么显示小黑猫？（含反作弊安全提示）',
      'feat.title': '把桌宠，做到强迫症级别的丝滑',
      'feat.whaleEyebrow': 'New Skin · 🐳 BigFish (鲸鱼娘) · 14s Video',
      'feat.whaleSpec1Val': '三线同动',
      'feat.whaleSpec1Lbl': '鼠标 + 手打字 + 鲸尾甩拍',
      'feat.whaleSpec2Val': '手速感应',
      'feat.whaleSpec2Lbl': '加速触发害羞脸红 → 大笑',
      'feat.whaleSpec3Val': '自动捂眼',
      'feat.whaleSpec3Lbl': '输密码自动闭眼防偷窥',
      'feat.whaleTryBtn': '在上方画布切到大肥鱼试玩 ↑',
      'feat.whaleDlBtn': '下载 1080P 竖屏演示（14s）',
      'feat.whaleMeta': '1080×1920 · 60fps · 14s 含同步键鼠音效',
      'feat.kbSpec1Val': '108 键',
      'feat.kbSpec1Lbl': '完整 F 区与数字小键盘',
      'feat.kbSpec2Val': '双视角',
      'feat.kbSpec2Lbl': '面向猫咪 / 面向观众',
      'feat.kbSpec3Val': '真键值',
      'feat.kbSpec3Lbl': '独立区分主回车与 Num↵',
      'feat.kbTryBtn': '在上方画布试玩 108 键 ↑',
      'feat.mouseSpec1Lbl': '左右中键完全独立高亮',
      'feat.mouseSpec2Lbl': '自动更新摘要校验',
      'feat.mouseSpec3Val': '一键升级',
      'feat.mouseSpec3Lbl': 'Win / Mac 静默重启',
      'bento.1Title': '20%–150% 无级滑动缩放',
      'bento.1Body': '自定义丝滑滑动条 60fps 实时预览、右下角锚定防漂移；就算缩到最小 20%，右键菜单与更新提醒依然完整不裁切。',
      'bento.2Title': '摸头眯眼 & 合成呼噜声',
      'bento.2Body': '鼠标移到猫头自动变身小手光标，来回抚摸触发慵懒眯眼与 Web Audio 24.5Hz 实时合成的温柔猫咪呼噜声。',
      'bento.3Title': '输密码自动闭眼防偷窥',
      'bento.3Body': '系统级自动识别 Windows / macOS 密码输入框：底层钩子拦截不外传按键，猫咪温柔闭眼、大肥鱼双手捂眼并遮蔽键帽与气泡。',
      'bento.4Title': 'Rust 原生极低开销',
      'bento.4Body': '无 Electron 臃肿内核，单文件约 24 MB 内存常驻，原生全局键鼠监听几乎零 CPU 占用。',
      'mcp.p1Text': '💬 “帮我用 KuroCat MCP 捏一只英短蓝猫并切过去”',
      'mcp.p2Text': '📸 “按这张我家猫的照片，给我定制一只专属桌宠！”',
      'mcp.p3Text': '⚙️ “把桌宠缩放到 85%，切到 108 键面向观众”',
      'mcp.copyShort': '复制',
      'mcp.tabHttp': '本机 HTTP',
      'mcp.footerMeta': '支持 7 个内置工具 · 0.4s 热重载',
      'mcp.copyCfg': '复制配置',
      'footer.home': '谦一主页',
      'footer.pelican': '鹈鹕测试专区',
      'footer.releases': '所有版本 (Releases)',
    },
    html: {
      'hero.title': 'KuroCat · 敲键盘的小黑猫<br /><span>住进你的桌面</span>',
      'hero.sub':
        '基于 <strong>Tauri v2 + Rust 原生钩子 + Three.js 3D / Canvas 2D 双引擎</strong> 打造的透明置顶桌面键鼠伴侣。默认 <strong>✨ 3D 体积光影手办模式</strong>（右键一键切换 <strong>2D 经典手绘</strong>），安装包仅 <strong>2.15 MB</strong>；内置 <strong>6 款猫咪 + 🐳 大肥鱼（鲸鱼娘）</strong>、<strong>游戏自动戴电竞耳机</strong>、<strong>3D 项圈铃铛</strong>、<strong>自定义尾巴拍键</strong>、<strong>OBS 免抠像直播源</strong>、<strong>输密码自动闭眼防偷窥</strong> 与 <strong>MCP 协议 AI 捏猫</strong>（3D/2D 同步斑点）。',
      'dl.sub':
        '所有安装包均内置 <strong>20%–150% 无级缩放</strong>、<strong>65% / 108 键随时切换</strong>、<strong>自定义尾巴拍键</strong> 与 <strong>App 内自动更新</strong>。<br />默认提供 <code>qianyi.one</code> 国内高速直链，同时保留 GitHub Releases 官方原链与 SHA-256 校验。',
      'dl.winDesc':
        '开箱即 65% 紧凑机械键盘，自动创建桌面 <code>KuroCat</code> 图标、开始菜单与系统卸载入口；右键随时可一键切换 <strong>108 键全尺寸小键盘</strong>、<strong>自定义尾巴按键</strong> 与内置自更新。',
      'dl.macDesc':
        '原生编译 ARM64 + x86_64 通用镜像，兼容 M1/M2/M3/M4 与老款 Intel Mac（macOS 10.15 Catalina 及以上），内置 65% / 108 键、6 款猫咪与大肥鱼皮肤。打开 <code>.dmg</code> 拖入「应用程序」即可运行。',
      'dl.tipWinBody':
        '由于本项目为免费开源软件、未购买商业 EV 代码签名证书，Edge 浏览器在下载新版本 <code>.exe</code> 时可能会弹出「通常不会下载」提示（全部源码已在 GitHub 公开，可放心使用）：<br /><strong>① Edge 浏览器保留步骤</strong>：鼠标移到下载记录上 → 点右侧<strong>三个点 <code>···</code></strong> → 点<strong>「保留」</strong> → 弹窗显示「删除」按钮时，点击旁边的<strong>下箭头 <code>▾</code>（显示更多）</strong> → 选择<strong>「仍然保留」</strong>即可下载完成（Chrome 请按 <code>Ctrl + J</code> 打开下载页 → 点「保留危险文件」→「仍然保留」）。<br /><strong>② 双击安装若弹出蓝框「Windows 已保护你的电脑」</strong>：点击<strong>「更多信息」</strong> → 点击<strong>「仍要运行」</strong>即可完成安装。',
      'dl.tipMacBody':
        '由于本项目为免费开源未公证应用，首次拖入「应用程序」后若提示「无法验证开发者」或「已损坏」，<strong>请勿进入包内容用终端运行</strong>，只需打开一次终端粘贴执行右侧命令即可彻底解除隔离（跑完可关闭终端，后续直接双击图标打开）。全局键鼠响应请在<strong>「系统设置 → 隐私与安全性」</strong>中同时勾选<strong>「辅助功能」与「输入监控」</strong>里的 <code>KuroCat</code>，即开即生效（兼容 Karabiner-Elements）。',
      'dl.tipWv2Body':
        '常见于较老 Win10 / LTSC 精简版、卸过 Edge 浏览器或直接运行绿色单文件版的电脑（<strong>Win7 用户请直接下载下方专属兼容绿包版</strong>）。优先推荐安装上方<strong>正式安装版（setup.exe）</strong>，或点击右侧下载微软官方 WebView2 引导程序（1.8 MB），<strong>右键 → 以管理员身份运行</strong>装完即可全机生效。',
      'dl.win7Body':
        '专为 Windows 7 SP1 64 位单独编译适配（原生 PE 6.01，零 Win8/Win10 DLL 依赖，内置微软官方最后一版支持 Win7 的 <strong>WebView2 109.0.1518.78</strong> 离线内核，并启用 Win7 原生 256 级逐像素透明抗锯齿渲染，无论是否开启 Aero 均无白底框与锯齿）。下载后请先<strong>全部解压</strong>，保持 <code>KuroCat.exe</code> 与 <code>WebView2Runtime</code> 同目录，直接双击运行即可。',
      'dl.linuxBody':
        '原生支持 X11 全局键鼠监听（免 root）与 Wayland <code>evdev</code> 降级、透明无边框置顶、鼠标穿透（按住 <code>Alt</code> 临时拖动）及开机自启。需要 <strong><code>glibc &gt;= 2.34</code></strong>（基于 Ubuntu 22.04+ / Debian 12+ / 银河麒麟 V11+，暂不支持基于 Ubuntu 20.04 / <code>glibc 2.31</code> 的银河麒麟 V10 SP1）。优先推荐下载轻量 <strong>.deb 安装包（2.2 MB）</strong>（需 <code>libwebkit2gtk-4.1-0</code>，双击或 <code>sudo apt install ./KuroCat-*.deb</code>）；无管理员权限可直接运行 <strong>.AppImage 绿色版</strong>（<code>chmod +x</code> 后双击）。',
      'dl.tipGameBody':
        '<strong>① 单机与常规游戏</strong>：在 Win10/11 全屏优化（FSO）或「无边框窗口化」下内置持续 Z 序置顶守卫且绝不抢焦点；建议开启「锁定鼠标穿透」（按住 <code>Alt</code> 键随时临时拖动或右键解锁）。若游戏以管理员权限运行导致无法捕获键鼠，右键系统托盘点<strong>「以管理员身份重启（捕获游戏键鼠）」</strong>即可。<br /><strong>② OBS 直播 / 录屏（原生免抠像）</strong>：右键小猫或系统托盘点<strong>「复制 OBS 透明源地址」</strong>（自动开启本机 <code>http://127.0.0.1:27421/obs</code>，默认关闭零开销），在 OBS 添加「浏览器」来源即可直接获得原生 Alpha 透明通道（无需绿幕抠像，支持「仅 OBS 显示」隐藏桌面猫，密码防偷窥同步生效）。<br /><strong>③ 强内核反作弊网游</strong>（无畏契约、三角洲行动等）：建议游玩前右键系统托盘点一下<strong>「暂停监听并隐藏（游戏反作弊护航）」</strong>，彻底卸载钩子保护账号安全。',
      'feat.whaleHeadline': '新皮肤「大肥鱼」登场<br />鲸尾拍键 · 脸红大笑 · 密码捂眼',
      'feat.whaleBody':
        '内置全新 <strong>🐳 大肥鱼（鲸鱼娘）</strong> 桌宠皮肤：支持<strong>左手点鼠标 + 右手敲键盘 + 大鲸尾甩拍自定义按键</strong>三线同时开工；打字手速越快越害羞脸红，飙到高能连打直接笑开花；检测到系统密码输入框时自动<strong>乖巧闭眼、双手捂眼</strong>并隐藏所有键帽与气泡。',
      'feat.kbHeadline': '65% 紧凑或 108 键全尺寸<br />正反双视角，随手切换',
      'feat.kbBody':
        '无论你习惯极简 65% 小键盘，还是财务/工程必备的 108 键完整小键盘，右键一秒切换并自动锚定右下角平滑调整窗口宽度。支持<strong>「面向猫咪（180° 真实视角）」</strong>与<strong>「面向观众（正向字母易读视角）」</strong>双透视重投影，鼠标左右键也同步自动翻转。',
      'feat.mouseHeadline': '左右键独立分色按压<br />还有无感自升级',
      'feat.mouseBody':
        '鼠标左键（<code>L</code>）、右键（<code>R</code>）与中键滚轮彻底独立分区：左键亮起猫咪主强调色，右键呈现高对比珊瑚橙或天蓝色，带 3D 按下内阴影与 <code>LMB</code>/<code>RMB</code> 迷你气泡，支持双键同时按住！启动后自动静默检查 GitHub Releases，发现新版时在猫头上方浮现轻量提醒条，点一下即可完成 SHA-256 校验与一键自升级。',
      'mcp.headline': '发张自家猫的照片<br />让 AI 0.4 秒捏进你的桌面',
      'mcp.body':
        'KuroCat 原生内置 <strong>Stdio</strong> 与 <strong>本机 Streamable HTTP（<code>127.0.0.1:27420</code>）</strong> 双模式 MCP 服务端，无需安装 Node.js 或 Python。右键猫咪点「复制 MCP 配置」粘贴进 <strong>Claude Desktop / Cursor / Antigravity / Windsurf</strong>，即可用自然语言捏出任何毛色、虎斑、三花、胎记斑块与主题高亮，实时热更新无需重启。',
      'footer.credit': 'KuroCat · MIT Open Source · Built by <a class="footer-home" href="/">谦一 (Qianyi)</a>',
    },
    placeholders: {
      'pg.pwdPlaceholder': '点此输入密码：猫咪自动闭眼 / 大肥鱼捂眼且隐藏按键…',
    },
    titles: {
      'pg.autoDemoTitle': '自动演示打字与鼠标点击',
      'pg.mouseTitle': '演示独立左/右键点击',
      'pg.curiousTitle': '触发逗猫棒好奇大圆瞳（也可快速甩动鼠标自然触发）',
      'pg.crossTitle': '触发飞机耳 + 尾巴三连捶桌（也可乱拍键盘自然触发）',
      'pg.sleepTitle': '触发趴下打瞌睡冒 Zzz（敲任意键抖头醒来）',
      'pg.bubblesTitle': '开关悬浮按键气泡',
      'pg.purrTitle': '开关摸头呼噜声',
      'pg.tailSmartTitle': '平时双手打字，两手忙不过来或打完回车时自动出尾',
      'pg.tailCustomTitle': '只拍你亲手勾选的按键',
      'pg.tailEdgeTitle': '近尾外侧边缘区（不拆 WASD）',
      'pg.tailOffTitle': '尾巴只自然摆动，不拍键',
      'pg.tailPickerTitle': '直接在上方键盘点击键帽或敲实体键盘自定义尾巴按键',
      'pg.privacyTitle': '手动切换密码防偷窥演示',
      'pg.scaleResetTitle': '点击重置为 100%',
    },
    prompts: {
      'mcp.p1': '帮我用 KuroCat MCP 新增一只英短蓝猫，琥珀色大眼睛、浅灰蓝键盘高亮，并立刻切过去',
      'mcp.p2': '看这张我家猫的照片，用 KuroCat MCP 按它的花色、耳尖和斑块位置给我定制一只专属桌宠！',
      'mcp.p3': '把 KuroCat 缩放到 85%，切换为 108 键全尺寸键盘和面向观众视角',
    },
    skins: {
      black: '小黑猫',
      ragdoll: '布偶猫',
      'orange-tabby': '大橘猫',
      calico: '三花猫',
      tuxedo: '奶牛猫',
      siamese: '暹罗猫',
      dafeiyu: '大肥鱼',
    },
    tailModeShort: {
      smart: '尾巴：智能',
      custom: '尾巴：自定义',
      edge: '尾巴：边缘',
      off: '尾巴：仅摆动',
    },
    mcpSnippets: {
      win: {
        raw: `{\n  "mcpServers": {\n    "kurocat": {\n      "command": "C:\\\\Users\\\\<你的用户名>\\\\AppData\\\\Local\\\\KuroCat\\\\KuroCat.exe",\n      "args": ["--mcp"]\n    }\n  }\n}`,
        html: `<span class="c-dim">// Windows Stdio 模式（Claude / Cursor / Antigravity 通用）</span>\n{\n  <span class="c-key">"mcpServers"</span>: {\n    <span class="c-key">"kurocat"</span>: {\n      <span class="c-key">"command"</span>: <span class="c-str">"C:\\\\Users\\\\&lt;你的用户名&gt;\\\\AppData\\\\Local\\\\KuroCat\\\\KuroCat.exe"</span>,\n      <span class="c-key">"args"</span>: [<span class="c-str">"--mcp"</span>]\n    }\n  }\n}`,
      },
      mac: {
        raw: `{\n  "mcpServers": {\n    "kurocat": {\n      "command": "/Applications/KuroCat.app/Contents/MacOS/KuroCat",\n      "args": ["--mcp"]\n    }\n  }\n}`,
        html: `<span class="c-dim">// macOS Stdio 模式（零依赖直连 App 内置二进制）</span>\n{\n  <span class="c-key">"mcpServers"</span>: {\n    <span class="c-key">"kurocat"</span>: {\n      <span class="c-key">"command"</span>: <span class="c-str">"/Applications/KuroCat.app/Contents/MacOS/KuroCat"</span>,\n      <span class="c-key">"args"</span>: [<span class="c-str">"--mcp"</span>]\n    }\n  }\n}`,
      },
      http: {
        raw: `{\n  "mcpServers": {\n    "kurocat": {\n      "url": "http://127.0.0.1:27420/mcp"\n    }\n  }\n}`,
        html: `<span class="c-dim">// 本机 Streamable HTTP 模式（桌宠运行时直接连接）</span>\n{\n  <span class="c-key">"mcpServers"</span>: {\n    <span class="c-key">"kurocat"</span>: {\n      <span class="c-key">"url"</span>: <span class="c-str">"http://127.0.0.1:27420/mcp"</span>\n    }\n  }\n}`,
      },
    },
    fmt: {
      latestVersion: (tag) => `最新版本 ${tag}`,
      heroDownloadWin: (size) => `免费下载 Windows 版（${size}）`,
      heroDownloadMac: (size) => `免费下载 macOS 通用版（${size}）`,
      layout: (id) => (id === 'k98m' ? 'K98M Plus' : id === '108' ? '108 全尺寸' : '65% 紧凑'),
      orient: (o) => (o === 'viewer' ? '面向观众' : '面向猫咪'),
      tailPickerBtn: (open, count) =>
        open ? `✓ 正在点选（已选 ${count} 键）` : `🐾 点选尾巴按键（${count}）`,
      tailPickerTitleDefault: (count) => `🐾 直接点击下方键帽或敲实体键盘开关（已选 ${count} 键）`,
      tailKeyAdded: (key, count) => `🐾 已加「${key}」· 共 ${count} 键（点完成开始打字测试）`,
      tailKeyRemoved: (key, count) => `🐾 已取消「${key}」· 共 ${count} 键`,
      tailPresetApplied: (preset, count) => {
        const names = { office: '回车空格', rightFn: '方向/小键盘', edgeMods: '外侧功能键' };
        return `🐾 已套用「${names[preset]}」（${count} 键）`;
      },
      tailCleared: () => '🐾 已清空全部尾巴按键（点键帽或敲键添加）',
      autoDemoBtn: (running) => (running ? '⏸ 停止演示' : '▶ 自动演示'),
      privacyBtn: (active) => (active ? '🙈 密码防偷窥中' : '🔒 密码防偷窥'),
      whaleSoundBtn: (muted) => (muted ? '🔇 点此开启音效' : '🔊 音效已开启'),
      copied: () => '已复制 ✓',
      copyConfig: () => '复制配置',
      copyCmd: () => '复制命令',
      copyShort: () => '复制',
      totalDownloads: (count) => `累计下载 ${count} 次`,
      statsUpdated: (timePart) => `更新于 ${timePart} (UTC+8) · 每 30 秒自动刷新`,
    },
  },

  en: {
    htmlLang: 'en',
    docTitle: 'KuroCat — Free Open-Source Desktop Typing Cat Pet (Bongo Cat Alternative for Win/Mac/Linux/OBS)',
    metaDesc:
      'KuroCat is a free open-source, lightweight transparent always-on-top desktop typing & mouse cat companion (Bongo Cat alternative) for Windows, macOS, Linux & Android: 6 hand-crafted cats + BigFish whale-girl, password privacy guard, customizable tail keys, native OBS transparent source, 65%/108-key layouts & built-in MCP AI skin studio.',
    text: {
      'nav.back': '← Qianyi',
      'nav.playground': 'Playground',
      'nav.whale': 'BigFish Video',
      'nav.download': 'Download',
      'nav.features': 'Features',
      'nav.mcp': 'AI MCP',
      'hero.eyebrow': 'Windows · macOS · Linux · Open Source',
      'hero.allPlatforms': 'All Platforms',
      'hero.ghSource': 'GitHub Source ›',
      'hero.spec1Lbl': 'Native Rust Installer Size',
      'hero.spec2Val': '7 Skins + MCP',
      'hero.spec2Lbl': 'Cats & Whale-Girl · AI Studio',
      'hero.spec3Val': 'Win / Mac / Linux',
      'hero.spec3Lbl': 'Apple Silicon · Win7 · KylinOS',
      'pg.title': 'Live Web Engine · Type or Pet the Cat',
      'pg.bgDark': 'Dark Desk',
      'pg.bgLight': 'Light Desk',
      'pg.hintKey': '⌨️ Type',
      'pg.hintMouse': '🖱️ L/R Click',
      'pg.hintPet': '🤚 Pet Head',
      'pg.done': 'Done',
      'pg.presetOffice': 'Enter & Space',
      'pg.presetRightFn': 'Arrows & Numpad',
      'pg.presetEdgeMods': 'Outer Modifiers',
      'pg.presetClear': 'Clear',
      'pg.lblSkin': 'Skin',
      'pg.layout65': '65% Compact',
      'pg.layout108': '108 Full-Size',
      'pg.orientCat': 'Cat View',
      'pg.orientViewer': 'Viewer View',
      'pg.btnMouse': '🖱️ L/R Click',
      'pg.btnCurious': '👀 Curious',
      'pg.btnCross': '💢 Tail Thump',
      'pg.btnSleep': '💤 Sleep',
      'pg.btnBubbles': '💬 Bubbles',
      'pg.btnPurr': '🔊 Purr',
      'pg.lblTail': 'Tail Keys',
      'pg.tailSmart': 'Smart 3rd Hand',
      'pg.tailCustom': 'Custom',
      'pg.tailEdge': 'Edge Only',
      'pg.tailOff': 'Wag Only',
      'pg.lblPwd': 'Password',
      'pg.lblScale': 'Scale',
      'dl.eyebrow': 'Direct Downloads · Cloudflare Edge CDN',
      'dl.title': 'Free Download — On Your Desk in 3 Seconds',
      'dl.winName': 'Windows 65% Classic Installer',
      'dl.winSub': 'Windows 10 / 11 (x64)',
      'dl.winTag': 'Recommended',
      'dl.primaryBtn': 'Fast Direct Download',
      'dl.ghBtn': 'GitHub Official Mirror ›',
      'dl.macName': 'macOS Universal (Apple Silicon & Intel)',
      'dl.macSub': 'macOS 10.15+ (Catalina or later) Universal DMG',
      'dl.tipWinTitle': '🛡️ Browser says "isn\'t commonly downloaded" or Windows SmartScreen pops up?',
      'dl.tipMacTitle': '🍎 macOS First-Launch Guide (One-Time Setup)',
      'dl.copyCmd': 'Copy Command',
      'dl.tipWv2Title': '🪟 Seeing "Could not find the WebView2 Runtime" on Windows?',
      'dl.tipWv2Btn': 'Download Microsoft WebView2 Runtime ›',
      'dl.win7Title': '🖥️ Windows 7 SP1 (64-bit) Dedicated Portable (Bundled WebView2 109)',
      'dl.win7Btn': 'Download Win7 Portable (178.94 MB)',
      'dl.win7Gh': 'GitHub Official Mirror (Win7) ›',
      'dl.linuxTitle': '🐧 Linux / Ubuntu 22.04+ / Debian 12+ / KylinOS V11+ (x86_64 & ARM64)',
      'dl.linuxArmDeb': 'ARM64 .deb (2.19 MB)',
      'dl.tipGameTitle': '🎮 Fullscreen Games, OBS Streaming & Anti-Cheat Guide',
      'feat.title': 'Desktop Pet Engineering, Polished to Every Pixel',
      'feat.whaleEyebrow': 'New Skin · 🐳 BigFish (Whale-Girl) · 14s Video',
      'feat.whaleSpec1Val': '3-Limb Sync',
      'feat.whaleSpec1Lbl': 'Mouse + Typing + Tail Slaps',
      'feat.whaleSpec2Val': 'Speed Blush',
      'feat.whaleSpec2Lbl': 'Fast Typing → Shy → Laugh',
      'feat.whaleSpec3Val': 'Hands Cover',
      'feat.whaleSpec3Lbl': 'Auto Password Privacy Shield',
      'feat.whaleTryBtn': 'Try BigFish in Playground ↑',
      'feat.whaleDlBtn': 'Download 1080p Vertical Video (14s)',
      'feat.whaleMeta': '1080×1920 · 60fps · 14s with synced key & mouse audio',
      'feat.kbSpec1Val': '108 Keys',
      'feat.kbSpec1Lbl': 'Full F-Row & Numpad',
      'feat.kbSpec2Val': 'Dual View',
      'feat.kbSpec2Lbl': 'Cat-Facing / Viewer-Facing',
      'feat.kbSpec3Val': 'True Keys',
      'feat.kbSpec3Lbl': 'Distinct Enter vs Num↵',
      'feat.kbTryBtn': 'Try 108-Key Layout Above ↑',
      'feat.mouseSpec1Lbl': 'Independent L / R / Scroll Glow',
      'feat.mouseSpec2Lbl': 'SHA-256 Verified Updates',
      'feat.mouseSpec3Val': '1-Click Update',
      'feat.mouseSpec3Lbl': 'Silent Win & Mac Upgrade',
      'bento.1Title': '20%–150% Smooth Scaling',
      'bento.1Body': '60fps continuous slider anchored to the bottom-right corner. Even at 20% mini size, menus and alerts stay crisp and unclipped.',
      'bento.2Title': 'Head Petting & Synthesized Purr',
      'bento.2Body': 'Hover over the cat’s head and pet back-and-forth to trigger happy squinting eyes and gentle 24.5Hz Web Audio purring.',
      'bento.3Title': 'Auto Password Privacy Guard',
      'bento.3Body': 'Detects Windows & macOS password fields at the OS level—intercepting keystrokes in Rust while cats close their eyes and BigFish covers hers.',
      'bento.4Title': 'Native Rust, Featherlight',
      'bento.4Body': 'No bloated Electron bundle. ~24 MB RAM footprint and near-zero idle CPU with native global input hooks.',
      'mcp.p1Text': '💬 "Create a British Shorthair blue cat via KuroCat MCP and switch to it"',
      'mcp.p2Text': '📸 "Look at this photo of my cat and design a matching KuroCat skin!"',
      'mcp.p3Text': '⚙️ "Scale KuroCat to 85% and switch to 108-key viewer perspective"',
      'mcp.copyShort': 'Copy',
      'mcp.tabHttp': 'Local HTTP',
      'mcp.footerMeta': '7 Built-in Tools · 0.4s Live Hot-Reload',
      'mcp.copyCfg': 'Copy Config',
      'footer.home': 'Qianyi Home',
      'footer.pelican': 'Pelican Benchmark',
      'footer.releases': 'All Releases',
    },
    html: {
      'hero.title': 'KuroCat — A Typing Black Cat<br /><span>Living on Your Desktop</span>',
      'hero.sub':
        'Built with <strong>Tauri v2 + native Rust hooks + Three.js 3D / Canvas 2D dual engine</strong> as a transparent, always-on-top desk companion. Defaults to <strong>✨ 3D Volumetric Figurine</strong> (one-click switch to <strong>2D Classic</strong>), only <strong>2.15 MB</strong> installer; includes <strong>6 cats + 🐳 BigFish</strong>, <strong>optional auto-game gaming headphones</strong>, <strong>3D collar bells</strong>, <strong>customizable tail-key patting</strong>, <strong>native OBS transparent source</strong>, <strong>password privacy guard</strong>, and <strong>MCP AI cat studio</strong> (1:1 spots in 3D &amp; 2D).',
      'dl.sub':
        'Every build includes <strong>20%–150% smooth scaling</strong>, <strong>65% / 108-key switching</strong>, <strong>customizable tail keys</strong>, and <strong>in-app auto-updates</strong>.<br />Fast CDN mirrors on <code>qianyi.one</code> alongside official GitHub Releases with SHA-256 verification.',
      'dl.winDesc':
        'Starts with the 65% compact layout and adds Desktop, Start Menu & Uninstaller shortcuts. Right-click anytime for <strong>108-key full-size</strong>, <strong>custom tail keys</strong>, OBS source & one-click updates.',
      'dl.macDesc':
        'Native ARM64 + x86_64 Universal DMG supporting Apple Silicon M1–M4 and Intel Macs (macOS 10.15 Catalina+). Includes 65%/108-key layouts, all 6 cats & BigFish. Open <code>.dmg</code> and drag to Applications.',
      'dl.tipWinBody':
        'Because KuroCat is free open-source software without a commercial EV code-signing certificate, Edge/Chrome may show a download warning (100% source code is public on GitHub):<br /><strong>① Edge</strong>: Hover the download → click <strong><code>···</code></strong> → <strong>Keep</strong> → click the down arrow <strong><code>▾</code> (Show more)</strong> → <strong>Keep anyway</strong> (Chrome: press <code>Ctrl + J</code> → Keep dangerous file → Keep anyway).<br /><strong>② Windows SmartScreen</strong>: Click <strong>More info</strong> → <strong>Run anyway</strong>.',
      'dl.tipMacBody':
        'Because this open-source app is not Apple-notarized, if macOS says "cannot be verified" or "damaged" on first launch, run the command on the right once in Terminal to remove the quarantine attribute. Then enable <code>KuroCat</code> in <strong>System Settings → Privacy &amp; Security → Accessibility &amp; Input Monitoring</strong> (Karabiner-Elements compatible).',
      'dl.tipWv2Body':
        'Occurs on older stripped Windows 10 / LTSC installs without Microsoft Edge WebView2 (<strong>Windows 7 users should use the Win7 Portable pack below</strong>). Install the official 1.8 MB Microsoft WebView2 bootstrapper via <strong>Right-click → Run as administrator</strong>.',
      'dl.win7Body':
        'Compiled natively as PE 6.01 for Windows 7 SP1 x64 with zero Win8/Win10 DLL dependencies. Bundles Microsoft’s final Win7 offline <strong>WebView2 109.0.1518.78</strong> runtime and native 256-level per-pixel anti-aliased transparency (zero white box with or without Aero). Extract all files and run <code>KuroCat.exe</code> next to <code>WebView2Runtime</code>.',
      'dl.linuxBody':
        'Native rootless X11 <code>XRecord</code> global hooks with Wayland <code>evdev</code> fallback, borderless transparency, click-through (hold <code>Alt</code> to drag) & autostart. Requires <strong><code>glibc &gt;= 2.34</code></strong> (Ubuntu 22.04+ / Debian 12+ / KylinOS V11+; not compatible with Ubuntu 20.04 / <code>glibc 2.31</code>). Use lightweight <strong>.deb (2.2 MB)</strong> (requires <code>libwebkit2gtk-4.1-0</code>) or portable <strong>.AppImage</strong>.',
      'dl.tipGameBody':
        '<strong>① Fullscreen &amp; Borderless Games</strong>: Built-in non-focus-stealing topmost guard for FSO &amp; borderless windows; enable Click-Through Lock (hold <code>Alt</code> anytime to move). For admin games, use tray → <strong>Restart as Administrator</strong>.<br /><strong>② OBS Streaming (Zero Chroma-Key)</strong>: Right-click pet or tray → <strong>Copy OBS Transparent Source URL</strong> (starts local <code>http://127.0.0.1:27421/obs</code>, off by default with zero overhead) and add as an OBS Browser Source for native Alpha transparency + OBS-Only mode + synced password guard.<br /><strong>③ Kernel Anti-Cheat Games</strong> (Valorant, etc.): Use tray → <strong>Pause Hook &amp; Hide (Anti-Cheat Safe Mode)</strong> before launching to fully unload global hooks.',
      'feat.whaleHeadline': 'Meet "BigFish" Whale-Girl<br />Tail Slaps · Speed Blush · Privacy Shield',
      'feat.whaleBody':
        'Our built-in <strong>🐳 BigFish (whale-girl)</strong> skin supports simultaneous <strong>left-hand mouse + right-hand typing + splashing whale-tail key slaps</strong>. Type faster to make her blush and burst into a happy smile; focus any password field and she covers her eyes with both hands while hiding every keycap.',
      'feat.kbHeadline': '65% Compact or 108 Full-Size<br />Dual Perspectives, Instant Switch',
      'feat.kbBody':
        'Switch in one click between minimal 65% and full 108-key ANSI (complete F-row &amp; numpad) with smooth bottom-right anchored resizing. Flip between <strong>Cat-Facing (180°)</strong> and <strong>Viewer-Facing (upright legends)</strong> with synchronized mouse button orientation.',
      'feat.mouseHeadline': 'Independent L / R Click Colors<br />&amp; Seamless In-App Auto-Updater',
      'feat.mouseBody':
        'Left (<code>L</code>), Right (<code>R</code>), and scroll/middle clicks glow independently with contrasting accent colors, 3D pressed shadows, and mini <code>LMB</code>/<code>RMB</code> badges—supporting dual-button holds. Silent GitHub Releases checks offer SHA-256 verified one-click upgrades.',
      'mcp.headline': 'Share a Photo of Your Cat<br />AI Sculpts It in 0.4 Seconds',
      'mcp.body':
        'KuroCat ships with both <strong>Stdio</strong> and <strong>Local Streamable HTTP (<code>127.0.0.1:27420</code>)</strong> MCP servers inside the single binary—no Node.js or Python needed. Click "Copy MCP Config" and paste into <strong>Claude Desktop / Cursor / Antigravity / Windsurf</strong> to design any coat, tabby stripes, calico patches, or eye colors with instant hot-reload.',
      'footer.credit': 'KuroCat · MIT Open Source · Built by <a class="footer-home" href="/?lang=en">Qianyi</a>',
    },
    placeholders: {
      'pg.pwdPlaceholder': 'Type a password here: cat closes eyes / BigFish covers eyes & hides keys…',
    },
    titles: {
      'pg.autoDemoTitle': 'Toggle automatic typing & mouse demo',
      'pg.mouseTitle': 'Demo independent L/R mouse clicks',
      'pg.curiousTitle': 'Trigger curious wide pupils (or flick cursor quickly)',
      'pg.crossTitle': 'Trigger airplane ears + 3-beat tail desk-thump (or mash keys)',
      'pg.sleepTitle': 'Trigger sleepy loaf with floating Zzz (press any key to wake)',
      'pg.bubblesTitle': 'Toggle floating keycap bubbles',
      'pg.purrTitle': 'Toggle petting purr sound',
      'pg.tailSmartTitle': 'Paws type normally; tail assists as a 3rd hand when busy or on fast Enter',
      'pg.tailCustomTitle': 'Tail taps only the keys you select',
      'pg.tailEdgeTitle': 'Outer tail-side edge keys only (protects WASD)',
      'pg.tailOffTitle': 'Tail wags naturally without pressing keys',
      'pg.tailPickerTitle': 'Click keycaps on the keyboard above or press physical keys to toggle',
      'pg.privacyTitle': 'Toggle password privacy guard demo',
      'pg.scaleResetTitle': 'Click to reset to 100%',
    },
    prompts: {
      'mcp.p1': 'Use KuroCat MCP to create a British Shorthair blue cat with amber eyes and ice-blue keycaps, and switch to it now',
      'mcp.p2': 'Look at this photo of my cat and design a custom KuroCat desktop pet matching its fur pattern and markings!',
      'mcp.p3': 'Scale KuroCat to 85% and switch to the 108-key full-size viewer-facing keyboard',
    },
    skins: {
      black: 'Black Cat',
      ragdoll: 'Ragdoll',
      'orange-tabby': 'Orange Tabby',
      calico: 'Calico',
      tuxedo: 'Tuxedo',
      siamese: 'Siamese',
      dafeiyu: 'BigFish',
    },
    tailModeShort: {
      smart: 'Tail: Smart',
      custom: 'Tail: Custom',
      edge: 'Tail: Edge',
      off: 'Tail: Wag Only',
    },
    mcpSnippets: {
      win: {
        raw: `{\n  "mcpServers": {\n    "kurocat": {\n      "command": "C:\\\\Users\\\\<YourUsername>\\\\AppData\\\\Local\\\\KuroCat\\\\KuroCat.exe",\n      "args": ["--mcp"]\n    }\n  }\n}`,
        html: `<span class="c-dim">// Windows Stdio Mode (Claude / Cursor / Antigravity)</span>\n{\n  <span class="c-key">"mcpServers"</span>: {\n    <span class="c-key">"kurocat"</span>: {\n      <span class="c-key">"command"</span>: <span class="c-str">"C:\\\\Users\\\\&lt;YourUsername&gt;\\\\AppData\\\\Local\\\\KuroCat\\\\KuroCat.exe"</span>,\n      <span class="c-key">"args"</span>: [<span class="c-str">"--mcp"</span>]\n    }\n  }\n}`,
      },
      mac: {
        raw: `{\n  "mcpServers": {\n    "kurocat": {\n      "command": "/Applications/KuroCat.app/Contents/MacOS/KuroCat",\n      "args": ["--mcp"]\n    }\n  }\n}`,
        html: `<span class="c-dim">// macOS Stdio Mode (zero dependencies, built into app binary)</span>\n{\n  <span class="c-key">"mcpServers"</span>: {\n    <span class="c-key">"kurocat"</span>: {\n      <span class="c-key">"command"</span>: <span class="c-str">"/Applications/KuroCat.app/Contents/MacOS/KuroCat"</span>,\n      <span class="c-key">"args"</span>: [<span class="c-str">"--mcp"</span>]\n    }\n  }\n}`,
      },
      http: {
        raw: `{\n  "mcpServers": {\n    "kurocat": {\n      "url": "http://127.0.0.1:27420/mcp"\n    }\n  }\n}`,
        html: `<span class="c-dim">// Local Streamable HTTP Mode (connect while KuroCat is running)</span>\n{\n  <span class="c-key">"mcpServers"</span>: {\n    <span class="c-key">"kurocat"</span>: {\n      <span class="c-key">"url"</span>: <span class="c-str">"http://127.0.0.1:27420/mcp"</span>\n    }\n  }\n}`,
      },
    },
    fmt: {
      latestVersion: (tag) => `Latest ${tag}`,
      heroDownloadWin: (size) => `Download for Windows (${size})`,
      heroDownloadMac: (size) => `Download for macOS (${size})`,
      layout: (id) => (id === 'k98m' ? 'K98M Plus' : id === '108' ? '108 Full-Size' : '65% Compact'),
      orient: (o) => (o === 'viewer' ? 'Viewer View' : 'Cat View'),
      tailPickerBtn: (open, count) =>
        open ? `✓ Picking (${count} selected)` : `🐾 Pick Tail Keys (${count})`,
      tailPickerTitleDefault: (count) => `🐾 Click keycaps below or press physical keys (${count} selected)`,
      tailKeyAdded: (key, count) => `🐾 Added "${key}" · ${count} keys (click Done to test)`,
      tailKeyRemoved: (key, count) => `🐾 Removed "${key}" · ${count} keys`,
      tailPresetApplied: (preset, count) => {
        const names = { office: 'Enter & Space', rightFn: 'Arrows & Numpad', edgeMods: 'Outer Modifiers' };
        return `🐾 Applied "${names[preset]}" (${count} keys)`;
      },
      tailCleared: () => '🐾 Cleared all tail keys (click keycaps or press keys to add)',
      autoDemoBtn: (running) => (running ? '⏸ Stop Demo' : '▶ Auto Demo'),
      privacyBtn: (active) => (active ? '🙈 Privacy Active' : '🔒 Privacy Guard'),
      whaleSoundBtn: (muted) => (muted ? '🔇 Unmute Audio' : '🔊 Audio On'),
      copied: () => 'Copied ✓',
      copyConfig: () => 'Copy Config',
      copyCmd: () => 'Copy Command',
      copyShort: () => 'Copy',
      totalDownloads: (count) => `${count} total downloads`,
      statsUpdated: (timePart) => `Updated ${timePart} (UTC+8) · auto-refreshes every 30s`,
    },
  },

  ja: {
    htmlLang: 'ja',
    docTitle: 'KuroCat · 無料オープンソースのデスクトップタイピング黒猫ペット（Win/Mac/Linux/OBS対応）',
    metaDesc:
      'KuroCat は Windows / macOS / Linux / Android 対応の無料オープンソース透過デスクトップタイピング黒猫ペット（Bongo Cat 代替）。手描き猫 6 種＋クジラ娘、パスワード自動目隠し保護、しっぽキー指定、OBS 透過ソース、65%/108 キー切替、内蔵 MCP AI スキン生成に対応。',
    text: {
      'nav.back': '← 謙一',
      'nav.playground': '体験版',
      'nav.whale': 'クジラ娘動画',
      'nav.download': 'ダウンロード',
      'nav.features': '主な機能',
      'nav.mcp': 'AI カスタム',
      'hero.eyebrow': 'Windows · macOS · Linux · Open Source',
      'hero.allPlatforms': '全プラットフォーム',
      'hero.ghSource': 'GitHub ソース ›',
      'hero.spec1Lbl': 'Rust ネイティブ導入サイズ',
      'hero.spec2Val': '7 種 + MCP',
      'hero.spec2Lbl': '猫 & クジラ娘 · AI 制作',
      'hero.spec3Val': 'Win / Mac / Linux',
      'hero.spec3Lbl': 'Apple Silicon · Win7 · KylinOS',
      'pg.title': 'リアルタイム体験版 · 打鍵やなでなでに対応',
      'pg.bgDark': 'ダーク壁紙',
      'pg.bgLight': 'ライト壁紙',
      'pg.hintKey': '⌨️ キー入力',
      'pg.hintMouse': '🖱️ 左右クリック',
      'pg.hintPet': '🤚 頭をなでる',
      'pg.done': '完了',
      'pg.presetOffice': 'Enter・Space',
      'pg.presetRightFn': '方向・テンキー',
      'pg.presetEdgeMods': '外側修飾キー',
      'pg.presetClear': 'クリア',
      'pg.lblSkin': 'スキン',
      'pg.layout65': '65% コンパクト',
      'pg.layout108': '108 フルサイズ',
      'pg.orientCat': '猫目線',
      'pg.orientViewer': '視聴者目線',
      'pg.btnMouse': '🖱️ 左右クリック',
      'pg.btnCurious': '👀 好奇心',
      'pg.btnCross': '💢 しっぽ叩き',
      'pg.btnSleep': '💤 うたた寝',
      'pg.btnBubbles': '💬 バブル',
      'pg.btnPurr': '🔊 ゴロゴロ',
      'pg.lblTail': 'しっぽ打鍵',
      'pg.tailSmart': 'スマート第3の手',
      'pg.tailCustom': 'カスタム',
      'pg.tailEdge': '端エリア',
      'pg.tailOff': '揺らすだけ',
      'pg.lblPwd': 'パスワード',
      'pg.lblScale': '拡大縮小',
      'dl.eyebrow': 'Direct Downloads · Cloudflare Edge CDN',
      'dl.title': '無料ダウンロード、3 秒でデスクにお迎え',
      'dl.winName': 'Windows 65% インストーラー版',
      'dl.winSub': 'Windows 10 / 11 (x64)',
      'dl.winTag': 'おすすめ',
      'dl.primaryBtn': '高速ダイレクトDL',
      'dl.ghBtn': 'GitHub 公式ミラー ›',
      'dl.macName': 'macOS ユニバーサル版（M チップ & Intel）',
      'dl.macSub': 'macOS 10.15+ (Catalina 以降) Universal DMG',
      'dl.tipWinTitle': '🛡️ ブラウザのダウンロード警告や SmartScreen が表示されたら？',
      'dl.tipMacTitle': '🍎 macOS 初回起動ガイド（初回のみ・常時ターミナル不要）',
      'dl.copyCmd': 'コマンドをコピー',
      'dl.tipWv2Title': '🪟 Windows で「Could not find the WebView2 Runtime」が出たら？',
      'dl.tipWv2Btn': 'Microsoft WebView2 をダウンロード ›',
      'dl.win7Title': '🖥️ Windows 7 SP1（64bit）専用ポータブル版（WebView2 109 同梱）',
      'dl.win7Btn': 'Win7 ポータブル版をダウンロード（178.94 MB）',
      'dl.win7Gh': 'GitHub 公式ミラー（Win7 版）›',
      'dl.linuxTitle': '🐧 Linux / Ubuntu 22.04+ / Debian 12+ / KylinOS V11+（x86_64 & ARM64）',
      'dl.linuxArmDeb': 'ARM64 .deb（2.19 MB）',
      'dl.tipGameTitle': '🎮 フルスクリーンゲーム・OBS 配信・アンチチート案内',
      'feat.title': '1 ピクセルまでこだわり抜いた滑らかさ',
      'feat.whaleEyebrow': 'New Skin · 🐳 クジラ娘（大肥鱼）· 14s Video',
      'feat.whaleSpec1Val': '3 系統同動',
      'feat.whaleSpec1Lbl': 'マウス + 手打ち + クジラ尾',
      'feat.whaleSpec2Val': '速度連動',
      'feat.whaleSpec2Lbl': '高速打鍵で照れ顔 → 満面笑顔',
      'feat.whaleSpec3Val': '自動目隠し',
      'feat.whaleSpec3Lbl': 'パスワード入力を両手で保護',
      'feat.whaleTryBtn': '上の体験版でクジラ娘を試す ↑',
      'feat.whaleDlBtn': '1080p 縦型デモ動画を保存（14秒）',
      'feat.whaleMeta': '1080×1920 · 60fps · 14秒 同期打鍵＆クリック音付き',
      'feat.kbSpec1Val': '108 キー',
      'feat.kbSpec1Lbl': 'F 列＆テンキー完全搭載',
      'feat.kbSpec2Val': '2 視点切替',
      'feat.kbSpec2Lbl': '猫目線 / 視聴者目線',
      'feat.kbSpec3Val': '完全識別',
      'feat.kbSpec3Lbl': '主 Enter と Num↵ を独立認識',
      'feat.kbTryBtn': '上の体験版で 108 キーを試す ↑',
      'feat.mouseSpec1Lbl': '左右中クリック完全独立発光',
      'feat.mouseSpec2Lbl': 'SHA-256 自動検証更新',
      'feat.mouseSpec3Val': '1 クリック更新',
      'feat.mouseSpec3Lbl': 'Win / Mac 自動再起動アップデート',
      'bento.1Title': '20%–150% 無段階ズーム',
      'bento.1Body': '60fps スライダーで右下基準のまま自在にリサイズ。最小 20% でもメニューや通知は見切れず鮮明です。',
      'bento.2Title': 'なでなで細目 & 合成ゴロゴロ音',
      'bento.2Body': '猫の頭を往復でなでると気持ちよさそうに目を細め、Web Audio 24.5Hz 合成のやさしいゴロゴロ音が鳴ります。',
      'bento.3Title': 'パスワード自動目隠し保護',
      'bento.3Body': 'Windows / macOS のパスワード欄を自動検知し Rust 層で打鍵を遮断。猫は目を閉じ、クジラ娘は両手で目を覆います。',
      'bento.4Title': 'Rust ネイティブ超軽量設計',
      'bento.4Body': 'Electron 不使用でメモリ常駐約 24 MB。ネイティブフックにより待機時 CPU 負荷はほぼゼロです。',
      'mcp.p1Text': '💬 「KuroCat MCP でブリティッシュショートヘアを作って切り替えて」',
      'mcp.p2Text': '📸 「うちの猫の写真に合わせて専用ペットを作って！」',
      'mcp.p3Text': '⚙️ 「85% に縮小して 108 キー・視聴者目線に切り替えて」',
      'mcp.copyShort': 'コピー',
      'mcp.tabHttp': 'ローカル HTTP',
      'mcp.footerMeta': '内蔵 7 ツール対応 · 0.4 秒ホットリロード',
      'mcp.copyCfg': '設定をコピー',
      'footer.home': '謙一ホーム',
      'footer.pelican': 'ペリカンテスト',
      'footer.releases': '全リリース (Releases)',
    },
    html: {
      'hero.title': 'KuroCat · キーボードを叩く黒猫が<br /><span>あなたのデスクトップに</span>',
      'hero.sub':
        '<strong>Tauri v2 + Rust ネイティブフック + Three.js 3D / Canvas 2D デュアルエンジン</strong> で開発した透過・最前面デスクトップ伴侶。初期設定の <strong>✨ 3D 立体フィギュア</strong> と <strong>2D クラシック</strong> をワンクリック切替、インストーラーわずか <strong>2.15 MB</strong>；<strong>猫 6 種 + 🐳 クジラ娘</strong>、<strong>ゲーム自動検出ゲーミングヘッドセット</strong>、<strong>3D 首輪ベル</strong>、<strong>しっぽタイピング</strong>、<strong>OBS 透過ソース</strong>、<strong>パスワード自動保護</strong>、<strong>MCP AI 捏猫</strong> を標準搭載。',
      'dl.sub':
        '全パッケージに <strong>20%–150% 無段階ズーム</strong>・<strong>65% / 108 キー切替</strong>・<strong>しっぽキー選択</strong>・<strong>アプリ内自動更新</strong> を内蔵。<br /><code>qianyi.one</code> 高速ミラーと GitHub Releases 公式リンク（SHA-256 検証対応）を用意しています。',
      'dl.winDesc':
        '初期配列は 65% コンパクト。デスクトップアイコンやアンインストーラーを自動作成し、右クリックから <strong>108 フルサイズ</strong>・<strong>しっぽキー指定</strong>・OBS 透過ソース・自動更新へいつでも切替できます。',
      'dl.macDesc':
        'Apple Silicon (M1–M4) と Intel Mac（macOS 10.15 Catalina 以降）両対応の Universal DMG。65%/108 キーと全 7 スキンを内蔵。<code>.dmg</code> を開いて「アプリケーション」へドラッグするだけです。',
      'dl.tipWinBody':
        '無料オープンソースで商用コード署名がないため、ダウンロード時に警告が表示される場合があります（全ソースコードは GitHub で公開済み）：<br /><strong>① Edge</strong>：履歴にカーソルを合わせ <strong><code>···</code></strong> → <strong>保存</strong> → <strong><code>▾</code>（詳細表示）</strong> → <strong>保持する</strong>（Chrome は <code>Ctrl + J</code> → 危険なファイルを保存 → 保持）。<br /><strong>② SmartScreen の青い画面</strong>：<strong>詳細情報</strong> → <strong>実行</strong> をクリックしてください。',
      'dl.tipMacBody':
        '未公証アプリのため初回起動時に「開発元を確認できない」等と出た場合は、ターミナルで右のコマンドを一度だけ実行して隔離属性を解除してください。その後、<strong>システム設定 → プライバシーとセキュリティ</strong> で <strong>アクセシビリティ</strong> と <strong>入力監視</strong> の両方に <code>KuroCat</code> を許可すれば即時動作します（Karabiner-Elements 併用可）。',
      'dl.tipWv2Body':
        '古い Win10 / LTSC 環境で WebView2 が未導入の場合に表示されます（<strong>Windows 7 は下の専用ポータブル版をご利用ください</strong>）。右の Microsoft 公式 1.8 MB インストーラーを <strong>右クリック → 管理者として実行</strong> で導入してください。',
      'dl.win7Body':
        'Windows 7 SP1 64bit 専用 PE 6.01 ネイティブビルド。Win7 最終版オフライン <strong>WebView2 109.0.1518.78</strong> を同梱し、Aero 有無を問わず白枠ゼロの 256 段階透過レンダリングを実現。すべて展開し <code>KuroCat.exe</code> と <code>WebView2Runtime</code> を同フォルダで起動してください。',
      'dl.linuxBody':
        'root 不要の X11 <code>XRecord</code> 監視と Wayland <code>evdev</code> フォールバック、透過最前面・クリック透過（<code>Alt</code> ドラッグ）・自動起動に対応。<strong><code>glibc &gt;= 2.34</code></strong>（Ubuntu 22.04+ / Debian 12+ / KylinOS V11+）が必要です。軽量な <strong>.deb（2.2 MB）</strong>（要 <code>libwebkit2gtk-4.1-0</code>）または <strong>.AppImage</strong> をお選びください。',
      'dl.tipGameBody':
        '<strong>① フルスクリーン＆ボーダレスゲーム</strong>：フォーカスを奪わない最前面ガードを内蔵（マウス透過ロック＋<code>Alt</code> 一時解除推奨）。管理者権限ゲームではトレイから <strong>管理者として再起動</strong> できます。<br /><strong>② OBS 透過配信（クロマキー不要）</strong>：右クリックまたはトレイから <strong>OBS 透過ソース URL をコピー</strong>（<code>http://127.0.0.1:27421/obs</code>、初期 OFF で負荷ゼロ）。OBS のブラウザソースに追加するだけで透過表示＆「OBS のみ表示」＆パスワード保護連動に対応します。<br /><strong>③ カーネル型アンチチート搭載ゲーム</strong>（VALORANT 等）：プレイ前にトレイの <strong>監視を一時停止して非表示</strong> をオンにすると安全にフックを解除できます。',
      'feat.whaleHeadline': '新スキン「クジラ娘」登場<br />クジラ尾打鍵・照れ笑顔・パスワード目隠し',
      'feat.whaleBody':
        '標準搭載の <strong>🐳 クジラ娘（大肥鱼 / BigFish）</strong> は <strong>左手マウス + 右手タイピング + 水しぶき付きクジラ尾打鍵</strong> の 3 系統同時動作に対応。高速タイピングで頬が染まり満面の笑顔に、パスワード入力時は両手で目を覆って入力を隠します。',
      'feat.kbHeadline': '65% コンパクト / 108 フルサイズ<br />2 視点をワンクリック切替',
      'feat.kbBody':
        '省スペースな 65% もテンキー完備の 108 キーも右クリック 1 秒で切替でき、右下基準でウィンドウ幅を自動調整。<strong>猫目線（180°）</strong> と <strong>視聴者目線（正立印字）</strong> に合わせてマウス左右ボタンも自動反転します。',
      'feat.mouseHeadline': '左右クリックを別カラーで発光<br />アプリ内ワンクリック自動更新',
      'feat.mouseBody':
        '左（<code>L</code>）・右（<code>R</code>）・中/ホイールをコントラスト配色と 3D 影、ミニ <code>LMB</code>/<code>RMB</code> バッジで明確に識別（同時押し対応）。GitHub Releases を自動チェックし SHA-256 検証付きでシームレスに更新できます。',
      'mcp.headline': '愛猫の写真から<br />AI が 0.4 秒でデスクトップへ再現',
      'mcp.body':
        'Node.js も Python も不要。単体アプリに <strong>Stdio</strong> と <strong>ローカル Streamable HTTP（<code>127.0.0.1:27420</code>）</strong> MCP サーバーを内蔵しています。右クリック「MCP 設定をコピー」を <strong>Claude Desktop / Cursor / Antigravity / Windsurf</strong> に貼るだけで、毛色や柄・瞳の色を自然言語で自由作成できます。',
      'footer.credit': 'KuroCat · MIT Open Source · Built by <a class="footer-home" href="/?lang=ja">謙一 (Qianyi)</a>',
    },
    placeholders: {
      'pg.pwdPlaceholder': 'ここにパスワードを入力：猫は目閉じ / クジラ娘は両手で目隠し…',
    },
    titles: {
      'pg.autoDemoTitle': '自動タイピング＆クリックデモの切替',
      'pg.mouseTitle': '左右独立クリックのデモ',
      'pg.curiousTitle': '好奇心のまん丸瞳をトリガー（素早いマウス移動でも発動）',
      'pg.crossTitle': 'イカ耳＋しっぽ 3 連机叩きをトリガー（連打でも発動）',
      'pg.sleepTitle': '香箱座りうたた寝 Zzz をトリガー（キー入力で起床）',
      'pg.bubblesTitle': 'キーバブル表示のオン/オフ',
      'pg.purrTitle': 'なでなでゴロゴロ音のオン/オフ',
      'pg.tailSmartTitle': '通常は両前足で打ち、忙しい時や高速 Enter でしっぽが自動補佐',
      'pg.tailCustomTitle': '自分で選んだキーだけしっぽで叩く',
      'pg.tailEdgeTitle': 'しっぽ側の外側端キーのみ（WASD 保護）',
      'pg.tailOffTitle': 'しっぽは自然に揺らすだけ（キーは叩かない）',
      'pg.tailPickerTitle': '上のキーボードをクリック、または実キーボードを押してしっぽキーを選択',
      'pg.privacyTitle': 'パスワード自動目隠しデモを切替',
      'pg.scaleResetTitle': 'クリックで 100% にリセット',
    },
    prompts: {
      'mcp.p1': 'KuroCat MCP を使って、琥珀色の瞳とアイスブルーのキーハイライトを持つブリティッシュショートヘアを作ってすぐ切り替えて',
      'mcp.p2': 'このうちの猫の写真を見て、KuroCat MCP で毛色と模様を再現した専用デスクトップペットを作って！',
      'mcp.p3': 'KuroCat を 85% に縮小して、108 キー・視聴者目線に切り替えて',
    },
    skins: {
      black: '黒猫',
      ragdoll: 'ラグドール',
      'orange-tabby': '茶トラ',
      calico: '三毛猫',
      tuxedo: 'ハチワレ',
      siamese: 'シャム猫',
      dafeiyu: 'クジラ娘',
    },
    tailModeShort: {
      smart: 'しっぽ：スマート',
      custom: 'しっぽ：カスタム',
      edge: 'しっぽ：端のみ',
      off: 'しっぽ：揺れのみ',
    },
    mcpSnippets: {
      win: {
        raw: `{\n  "mcpServers": {\n    "kurocat": {\n      "command": "C:\\\\Users\\\\<ユーザー名>\\\\AppData\\\\Local\\\\KuroCat\\\\KuroCat.exe",\n      "args": ["--mcp"]\n    }\n  }\n}`,
        html: `<span class="c-dim">// Windows Stdio モード（Claude / Cursor / Antigravity 共通）</span>\n{\n  <span class="c-key">"mcpServers"</span>: {\n    <span class="c-key">"kurocat"</span>: {\n      <span class="c-key">"command"</span>: <span class="c-str">"C:\\\\Users\\\\&lt;ユーザー名&gt;\\\\AppData\\\\Local\\\\KuroCat\\\\KuroCat.exe"</span>,\n      <span class="c-key">"args"</span>: [<span class="c-str">"--mcp"</span>]\n    }\n  }\n}`,
      },
      mac: {
        raw: `{\n  "mcpServers": {\n    "kurocat": {\n      "command": "/Applications/KuroCat.app/Contents/MacOS/KuroCat",\n      "args": ["--mcp"]\n    }\n  }\n}`,
        html: `<span class="c-dim">// macOS Stdio モード（外部依存なし・アプリ内蔵バイナリ直結）</span>\n{\n  <span class="c-key">"mcpServers"</span>: {\n    <span class="c-key">"kurocat"</span>: {\n      <span class="c-key">"command"</span>: <span class="c-str">"/Applications/KuroCat.app/Contents/MacOS/KuroCat"</span>,\n      <span class="c-key">"args"</span>: [<span class="c-str">"--mcp"</span>]\n    }\n  }\n}`,
      },
      http: {
        raw: `{\n  "mcpServers": {\n    "kurocat": {\n      "url": "http://127.0.0.1:27420/mcp"\n    }\n  }\n}`,
        html: `<span class="c-dim">// ローカル Streamable HTTP モード（KuroCat 起動中に直接接続）</span>\n{\n  <span class="c-key">"mcpServers"</span>: {\n    <span class="c-key">"kurocat"</span>: {\n      <span class="c-key">"url"</span>: <span class="c-str">"http://127.0.0.1:27420/mcp"</span>\n    }\n  }\n}`,
      },
    },
    fmt: {
      latestVersion: (tag) => `最新版 ${tag}`,
      heroDownloadWin: (size) => `Windows 版を無料ダウンロード（${size}）`,
      heroDownloadMac: (size) => `macOS 版を無料ダウンロード（${size}）`,
      layout: (id) => (id === 'k98m' ? 'K98M Plus' : id === '108' ? '108 フルサイズ' : '65% コンパクト'),
      orient: (o) => (o === 'viewer' ? '視聴者目線' : '猫目線'),
      tailPickerBtn: (open, count) =>
        open ? `✓ 選択中（${count} キー）` : `🐾 しっぽキー選択（${count}）`,
      tailPickerTitleDefault: (count) => `🐾 下のキーをクリック、または実キーボードで切替（${count} キー選択中）`,
      tailKeyAdded: (key, count) => `🐾 「${key}」を追加・計 ${count} キー（完了でテスト）`,
      tailKeyRemoved: (key, count) => `🐾 「${key}」を解除・計 ${count} キー`,
      tailPresetApplied: (preset, count) => {
        const names = { office: 'Enter・Space', rightFn: '方向・テンキー', edgeMods: '外側修飾キー' };
        return `🐾 「${names[preset]}」を適用（${count} キー）`;
      },
      tailCleared: () => '🐾 しっぽキーをすべてクリアしました（キーを押して追加）',
      autoDemoBtn: (running) => (running ? '⏸ デモ停止' : '▶ 自動デモ'),
      privacyBtn: (active) => (active ? '🙈 目隠し保護中' : '🔒 パスワード保護'),
      whaleSoundBtn: (muted) => (muted ? '🔇 音声をオン' : '🔊 音声オン'),
      copied: () => 'コピー済み ✓',
      copyConfig: () => '設定をコピー',
      copyCmd: () => 'コマンドをコピー',
      copyShort: () => 'コピー',
      totalDownloads: (count) => `累計 ${count} ダウンロード`,
      statsUpdated: (timePart) => `${timePart} (UTC+8) 更新 · 30 秒ごとに自動更新`,
    },
  },
};

export function applyStaticI18n(locale: Locale): KuroCatI18nBundle {
  const bundle = KUROCAT_I18N[locale];
  document.documentElement.lang = bundle.htmlLang;
  document.title = bundle.docTitle;
  const descEl = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (descEl) descEl.content = bundle.metaDesc;

  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (key && key in bundle.text) {
      el.textContent = bundle.text[key];
    }
  });

  document.querySelectorAll<HTMLElement>('[data-i18n-html]').forEach((el) => {
    const key = el.dataset.i18nHtml;
    if (key && key in bundle.html) {
      el.innerHTML = bundle.html[key];
    }
  });

  document.querySelectorAll<HTMLInputElement>('[data-i18n-placeholder]').forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    if (key && key in bundle.placeholders) {
      el.placeholder = bundle.placeholders[key];
    }
  });

  document.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((el) => {
    const key = el.dataset.i18nTitle;
    if (key && key in bundle.titles) {
      el.title = bundle.titles[key];
    }
  });

  document.querySelectorAll<HTMLElement>('[data-i18n-prompt]').forEach((el) => {
    const key = el.dataset.i18nPrompt;
    if (key && key in bundle.prompts) {
      el.dataset.prompt = bundle.prompts[key];
    }
  });

  document.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === locale);
  });

  return bundle;
}
