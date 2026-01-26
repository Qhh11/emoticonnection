/**
 * TiltedCard - 3D 倾斜卡片组件
 * 鼠标悬停时有 3D 倾斜 + 缩放动画
 * 支持图片或渐变背景
 */

import type { SpringOptions } from 'motion/react';
import { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';
import './TiltedCard.css';

// SVG 滤镜定义组件 - 油画感效果
function SvgFilters() {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0 }}>
      <defs>
        {/* 油画感滤镜 - 使用位移扭曲 */}
        <filter id="oilPaintFilter" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence
            type="turbulence"
            baseFrequency="0.01 0.01"
            numOctaves="2"
            result="turbulence"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="turbulence"
            scale="15"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}

interface TiltedCardProps {
  imageSrc?: string;
  gradientBg?: string;  // 渐变背景，当无图片时使用
  backgroundSize?: string;  // 背景尺寸，用于点点纹理
  backgroundPosition?: string;  // 背景位置，用于图片裁剪
  useGlassmorphism?: boolean;  // 是否使用毛玻璃效果
  glassmorphismColor?: string; // 毛玻璃颜色，默认白色
  blurContent?: boolean;  // 是否模糊背景/图片内容
  blurAmount?: number;    // 模糊程度，默认 8
  showGrain?: boolean;    // 是否显示噪点纹理
  showBorder?: boolean;   // 是否显示清晰边框
  showOilPaint?: boolean; // 是否显示油画感效果
  altText?: string;
  captionText?: string;
  containerHeight?: React.CSSProperties['height'];
  containerWidth?: React.CSSProperties['width'];
  imageHeight?: React.CSSProperties['height'];
  imageWidth?: React.CSSProperties['width'];
  scaleOnHover?: number;
  rotateAmplitude?: number;
  showMobileWarning?: boolean;
  showTooltip?: boolean;
  overlayContent?: React.ReactNode;
  displayOverlayContent?: boolean;
  borderRadius?: number;
  onClick?: () => void;
}

const springValues: SpringOptions = {
  damping: 30,
  stiffness: 100,
  mass: 2
};

export default function TiltedCard({
  imageSrc,
  gradientBg,
  backgroundSize,
  backgroundPosition,
  useGlassmorphism = false,
  glassmorphismColor,
  blurContent = false,
  blurAmount = 8,
  showGrain = false,
  showBorder = false,
  showOilPaint = false,
  altText = 'Tilted card image',
  captionText = '',
  containerHeight = '100%',
  containerWidth = '100%',
  imageHeight = '100%',
  imageWidth = '100%',
  scaleOnHover = 1.05,
  rotateAmplitude = 12,
  showMobileWarning = false,
  showTooltip = true,
  overlayContent = null,
  displayOverlayContent = true,
  borderRadius = 15,
  onClick
}: TiltedCardProps) {
  const ref = useRef<HTMLElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useMotionValue(0), springValues);
  const rotateY = useSpring(useMotionValue(0), springValues);
  const scale = useSpring(1, springValues);
  const opacity = useSpring(0);
  const rotateFigcaption = useSpring(0, {
    stiffness: 350,
    damping: 30,
    mass: 1
  });

  const [lastY, setLastY] = useState<number>(0);

  function handleMouse(e: React.MouseEvent<HTMLElement>) {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - rect.width / 2;
    const offsetY = e.clientY - rect.top - rect.height / 2;

    const rotationX = (offsetY / (rect.height / 2)) * -rotateAmplitude;
    const rotationY = (offsetX / (rect.width / 2)) * rotateAmplitude;

    rotateX.set(rotationX);
    rotateY.set(rotationY);

    x.set(e.clientX - rect.left);
    y.set(e.clientY - rect.top);

    const velocityY = offsetY - lastY;
    rotateFigcaption.set(-velocityY * 0.6);
    setLastY(offsetY);
  }

  function handleMouseEnter() {
    scale.set(scaleOnHover);
    opacity.set(1);
  }

  function handleMouseLeave() {
    opacity.set(0);
    scale.set(1);
    rotateX.set(0);
    rotateY.set(0);
    rotateFigcaption.set(0);
  }

  return (
    <figure
      ref={ref}
      className="tilted-card-figure"
      style={{
        height: containerHeight,
        width: containerWidth
      }}
      onMouseMove={handleMouse}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      {/* SVG 滤镜定义 */}
      {showOilPaint && <SvgFilters />}

      {showMobileWarning && (
        <div className="tilted-card-mobile-alert">This effect is not optimized for mobile. Check on desktop.</div>
      )}

      <motion.div
        className="tilted-card-inner"
        style={{
          width: imageWidth,
          height: imageHeight,
          rotateX,
          rotateY,
          scale
        }}
      >
        {/* 图片或渐变背景 */}
        {imageSrc ? (
          <div
            style={{
              position: 'relative',
              width: imageWidth,
              height: imageHeight,
              borderRadius: `${borderRadius}px`,
              overflow: 'hidden',
            }}
          >
            <motion.img
              src={imageSrc}
              alt={altText}
              className="tilted-card-img"
              style={{
                width: '100%',
                height: '100%',
                borderRadius: `${borderRadius}px`,
                filter: [
                  blurContent ? `blur(${blurAmount}px)` : '',
                  showOilPaint ? 'url(#oilPaintFilter)' : ''
                ].filter(Boolean).join(' ') || 'none',
                transform: blurContent ? 'scale(1.15)' : 'none',
              }}
            />
          </div>
        ) : (
          <motion.div
            className="tilted-card-gradient-bg"
            style={{
              position: 'relative',
              width: imageWidth,
              height: imageHeight,
              borderRadius: `${borderRadius}px`,
              overflow: 'hidden',
            }}
          >
            {/* 高饱和度背景装饰层 */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: gradientBg || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundSize: backgroundSize || 'cover',
                backgroundPosition: backgroundPosition || 'center',
                filter: blurContent ? `blur(${blurAmount}px)` : 'none',
                transform: blurContent ? 'scale(1.1)' : 'none',
              }}
            />
            {/* 毛玻璃效果层 */}
            {useGlassmorphism && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: glassmorphismColor
                    ? `${glassmorphismColor}66`  // 添加 40% 透明度
                    : 'rgba(255, 255, 255, 0.4)',
                  backdropFilter: 'blur(40px)',
                  WebkitBackdropFilter: 'blur(40px)',
                }}
              />
            )}
          </motion.div>
        )}

        {/* 噪点纹理层 */}
        {showGrain && (
          <div
            className="tilted-card-grain-fallback"
            style={{ borderRadius: `${borderRadius}px` }}
          />
        )}

        {/* 光泽层 */}
        {showGrain && (
          <div
            className="tilted-card-sheen"
            style={{ borderRadius: `${borderRadius}px` }}
          />
        )}

        {/* 清晰边框层 */}
        {showBorder && (
          <div
            className="tilted-card-border"
            style={{ borderRadius: `${borderRadius}px` }}
          />
        )}

        {/* Overlay 内容 */}
        {displayOverlayContent && overlayContent && (
          <motion.div
            className="tilted-card-overlay"
            style={{ borderRadius: `${borderRadius}px` }}
          >
            {overlayContent}
          </motion.div>
        )}
      </motion.div>

      {/* Tooltip 跟随鼠标 */}
      {showTooltip && captionText && (
        <motion.figcaption
          className="tilted-card-caption"
          style={{
            x,
            y,
            opacity,
            rotate: rotateFigcaption
          }}
        >
          {captionText}
        </motion.figcaption>
      )}
    </figure>
  );
}
