'use client';

import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
} from 'react';

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

interface SwarmRebuildEngineProps {
  triggerKey?: number;
  onInitialBuildComplete?: () => void;
}

interface AgentConfig {
  id: string;
  name: string;
  color: string;
  bgLight: string;
}

const SWARM_AGENTS: AgentConfig[] = [
  {
    id: 'agent-indi',
    name: 'Indi',
    color: '#2563EB',
    bgLight: 'rgba(37, 99, 235, 0.09)',
  },
  {
    id: 'agent-jaye',
    name: 'Jaye',
    color: '#059669',
    bgLight: 'rgba(5, 150, 105, 0.09)',
  },
  {
    id: 'agent-piana',
    name: 'Piana',
    color: '#7C3AED',
    bgLight: 'rgba(124, 58, 237, 0.09)',
  },
  {
    id: 'agent-anis',
    name: 'Anis',
    color: '#E11D48',
    bgLight: 'rgba(225, 29, 72, 0.09)',
  },
  {
    id: 'agent-rifky',
    name: 'Rifky',
    color: '#D97706',
    bgLight: 'rgba(217, 119, 6, 0.09)',
  },
];

interface CursorVisualState {
  agent: AgentConfig;
  x: number;
  y: number;
  visible: boolean;
  actionLabel?: string;
  box: {
    active: boolean;
    left: number;
    top: number;
    width: number;
    height: number;
  };
  guide: {
    active: boolean;
    x: number;
    y: number;
  };
}

