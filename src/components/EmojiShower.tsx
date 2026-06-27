import { useEffect, useRef } from "react";

interface EmojiShowerProps {
  triggerCount: number; // Trigger explosion whenever this count changes
  emojis?: string[];
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  emoji: string;
  size: number;
  alpha: number;
  decay: number;
  rotation: number;
  rotationSpeed: number;
}

const DEFAULT_EMOJIS = ["🌟", "✨", "🎉", "💖", "🚀", "🎈", "🦖", "🦄", "🍭", "🦁", "🎨", "🏆", "✏️", "🍓"];

export default function EmojiShower({ triggerCount, emojis = DEFAULT_EMOJIS }: EmojiShowerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle resizing
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Animation Loop
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const particles = particlesRef.current;

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.18; // Gravity
        p.vx *= 0.98; // Friction
        p.alpha -= p.decay;
        p.rotation += p.rotationSpeed;

        if (p.alpha <= 0 || p.y > canvas.height + p.size) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.font = `${p.size}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.emoji, 0, 0);
        ctx.restore();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Trigger explosion on count change (ignoring the initial 0 mount)
  useEffect(() => {
    if (triggerCount === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Spawn 35-45 particles from the lower-middle screen (ideal button/card location)
    const particleCount = 40;
    const startX = canvas.width / 2;
    const startY = canvas.height * 0.75; // near the copy button

    const newParticles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI * 0.6); // upward arc
      const speed = 7 + Math.random() * 12;

      newParticles.push({
        x: startX + (Math.random() - 0.5) * 60,
        y: startY + (Math.random() - 0.5) * 30,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
        size: 24 + Math.random() * 26, // size between 24px and 50px
        alpha: 1.0,
        decay: 0.008 + Math.random() * 0.012, // fade out speed
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.15,
      });
    }

    particlesRef.current = [...particlesRef.current, ...newParticles];
  }, [triggerCount, emojis]);

  return (
    <canvas
      ref={canvasRef}
      id="emoji-canvas"
      className="fixed inset-0 pointer-events-none z-50 w-full h-full"
    />
  );
}
