import { useMediaQuery } from '@/hooks/use-media-query';

export const useMobile = () => {
  return useMediaQuery("(max-width: 768px)");
};