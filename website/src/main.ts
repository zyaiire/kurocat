import {
  DEFAULT_TAIL_KEY_IDS,
  KuroCatEngine,
  TAIL_KEY_PRESETS,
  type KeyboardOrientation,
  type TailKeyMode,
} from '../../src/catEngine';
import { catAudio } from '../../src/audio';
import { normalizeLayout, resolveKeyByVk, type KeyboardLayoutId } from '../../src/keyboardLayout';
import { BUILTIN_WEB_CATS } from './builtinCats';
import {
  KUROCAT_I18N,
  applyStaticI18n,
  detectInitialLocale,
  persistLocale,
  type Locale,
} from './i18n';
import { keyboardEventToVk } from './webKeyMap';
import type { CollarColorId, KuroCatEngine3D } from '../../src/catEngine3d';

const LOCAL_MIRROR_VERSION = 'v5.0.1';
const LOCAL_MIRROR_VER_NUM = '5.0.1';
const MACOS_MIRROR_VERSION = 'v5.0.1';

let currentLocale: Locale = detectInitialLocale();
let i18n = KUROCAT_I18N[currentLocale];
const localeListeners: Array<() => void> = [];
let activeReleaseTag = LOCAL_MIRROR_VERSION;
let activeReleaseAssets: ReleaseAssetMap | null = null;

function setLocale(next: Locale, shouldPersist: boolean): void {
  currentLocale = next;
  i18n = applyStaticI18n(next);
  if (shouldPersist) persistLocale(next);
  if (activeReleaseAssets) {
    applyReleaseUI(activeReleaseTag, activeReleaseAssets);
  }
  localeListeners.forEach((fn) => fn());
}

interface ReleaseAssetMap {
  win65: { name: string; primaryUrl: string; ghUrl: string; sizeText: string };
  macos: { name: string; primaryUrl: string; ghUrl: string; sizeText: string };
}

function buildDefaultAssets(): ReleaseAssetMap {
  const localBase = `/kurocat/releases/${LOCAL_MIRROR_VERSION}`;
  const ghBase = `https://github.com/qianyiai/kurocat/releases/download/${LOCAL_MIRROR_VERSION}`;
  const macLocalBase = `/kurocat/releases/${MACOS_MIRROR_VERSION}`;
  const macGhBase = `https://github.com/qianyiai/kurocat/releases/download/${MACOS_MIRROR_VERSION}`;
  const n65 = `KuroCat-${LOCAL_MIRROR_VER_NUM}-x64-setup.exe`;
  const nMac = `KuroCat-${MACOS_MIRROR_VERSION}-macos-universal.dmg`;
  return {
    win65: { name: n65, primaryUrl: `${localBase}/${n65}`, ghUrl: `${ghBase}/${n65}`, sizeText: '2.15 MB' },
    macos: { name: nMac, primaryUrl: `${macLocalBase}/${nMac}`, ghUrl: `${macGhBase}/${nMac}`, sizeText: '5.93 MB' },
  };
}

function formatBytesMB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function applyReleaseUI(tag: string, assets: ReleaseAssetMap): void {
  activeReleaseTag = tag;
  activeReleaseAssets = assets;

  const navPill = document.getElementById('nav-ver-pill');
  if (navPill) navPill.textContent = tag;

  const heroVer = document.getElementById('hero-release-label');
  if (heroVer) heroVer.textContent = i18n.fmt.latestVersion(tag);

  const isMac = /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent);
  const heroBtn = document.getElementById('hero-primary-dl') as HTMLAnchorElement | null;
  const heroLabel = document.getElementById('hero-primary-dl-label');
  if (heroBtn && heroLabel) {
    if (isMac) {
      heroBtn.href = assets.macos.primaryUrl;
      heroLabel.textContent = i18n.fmt.heroDownloadMac(assets.macos.sizeText);
    } else {
      heroBtn.href = assets.win65.primaryUrl;
      heroLabel.textContent = i18n.fmt.heroDownloadWin(assets.win65.sizeText);
    }
  }

  (Object.keys(assets) as Array<keyof ReleaseAssetMap>).forEach((key) => {
    const item = assets[key];
    const nameEl = document.querySelector(`[data-asset-name="${key}"]`);
    const sizeEl = document.querySelector(`[data-asset-size="${key}"]`);
    const primaryEl = document.querySelector(`[data-dl-primary="${key}"]`) as HTMLAnchorElement | null;
    const ghEl = document.querySelector(`[data-dl-gh="${key}"]`) as HTMLAnchorElement | null;
    if (nameEl) nameEl.textContent = item.name;
    if (sizeEl) sizeEl.textContent = item.sizeText;
    if (primaryEl) primaryEl.href = item.primaryUrl;
    if (ghEl) {
      ghEl.href = item.ghUrl;
      ghEl.dataset.filename = item.name;
      ghEl.dataset.version = tag;
    }
  });
}

interface LiveStatsPayload {
  total_downloads?: number;
  qianyi_downloads?: number;
  today_downloads?: number;
  github_downloads?: number;
  combined_downloads?: number;
  updated_at_cst?: string;
}

function formatCount(n: number): string {
  return Math.max(0, Math.floor(n)).toLocaleString('en-US');
}

