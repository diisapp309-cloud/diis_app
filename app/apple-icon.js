import { ImageResponse } from 'next/og';
import { TruckMark } from '@/components/TruckMark';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(<TruckMark size={180} />, size);
}
