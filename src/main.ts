import './style.css';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  DEFAULT_TAIL_KEY_IDS,
  KuroCatEngine,
  type KeyboardOrientation,
  type TailKeyMode,
} from './catEngine';
import { catAudio } from './audio';
import { DEFAULT_BUILTIN_CATS, type CatSkinConfig } from './catSkins';
import {
  normalizeLayout,
  isKeyboardLayout,
  getKeyboardLayout,
  resolveKeyByVk,
  type KeyboardLayoutDef,
  type KeyboardLayoutId,
  type KeySpec,
} from './keyboardLayout';
import type { CollarColorId, KuroCatEngine3D } from './catEngine3d';

type DesktopRenderMode = '2d' | '3d';
type HeadphoneMode = 'auto' | 'on' | 'off';

interface AppSettings {
  x: number | null;
  y: number | null;
  scale: number;
  alwaysOnTop: boolean;
  clickThroughLocked: boolean;
  showKeyBubbles: boolean;
  soundEnabled: boolean;
  autostart: boolean;
  catBreed: string;
  mcpEnabled: boolean;
  mcpPort: number;
  keyboardLayout: KeyboardLayoutId;
  keyboardOrientation: KeyboardOrientation;
  privacyPasswordGuard: boolean;
  tailKeyMode: TailKeyMode;
  tailKeyIds: string[];
  obsEnabled?: boolean;
  obsPort?: number;
  obsHidePet?: boolean;
  renderMode?: DesktopRenderMode;
  collarColor?: CollarColorId;
  headphoneMode?: HeadphoneMode;
}

type InputEvent =
  | { kind: 'keyDown'; vk: number; scan: number; repeat: boolean }
  | { kind: 'keyUp'; vk: number; scan: number }
  | { kind: 'mouseDown'; button: string }
  | { kind: 'mouseUp'; button: string }
  | { kind: 'mouseWheel'; delta: number }
  | { kind: 'mouseMove'; x: number; y: number; nx: number; ny: number }
  | { kind: 'privacyTyping' };

interface WindowCursorInfo {
  relX: number;
  relY: number;
  insideWindow: boolean;
  overCat: boolean;
  altOverride?: boolean;
}

interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  releaseUrl: string;
  assetName: string | null;
  downloadUrl: string | null;
  assetSha256: string | null;
  assetSize: number | null;
  installKind: string;
  notesSummary: string;
}

interface UpdateProgressEvent {
  stage: string;
  message: string;
  info: UpdateInfo | null;
}

let appVersion = '5.0.1';
let latestUpdateInfo: UpdateInfo | null = null;
let updateBusy = false;
let dismissedVersion: string | null = null;
let toastAutoHideTimer: number | null = null;
let sliderDragging = false;
let altOverride = false;
let lastKnownLockState: boolean | null = null;
let syncWin7OverlayFn: ((focusMenu?: boolean) => void) | null = null;
let tailPickerOpen = false;
let tailPickerLoading = false;
let tailPickerSaving = false;
let tailPickerSelection = new Set<string>();
let tailPickerStatusOverride: string | null = null;
const ARROW_KEY_IDS = new Set(['up', 'down', 'left', 'right']);

const TAIL_MODE_LABELS: Record<TailKeyMode, string> = {
  smart: '智能第三只手',
  custom: '自定义按键',
  edge: '近尾边缘区',
  off: '仅摆动',
};

let settings: AppSettings = {
  x: null,
  y: null,
  scale: 1,
  alwaysOnTop: true,
  clickThroughLocked: false,
  showKeyBubbles: true,
  soundEnabled: true,
  autostart: false,
  catBreed: 'black',
  mcpEnabled: true,
  mcpPort: 27420,
  keyboardLayout: '65',
  keyboardOrientation: 'cat',
  privacyPasswordGuard: true,
  tailKeyMode: 'smart',
  tailKeyIds: [...DEFAULT_TAIL_KEY_IDS],
  renderMode: '3d',
  collarColor: 'none',
  headphoneMode: 'off',
};

let catList: CatSkinConfig[] = [...DEFAULT_BUILTIN_CATS];

const canvas = document.getElementById('pet-canvas') as HTMLCanvasElement;
const canvas3d = document.getElementById('pet-canvas-3d') as HTMLCanvasElement;
const menuEl = document.getElementById('context-menu') as HTMLDivElement;
const breedPillsEl = document.getElementById('breed-pills') as HTMLDivElement;
const scaleSliderEl = document.getElementById('scale-slider') as HTMLInputElement;
const scaleValueEl = document.getElementById('scale-value') as HTMLButtonElement;
const updateToastEl = document.getElementById('update-toast') as HTMLDivElement;
const updateToastTextEl = document.getElementById('update-toast-text') as HTMLSpanElement;
const btnToastInstallEl = document.getElementById('btn-toast-install') as HTMLButtonElement;
const btnToastOpenEl = document.getElementById('btn-toast-open') as HTMLButtonElement;
const btnToastCloseEl = document.getElementById('btn-toast-close') as HTMLButtonElement;
const tailPickerBarEl = document.getElementById('tail-picker-bar') as HTMLDivElement;
const tailPickerTitleEl = document.getElementById('tail-picker-title') as HTMLSpanElement;
const tailPresetButtons = tailPickerBarEl.querySelectorAll<HTMLButtonElement>('.tail-picker-presets [data-tailpreset]');
const btnTailDoneEl = document.getElementById('btn-tail-done') as HTMLButtonElement;
const btnTailCancelEl = document.getElementById('btn-tail-cancel') as HTMLButtonElement;
const tailModeBadgeEl = document.getElementById('tail-mode-badge') as HTMLSpanElement;
const tailKeysCountEl = document.getElementById('tail-keys-count') as HTMLSpanElement;
const engine = new KuroCatEngine(canvas);