function refreshLiveDownloadStats(): void {
  void fetch('/kurocat/api/stats', { cache: 'no-cache' })
    .then((r) => (r.ok ? (r.json() as Promise<LiveStatsPayload>) : null))
    .then((data) => {
      if (!data) return;
      const qianyiDl =
        typeof data.qianyi_downloads === 'number'
          ? data.qianyi_downloads
          : typeof data.total_downloads === 'number'
            ? data.total_downloads
            : 0;
      const githubDl = typeof data.github_downloads === 'number' ? data.github_downloads : 0;
      const combinedDl =
        typeof data.combined_downloads === 'number' ? data.combined_downloads : qianyiDl + githubDl;
      const todayDl = typeof data.today_downloads === 'number' ? data.today_downloads : 0;

      if (combinedDl > 0) {
        const sep = document.getElementById('site-dl-sep');
        const txt = document.getElementById('site-dl-text');
        if (sep && txt) {
          sep.style.display = '';
          txt.style.display = '';
          txt.textContent = `累计下载 ${formatCount(combinedDl)} 次`;
        }
      }

      const totalEl = document.getElementById('live-dl-total');
      const ghEl = document.getElementById('live-dl-github');
      const qyEl = document.getElementById('live-dl-qianyi');
      const todayEl = document.getElementById('live-dl-today');
      const updatedEl = document.getElementById('live-stats-updated');

      if (totalEl) totalEl.textContent = `${formatCount(combinedDl)}`;
      if (ghEl) ghEl.textContent = `${formatCount(githubDl)}`;
      if (qyEl) qyEl.textContent = `${formatCount(qianyiDl)}`;
      if (todayEl) todayEl.textContent = formatCount(todayDl);
      if (updatedEl) {
        const timePart =
          typeof data.updated_at_cst === 'string' && data.updated_at_cst.length >= 19
            ? data.updated_at_cst.slice(11, 19)
            : new Date().toTimeString().slice(0, 8);
        updatedEl.textContent = `更新于 ${timePart} (UTC+8) · 每 30 秒自动刷新`;
      }
    })
    .catch(() => {});
}

function initDownloadTracking(): void {
  document.querySelectorAll<HTMLAnchorElement>('[data-dl-gh]').forEach((link) => {
    link.addEventListener('click', () => {
      const filename = link.dataset.filename || '';
      const version = link.dataset.version || LOCAL_MIRROR_VERSION;
      if (!filename) return;
      const body = JSON.stringify({ filename, version });
      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/kurocat/api/track-outbound', new Blob([body], { type: 'application/json' }));
        } else {
          void fetch('/kurocat/api/track-outbound', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
            keepalive: true,
          });
        }
      } catch {
        // Never block outbound navigation
      }
    });
  });
}

async function syncGithubMetadata(): Promise<void> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 4500);
  try {
    const [repoRes, relRes] = await Promise.all([
      fetch('https://api.github.com/repos/qianyiai/kurocat', { signal: controller.signal }),
      fetch('https://api.github.com/repos/qianyiai/kurocat/releases/latest', { signal: controller.signal }),
    ]);

    if (repoRes.ok) {
      const repo = await repoRes.json();
      if (typeof repo.stargazers_count === 'number') {
        const sep = document.getElementById('github-stats-sep');
        const txt = document.getElementById('github-stats-text');
        if (sep && txt) {
          sep.style.display = '';
          txt.style.display = '';
          txt.textContent = `★ ${repo.stargazers_count} Stars`;
        }
      }
    }

    if (relRes.ok) {
      const rel = await relRes.json();
      const tag: string | undefined = rel.tag_name;
      const ghAssets: Array<{ name: string; browser_download_url: string; size: number }> = Array.isArray(rel.assets)
        ? rel.assets
        : [];
      if (tag && tag !== LOCAL_MIRROR_VERSION && ghAssets.length >= 2) {
        const defaults = buildDefaultAssets();
        const find = (pred: (n: string) => boolean) => ghAssets.find((a) => pred(a.name));
        const a65 = find((n) => n.endsWith('-x64-setup.exe') && !n.includes('108key'));
        const aMac = find((n) => n.endsWith('-macos-universal.dmg'));

        const updated: ReleaseAssetMap = {
          win65: a65
            ? { name: a65.name, primaryUrl: a65.browser_download_url, ghUrl: a65.browser_download_url, sizeText: formatBytesMB(a65.size) }
            : defaults.win65,
          macos: aMac
            ? { name: aMac.name, primaryUrl: aMac.browser_download_url, ghUrl: aMac.browser_download_url, sizeText: formatBytesMB(aMac.size) }
            : defaults.macos,
        };
        applyReleaseUI(tag, updated);
      }
    }
  } catch {
    // Gracefully stay on fast local mirror defaults if GitHub API is unreachable
  } finally {
    window.clearTimeout(timer);
  }
}