const TARGET_SELECTORS = [
  'header > div > div:first-child',
  '#tour-cart-nav > button',
  '#tour-batch-info',
  '#tour-hero-counter',
  '#katalog-menu > div:first-child',
  '#katalog-menu > div:nth-child(2) > button',
  '#katalog-menu article',
  'section > div > div.bg-white',
  'footer > div > div',
].join(', ');

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export default function SwarmRebuildEngine({
  triggerKey = 0,
  onInitialBuildComplete,
}: SwarmRebuildEngineProps) {
  const [cursors, setCursors] = useState<CursorVisualState[]>(() =>
    SWARM_AGENTS.map((agent, idx) => ({
      agent,
      x: 160 + idx * 210,
      y: 90 + (idx % 2) * 140,
      visible: false,
      box: { active: false, left: 0, top: 0, width: 0, height: 0 },
      guide: { active: false, x: 0, y: 0 },
    }))
  );

  const cursorPosRef = useRef<Array<{ x: number; y: number }>>(
    SWARM_AGENTS.map((_, idx) => ({
      x: 160 + idx * 210,
      y: 90 + (idx % 2) * 140,
    }))
  );

  const builtElementsRef = useRef<WeakSet<Element>>(new WeakSet());
  const queuedElementsRef = useRef<WeakSet<Element>>(new WeakSet());
  const agentTaskQueuesRef = useRef<HTMLElement[][]>(
    SWARM_AGENTS.map(() => [])
  );
  const agentBusyRef = useRef<boolean[]>(SWARM_AGENTS.map(() => false));
  const nextAgentAssignRef = useRef<number>(0);
  const hasStartedInitialRef = useRef<boolean>(false);
  const hasCompletedInitialRef = useRef<boolean>(false);
  const pendingTimersRef = useRef<number[]>([]);
  const onInitialCompleteRef = useRef(onInitialBuildComplete);

  useEffect(() => {
    onInitialCompleteRef.current = onInitialBuildComplete;
  }, [onInitialBuildComplete]);

  // Helper animasi halus 60fps menggunakan requestAnimationFrame
  const animateDuration = useCallback(
    (durationMs: number, onFrame: (progress: number) => void): Promise<void> => {
      return new Promise((resolve) => {
        const start = performance.now();
        const step = (now: number) => {
          const elapsed = now - start;
          const rawProgress = Math.min(1, elapsed / durationMs);
          onFrame(rawProgress);
          if (rawProgress < 1) {
            requestAnimationFrame(step);
          } else {
            resolve();
          }
        };
        requestAnimationFrame(step);
      });
    },
    []
  );

  // Satu kursor menggambar satu elemen secara perlahan & halus seperti di video
  const drawSingleElementWithAgent = useCallback(
    async (agentIndex: number, el: HTMLElement) => {
      const rect = el.getBoundingClientRect();

      // Jika elemen terlalu kecil, langsung tampilkan
      if (rect.width < 10 || rect.height < 10) {
        el.style.opacity = '1';
        el.style.transform = 'none';
        builtElementsRef.current.add(el);
        return;
      }

      const prevPos = cursorPosRef.current[agentIndex];
      const startX = Math.round(rect.left);
      const startY = Math.round(rect.top);
      const targetW = Math.round(rect.width);
      const targetH = Math.round(rect.height);

      // 1. Gerakkan kursor perlahan menuju sudut kiri-atas elemen (750ms)
      await animateDuration(400, (p) => {
        const eased = easeInOutCubic(p);
        const curX = Math.round(prevPos.x + (startX - prevPos.x) * eased);
        const curY = Math.round(prevPos.y + (startY - prevPos.y) * eased);
        cursorPosRef.current[agentIndex] = { x: curX, y: curY };

        setCursors((prev) =>
          prev.map((c, idx) =>
            idx === agentIndex
              ? {
                  ...c,
                  visible: true,
                  x: curX,
                  y: curY,
                  actionLabel: undefined,
                  guide: { active: p > 0.7, x: startX, y: startY },
                  box: { ...c.box, active: false },
                }
              : c
          )
        );
      });

      // Jeda bidik crosshair singkat di sudut kiri-atas (180ms)
      await new Promise((r) => setTimeout(r, 100));

      // Ambil ulang koordinat terbaru kalau pengguna sedang scroll perlahan
      const freshRect = el.getBoundingClientRect();
      const boxLeft = Math.round(freshRect.left);
      const boxTop = Math.round(freshRect.top);
      const finalW = Math.round(freshRect.width);
      const finalH = Math.round(freshRect.height);

      // 2. Tarik (Drag) kotak seleksi perlahan dari kiri-atas ke kanan-bawah (1050ms)
      await animateDuration(600, (p) => {
        const eased = easeOutCubic(p);
        const curRect = el.getBoundingClientRect();
        const curLeft = Math.round(curRect.left);
        const curTop = Math.round(curRect.top);
        const curW = Math.max(4, Math.round(finalW * eased));
        const curH = Math.max(4, Math.round(finalH * eased));
        const curX = curLeft + curW;
        const curY = curTop + curH;

        cursorPosRef.current[agentIndex] = { x: curX, y: curY };

        setCursors((prev) =>
          prev.map((c, idx) =>
            idx === agentIndex
              ? {
                  ...c,
                  visible: true,
                  x: curX,
                  y: curY,
                  actionLabel: `${curW} × ${curH}`,
                  guide: { active: true, x: curLeft, y: curTop },
                  box: {
                    active: true,
                    left: curLeft || boxLeft,
                    top: curTop || boxTop,
                    width: curW,
                    height: curH,
                  },
                }
              : c
          )
        );
      });

      // Tahan kotak 100% sebentar sebelum elemen muncul (160ms)
      await new Promise((r) => setTimeout(r, 160));

      // 3. Tampilkan elemen asli dengan transisi halus
      builtElementsRef.current.add(el);
      el.style.transition =
        'opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1), transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)';
      el.style.opacity = '1';
      el.style.transform = 'scale(1)';

      // Matikan kotak seleksi setelah elemen muncul
      setCursors((prev) =>
        prev.map((c, idx) =>
          idx === agentIndex
            ? {
                ...c,
                actionLabel: undefined,
                guide: { active: false, x: 0, y: 0 },
                box: { ...c.box, active: false },
              }
            : c
        )
      );

      await new Promise((r) => setTimeout(r, 140));
    },
    [animateDuration]
  );

  // Worker antrean untuk masing-masing agen kursor
  const processAgentQueue = useCallback(
    async (agentIndex: number, onQueueDrained?: () => void) => {
      if (agentBusyRef.current[agentIndex]) return;
      agentBusyRef.current[agentIndex] = true;

      while (agentTaskQueuesRef.current[agentIndex].length > 0) {
        const nextEl = agentTaskQueuesRef.current[agentIndex].shift();
        if (nextEl) {
          await drawSingleElementWithAgent(agentIndex, nextEl);
        }
      }

      agentBusyRef.current[agentIndex] = false;

      // Sembunyikan kursor agen ini jika tidak ada lagi antrean
      setCursors((prev) =>
        prev.map((c, idx) =>
          idx === agentIndex
            ? {
                ...c,
                visible: false,
                actionLabel: undefined,
                guide: { active: false, x: 0, y: 0 },
                box: { ...c.box, active: false },
              }
            : c
        )
      );

      if (onQueueDrained) {
        onQueueDrained();
      }
    },
    [drawSingleElementWithAgent]
  );

  // Masukkan daftar elemen ke antrean kursor secara merata
  const enqueueElementsForSwarm = useCallback(
    (elements: HTMLElement[], isInitialViewportBatch = false) => {
      if (isInitialViewportBatch) {
        hasStartedInitialRef.current = true;
      }

      if (elements.length === 0) {
        if (
          hasStartedInitialRef.current &&
          !hasCompletedInitialRef.current &&
          !agentBusyRef.current.some(Boolean) &&
          !agentTaskQueuesRef.current.some((q) => q.length > 0)
        ) {
          hasCompletedInitialRef.current = true;
          onInitialCompleteRef.current?.();
        }
        return;
      }

      elements.forEach((el) => {
        if (queuedElementsRef.current.has(el)) return;
        queuedElementsRef.current.add(el);

        const assignedAgent =
          nextAgentAssignRef.current % SWARM_AGENTS.length;
        nextAgentAssignRef.current += 1;
        agentTaskQueuesRef.current[assignedAgent].push(el);
      });

      const checkAllAgentsDone = () => {
        if (!hasStartedInitialRef.current || hasCompletedInitialRef.current) {
          return;
        }
        const anyBusy = agentBusyRef.current.some(Boolean);
        const anyQueued = agentTaskQueuesRef.current.some(
          (q) => q.length > 0
        );
        if (!anyBusy && !anyQueued) {
          hasCompletedInitialRef.current = true;
          // Setelah seluruh animasi awal selesai, baru tampilkan popup panduan!
          const doneTimer = window.setTimeout(() => {
            onInitialCompleteRef.current?.();
          }, 350);
          pendingTimersRef.current.push(doneTimer);
        }
      };

      SWARM_AGENTS.forEach((_, idx) => {
        if (
          agentTaskQueuesRef.current[idx].length > 0 &&
          !agentBusyRef.current[idx]
        ) {
          const t = window.setTimeout(() => {
            processAgentQueue(idx, checkAllAgentsDone);
          }, idx * 140);
          pendingTimersRef.current.push(t);
        }
      });
    },
    [processAgentQueue]
  );

  // Setup awal: Sembunyikan semua elemen target SEBELUM browser melakukan paint pertama
  // (dikombinasikan dengan [data-swarm-preload="true"] di globals.css agar tidak ada flash awal),
  // lalu langsung mulai animasi untuk elemen di layar awal dan pakai IntersectionObserver untuk scroll.
  useIsomorphicLayoutEffect(() => {
    if (typeof window === 'undefined') return;

    const allTargets = Array.from(
      document.querySelectorAll<HTMLElement>(TARGET_SELECTORS)
    ).filter((el) => {
      const r = el.getBoundingClientRect();
      return (
        el.id === 'tour-hero-counter' ||
        (r.width >= 15 && r.height >= 15)
      );
    });

    // Sembunyikan semua elemen target secara sinkron sebelum paint
    allTargets.forEach((el) => {
      el.style.transition = 'none';
      el.style.opacity = '0';
      el.style.transform = 'scale(0.97)';
    });

    // Lepas attribute preload setelah inline opacity='0' terpasang
    document.querySelectorAll('[data-swarm-preload="true"]').forEach((node) => {
      node.removeAttribute('data-swarm-preload');
    });

    // Pisahkan elemen yang ada di layar atas (initial viewport) vs elemen yang ada di bawah (butuh di-scroll)
    const initialViewportEls: HTMLElement[] = [];
    const scrollBelowEls: HTMLElement[] = [];

    allTargets.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight - 50) {
        initialViewportEls.push(el);
      } else {
        scrollBelowEls.push(el);
      }
    });

    // 1. Langsung jalankan animasi perlahan di frame pertama tanpa jeda tampilan awal
    const startRaf = requestAnimationFrame(() => {
      enqueueElementsForSwarm(initialViewportEls, true);
    });

    // 2. Pasang IntersectionObserver untuk elemen-elemen di bawah layar:
    //    Setiap kali user scroll ke bawah, kursor baru akan datang membangun elemen tersebut!
    if (!('IntersectionObserver' in window)) {
      scrollBelowEls.forEach((el) => {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
      return () => cancelAnimationFrame(startRaf);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const newlyVisible: HTMLElement[] = [];
        entries.forEach((entry) => {
          const el = entry.target as HTMLElement;
          if (
            entry.isIntersecting &&
            !builtElementsRef.current.has(el) &&
            !queuedElementsRef.current.has(el)
          ) {
            newlyVisible.push(el);
          }
        });

        if (newlyVisible.length > 0) {
          enqueueElementsForSwarm(newlyVisible, false);
        }
      },
      {
        threshold: 0.16,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    scrollBelowEls.forEach((el) => observer.observe(el));

    // Pantau jika ada kartu produk baru yang di-mount (misal setelah sinkronisasi data / ganti kategori)
    const mutationObserver = new MutationObserver(() => {
      const currentTargets = Array.from(
        document.querySelectorAll<HTMLElement>(TARGET_SELECTORS)
      );
      currentTargets.forEach((el) => {
        if (
          !builtElementsRef.current.has(el) &&
          !queuedElementsRef.current.has(el) &&
          el.style.opacity !== '0'
        ) {
          const r = el.getBoundingClientRect();
          if (r.width >= 15 && r.height >= 15) {
            el.style.transition = 'none';
            el.style.opacity = '0';
            el.style.transform = 'scale(0.97)';
            if (r.top < window.innerHeight - 40) {
              enqueueElementsForSwarm([el], false);
            } else {
              observer.observe(el);
            }
          }
        }
      });
    });

    const mainEl = document.querySelector('main');
    if (mainEl) {
      mutationObserver.observe(mainEl, { childList: true, subtree: true });
    }

    return () => {
      cancelAnimationFrame(startRaf);
      pendingTimersRef.current.forEach((t) => clearTimeout(t));
      pendingTimersRef.current = [];
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, [enqueueElementsForSwarm]);

  // Jika pengguna klik logo AJCUlicious di kiri atas, ulangi animasi pada elemen yang sedang tampak di layar
  useEffect(() => {
    if (triggerKey === 0 || typeof window === 'undefined') return;

    const visibleNow = Array.from(
      document.querySelectorAll<HTMLElement>(TARGET_SELECTORS)
    ).filter((el) => {
      const r = el.getBoundingClientRect();
      return (
        r.width >= 15 &&
        r.height >= 15 &&
        r.bottom > 20 &&
        r.top < window.innerHeight - 20
      );
    });

    visibleNow.forEach((el) => {
      builtElementsRef.current.delete(el);
      queuedElementsRef.current.delete(el);
      el.style.transition = 'none';
      el.style.opacity = '0';
      el.style.transform = 'scale(0.97)';
    });

    enqueueElementsForSwarm(visibleNow, false);
  }, [triggerKey, enqueueElementsForSwarm]);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-[70] overflow-hidden"
      aria-hidden="true"
    >
      {cursors.map((c) => {
        if (!c.visible) return null;

        return (
          <React.Fragment key={c.agent.id}>
            {/* Garis Bantu Presisi (Figma Alignment Ruler Guides) */}
            {c.guide.active && (
              <>
                <div
                  style={{
                    top: `${c.guide.y}px`,
                    borderColor: c.agent.color,
                  }}
                  className="fixed left-0 right-0 border-t border-dashed opacity-30"
                />
                <div
                  style={{
                    left: `${c.guide.x}px`,
                    borderColor: c.agent.color,
                  }}
                  className="fixed top-0 bottom-0 border-l border-dashed opacity-30"
                />
              </>
            )}

            {/* Kotak Seleksi yang Ditarik Kursor (Selection Bounding Box + Corner Handles + WxH Badge) */}
            {c.box.active && c.box.width > 4 && c.box.height > 4 && (
              <div
                style={{
                  left: `${c.box.left}px`,
                  top: `${c.box.top}px`,
                  width: `${c.box.width}px`,
                  height: `${c.box.height}px`,
                  borderColor: c.agent.color,
                  backgroundColor: c.agent.bgLight,
                }}
                className="fixed border-[1.5px] rounded-xs"
              >
                {/* 4 Titik Sudut Figma (Corner Resize Handles) */}
                <span
                  style={{ borderColor: c.agent.color }}
                  className="absolute -top-1 -left-1 w-2 h-2 bg-white border-[1.5px]"
                />
                <span
                  style={{ borderColor: c.agent.color }}
                  className="absolute -top-1 -right-1 w-2 h-2 bg-white border-[1.5px]"
                />
                <span
                  style={{ borderColor: c.agent.color }}
                  className="absolute -bottom-1 -left-1 w-2 h-2 bg-white border-[1.5px]"
                />
                <span
                  style={{ borderColor: c.agent.color }}
                  className="absolute -bottom-1 -right-1 w-2 h-2 bg-white border-[1.5px]"
                />

                {/* Badge Ukuran Piksel Live (W × H) di Tengah Bawah Kotak */}
                <div
                  style={{ backgroundColor: c.agent.color }}
                  className="absolute -bottom-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-white whitespace-nowrap shadow-xs"
                >
                  {c.box.width} &times; {c.box.height}
                </div>
              </div>
            )}

            {/* Kursor Multiplayer (Panah SVG + Pill Nama Anggota Tim) */}
            <div
              style={{
                transform: `translate3d(${c.x}px, ${c.y}px, 0)`,
              }}
              className="fixed top-0 left-0 will-change-transform"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                className="drop-shadow-md -mt-0.5 -ml-0.5"
              >
                <path
                  d="M4 3L11.5 21L14.8 13.8L22 10.5L4 3Z"
                  fill={c.agent.color}
                  stroke="white"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>

              <div
                style={{ backgroundColor: c.agent.color }}
                className="ml-3 -mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white shadow-md whitespace-nowrap flex items-center gap-1.5"
              >
                <span>{c.agent.name}</span>
                {c.actionLabel && (
                  <span className="font-mono text-[9px] opacity-90 border-l border-white/30 pl-1.5">
                    {c.actionLabel}
                  </span>
                )}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
