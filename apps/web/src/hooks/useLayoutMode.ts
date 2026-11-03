import { useMediaQuery } from '@/hooks/useMediaQuery';

export type LayoutMode = 'expanded' | 'drawer';

/**
 * En escritorio la barra vive plegada como una franja y se despliega al pasar el
 * cursor o al llegar con el teclado. En tableta y móvil se usa un cajón off-canvas.
 */
export function useLayoutMode(): LayoutMode {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  return isDesktop ? 'expanded' : 'drawer';
}