function initPlayground(): void {
  const canvas = document.getElementById('kurocat-canvas') as HTMLCanvasElement | null;
  const canvas3d = document.getElementById('kurocat-canvas-3d') as HTMLCanvasElement | null;
  const viewport = document.getElementById('canvas-viewport') as HTMLDivElement | null;
  if (!canvas || !viewport) return;

  const engine = new KuroCatEngine(canvas, { embedded: true });
  let engine3d: KuroCatEngine3D | null = null;
  let loading3d: Promise<void> | null = null;
  let webgl3dBlocked = false;
  let active3d = false;
  let preferredRenderMode: '3d' | '2d' = '3d';
  let currentCollar: CollarColorId = 'none';
  let headphonesOn = false;
  let orbitMode = false;
  let orbitDragging = false;
  let lastOrbitX = 0;
  let lastOrbitY = 0;

  let currentLayout: KeyboardLayoutId = 'k98m';
  let currentOrient: KeyboardOrientation = 'viewer';
  let currentSkinId = 'gold-black';
  let currentTailMode: TailKeyMode = 'smart';
  let currentTailKeyIds: string[] = [...DEFAULT_TAIL_KEY_IDS];
  let tailPickerOpen = false;
  let tailPickerHintOverride: (() => string) | null = null;
  let autoDemoRunning = true;
  let autoDemoTimer: number | null = null;

  const statusPill = document.getElementById('stage-status-pill');
  const stageHint = document.getElementById('stage-hint');
  const webTailPickerBar = document.getElementById('web-tail-picker-bar');
  const webTailPickerTitle = document.getElementById('web-tail-picker-title');
  const btnWebTailPicker = document.getElementById('btn-web-tail-picker');
  const btnWebTailDone = document.getElementById('btn-web-tail-done');
  const webCollarRow = document.getElementById('web-collar-row');
  const btnWebHeadphones = document.getElementById('btn-web-headphones');
  const btnWebOrbit = document.getElementById('btn-web-orbit');

  const getActiveSkin = () => BUILTIN_WEB_CATS.find((c) => c.id === currentSkinId) ?? BUILTIN_WEB_CATS[0];

  const wants3D = () =>
    Boolean(canvas3d) &&
    preferredRenderMode === '3d' &&
    currentSkinId !== 'dafeiyu' &&
    !tailPickerOpen &&
    !webgl3dBlocked;

  const sync3DState = () => {
    if (!engine3d) return;
    engine3d.showKeyBubbles = engine.showKeyBubbles;
    engine3d.setRenderStyle('3d');
    engine3d.setCatSkin(getActiveSkin());
    engine3d.setCollar(currentCollar);
    engine3d.setHeadphones(headphonesOn && currentSkinId !== 'dafeiyu');
    engine3d.setKeyboardConfig(currentLayout, currentOrient);
    engine3d.setTailKeyConfig(currentTailMode, currentTailKeyIds);
    engine3d.setPrivacyMode(engine.privacyMode);
  };

  const syncRenderEngine = () => {
    const use3d = wants3D();
    document.querySelectorAll<HTMLButtonElement>('[data-web-rendermode]').forEach((b) => {
      b.classList.toggle('active', b.dataset.webRendermode === preferredRenderMode);
    });
    webCollarRow?.classList.toggle('hidden', !use3d);
    btnWebOrbit?.classList.toggle('hidden', !use3d);
    btnWebHeadphones?.classList.toggle('hidden', currentSkinId === 'dafeiyu');
    if (!use3d) {
      orbitMode = false;
      orbitDragging = false;
      btnWebOrbit?.classList.remove('active');
      viewport.classList.remove('orbit-active', 'orbit-dragging');
      if (active3d) {
        engine3d?.stop();
        canvas3d?.classList.add('hidden');
        canvas.classList.remove('hidden');
        engine.resize();
        engine.start();
        active3d = false;
      }
      return;
    }

    if (engine3d && canvas3d) {
      sync3DState();
      if (!active3d) {
        engine.stop();
        canvas.classList.add('hidden');
        canvas3d.classList.remove('hidden');
        engine3d.resize();
        engine3d.start();
        active3d = true;
      }
      return;
    }

    if (canvas3d && !loading3d) {
      loading3d = import('../../src/catEngine3d')
        .then(({ KuroCatEngine3D }) => {
          engine3d = new KuroCatEngine3D(canvas3d, { embedded: true });
          sync3DState();
          syncRenderEngine();
        })
        .catch(() => {
          webgl3dBlocked = true;
          preferredRenderMode = '2d';
          syncRenderEngine();
        })
        .finally(() => {
          loading3d = null;
        });
    }
  };

  const updateStatusPill = () => {
    if (!statusPill) return;
    const layoutText = i18n.fmt.layout(currentLayout);
    const orientText = i18n.fmt.orient(currentOrient);
    const modeTag = wants3D() ? '3D' : '2D';
    statusPill.textContent = `${modeTag} · ${layoutText} · ${orientText} · ${i18n.tailModeShort[currentTailMode]}`;
  };

  const syncTailUI = () => {
    engine.setTailKeyConfig(currentTailMode, currentTailKeyIds);
    engine3d?.setTailKeyConfig(currentTailMode, currentTailKeyIds);
    document.querySelectorAll<HTMLButtonElement>('[data-web-tailmode]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.webTailmode === currentTailMode);
    });
    if (btnWebTailPicker) {
      btnWebTailPicker.classList.toggle('active', tailPickerOpen);
      btnWebTailPicker.textContent = i18n.fmt.tailPickerBtn(tailPickerOpen, currentTailKeyIds.length);
    }
    if (webTailPickerBar) {
      webTailPickerBar.classList.toggle('hidden', !tailPickerOpen);
    }
    if (stageHint) {
      stageHint.style.display = tailPickerOpen ? 'none' : '';
    }
    if (webTailPickerTitle) {
      webTailPickerTitle.textContent = tailPickerHintOverride
        ? tailPickerHintOverride()
        : i18n.fmt.tailPickerTitleDefault(currentTailKeyIds.length);
    }
    updateStatusPill();
  };

  const setTailPickerOpen = (open: boolean) => {
    tailPickerOpen = open;
    tailPickerHintOverride = null;
    if (open) {
      if (autoDemoRunning) stopAutoDemo();
      currentTailMode = 'custom';
    } else {
      viewport.classList.remove('tail-key-hover');
    }
    engine.setTailPickerActive(open);
    syncRenderEngine();
    syncTailUI();
  };

  const toggleWebTailKey = (specId: string, label?: string) => {
    const idx = currentTailKeyIds.indexOf(specId);
    let added = false;
    if (idx >= 0) {
      currentTailKeyIds.splice(idx, 1);
    } else {
      currentTailKeyIds.push(specId);
      added = true;
    }
    currentTailMode = 'custom';
    const keyText = label || specId.toUpperCase();
    const count = currentTailKeyIds.length;
    tailPickerHintOverride = () =>
      added ? i18n.fmt.tailKeyAdded(keyText, count) : i18n.fmt.tailKeyRemoved(keyText, count);
    syncTailUI();
    if (added) {
      engine.previewTailTap(specId);
    }
  };

  engine.setCatAppearance(currentSkinId, getActiveSkin());
  engine.setKeyboardConfig(currentLayout, currentOrient);
  engine.start();
  syncTailUI();
  syncRenderEngine();

  const ro = new ResizeObserver(() => {
    engine.resize();
    engine3d?.resize();
  });
  ro.observe(viewport);

  // 3D / 2D visual mode switch
  document.querySelectorAll<HTMLButtonElement>('[data-web-rendermode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const m = btn.dataset.webRendermode === '2d' ? '2d' : '3d';
      preferredRenderMode = m;
      if (m === '3d' && currentSkinId === 'dafeiyu') {
        const black = BUILTIN_WEB_CATS[0];
        currentSkinId = black.id;
        engine.setCatAppearance(black.id, black);
        skinHost?.querySelectorAll('.skin-btn').forEach((el) => {
          el.classList.toggle('active', (el as HTMLElement).dataset.skinId === black.id);
        });
      }
      if (m === '3d' && tailPickerOpen) {
        setTailPickerOpen(false);
      }
      syncRenderEngine();
      updateStatusPill();
    });
  });

  // Gaming headset toggle (works in both 3D & 2D!)
  btnWebHeadphones?.addEventListener('click', () => {
    headphonesOn = !headphonesOn;
    btnWebHeadphones.classList.toggle('active', headphonesOn);
    engine.setHeadphones(headphonesOn && currentSkinId !== 'dafeiyu');
    engine3d?.setHeadphones(headphonesOn && currentSkinId !== 'dafeiyu');
  });

  // 3D collar switcher
  document.querySelectorAll<HTMLButtonElement>('[data-web-collar]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const raw = btn.dataset.webCollar;
      const c: CollarColorId =
        raw === 'red' || raw === 'blue' || raw === 'pink' || raw === 'green' ? raw : 'none';
      currentCollar = c;
      engine3d?.setCollar(c);
      document.querySelectorAll<HTMLButtonElement>('[data-web-collar]').forEach((b) => {
        b.classList.toggle('active', b.dataset.webCollar === c);
      });
    });
  });

  // 360° 3D Orbit toggle
  btnWebOrbit?.addEventListener('click', () => {
    if (!active3d) return;
    orbitMode = !orbitMode;
    btnWebOrbit.classList.toggle('active', orbitMode);
    viewport.classList.toggle('orbit-active', orbitMode);
    if (!orbitMode) {
      orbitDragging = false;
      viewport.classList.remove('orbit-dragging');
      engine3d?.resetOrbit();
    }
  });

  // Build 7 skin buttons (re-labeled automatically when switching language)
  const skinHost = document.getElementById('skin-pills');
  const syncSkinLabels = () => {
    if (!skinHost) return;
    skinHost.querySelectorAll<HTMLButtonElement>('.skin-btn').forEach((btn) => {
      const id = btn.dataset.skinId || '';
      const skin = BUILTIN_WEB_CATS.find((c) => c.id === id);
      if (skin) {
        const displayName = i18n.skins[skin.id] || skin.name;
        btn.textContent = `${skin.emoji || '🐱'} ${displayName}`;
      }
    });
  };
  if (skinHost) {
    BUILTIN_WEB_CATS.forEach((skin) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `skin-btn${skin.id === currentSkinId ? ' active' : ''}`;
      btn.dataset.skinId = skin.id;
      btn.textContent = `${skin.emoji || '🐱'} ${i18n.skins[skin.id] || skin.name}`;
      btn.addEventListener('click', () => {
        currentSkinId = skin.id;
        engine.setCatAppearance(skin.id, skin);
        engine.setHeadphones(headphonesOn && skin.id !== 'dafeiyu');
        if (skin.id !== 'dafeiyu') {
          engine3d?.setCatSkin(skin);
          engine3d?.setHeadphones(headphonesOn);
        }
        syncRenderEngine();
        updateStatusPill();
        skinHost.querySelectorAll('.skin-btn').forEach((el) => {
          el.classList.toggle('active', (el as HTMLElement).dataset.skinId === skin.id);
        });
      });
      skinHost.appendChild(btn);
    });
  }

  // Layout & Orientation buttons
  const setLayout = (layout: KeyboardLayoutId) => {
    currentLayout = layout;
    engine.setKeyboardConfig(currentLayout, currentOrient);
    engine3d?.setKeyboardConfig(currentLayout, currentOrient);
    document.querySelectorAll('[data-layout]').forEach((el) => {
      el.classList.toggle('active', (el as HTMLElement).dataset.layout === layout);
    });
    updateStatusPill();
  };

  const setOrient = (orient: KeyboardOrientation) => {
    currentOrient = orient;
    engine.setKeyboardConfig(currentLayout, currentOrient);
    engine3d?.setKeyboardConfig(currentLayout, currentOrient);
    document.querySelectorAll('[data-orient]').forEach((el) => {
      el.classList.toggle('active', (el as HTMLElement).dataset.orient === orient);
    });
    updateStatusPill();
  };

  document.querySelectorAll('[data-layout]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const val = normalizeLayout((btn as HTMLElement).dataset.layout);
      setLayout(val);
    });
  });

  document.querySelectorAll('[data-orient]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const val = (btn as HTMLElement).dataset.orient === 'viewer' ? 'viewer' : 'cat';
      setOrient(val);
    });
  });

  // Tail key mode pills & visual keycap picker controls
  document.querySelectorAll<HTMLButtonElement>('[data-web-tailmode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.webTailmode;
      if (val === 'smart' || val === 'custom' || val === 'edge' || val === 'off') {
        currentTailMode = val;
        if (val !== 'custom' && tailPickerOpen) {
          setTailPickerOpen(false);
        } else {
          syncTailUI();
        }
      }
    });
  });

  btnWebTailPicker?.addEventListener('click', () => {
    setTailPickerOpen(!tailPickerOpen);
  });

  btnWebTailDone?.addEventListener('click', (e) => {
    e.stopPropagation();
    setTailPickerOpen(false);
  });

  webTailPickerBar?.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
  });

  webTailPickerBar?.addEventListener('click', (e) => {
    const presetBtn = (e.target as HTMLElement).closest<HTMLElement>('[data-web-tailpreset]');
    if (!presetBtn) return;
    e.stopPropagation();
    const preset = presetBtn.dataset.webTailpreset;
    if (preset === 'office') {
      currentTailKeyIds = [...TAIL_KEY_PRESETS.office.ids];
      const count = currentTailKeyIds.length;
      tailPickerHintOverride = () => i18n.fmt.tailPresetApplied('office', count);
    } else if (preset === 'rightFn') {
      currentTailKeyIds = [...TAIL_KEY_PRESETS.rightFn.ids];
      const count = currentTailKeyIds.length;
      tailPickerHintOverride = () => i18n.fmt.tailPresetApplied('rightFn', count);
    } else if (preset === 'edgeMods') {
      currentTailKeyIds = [...TAIL_KEY_PRESETS.edgeMods.ids];
      const count = currentTailKeyIds.length;
      tailPickerHintOverride = () => i18n.fmt.tailPresetApplied('edgeMods', count);
    } else if (preset === 'clear') {
      currentTailKeyIds = [];
      tailPickerHintOverride = () => i18n.fmt.tailCleared();
    }
    currentTailMode = 'custom';
    syncTailUI();
    if (currentTailKeyIds.length > 0) {
      engine.previewTailTap(currentTailKeyIds[0]);
    }
  });

  // Feature card button to jump & test 108-key
  const try108Btn = document.getElementById('try-108-btn');
  if (try108Btn) {
    try108Btn.addEventListener('click', () => {
      setLayout('108');
      setOrient('viewer');
      document.getElementById('playground')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      startAutoDemo();
    });
  }

  // Feature card button to switch live playground directly to BigFish (鲸鱼娘)
  const tryDafeiyuBtn = document.getElementById('try-dafeiyu-btn');
  if (tryDafeiyuBtn) {
    tryDafeiyuBtn.addEventListener('click', () => {
      const fish = BUILTIN_WEB_CATS.find((c) => c.id === 'dafeiyu');
      if (fish) {
        currentSkinId = fish.id;
        engine.setCatAppearance(fish.id, fish);
        syncRenderEngine();
        skinHost?.querySelectorAll('.skin-btn').forEach((el) => {
          el.classList.toggle('active', (el as HTMLElement).dataset.skinId === fish.id);
        });
      }
      setLayout('65');
      setOrient('viewer');
      document.getElementById('playground')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      startAutoDemo();
    });
  }

  // Whale demo vertical video sound toggle
  const whaleVideo = document.getElementById('whale-demo-video') as HTMLVideoElement | null;
  const whaleSoundBtn = document.getElementById('whale-sound-toggle');
  const syncSoundBtn = () => {
    if (!whaleVideo || !whaleSoundBtn) return;
    const muted = whaleVideo.muted;
    whaleSoundBtn.classList.toggle('active', !muted);
    whaleSoundBtn.textContent = i18n.fmt.whaleSoundBtn(muted);
  };
  if (whaleVideo && whaleSoundBtn) {
    whaleSoundBtn.addEventListener('click', () => {
      whaleVideo.muted = !whaleVideo.muted;
      if (!whaleVideo.muted && whaleVideo.paused) {
        void whaleVideo.play().catch(() => {});
      }
      syncSoundBtn();
    });
    whaleVideo.addEventListener('volumechange', syncSoundBtn);
    syncSoundBtn();
  }

  // Backdrop switcher (Dark / Light desktop wallpaper preview)
  document.querySelectorAll('[data-backdrop]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = (btn as HTMLElement).dataset.backdrop === 'light' ? 'light' : 'dark';
      viewport.classList.toggle('backdrop-light', mode === 'light');
      viewport.classList.toggle('backdrop-dark', mode === 'dark');
      document.querySelectorAll('[data-backdrop]').forEach((b) => {
        b.classList.toggle('active', (b as HTMLElement).dataset.backdrop === mode);
      });
    });
  });

  // Bubbles & Purr toggles
  const btnBubbles = document.getElementById('btn-bubbles');
  if (btnBubbles) {
    btnBubbles.addEventListener('click', () => {
      engine.showKeyBubbles = !engine.showKeyBubbles;
      if (engine3d) engine3d.showKeyBubbles = engine.showKeyBubbles;
      btnBubbles.classList.toggle('active', engine.showKeyBubbles);
    });
  }

  let purrEnabled = true;
  const btnPurr = document.getElementById('btn-purr');
  if (btnPurr) {
    btnPurr.addEventListener('click', () => {
      purrEnabled = !purrEnabled;
      catAudio.setEnabled(purrEnabled);
      btnPurr.classList.toggle('active', purrEnabled);
    });
  }

  // Password privacy interactive demo (manual toggle OR focusing the real <input type="password">)
  const btnPrivacy = document.getElementById('btn-privacy-demo');
  const pwdInput = document.getElementById('web-pwd-test') as HTMLInputElement | null;
  let manualPrivacyPinned = false;
  let pwdInputFocused = false;
  const syncPrivacyState = () => {
    const active = manualPrivacyPinned || pwdInputFocused;
    engine.setPrivacyMode(active);
    engine3d?.setPrivacyMode(active);
    if (btnPrivacy) {
      btnPrivacy.classList.toggle('active', active);
      btnPrivacy.textContent = i18n.fmt.privacyBtn(active);
    }
  };
  if (btnPrivacy) {
    btnPrivacy.addEventListener('click', () => {
      manualPrivacyPinned = !manualPrivacyPinned;
      if (manualPrivacyPinned && autoDemoRunning) stopAutoDemo();
      syncPrivacyState();
    });
  }
  if (pwdInput) {
    pwdInput.addEventListener('focus', () => {
      pwdInputFocused = true;
      if (autoDemoRunning) stopAutoDemo();
      syncPrivacyState();
    });
    pwdInput.addEventListener('blur', () => {
      pwdInputFocused = false;
      syncPrivacyState();
    });
    pwdInput.addEventListener('keydown', () => {
      engine.onPrivacyTyping();
      engine3d?.onPrivacyTyping();
    });
  }

  // Alive cat emotion quick-test buttons (also trigger organically via fast cursor / key mash / idle!)
  const ensureCatForEmotion = () => {
    if (autoDemoRunning) stopAutoDemo();
    if (manualPrivacyPinned) {
      manualPrivacyPinned = false;
      syncPrivacyState();
    }
    if (currentSkinId === 'dafeiyu') {
      const black = BUILTIN_WEB_CATS.find((c) => c.id === 'black');
      if (black) {
        currentSkinId = black.id;
        engine.setCatAppearance(black.id, black);
        engine3d?.setCatSkin(black);
        syncRenderEngine();
        skinHost?.querySelectorAll('.skin-btn').forEach((el) => {
          el.classList.toggle('active', (el as HTMLElement).dataset.skinId === black.id);
        });
      }
    }
  };
  document.getElementById('btn-curious-demo')?.addEventListener('click', () => {
    ensureCatForEmotion();
    engine.triggerCuriousDemo(3600);
    engine3d?.triggerCuriousDemo(3.6);
  });
  document.getElementById('btn-cross-demo')?.addEventListener('click', () => {
    ensureCatForEmotion();
    engine.triggerCrossDemo();
    engine3d?.triggerCrossDemo();
  });
  document.getElementById('btn-sleep-demo')?.addEventListener('click', () => {
    ensureCatForEmotion();
    engine.triggerSleepDemo();
    engine3d?.triggerSleepDemo();
  });

  // Scale slider (20% - 150%)
  const scaleSlider = document.getElementById('web-scale-slider') as HTMLInputElement | null;
  const scaleValBtn = document.getElementById('web-scale-val');
  const applyScalePct = (pct: number) => {
    const clamped = Math.max(20, Math.min(150, Math.round(pct)));
    engine.setRenderScale(clamped / 100);
    engine3d?.setRenderScale(clamped / 100);
    if (scaleSlider) scaleSlider.value = String(clamped);
    if (scaleValBtn) scaleValBtn.textContent = `${clamped}%`;
  };
  if (scaleSlider) {
    scaleSlider.addEventListener('input', () => applyScalePct(Number(scaleSlider.value)));
  }
  if (scaleValBtn) {
    scaleValBtn.addEventListener('click', () => applyScalePct(100));
  }

  // Auto-demo choreography (stops immediately when user starts typing/clicking)
  const btnAutoDemo = document.getElementById('btn-auto-demo');
  const DEMO_SCRIPT: Array<{ type: 'key'; vk: number; hold: number; gap: number } | { type: 'mouse'; btn: 'left' | 'right'; hold: number; gap: number }> = [
    { type: 'key', vk: 0x4b, hold: 90, gap: 165 }, // K
    { type: 'key', vk: 0x55, hold: 85, gap: 155 }, // U
    { type: 'key', vk: 0x52, hold: 90, gap: 160 }, // R
    { type: 'key', vk: 0x4f, hold: 85, gap: 170 }, // O
    { type: 'key', vk: 0x43, hold: 90, gap: 160 }, // C
    { type: 'key', vk: 0x41, hold: 85, gap: 155 }, // A
    { type: 'key', vk: 0x54, hold: 95, gap: 220 }, // T
    { type: 'key', vk: 0x20, hold: 90, gap: 260 }, // Space
    { type: 'mouse', btn: 'left', hold: 240, gap: 360 },
    { type: 'mouse', btn: 'right', hold: 240, gap: 420 },
    { type: 'key', vk: 0x48, hold: 80, gap: 150 }, // H
    { type: 'key', vk: 0x49, hold: 85, gap: 180 }, // I
    { type: 'key', vk: 0x0d, hold: 110, gap: 680 }, // Enter
  ];
  let demoStep = 0;

  const stopAutoDemo = () => {
    autoDemoRunning = false;
    if (autoDemoTimer !== null) {
      window.clearTimeout(autoDemoTimer);
      autoDemoTimer = null;
    }
    if (btnAutoDemo) {
      btnAutoDemo.classList.remove('active');
      btnAutoDemo.textContent = i18n.fmt.autoDemoBtn(false);
    }
  };

  const runDemoTick = () => {
    if (!autoDemoRunning) return;
    const item = DEMO_SCRIPT[demoStep % DEMO_SCRIPT.length];
    demoStep += 1;
    if (item.type === 'key') {
      engine.onKeyDown(item.vk, false);
      engine3d?.onKeyDown(item.vk, false);
      window.setTimeout(() => {
        engine.onKeyUp(item.vk);
        engine3d?.onKeyUp(item.vk);
      }, item.hold);
    } else {
      engine.onMouseDown(item.btn);
      engine3d?.onMouseDown(item.btn);
      window.setTimeout(() => {
        engine.onMouseUp(item.btn);
        engine3d?.onMouseUp(item.btn);
      }, item.hold);
    }
    autoDemoTimer = window.setTimeout(runDemoTick, item.gap);
  };

  const startAutoDemo = () => {
    if (autoDemoTimer !== null) window.clearTimeout(autoDemoTimer);
    autoDemoRunning = true;
    if (btnAutoDemo) {
      btnAutoDemo.classList.add('active');
      btnAutoDemo.textContent = i18n.fmt.autoDemoBtn(true);
    }
    autoDemoTimer = window.setTimeout(runDemoTick, 240);
  };

  localeListeners.push(() => {
    syncSkinLabels();
    syncTailUI();
    syncSoundBtn();
    syncPrivacyState();
    if (btnAutoDemo) {
      btnAutoDemo.textContent = i18n.fmt.autoDemoBtn(autoDemoRunning);
    }
  });

  if (btnAutoDemo) {
    btnAutoDemo.addEventListener('click', () => {
      if (autoDemoRunning) stopAutoDemo();
      else startAutoDemo();
    });
  }

  // Dedicated L/R Mouse Demo button (great for mobile visitors!)
  const btnMouseDemo = document.getElementById('btn-mouse-demo');
  if (btnMouseDemo) {
    btnMouseDemo.addEventListener('click', () => {
      stopAutoDemo();
      engine.onMouseDown('left');
      engine3d?.onMouseDown('left');
      window.setTimeout(() => {
        engine.onMouseUp('left');
        engine3d?.onMouseUp('left');
        window.setTimeout(() => {
          engine.onMouseDown('right');
          engine3d?.onMouseDown('right');
          window.setTimeout(() => {
            engine.onMouseUp('right');
            engine3d?.onMouseUp('right');
          }, 320);
        }, 120);
      }, 320);
    });
  }

  // Real physical keyboard interaction
  window.addEventListener('keydown', (e) => {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (engine.privacyMode) {
      if (autoDemoRunning) stopAutoDemo();
      engine.onPrivacyTyping();
      engine3d?.onPrivacyTyping();
      return;
    }
    const vk = keyboardEventToVk(e);
    if (vk !== null) {
      if (autoDemoRunning) stopAutoDemo();
      if (tailPickerOpen) {
        if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
          e.preventDefault();
        }
        if (!e.repeat) {
          const spec = resolveKeyByVk(vk, currentLayout);
          if (spec) {
            toggleWebTailKey(spec.id, spec.bubble || spec.label);
          }
        }
        return;
      }
      engine.onKeyDown(vk, e.repeat);
      engine3d?.onKeyDown(vk, e.repeat);
    }
  });

  window.addEventListener('keyup', (e) => {
    if (tailPickerOpen) return;
    const vk = keyboardEventToVk(e);
    if (vk !== null) {
      engine.onKeyUp(vk);
      engine3d?.onKeyUp(vk);
    }
  });

  // Full-window silky eye tracking + stage-scoped mouse move & petting (zero snap-back at canvas border!)
  window.addEventListener('pointermove', (e) => {
    if (active3d && orbitMode && orbitDragging) {
      const dx = e.clientX - lastOrbitX;
      const dy = e.clientY - lastOrbitY;
      lastOrbitX = e.clientX;
      lastOrbitY = e.clientY;
      engine3d?.addOrbitDelta(-dx * 0.45, dy * 0.30);
      return;
    }

    const rect = viewport.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) return;
    const insideViewport =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;

    if (active3d && engine3d) {
      const overHead = engine3d.onPointerMove(e.clientX, e.clientY, insideViewport, !orbitMode);
      viewport.classList.toggle('petting', overHead && !orbitMode);
      return;
    }

    if (tailPickerOpen) {
      if (insideViewport) {
        const hit = engine.hitTestKeyAtClientPoint(e.clientX, e.clientY);
        engine.setTailPickerHover(hit ? hit.id : null);
        viewport.classList.toggle('tail-key-hover', Boolean(hit));
      } else {
        engine.setTailPickerHover(null);
        viewport.classList.remove('tail-key-hover');
      }
      viewport.classList.remove('petting');
      return;
    }

    // Map cursor across the ENTIRE webpage smoothly into cat logical space so eyes track seamlessly everywhere!
    const { w: lw, h: lh } = engine.getLogicalSize();
    const fit = Math.min((rect.width * 0.86) / lw, (rect.height * 0.86) / lh);
    const drawW = lw * fit;
    const drawH = lh * fit;
    const ox = (rect.width - drawW) * 0.5;
    const oy = (rect.height - drawH) * 0.52;
    const relX = (e.clientX - rect.left - ox) / Math.max(1, drawW);
    const relY = (e.clientY - rect.top - oy) / Math.max(1, drawH);

    // Cat head/body zone for intentional head petting (only inside the canvas stage)
    const overHead =
      insideViewport && relX >= 0.30 && relX <= 0.72 && relY >= 0.14 && relY <= 0.52;
    viewport.classList.toggle('petting', overHead);
    engine.onWindowCursor(relX, relY, overHead);
    // Feed consistent CSS-pixel/1440 speed across the ENTIRE browser window so laser-pointer Curious mode works anywhere (~1325 px/s)
    engine.onPointerSpeedSample(e.clientX / 1440, e.clientY / 1440);

    if (insideViewport) {
      const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width)));
      const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / Math.max(1, rect.height)));
      engine.onGlobalMouseMove(nx, ny);
    }
  });

  viewport.addEventListener('pointerleave', () => {
    viewport.classList.remove('petting');
    viewport.classList.remove('tail-key-hover');
    engine.setTailPickerHover(null);
  });

  viewport.addEventListener('pointerdown', (e) => {
    if (active3d && orbitMode) {
      orbitDragging = true;
      lastOrbitX = e.clientX;
      lastOrbitY = e.clientY;
      viewport.classList.add('orbit-dragging');
      viewport.setPointerCapture(e.pointerId);
      return;
    }
    if (autoDemoRunning) stopAutoDemo();
    if (tailPickerOpen && e.button === 0) {
      const hit = engine.hitTestKeyAtClientPoint(e.clientX, e.clientY);
      if (hit) {
        e.preventDefault();
        toggleWebTailKey(hit.id, hit.bubble || hit.label);
        return;
      }
    }
    const btnName = e.button === 2 ? 'right' : e.button === 1 ? 'middle' : 'left';
    engine.onMouseDown(btnName);
    engine3d?.onMouseDown(btnName);
  });

  window.addEventListener('pointerup', (e) => {
    if (orbitDragging) {
      orbitDragging = false;
      viewport.classList.remove('orbit-dragging');
      return;
    }
    const btnName = e.button === 2 ? 'right' : e.button === 1 ? 'middle' : 'left';
    engine.onMouseUp(btnName);
    engine3d?.onMouseUp(btnName);
  });

  viewport.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  viewport.addEventListener('wheel', () => {
    engine.onMouseWheel();
    engine3d?.onMouseWheel();
  }, { passive: true });

  // Kick off gentle live demo on load!
  startAutoDemo();
}