// Lazy-loaded Three.js 3D engine (NEVER imported when user stays in 2D mode -> +0 MB overhead!)
let engine3d: KuroCatEngine3D | null = null;
let loading3dPromise: Promise<void> | null = null;
let webgl3dUnavailable = false;
let isWin7Ulw = false;
let active3d = false;
let privacyActive = false;
let gameActive = false;

function shouldWearHeadphonesNow(): boolean {
  if (settings.catBreed === 'dafeiyu') return false;
  const hm: HeadphoneMode =
    settings.headphoneMode === 'auto' || settings.headphoneMode === 'on'
      ? settings.headphoneMode
      : 'off';
  if (hm === 'on') return true;
  if (hm === 'off') return false;
  return gameActive;
}

function wants3DNow(): boolean {
  return (
    settings.renderMode !== '2d' &&
    settings.catBreed !== 'dafeiyu' &&
    !tailPickerOpen &&
    !isWin7Ulw &&
    !webgl3dUnavailable
  );
}

function syncEngine3DState(): void {
  if (!engine3d) return;
  const activeCat = catList.find((c) => c.id === settings.catBreed) ?? catList[0];
  const kbLayout: KeyboardLayoutId = normalizeLayout(settings.keyboardLayout);
  const kbOrient: KeyboardOrientation = settings.keyboardOrientation === 'viewer' ? 'viewer' : 'cat';
  const tailMode: TailKeyMode =
    settings.tailKeyMode === 'custom' ||
    settings.tailKeyMode === 'edge' ||
    settings.tailKeyMode === 'off'
      ? settings.tailKeyMode
      : 'smart';
  const tailIds = Array.isArray(settings.tailKeyIds) ? settings.tailKeyIds : [...DEFAULT_TAIL_KEY_IDS];
  const collar: CollarColorId =
    settings.collarColor === 'red' ||
    settings.collarColor === 'blue' ||
    settings.collarColor === 'pink' ||
    settings.collarColor === 'green'
      ? settings.collarColor
      : 'none';

  engine3d.showKeyBubbles = settings.showKeyBubbles;
  engine3d.setRenderStyle('3d');
  if (activeCat) {
    engine3d.setCatSkin(activeCat);
  }
  engine3d.setCollar(collar);
  engine3d.setHeadphones(shouldWearHeadphonesNow());
  engine3d.setKeyboardConfig(kbLayout, kbOrient);
  engine3d.setTailKeyConfig(tailMode, tailIds);
  engine3d.setPrivacyMode(privacyActive);
  engine3d.resize();
}

function activateRenderEngine(): void {
  const want3d = wants3DNow();
  if (!want3d) {
    if (active3d) {
      engine3d?.stop();
      canvas3d.classList.add('hidden');
      canvas.classList.remove('hidden');
      engine.resize();
      engine.start();
      active3d = false;
    }
    return;
  }

  if (engine3d) {
    syncEngine3DState();
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

  if (!loading3dPromise) {
    loading3dPromise = import('./catEngine3d')
      .then(({ KuroCatEngine3D }) => {
        engine3d = new KuroCatEngine3D(canvas3d, { embedded: false });
        window.addEventListener('resize', () => engine3d?.resize());
        activateRenderEngine();
      })
      .catch((err) => {
        console.warn('3D WebGL unavailable, keeping 2D mode:', err);
        webgl3dUnavailable = true;
        active3d = false;
        canvas3d.classList.add('hidden');
        canvas.classList.remove('hidden');
        engine.start();
      })
      .finally(() => {
        loading3dPromise = null;
      });
  }
}

function renderBreedPills(): void {
  if (!breedPillsEl) return;
  breedPillsEl.innerHTML = '';
  for (const cat of catList) {
    const btn = document.createElement('button');
    btn.className = 'breed-pill';
    btn.dataset.breed = cat.id;
    const emoji = cat.emoji ? `${cat.emoji} ` : '🐱 ';
    btn.textContent = `${emoji}${cat.name}`;
    const accent = cat.accentColor || (cat.id === 'ragdoll' ? '#7ac7ff' : '#c8f538');
    btn.style.setProperty('--pill-accent', accent);
    btn.classList.toggle('active', cat.id === settings.catBreed);
    breedPillsEl.appendChild(btn);
  }
}

function updateScaleSliderVisual(scaleVal: number): void {
  const pctNum = Math.round(Math.max(20, Math.min(150, scaleVal * 100)));
  if (scaleSliderEl) {
    scaleSliderEl.value = String(pctNum);
    const fillPct = ((pctNum - 20) / (150 - 20)) * 100;
    scaleSliderEl.style.setProperty('--pct', `${fillPct.toFixed(1)}%`);
  }
  if (scaleValueEl) {
    scaleValueEl.textContent = `${pctNum}%`;
  }
}

function syncMenuUI(): void {
  const setCheck = (id: string, on: boolean) => {
    const el = document.getElementById(id);
    if (el) el.textContent = on ? '✓' : '';
  };
  setCheck('chk-privacy', settings.privacyPasswordGuard !== false);
  setCheck('chk-bubbles', settings.showKeyBubbles);
  setCheck('chk-lock', settings.clickThroughLocked);
  setCheck('chk-sound', settings.soundEnabled);
  setCheck('chk-top', settings.alwaysOnTop);
  setCheck('chk-autostart', settings.autostart);
  setCheck('chk-mcp', settings.mcpEnabled);

  if (!sliderDragging) {
    updateScaleSliderVisual(settings.scale);
  }

  const kbLayout: KeyboardLayoutId = normalizeLayout(settings.keyboardLayout);
  const kbOrient: KeyboardOrientation = settings.keyboardOrientation === 'viewer' ? 'viewer' : 'cat';
  const tailMode: TailKeyMode =
    settings.tailKeyMode === 'custom' ||
    settings.tailKeyMode === 'edge' ||
    settings.tailKeyMode === 'off'
      ? settings.tailKeyMode
      : 'smart';
  const tailIds = Array.isArray(settings.tailKeyIds) ? settings.tailKeyIds : [...DEFAULT_TAIL_KEY_IDS];

  document.querySelectorAll<HTMLButtonElement>('[data-kblayout]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.kblayout === kbLayout);
  });
  document.querySelectorAll<HTMLButtonElement>('[data-kborient]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.kborient === kbOrient);
  });
  document.querySelectorAll<HTMLButtonElement>('[data-tailmode]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tailmode === tailMode);
  });
  if (tailModeBadgeEl) {
    tailModeBadgeEl.textContent = TAIL_MODE_LABELS[tailMode];
  }
  if (tailKeysCountEl) {
    tailKeysCountEl.textContent = `${tailIds.length} 键`;
  }
  const activeCat = catList.find((c) => c.id === settings.catBreed) ?? catList[0];
  renderBreedPills();

  const renderMode: DesktopRenderMode = settings.renderMode === '2d' ? '2d' : '3d';
  const collarColor: CollarColorId =
    settings.collarColor === 'red' ||
    settings.collarColor === 'blue' ||
    settings.collarColor === 'pink' ||
    settings.collarColor === 'green'
      ? settings.collarColor
      : 'none';
  document.querySelectorAll<HTMLButtonElement>('[data-rendermode]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.rendermode === renderMode);
  });
  document.querySelectorAll<HTMLButtonElement>('[data-collar]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.collar === collarColor);
  });
  const collarRowEl = document.getElementById('collar-row');
  if (collarRowEl) {
    collarRowEl.classList.toggle('hidden', renderMode === '2d' || settings.catBreed === 'dafeiyu');
  }

  const headphoneMode: HeadphoneMode =
    settings.headphoneMode === 'auto' || settings.headphoneMode === 'on'
      ? settings.headphoneMode
      : 'off';
  document.querySelectorAll<HTMLButtonElement>('[data-headphonemode]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.headphonemode === headphoneMode);
  });
  const headphoneRowEl = document.getElementById('headphone-row');
  if (headphoneRowEl) {
    headphoneRowEl.classList.toggle('hidden', settings.catBreed === 'dafeiyu');
  }

  const headerEl = document.getElementById('menu-header');
  if (headerEl && activeCat) {
    const emoji = activeCat.emoji || '🐱';
    headerEl.textContent = `${emoji} KuroCat ${activeCat.name}`;
    headerEl.style.color = activeCat.accentColor || '#c8f538';
  }

  engine.showKeyBubbles = settings.showKeyBubbles;
  engine.setCatAppearance(activeCat?.id || 'black', activeCat);
  engine.setHeadphones(shouldWearHeadphonesNow());
  engine.setKeyboardConfig(kbLayout, kbOrient);
  engine.setTailKeyConfig(tailMode, tailIds);
  if (!sliderDragging) {
    engine.setRenderScale(settings.scale);
  }
  catAudio.setEnabled(settings.soundEnabled);
  activateRenderEngine();
  if (tailPickerOpen) syncTailPickerSelection();
}

