import { useEffect, useRef, useState } from 'react';

const SCENES = ['hero', 'bares', 'freelas'];

export function useWallScene() {
  const [scene, setScene] = useState('hero');
  const heroRef = useRef(null);
  const baresRef = useRef(null);
  const freelasRef = useRef(null);
  const refs = { hero: heroRef, bares: baresRef, freelas: freelasRef };

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const next = visible?.target?.dataset?.scene;
        if (next && SCENES.includes(next)) {
          setScene(next);
        }
      },
      {
        threshold: [0.2, 0.45, 0.7],
        rootMargin: '-12% 0px -28% 0px',
      }
    );

    SCENES.forEach((id) => {
      const node = refs[id].current;
      if (node) io.observe(node);
    });

    return () => io.disconnect();
  }, []);

  return { scene, heroRef, baresRef, freelasRef };
}
