export default function Skeleton({ className = "" }) {
  return (
    <div className={`animate-pulse bg-[var(--surface-container-highest)] rounded-md ${className}`}></div>
  );
}

export function SkeletonText({ lines = 3, className = "" }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div 
          key={i} 
          className={`h-4 bg-[var(--surface-container-highest)] rounded-md ${i === lines - 1 ? 'w-4/5' : 'w-full'}`}
        ></div>
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "" }) {
  return (
    <div className={`p-4 border border-[var(--outline-variant)] rounded-xl shadow-sm bg-[var(--surface-container-lowest)] ${className}`}>
      <div className="flex gap-4 items-center mb-4">
        <Skeleton className="w-12 h-12 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}