function syncWindowInteractiveState(): void {
  const open = !menuEl.classList.contains('hidden');
  void invoke('set_menu_open', { open });
}

function syncTailPickerBounds(): void {
  if (!tailPickerOpen) {
    void invoke('set_tail_picker_bounds', { bounds: null });
    return;
  }

  const normalized = (rect: DOMRect) => [
    rect.left / window.innerWidth,
    rect.top / window.innerHeight,
    rect.right / window.innerWidth,
    rect.bottom / window.innerHeight,
  ];
  void invoke('set_tail_picker_bounds', {
    bounds: {
      toolbar: normalized(tailPickerBarEl.getBoundingClientRect()),
      keyboard: normalized(engine.getKeyboardClientBounds()),
      closeButton: normalized(btnTailCancelEl.getBoundingClientRect()),
    },
  });
}

function syncTailPickerSelection(): void {
  const layout = getKeyboardLayout(settings.keyboardLayout);
  const visibleCount = layout.keys.filter(({ id }) => tailPickerSelection.has(id)).length;
  tailPickerTitleEl.textContent =
    tailPickerStatusOverride ?? `🐾 点键帽或敲键盘（已选 ${visibleCount} 键）`;
  for (const button of tailPresetButtons) {
    const presetKeys = getTailPresetKeys(button.dataset.tailpreset ?? '', layout);
    button.setAttribute('aria-pressed', String(isTailPresetSelected(presetKeys)));
  }
  engine.setTailPickerActive(true, tailPickerSelection);
  syncTailPickerBounds();
}

function closeContextMenu(): void {
  if (!menuEl.classList.contains('hidden')) {
    menuEl.classList.add('hidden');
    syncWindowInteractiveState();
    syncWin7OverlayFn?.(false);
  }
  void invoke('close_context_menu');
}

function openContextMenu(clientX: number, clientY: number): void {
  // Always pop the dedicated non-overlapping side menu window beside the cat so it NEVER blocks the pet!
  if (!menuEl.classList.contains('hidden')) {
    menuEl.classList.add('hidden');
    syncWindowInteractiveState();
    syncWin7OverlayFn?.(false);
  }
  void invoke('open_context_menu').catch(() => {
    // Defensive fallback to inline menu if side-window creation ever fails on an unsupported WM
    menuEl.classList.remove('hidden');
    const mw = menuEl.offsetWidth || 236;
    const mh = menuEl.offsetHeight || 360;
    const left = Math.max(8, Math.min(window.innerWidth - mw - 8, clientX));
    const top = Math.max(8, Math.min(window.innerHeight - mh - 8, clientY));
    menuEl.style.left = `${left}px`;
    menuEl.style.top = `${top}px`;
    syncWindowInteractiveState();
    syncWin7OverlayFn?.(true);
  });
}

