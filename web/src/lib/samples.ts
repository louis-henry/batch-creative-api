import productLamp from '@/assets/imgs/product-lamp.jpg';
import productPhone from '@/assets/imgs/product-phone.jpg';
import productShampoo from '@/assets/imgs/product-shampoo.jpg';
import refForest from '@/assets/imgs/context-forest.jpg';
import refMars from '@/assets/imgs/context-mars.jpg';
import refSkytower from '@/assets/imgs/context-skytower.jpg';

export interface Sample {
  label: string;
  url: string;
}

export const SAMPLE_PRODUCTS: Sample[] = [
  { label: 'Lamp', url: productLamp },
  { label: 'Phone', url: productPhone },
  { label: 'Shampoo', url: productShampoo },
];

export const SAMPLE_REFS: Sample[] = [
  { label: 'Forest', url: refForest },
  { label: 'Mars', url: refMars },
  { label: 'Sky tower', url: refSkytower },
];

export async function loadSample(url: string): Promise<File> {
  const res = await fetch(url);
  const blob = await res.blob();
  const name = url.split('/').pop()?.split('?')[0] ?? 'sample.jpg';
  return new File([blob], name, { type: blob.type || 'image/jpeg' });
}
