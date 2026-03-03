import { useEffect, useState } from 'react';
import { getStats } from '../api';
import useDocTitle from '../hooks/useDocTitle';

function DonutChart({ containers, items }) {
  const total = containers + items;
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-500 text-sm">
        No data
      </div>
    );
  }

  const containerPct = containers / total;
  const itemPct = items / total;

  // SVG donut via stroke-dasharray
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const containerArc = containerPct * circumference;
  const itemArc = itemPct * circumference;

  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox="0 0 160 160" className="w-48 h-48">
        {/* Items slice (background full circle) */}
        <circle
          cx="80" cy="80" r={radius}
          fill="none"
          stroke="currentColor"
          className="text-blue-400 dark:text-blue-500"
          strokeWidth="24"
        />
        {/* Containers slice */}
        <circle
          cx="80" cy="80" r={radius}
          fill="none"
          stroke="currentColor"
          className="text-indigo-500 dark:text-indigo-400"
          strokeWidth="24"
          strokeDasharray={`${containerArc} ${circumference - containerArc}`}
          strokeDashoffset={circumference * 0.25}
          strokeLinecap="butt"
        />
        {/* Center label */}
        <text x="80" y="76" textAnchor="middle" className="fill-gray-700 dark:fill-gray-200 text-lg font-bold" fontSize="20">
          {total}
        </text>
        <text x="80" y="94" textAnchor="middle" className="fill-gray-400 dark:fill-gray-500" fontSize="11">
          total
        </text>
      </svg>
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-indigo-500 dark:bg-indigo-400 inline-block" />
          <span className="text-gray-700 dark:text-gray-300">Containers ({containers})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-400 dark:bg-blue-500 inline-block" />
          <span className="text-gray-700 dark:text-gray-300">Items ({items})</span>
        </div>
      </div>
    </div>
  );
}

export default function StatsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  useDocTitle('Stats');

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-center text-gray-400 mt-12">Loading stats…</p>;
  }

  if (!stats) {
    return <p className="text-center text-gray-400 mt-12">Failed to load stats.</p>;
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Stats</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Containers" value={stats.containers} />
        <StatCard label="Items" value={stats.items} />
      </div>

      {/* Donut */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Containers vs Items</h2>
        <DonutChart containers={stats.containers} items={stats.items} />
      </div>

      {/* Additional stats */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow divide-y divide-gray-100 dark:divide-gray-700">
        <StatRow label="Avg items per container" value={stats.avg_items_per_container} />
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <span className="text-gray-600 dark:text-gray-400">Depth</span>
          <span
            className="font-semibold text-gray-800 dark:text-gray-100 cursor-default"
            title="min / average / max"
          >
            {stats.min_depth} / {stats.avg_depth} / {stats.max_depth}
          </span>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 text-center">
      <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
    </div>
  );
}

function StatRow({ label, value }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <span className="text-gray-600 dark:text-gray-400">{label}</span>
      <span className="font-semibold text-gray-800 dark:text-gray-100">{value}</span>
    </div>
  );
}