async function openTailPicker(): Promise<void> {
  if (tailPickerOpen || tailPickerLoading) return;
  tailPickerLoading = true;
  try {
    settings = await invoke<AppSettings>('get_settings');
    tailPickerSelection = new Set(settings.tailKeyIds ?? DEFAULT_TAIL_KEY_IDS);
    tailPickerStatusOverride = null;
    tailPickerOpen = true;
    closeContextMenu();
    tailPickerBarEl.classList.remove('hidden');
    syncMenuUI();
    requestAnimationFrame(() => syncWin7OverlayFn?.(true));
  } catch (error) {
    console.error('加载自定义尾巴按键失败', error);
  } finally {
    tailPickerLoading = false;
  }
}

function closeTailPicker(): void {
  if (!tailPickerOpen || tailPickerSaving) return;
  tailPickerOpen = false;
  tailPickerStatusOverride = null;
  tailPickerSelection.clear();
  tailPickerBarEl.classList.add('hidden');
  canvas.classList.remove('tail-key-hover');
  engine.setTailPickerActive(false);
  syncTailPickerBounds();
  activateRenderEngine();
  syncWin7OverlayFn?.(false);
}

function toggleTailKeyId(specId: string): void {
  if (tailPickerSaving) return;
  if (!tailPickerSelection.delete(specId)) tailPickerSelection.add(specId);
  tailPickerStatusOverride = null;
  syncTailPickerSelection();
}

function getTailPresetKeys(presetKey: string, { keys, totalUnits, totalRows }: KeyboardLayoutDef): KeySpec[] {
  return keys.filter((key) => {
    switch (presetKey) {
      case 'office':
        return key.id === 'enter' || key.id === 'space';
      case 'rightFn':
        return ARROW_KEY_IDS.has(key.id) || key.id === 'numlk' || key.id.startsWith('np_');
      case 'edgeMods': {
        const top = key.rowY ?? key.row;
        const bottom = top + (key.rowSpan ?? 1);
        return key.uStart === 0 || key.uStart + key.uWidth >= totalUnits - 0.001 ||
          top === 0 || bottom >= totalRows - 0.001;
      }
      default:
        return false;
    }
  });
}

function isTailPresetSelected(keys: KeySpec[]): boolean {
  return keys.length > 0 && keys.every(({ id }) => tailPickerSelection.has(id));
}

function applyTailPreset(presetKey: string): void {
  if (tailPickerSaving) return;
  if (presetKey === 'clear') {
    tailPickerSelection.clear();
  } else {
    const presetKeys = getTailPresetKeys(presetKey, getKeyboardLayout(settings.keyboardLayout));
    if (isTailPresetSelected(presetKeys)) {
      for (const { id } of presetKeys) tailPickerSelection.delete(id);
    } else {
      for (const { id } of presetKeys) tailPickerSelection.add(id);
    }
  }
  tailPickerStatusOverride = null;
  syncTailPickerSelection();
}

async function confirmTailPicker(): Promise<void> {
  if (!tailPickerOpen || tailPickerSaving) return;
  tailPickerSaving = true;
  btnTailDoneEl.disabled = true;
  btnTailCancelEl.disabled = true;
  try {
    settings = await invoke<AppSettings>('save_tail_picker_selection', {
      keyIds: [...tailPickerSelection],
    });
  } catch (error) {
    console.error('保存自定义尾巴按键失败', error);
    tailPickerStatusOverride = '保存失败，请重试';
    syncTailPickerSelection();
    return;
  } finally {
    tailPickerSaving = false;
    btnTailDoneEl.disabled = false;
    btnTailCancelEl.disabled = false;
  }
  closeTailPicker();
  syncMenuUI();
}

async function applySettingsPatch(patch: Partial<AppSettings>): Promise<void> {
  settings = { ...settings, ...patch };
  syncMenuUI();
  settings = await invoke<AppSettings>('update_settings', { patch: settings });
  syncMenuUI();
}

async function copyMcpConfig(): Promise<void> {
  const hint = document.getElementById('mcp-copy-hint');
  try {
    const jsonText = await invoke<string>('get_mcp_config');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(jsonText);
    } else {
      const ta = document.createElement('textarea');
      ta.value = jsonText;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    if (hint) {
      hint.textContent = '✓ 已复制';
      hint.classList.add('copied');
      setTimeout(() => {
        hint.textContent = 'AI 捏猫';
        hint.classList.remove('copied');
      }, 1800);
    }
  } catch (err) {
    console.error('Failed to copy MCP config:', err);
  }
}

async function createDesktopShortcut(): Promise<void> {
  const hint = document.getElementById('shortcut-hint');
  try {
    await invoke<string>('create_desktop_shortcut');
    if (hint) {
      hint.textContent = '✓ 已创建';
      hint.classList.add('copied');
      setTimeout(() => {
        hint.textContent = 'KuroCat';
        hint.classList.remove('copied');
      }, 1800);
    }
  } catch (err) {
    console.error('Failed to create desktop shortcut:', err);
  }
}

function setUpdateHint(text: string, mode: 'default' | 'ready' | 'error' = 'default'): void {
  const hint = document.getElementById('update-hint');
  if (!hint) return;
  hint.textContent = text;
  hint.classList.remove('update-ready', 'update-error');
  if (mode === 'ready') hint.classList.add('update-ready');
  else if (mode === 'error') hint.classList.add('update-error');
}

function hideUpdateToast(): void {
  if (toastAutoHideTimer !== null) {
    window.clearTimeout(toastAutoHideTimer);
    toastAutoHideTimer = null;
  }
  if (!updateToastEl.classList.contains('hidden')) {
    updateToastEl.classList.add('hidden');
    void invoke('set_update_banner_open', { open: false });
    syncWin7OverlayFn?.(false);
  }
}

