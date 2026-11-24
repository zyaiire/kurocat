import { KuroCatEngine, type KeyboardOrientation } from './catEngine';
import { BUILTIN_WEB_CATS } from '../website/src/builtinCats';
import { catAudio } from './audio';
import { normalizeLayout, type KeyboardLayoutId } from './keyboardLayout';

interface AndroidSettingsPayload {
  catBreed?: string;
  keyboardLayout?: KeyboardLayoutId;
  keyboardOrientation?: KeyboardOrientation;
  showKeyBubbles?: boolean;
  soundEnabled?: boolean;
  privacyMode?: boolean;
}

const canvas = document.getElementById('pet-canvas') as HTMLCanvasElement;
const engine = new KuroCatEngine(canvas, { embedded: true });
engine.setRenderScale(1.0);
engine.start();

// Natural alternating left/right home-row + occasional space/enter/backspace VKs
// used when Android Accessibility reports IME text-change deltas without physical keycodes.
const LEFT_HAND_VKS = [0x41, 0x53, 0x44, 0x46, 0x47, 0x51, 0x57, 0x45, 0x52, 0x54, 0x5A, 0x58, 0x43, 0x56];
const RIGHT_HAND_VKS = [0x48, 0x4A, 0x4B, 0x4C, 0x59, 0x55, 0x49, 0x4F, 0x50, 0x42, 0x4E, 0x4D];
const TAIL_TAILSLAP_VKS = [0x0D, 0x08, 0x20]; // Enter / Backspace / Space -> triggers BigFish whale tail slap!

let burstStep = 0;
let petResetTimer: number | null = null;
let petAnimRaf: number | null = null;

function tapVk(vk: number, delayMs: number, holdMs = 82): void {
  window.setTimeout(() => {
    engine.onKeyDown(vk, false);
    window.setTimeout(() => {
      engine.onKeyUp(vk);
    }, holdMs);
  }, delayMs);
}

function applySettings(payload: AndroidSettingsPayload): void {
  if (!payload || typeof payload !== 'object') return;
  const breedId = payload.catBreed || 'black';
  const skin = BUILTIN_WEB_CATS.find((c) => c.id === breedId) ?? BUILTIN_WEB_CATS[0];
  engine.setCatAppearance(skin.id, skin);

  const layout: KeyboardLayoutId = normalizeLayout(payload.keyboardLayout);
  const orient: KeyboardOrientation = payload.keyboardOrientation === 'viewer' ? 'viewer' : 'cat';
  engine.setKeyboardConfig(layout, orient);

  if (typeof payload.showKeyBubbles === 'boolean') {
    engine.showKeyBubbles = payload.showKeyBubbles;
  }
  if (typeof payload.soundEnabled === 'boolean') {
    catAudio.setEnabled(payload.soundEnabled);
  }
  if (typeof payload.privacyMode === 'boolean') {
    engine.setPrivacyMode(payload.privacyMode);
  }
  engine.resize();
}

function triggerPetBurst(): void {
  // Smooth synthetic back-and-forth rub across cat forehead so tapping the pet's head
  // immediately triggers blissful squinting eyes + gentle Web Audio purr!
  if (petAnimRaf !== null) {
    cancelAnimationFrame(petAnimRaf);
    petAnimRaf = null;
  }
  if (petResetTimer !== null) {
    window.clearTimeout(petResetTimer);
    petResetTimer = null;
  }
  const start = performance.now();
  const duration = 680;
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    const wave = Math.sin(t * Math.PI * 4.0) * 0.14;
    engine.onWindowCursor(0.48 + wave, 0.36, true);
    if (t < 1) {
      petAnimRaf = requestAnimationFrame(step);
    } else {
      petAnimRaf = null;
      petResetTimer = window.setTimeout(() => {
        engine.onWindowCursor(-1, -1, false);
      }, 320);
    }
  };
  petAnimRaf = requestAnimationFrame(step);
}

const bridge = {
  setSettings(payloadOrJson: AndroidSettingsPayload | string): void {
    try {
      const data =
        typeof payloadOrJson === 'string'
          ? (JSON.parse(payloadOrJson) as AndroidSettingsPayload)
          : payloadOrJson;
      applySettings(data);
    } catch (e) {
      console.error('KuroAndroid.setSettings error', e);
    }
  },

  onTypingBurst(count = 1, kind: 'char' | 'delete' | 'enter' | 'space' = 'char'): void {
    if (engine.privacyMode) {
      engine.onPrivacyTyping();
      return;
    }
    const taps = Math.max(1, Math.min(4, Math.round(count)));
    for (let i = 0; i < taps; i++) {
      let vk: number;
      if (kind === 'delete') {
        vk = 0x08;
      } else if (kind === 'enter') {
        vk = 0x0D;
      } else if (kind === 'space') {
        vk = 0x20;
      } else {
        burstStep++;
        // Every 6th stroke tap Enter/Space/Backspace so BigFish also splashes her whale tail naturally!
        if (burstStep % 7 === 0) {
          vk = TAIL_TAILSLAP_VKS[burstStep % TAIL_TAILSLAP_VKS.length];
        } else if (burstStep % 2 === 0) {
          vk = LEFT_HAND_VKS[(burstStep * 3) % LEFT_HAND_VKS.length];
        } else {
          vk = RIGHT_HAND_VKS[(burstStep * 5) % RIGHT_HAND_VKS.length];
        }
      }
      tapVk(vk, i * 52, 78);
    }
  },

  onKeyDown(vk: number, repeat = false): void {
    if (engine.privacyMode) {
      engine.onPrivacyTyping();
      return;
    }
    engine.onKeyDown(vk, Boolean(repeat));
  },

  onKeyUp(vk: number): void {
    engine.onKeyUp(vk);
  },

  onScreenTap(nx = 0.5, ny = 0.5, rightBtn = false): void {
    engine.onGlobalMouseMove(Math.max(0, Math.min(1, nx)), Math.max(0, Math.min(1, ny)));
    const btn = rightBtn ? 'right' : 'left';
    engine.onMouseDown(btn);
    window.setTimeout(() => engine.onMouseUp(btn), 95);
  },

  setPrivacyMode(active: boolean): void {
    engine.setPrivacyMode(Boolean(active));
  },

  onPrivacyTyping(): void {
    engine.onPrivacyTyping();
  },

  petHead(): void {
    triggerPetBurst();
  },

  petMove(relX: number, relY: number, active: boolean): void {
    engine.onWindowCursor(relX, relY, Boolean(active));
  },

  resize(): void {
    engine.resize();
  },
};

(window as unknown as { KuroAndroid: typeof bridge }).KuroAndroid = bridge;

// ResizeObserver ensures canvas pixel dimensions track Android WindowManager resize instantaneously
const ro = new ResizeObserver(() => engine.resize());
ro.observe(document.documentElement);
