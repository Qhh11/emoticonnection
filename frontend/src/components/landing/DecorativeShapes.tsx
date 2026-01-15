import { useEffect, useState, useRef } from 'react'
import Bluey from '../../assets/2d/Bluey.png'
import Blushy from '../../assets/2d/Blushy.png'
import Grumpy from '../../assets/2d/Grumpy.png'
import Scaredy from '../../assets/2d/Scaredy.png'
import Snoozy from '../../assets/2d/Snoozy.png'
import Sparkle from '../../assets/2d/Sparkle.png'
import Sunny from '../../assets/2d/Sunny.png'
import Yucky from '../../assets/2d/Yucky.png'
import Zippy from '../../assets/2d/Zippy.png'

interface CharacterDecoration {
  src: string
  name: string
  x: number
  y: number
  factor: number
  size: number
  rotate: number
  opacity: number
}

export default function DecorativeShapes() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const [characters] = useState<CharacterDecoration[]>([
// 左侧阵营：在 10-25 之间散开，确保不遮挡 "Connect" 开头的字母
    { src: Bluey, name: 'Bluey', x: 20, y: 10, factor: 0.025, size: 210, rotate: -12, opacity: 0.65 },
    { src: Sparkle, name: 'Sparkle', x: 18, y: 65, factor: 0.02, size: 250, rotate: -8, opacity: 0.68 },
    { src: Snoozy, name: 'Snoozy', x: 6, y: 45, factor: 0.028, size: 200, rotate: 8, opacity: 0.62 },
    
    // 中轴阵营：稍微拉开纵向距离，作为视觉延伸
    { src: Blushy, name: 'Blushy', x: 40, y: 20, factor: 0.015, size: 190, rotate: 5, opacity: 0.6 },
    { src: Zippy, name: 'Zippy', x: 41, y: 60, factor: 0.022, size: 220, rotate: 12, opacity: 0.68 },

    // 右侧阵营：在 75-88 之间分布，环绕聊天卡片的右侧
    { src: Sunny, name: 'Sunny', x: 82, y: 22, factor: 0.035, size: 230, rotate: 10, opacity: 0.7 },
    { src: Grumpy, name: 'Grumpy', x: 78, y: 68, factor: 0.03, size: 220, rotate: 15, opacity: 0.65 },
    { src: Scaredy, name: 'Scaredy', x: 50, y: 70, factor: 0.04, size: 210, rotate: -15, opacity: 0.65 },
    { src: Yucky, name: 'Yucky', x: 85, y: 45, factor: 0.032, size: 190, rotate: -10, opacity: 0.6 },
  ]);
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
      const y = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
      setMousePosition({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const renderCharacter = (character: CharacterDecoration) => {
    const style = {
      left: `${character.x}%`,
      top: `${character.y}%`,
      transform: `translate(${mousePosition.x * character.factor * 1000}px, ${mousePosition.y * character.factor * 1000}px) rotate(${character.rotate + (mousePosition.x * 25)}deg)`,
      opacity: character.opacity,
      width: `${character.size}px`,
      height: `${character.size}px`,
    };

    return (
      <img
        key={character.name}
        src={character.src}
        alt={character.name}
        className="absolute transition-transform duration-700 ease-out select-none pointer-events-none drop-shadow-xl"
        style={style}
        draggable={false}
      />
    );
  };

  return (
    <div
      ref={containerRef}
      className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden select-none -z-0"
    >
      {characters.map(character => renderCharacter(character))}

      {/* Subtle background lines */}
      <svg className="absolute w-full h-full opacity-[0.04]" viewBox="0 0 1000 1000">
        <path d="M0 200 C 300 100 700 300 1000 200" fill="none" stroke="black" strokeWidth="2" strokeDasharray="10,10" />
        <path d="M0 800 C 400 900 600 700 1000 800" fill="none" stroke="black" strokeWidth="2" strokeDasharray="10,10" />
        <path d="M300 0 Q 500 500 300 1000" fill="none" stroke="black" strokeWidth="2" strokeDasharray="10,10" />
      </svg>
    </div>
  )
}