function showUpdateToast(
  text: string,
  options: { showInstall?: boolean; showOpen?: boolean; autoHideMs?: number; busy?: boolean } = {},
): void {
  if (toastAutoHideTimer !== null) {
    window.clearTimeout(toastAutoHideTimer);
    toastAutoHideTimer = null;
  }
  updateToastTextEl.textContent = text;
  btnToastInstallEl.classList.toggle('hidden', !options.showInstall);
  btnToastInstallEl.disabled = Boolean(options.busy);
  btnToastOpenEl.classList.toggle('hidden', !options.showOpen);
  updateToastEl.classList.remove('hidden');
  void invoke('set_update_banner_open', { open: true });
  requestAnimationFrame(() => syncWin7OverlayFn?.(false));

  if (options.autoHideMs && options.autoHideMs > 0) {
    toastAutoHideTimer = window.setTimeout(() => {
      hideUpdateToast();
    }, options.autoHideMs);
  }
}

function handleUpdateProgressEvent(ev: UpdateProgressEvent, fromManual = false): void {
  if (ev.info) {
    latestUpdateInfo = ev.info;
    appVersion = ev.info.currentVersion || appVersion;
  }

  switch (ev.stage) {
    case 'checking':
      updateBusy = true;
      setUpdateHint('检测中...');
      showUpdateToast('🔍 正在检查新版本...', { busy: true });
      break;
    case 'available':
      updateBusy = false;
      if (latestUpdateInfo?.hasUpdate) {
        const ver = latestUpdateInfo.latestVersion;
        setUpdateHint(`⬆ v${ver}`, 'ready');
        if (fromManual || dismissedVersion !== ver) {
          showUpdateToast(`✨ 发现新版本 v${ver}`, {
            showInstall: Boolean(latestUpdateInfo.downloadUrl),
            showOpen: !latestUpdateInfo.downloadUrl,
          });
        }
      }
      break;
    case 'up_to_date':
      updateBusy = false;
      setUpdateHint(`✓ v${appVersion}`);
      showUpdateToast(`✓ 已是最新版本 v${appVersion}`, { autoHideMs: 2600 });
      break;
    case 'downloading':
    case 'verifying':
    case 'installing':
      updateBusy = true;
      setUpdateHint('更新中...', 'ready');
      showUpdateToast(`⏳ ${ev.message}`, { busy: true });
      break;
    case 'error':
      updateBusy = false;
      setUpdateHint('检查失败', 'error');
      showUpdateToast(`⚠ ${ev.message}`, {
        showOpen: true,
        autoHideMs: 5200,
      });
      break;
  }
}

async function triggerInstallUpdate(): Promise<void> {
  if (updateBusy || !latestUpdateInfo || !latestUpdateInfo.hasUpdate) return;
  updateBusy = true;
  closeContextMenu();
  showUpdateToast(`⏳ 正在下载 v${latestUpdateInfo.latestVersion}...`, { busy: true });
  setUpdateHint('下载中...', 'ready');
  try {
    await invoke('install_update', { info: latestUpdateInfo });
  } catch (err) {
    updateBusy = false;
    const msg = typeof err === 'string' ? err : String(err);
    setUpdateHint('更新失败', 'error');
    showUpdateToast(`⚠ ${msg}`, { showOpen: true, autoHideMs: 6500 });
  }
}

async function triggerManualUpdateCheck(): Promise<void> {
  if (updateBusy) return;
  // If we already know an update is ready, clicking the menu item immediately starts installing it!
  if (latestUpdateInfo?.hasUpdate && latestUpdateInfo.downloadUrl) {
    await triggerInstallUpdate();
    return;
  }
  updateBusy = true;
  setUpdateHint('检测中...');
  closeContextMenu();
  showUpdateToast('🔍 正在检查新版本...', { busy: true });
  try {
    const info = await invoke<UpdateInfo>('check_for_update');
    handleUpdateProgressEvent(
      {
        stage: info.hasUpdate ? 'available' : 'up_to_date',
        message: info.hasUpdate
          ? `发现新版本 v${info.latestVersion}`
          : `已是最新版本 v${info.currentVersion}`,
        info,
      },
      true,
    );
  } catch (err) {
    const msg = typeof err === 'string' ? err : String(err);
    handleUpdateProgressEvent({ stage: 'error', message: msg, info: null }, true);
  }
}

