import { cn } from '@/lib/utils';

interface PixelArtSpriteProps {
  src: string;
  alt: string;
  size?: number;
  className?: string;
}

export function PixelArtSprite({ src, alt, size = 32, className }: PixelArtSpriteProps) {
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      className={cn('pixel-art select-none', className)}
      draggable={false}
    />
  );
}
