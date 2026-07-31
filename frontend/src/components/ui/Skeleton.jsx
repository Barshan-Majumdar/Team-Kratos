import React from 'react';

export const Skeleton = ({ className = '', style = {} }) => {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] rounded-lg ${className}`}
      style={style}
    />
  );
};

export const StatCardSkeleton = () => (
  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm animate-pulse flex flex-col justify-between">
    <div className="flex items-center justify-between mb-4">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-10 w-10 rounded-xl" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-3 w-32" />
    </div>
  </div>
);

export const TableSkeleton = ({ rows = 5, cols = 4 }) => (
  <div className="w-full bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-pulse">
    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
      <Skeleton className="h-5 w-36" />
      <Skeleton className="h-8 w-24 rounded-lg" />
    </div>
    <div className="p-4 space-y-4">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 py-2 border-b border-slate-50 last:border-0">
          <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className="h-4 w-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const CardSkeleton = () => (
  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm animate-pulse space-y-4">
    <div className="flex items-center gap-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
    <Skeleton className="h-16 w-full rounded-xl" />
    <div className="flex justify-between items-center pt-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-20 rounded-lg" />
    </div>
  </div>
);

export const ListSkeleton = ({ items = 4 }) => (
  <div className="space-y-3 animate-pulse">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="p-4 bg-white rounded-xl border border-slate-100 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    ))}
  </div>
);

export const ProfileSkeleton = () => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-pulse">
    <div className="h-32 bg-gradient-to-r from-indigo-100 to-slate-200" />
    <div className="p-6 relative pt-0">
      <div className="flex justify-between items-end -mt-12 mb-6">
        <Skeleton className="h-24 w-24 rounded-2xl border-4 border-white" />
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      </div>
    </div>
  </div>
);