async function bootstrap(): Promise<void> {
  engine.start();

  // Hide Windows-only desktop shortcut button on macOS
  if (/Mac/i.test(navigator.platform) || /Macintosh/i.test(navigator.userAgent)) {
    const shortcutBtn = document.getElementById('btn-desktop-shortcut');
    if (shortcutBtn) shortcutBtn.style.display = 'none';
  }

  try {
    const [loadedSettings, loadedCats, loadedVer] = await Promise.all([
      invoke<AppSettings>('get_settings'),
      invoke<CatSkinConfig[]>('get_cats'),
      invoke<string>('get_app_version'),
    ]);
    settings = loadedSettings;
    lastKnownLockState = settings.clickThroughLocked;
    if (Array.isArray(loadedCats) && loadedCats.length > 0) {
      catList = loadedCats;
    }
    if (loadedVer) {
      appVersion = loadedVer;
      setUpdateHint(`v${appVersion}`);
    }
    syncMenuUI();
  } catch (err) {
    console.error('Failed to load settings or cats:', err);
  }

  await listen<UpdateProgressEvent>('kuro-update-status', (ev) => {
    handleUpdateProgressEvent(ev.payload, false);
  });

  btnToastInstallEl.addEventListener('click', (e) => {
    e.stopPropagation();
    void triggerInstallUpdate();
  });

  btnToastOpenEl.addEventListener('click', (e) => {
    e.stopPropagation();
    const url = latestUpdateInfo?.releaseUrl || 'https://github.com/qianyiai/kurocat/releases/latest';
    void invoke('open_release_page', { url });
  });

  btnToastCloseEl.addEventListener('click', (e) => {
    e.stopPropagation();
    if (latestUpdateInfo?.hasUpdate) {
      dismissedVersion = latestUpdateInfo.latestVersion;
    }
    hideUpdateToast();
  });

  if (scaleSliderEl) {
    scaleSliderEl.addEventListener('pointerdown', () => {
      sliderDragging = true;
    });
    scaleSliderEl.addEventListener('input', () => {
      sliderDragging = true;
      const nextScale = Math.max(0.2, Math.min(1.5, Number(scaleSliderEl.value) / 100));
      updateScaleSliderVisual(nextScale);
      engine.setRenderScale(nextScale);
    });
    const commitSliderScale = () => {
      sliderDragging = false;
      const nextScale = Math.max(0.2, Math.min(1.5, Number(scaleSliderEl.value) / 100));
      void applySettingsPatch({ scale: nextScale });
    };
    scaleSliderEl.addEventListener('change', commitSliderScale);
    scaleSliderEl.addEventListener('pointerup', () => {
      sliderDragging = false;
    });
  }

  if (scaleValueEl) {
    scaleValueEl.addEventListener('click', (e) => {
      e.stopPropagation();
      sliderDragging = false;
      updateScaleSliderVisual(1.0);
      void applySettingsPatch({ scale: 1.0 });
    });
  }

  await listen<AppSettings>('kuro-settings', (ev) => {
    const prevLock = lastKnownLockState;
    settings = ev.payload;
    lastKnownLockState = settings.clickThroughLocked;
    syncMenuUI();
    if (prevLock !== null && prevLock !== settings.clickThroughLocked) {
      if (settings.clickThroughLocked) {
        showUpdateToast('🔒 已锁定穿透（按住 Alt 点击或 ^ 托盘解锁）', { autoHideMs: 4200 });
      } else {
        showUpdateToast('🔓 已解除穿透，可直接拖动或右键', { autoHideMs: 2200 });
      }
    }
  });

  await listen<CatSkinConfig[]>('kuro-cats', (ev) => {
    if (Array.isArray(ev.payload) && ev.payload.length > 0) {
      catList = ev.payload;
      syncMenuUI();
    }
  });

  await listen('kuro-open-tail-picker', () => {
    void openTailPicker();
  });

  await listen<number>('kuro-scale-preview', (ev) => {
    if (typeof ev.payload === 'number' && Number.isFinite(ev.payload)) {
      engine.setRenderScale(Math.max(0.2, Math.min(1.5, ev.payload)));
    }
  });

  btnTailDoneEl.addEventListener('click', (e) => {
    e.stopPropagation();
    void confirmTailPicker();
  });

  btnTailCancelEl.addEventListener('click', (e) => {
    e.stopPropagation();
    closeTailPicker();
  });

  window.addEventListener('resize', () => {
    if (tailPickerOpen) syncTailPickerBounds();
  });
  tailPickerBarEl.addEventListener('animationend', () => {
    if (!tailPickerOpen) return;
    syncTailPickerBounds();
    syncWin7OverlayFn?.(false);
  });

  tailPickerBarEl.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-tailpreset]');
    if (!btn) return;
    e.stopPropagation();
    const preset = btn.dataset.tailpreset;
    if (preset) applyTailPreset(preset);
  });

  await listen<InputEvent>('kuro-input', (ev) => {
    const p = ev.payload;
    switch (p.kind) {
      case 'keyDown':
        if (tailPickerOpen) {
          if (!p.repeat) {
            const spec = resolveKeyByVk(p.vk, settings.keyboardLayout);
            if (spec) {
              toggleTailKeyId(spec.id);
            }
          }
          break;
        }
        if (active3d && engine3d) engine3d.onKeyDown(p.vk, p.repeat);
        else engine.onKeyDown(p.vk, p.repeat);
        break;
      case 'keyUp':
        if (active3d || tailPickerOpen) engine3d?.onKeyUp(p.vk);
        if (!active3d) {
          engine.onKeyUp(p.vk);
        }
        break;
      case 'mouseMove':
        if (active3d && engine3d) engine3d.onGlobalMouseMove(p.nx, p.ny);
        else engine.onGlobalMouseMove(p.nx, p.ny);
        break;
      case 'mouseDown':
        if (active3d && engine3d) engine3d.onMouseDown(p.button);
        else engine.onMouseDown(p.button);
        break;
      case 'mouseUp':
        if (active3d && engine3d) engine3d.onMouseUp(p.button);
        else engine.onMouseUp(p.button);
        break;
      case 'mouseWheel':
        if (active3d && engine3d) engine3d.onMouseWheel();
        else engine.onMouseWheel();
        break;
      case 'privacyTyping':
        if (active3d && engine3d) engine3d.onPrivacyTyping();
        else engine.onPrivacyTyping();
        break;
    }
  });

  await listen<boolean>('kuro-privacy', (ev) => {
    privacyActive = Boolean(ev.payload);
    engine.setPrivacyMode(privacyActive);
    engine3d?.setPrivacyMode(privacyActive);
  });

  try {
    gameActive = await invoke<boolean>('get_game_active');
    const wearNow = shouldWearHeadphonesNow();
    engine.setHeadphones(wearNow);
    engine3d?.setHeadphones(wearNow);
  } catch {
    // non-Tauri or older backend
  }

  await listen<{ active?: boolean; gameName?: string | null }>('kuro-game-active', (ev) => {
    gameActive = Boolean(ev.payload?.active);
    const wearNow = shouldWearHeadphonesNow();
    engine.setHeadphones(wearNow);
    engine3d?.setHeadphones(wearNow);
  });

  await listen<WindowCursorInfo>('kuro-cursor', (ev) => {
    const c = ev.payload;
    altOverride = Boolean(c.altOverride);
    if (active3d && engine3d) engine3d.onWindowCursor(c.relX, c.relY, c.overCat);
    else engine.onWindowCursor(c.relX, c.relY, c.overCat);
    const interactive = !settings.clickThroughLocked || altOverride;
    canvas.classList.toggle('pet-hover', c.overCat && interactive);
    canvas3d.classList.toggle('pet-hover', c.overCat && interactive);
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!tailPickerOpen) return;
    const hit = engine.hitTestKeyAtClientPoint(e.clientX, e.clientY);
    engine.setTailPickerHover(hit ? hit.id : null);
    canvas.classList.toggle('tail-key-hover', Boolean(hit));
  });

  canvas.addEventListener('mouseleave', () => {
    if (!tailPickerOpen) return;
    engine.setTailPickerHover(null);
    canvas.classList.remove('tail-key-hover');
  });

  // Left-click keycap toggle in tail-picker mode, OR drag to reposition transparent window (both 2D & 3D canvases!)
  const handleCanvasMouseDown = async (e: MouseEvent) => {
    if (e.button === 0) {
      closeContextMenu();
      if (tailPickerOpen) {
        const hit = engine.hitTestKeyAtClientPoint(e.clientX, e.clientY);
        if (hit) {
          e.preventDefault();
          e.stopPropagation();
          toggleTailKeyId(hit.id);
          return;
        }
      }
      if (settings.clickThroughLocked && !altOverride && !e.altKey) return;
      canvas.classList.add('pet-dragging');
      canvas3d.classList.add('pet-dragging');
      void invoke('set_dragging', { dragging: true });
      try {
        const nativeHandled = await invoke<boolean>('start_pet_drag').catch(() => false);
        if (!nativeHandled) {
          await getCurrentWindow().startDragging();
        }
      } finally {
        canvas.classList.remove('pet-dragging');
        canvas3d.classList.remove('pet-dragging');
        engine.onMouseUp('left');
        engine3d?.onMouseUp('left');
        void invoke('set_dragging', { dragging: false });
        void invoke('save_window_pos');
      }
    }
  };
  canvas.addEventListener('mousedown', handleCanvasMouseDown);
  canvas3d.addEventListener('mousedown', handleCanvasMouseDown);

  // Right-click opens sleek dark glass settings menu (both 2D & 3D canvases!)
  const handleCanvasContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    if (tailPickerSaving) return;
    if (tailPickerOpen) {
      closeTailPicker();
    }
    if (settings.clickThroughLocked && !altOverride && !e.altKey) return;
    openContextMenu(e.clientX, e.clientY);
  };
  canvas.addEventListener('contextmenu', handleCanvasContextMenu);
  canvas3d.addEventListener('contextmenu', handleCanvasContextMenu);

  // Side menu window auto-closes on its own focus loss; do NOT close on main blur (clicking the menu blurs main!)
  window.addEventListener('keydown', (e) => {
    if (tailPickerOpen) {
      // Enter and Space can be selected without activating the focused toolbar button.
      e.preventDefault();
    } else if (e.key === 'Escape') {
      closeContextMenu();
    }
  });

  menuEl.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>(
      '[data-action], [data-scale], [data-breed], [data-rendermode], [data-collar], [data-headphonemode], [data-kblayout], [data-kborient], [data-tailmode]',
    );
    if (!target) return;

    const headphoneAttr = target.dataset.headphonemode;
    if (headphoneAttr === 'auto' || headphoneAttr === 'on' || headphoneAttr === 'off') {
      void applySettingsPatch({ headphoneMode: headphoneAttr });
      return;
    }

    const renderModeAttr = target.dataset.rendermode;
    if (renderModeAttr === '2d' || renderModeAttr === '3d') {
      void applySettingsPatch({ renderMode: renderModeAttr });
      return;
    }

    const collarAttr = target.dataset.collar;
    if (
      collarAttr === 'none' ||
      collarAttr === 'red' ||
      collarAttr === 'blue' ||
      collarAttr === 'pink' ||
      collarAttr === 'green'
    ) {
      void applySettingsPatch({ collarColor: collarAttr });
      return;
    }

    const kbLayoutAttr = target.dataset.kblayout;
    if (isKeyboardLayout(kbLayoutAttr)) {
      void applySettingsPatch({ keyboardLayout: kbLayoutAttr });
      closeContextMenu();
      return;
    }

    const kbOrientAttr = target.dataset.kborient;
    if (kbOrientAttr === 'cat' || kbOrientAttr === 'viewer') {
      void applySettingsPatch({ keyboardOrientation: kbOrientAttr });
      closeContextMenu();
      return;
    }

    const tailModeAttr = target.dataset.tailmode;
    if (
      tailModeAttr === 'smart' ||
      tailModeAttr === 'custom' ||
      tailModeAttr === 'edge' ||
      tailModeAttr === 'off'
    ) {
      void applySettingsPatch({ tailKeyMode: tailModeAttr });
      return;
    }

    const breedAttr = target.dataset.breed;
    if (breedAttr) {
      void applySettingsPatch({ catBreed: breedAttr });
      closeContextMenu();
      return;
    }

    const scaleAttr = target.dataset.scale;
    if (scaleAttr) {
      void applySettingsPatch({ scale: Number(scaleAttr) });
      closeContextMenu();
      return;
    }

    switch (target.dataset.action) {
      case 'toggle-privacy':
        void applySettingsPatch({ privacyPasswordGuard: !(settings.privacyPasswordGuard !== false) });
        break;
      case 'toggle-bubbles':
        void applySettingsPatch({ showKeyBubbles: !settings.showKeyBubbles });
        break;
      case 'toggle-lock':
        void applySettingsPatch({ clickThroughLocked: !settings.clickThroughLocked });
        closeContextMenu();
        break;
      case 'toggle-sound':
        void applySettingsPatch({ soundEnabled: !settings.soundEnabled });
        break;
      case 'toggle-top':
        void applySettingsPatch({ alwaysOnTop: !settings.alwaysOnTop });
        break;
      case 'toggle-autostart':
        void applySettingsPatch({ autostart: !settings.autostart });
        break;
      case 'toggle-mcp':
        void applySettingsPatch({ mcpEnabled: !settings.mcpEnabled });
        break;
      case 'copy-mcp':
        void copyMcpConfig();
        break;
      case 'desktop-shortcut':
        void createDesktopShortcut();
        break;
      case 'check-update':
        void triggerManualUpdateCheck();
        break;
      case 'open-tail-picker':
        void openTailPicker();
        break;
      case 'reset-pos':
        void invoke('reset_position');
        closeContextMenu();
        break;
      case 'quit':
        void invoke('quit_app');
        break;
    }
  });

  // On Windows 7/8 (where Microsoft WebView2 does not support DirectComposition alpha),
  // stream the live 2D Canvas RGBA pixels via zero-copy binary IPC to a native Win32
  // UpdateLayeredWindow(ULW_ALPHA) presenter window for true 256-level per-pixel anti-aliased
  // transparency (zero white box, zero jagged edges) on both Aero and Win7 Basic desktops.
  try {
    const useWin7Ulw = await invoke<boolean>('is_win7_ulw_mode');
    if (useWin7Ulw) {
      isWin7Ulw = true;
      activateRenderEngine();
      document.documentElement.classList.add('win7-ulw-mode');
      const petCtx = canvas.getContext('2d');
      let win7Visible = true;
      let frameBusy = false;
      let lastPresentMs = 0;
      let lastFrameKey = '';
      let lastOverlayKey = '';

      const syncWin7Overlay = (focusMenu = false) => {
        const dpr = Math.max(window.devicePixelRatio || 1, 1);
        const physW = Math.max(1, Math.round(window.innerWidth * dpr));
        const physH = Math.max(1, Math.round(window.innerHeight * dpr));
        const rects: number[] = [];

        if (menuEl && !menuEl.classList.contains('hidden')) {
          const r = menuEl.getBoundingClientRect();
          if (r.width > 2 && r.height > 2) {
            rects.push(
              Math.max(0, Math.floor(r.left * dpr)),
              Math.max(0, Math.floor(r.top * dpr)),
              Math.min(physW, Math.ceil(r.right * dpr)),
              Math.min(physH, Math.ceil(r.bottom * dpr)),
              Math.round(12 * dpr),
            );
          }
        }
        if (tailPickerBarEl && !tailPickerBarEl.classList.contains('hidden')) {
          const toolbar = tailPickerBarEl.getBoundingClientRect();
          const closeButton = btnTailCancelEl.getBoundingClientRect();
          const pickerRegions = [
            { rect: toolbar, radius: 13 },
            { rect: closeButton, radius: closeButton.width / 2 },
          ];
          for (const { rect, radius } of pickerRegions) {
            if (rect.width <= 2 || rect.height <= 2) continue;
            rects.push(
              Math.max(0, Math.floor(rect.left * dpr)),
              Math.max(0, Math.floor(rect.top * dpr)),
              Math.min(physW, Math.ceil(rect.right * dpr)),
              Math.min(physH, Math.ceil(rect.bottom * dpr)),
              Math.round(radius * dpr),
            );
          }
        }
        if (updateToastEl && !updateToastEl.classList.contains('hidden')) {
          const r = updateToastEl.getBoundingClientRect();
          if (r.width > 2 && r.height > 2) {
            const top = Math.max(0, Math.floor(r.top * dpr));
            const bot = Math.min(physH, Math.ceil(r.bottom * dpr));
            rects.push(
              Math.max(0, Math.floor(r.left * dpr)),
              top,
              Math.min(physW, Math.ceil(r.right * dpr)),
              bot,
              Math.max(8, Math.round((bot - top) / 2)),
            );
          }
        }

        const key = rects.join(',');
        if (!focusMenu && key === lastOverlayKey) return;
        lastOverlayKey = key;
        void invoke('win7_sync_overlay', { rects, focusMenu });
      };
      syncWin7OverlayFn = syncWin7Overlay;

      await listen<{ x: number; y: number }>('kuro-win7-contextmenu', (ev) => {
        openContextMenu(ev.payload.x, ev.payload.y);
      });
      await listen('kuro-win7-close-menu', () => {
        closeContextMenu();
      });
      await listen<boolean>('kuro-win7-visibility', (ev) => {
        win7Visible = Boolean(ev.payload);
        if (win7Visible) {
          lastFrameKey = '';
        }
      });

      const presentWin7Frame = () => {
        if (!win7Visible || frameBusy || !petCtx) return;
        const now = performance.now();
        if (now - lastPresentMs < 28) return;
        const w = canvas.width;
        const h = canvas.height;
        if (w < 8 || h < 8) return;

        const imgData = petCtx.getImageData(0, 0, w, h);
        const u32 = new Uint32Array(
          imgData.data.buffer,
          imgData.data.byteOffset,
          imgData.data.byteLength >>> 2,
        );
        let hash = 2166136261 >>> 0;
        hash = Math.imul(hash ^ w, 16777619) >>> 0;
        hash = Math.imul(hash ^ h, 16777619) >>> 0;
        for (let i = 0; i < u32.length; i++) {
          hash = Math.imul(hash ^ u32[i], 16777619) >>> 0;
        }
        const key = `${w}x${h}:${hash}`;
        if (key === lastFrameKey) return;

        lastFrameKey = key;
        lastPresentMs = now;
        frameBusy = true;
        const payload = new Uint8Array(
          imgData.data.buffer,
          imgData.data.byteOffset,
          imgData.data.byteLength,
        );
        void invoke('win7_present_frame', payload, {
          headers: { 'x-w': String(w), 'x-h': String(h) },
        }).finally(() => {
          frameBusy = false;
        });
      };

      engine.onAfterRender = presentWin7Frame;
      // Kick initial presentation immediately & keep overlay bounds in sync if toast/menu resizes
      setTimeout(presentWin7Frame, 30);
      setInterval(() => syncWin7Overlay(false), 200);
    }
  } catch {
    // Non-Win7 or unsupported: keep native transparency untouched
  }
}

void bootstrap();
