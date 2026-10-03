import { ImageResponse } from 'next/og';
import { TruckMark } from '@/components/TruckMark';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return [{ size: '192' }, { size: '512' }];
}

// App icons for the install manifest. Full-bleed background keeps them maskable-safe.
export async function GET(_request, { params }) {
  const { size } = await params;
  const px = size === '512' ? 512 : 192;
  return new ImageResponse(<TruckMark size={px} />, { width: px, height: px });
}
