/* eslint-disable react/prop-types */
import { motion } from "framer-motion";

const VARIANT_STYLES = {
  teal: {
    bg: 'var(--sm-glass-teal)',
    color: 'var(--sm-teal)',
  },
  coral: {
    bg: 'var(--sm-glass-coral)',
    color: 'var(--sm-coral)',
  },
  gold: {
    bg: 'var(--sm-glass-gold)',
    color: 'var(--sm-gold)',
  },
  slate: {
    bg: 'var(--sm-surface-muted)',
    color: 'var(--sm-text-muted)',
  },
};

export default function StatsCard({ title, value, subtitle, icon: Icon, variant = "teal" }) {
  const style = VARIANT_STYLES[variant] || VARIANT_STYLES.teal;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-6 hover:shadow-md transition-shadow duration-300"
      style={{
        backgroundColor: 'var(--sm-control-bg)',
        border: '1px solid var(--sm-control-border)',
        boxShadow: 'var(--sm-shadow-card)',
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium tracking-wide uppercase" style={{ color: 'var(--sm-text-muted)' }}>{title}</p>
          <p className="text-3xl font-semibold mt-2" style={{ color: 'var(--sm-text-strong)' }}>{value}</p>
          {subtitle && (
            <p className="text-sm mt-1" style={{ color: 'var(--sm-text-placeholder)' }}>{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className="p-3 rounded-xl" style={{ backgroundColor: style.bg, color: style.color }}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </motion.div>
  );
}