function initMcpCodeTabs(): void {
  let active: 'win' | 'mac' | 'http' = 'win';
  const codeEl = document.getElementById('mcp-code');
  const copyBtn = document.getElementById('copy-mcp-btn');

  const render = (key: 'win' | 'mac' | 'http') => {
    active = key;
    if (codeEl) codeEl.innerHTML = i18n.mcpSnippets[key].html;
  };
  render('win');
  localeListeners.push(() => render(active));

  document.querySelectorAll('[data-mcp-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const raw = (btn as HTMLElement).dataset.mcpTab;
      const key: 'win' | 'mac' | 'http' = raw === 'mac' || raw === 'http' ? raw : 'win';
      document.querySelectorAll('[data-mcp-tab]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      render(key);
    });
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(i18n.mcpSnippets[active].raw).then(() => {
        copyBtn.textContent = i18n.fmt.copied();
        window.setTimeout(() => {
          copyBtn.textContent = i18n.fmt.copyConfig();
        }, 1600);
      });
    });
  }

  // macOS xattr copy
  const xattrBtn = document.getElementById('copy-xattr-btn');
  if (xattrBtn) {
    xattrBtn.addEventListener('click', () => {
      navigator.clipboard.writeText('xattr -cr /Applications/KuroCat.app && open /Applications/KuroCat.app').then(() => {
        xattrBtn.textContent = i18n.fmt.copied();
        window.setTimeout(() => {
          xattrBtn.textContent = i18n.fmt.copyCmd();
        }, 1600);
      });
    });
  }

  // Prompt chips copy
  document.querySelectorAll('.prompt-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const prompt = (chip as HTMLElement).dataset.prompt || '';
      const em = chip.querySelector('em');
      navigator.clipboard.writeText(prompt).then(() => {
        if (em) {
          em.textContent = i18n.fmt.copied();
          window.setTimeout(() => {
            em.textContent = i18n.fmt.copyShort();
          }, 1500);
        }
      });
    });
  });
}

function initPolish(): void {
  // Pointer specular highlight on stage cards
  document.querySelectorAll('.stage-card').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const ev = e as PointerEvent;
      const rect = card.getBoundingClientRect();
      (card as HTMLElement).style.setProperty('--mx', `${ev.clientX - rect.left}px`);
      (card as HTMLElement).style.setProperty('--my', `${ev.clientY - rect.top}px`);
    });
  });

  // Scroll reveal (low threshold so tall sections on mobile & hash jumps never stay hidden)
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
      });
    },
    { threshold: 0.01 }
  );
  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

  if (window.location.hash) {
    const target = document.querySelector(window.location.hash);
    if (target) {
      target.classList.add('visible');
      target.closest('.reveal')?.classList.add('visible');
    }
  }
}

function initLanguageSwitcher(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      if (lang === 'zh' || lang === 'en' || lang === 'ja') {
        setLocale(lang, true);
      }
    });
  });
}

applyReleaseUI(LOCAL_MIRROR_VERSION, buildDefaultAssets());
initDownloadTracking();
initPlayground();
initMcpCodeTabs();
initLanguageSwitcher();
setLocale(currentLocale, false);
initPolish();
void syncGithubMetadata();
