import { OrbitingLoader } from './OrbitingLoader';

export const StageSkeleton = () => (
  <div className="w-full h-[60vh] flex items-center justify-center">
    <OrbitingLoader size="small" showText={false} />
  </div>
);
