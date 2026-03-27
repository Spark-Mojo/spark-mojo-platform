import { RefreshCw } from 'lucide-react';

export default function SyncPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <RefreshCw className="w-12 h-12 mb-4" style={{ color: 'var(--color-primary)' }} />
      <h2 className="text-xl font-semibold mb-2" style={{ color: '#34424A' }}>SP Sync</h2>
      <p className="text-sm" style={{ color: '#64748b' }}>Coming Soon</p>
    </div>
  );
}
