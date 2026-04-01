/* eslint-disable react/prop-types */
import React, { useState } from 'react';
import { BarChart2, TrendingUp, Users, DollarSign, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import MojoHeader from '@/components/mojo-patterns/MojoHeader';
import StatsCardRow from '@/components/mojo-patterns/StatsCardRow';
import FilterTabBar from '@/components/mojo-patterns/FilterTabBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// ---------------------------------------------------------------------------
// Color palette
// ---------------------------------------------------------------------------
const TEAL = '#0D9488';
const CORAL = '#F97066';
const GOLD = '#F59E0B';
const BLUE = '#3B82F6';
const PURPLE = '#8B5CF6';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const revenueWeekly = [
  { week: 'W1', revenue: 18200 },
  { week: 'W2', revenue: 19500 },
  { week: 'W3', revenue: 17800 },
  { week: 'W4', revenue: 21400 },
  { week: 'W5', revenue: 22100 },
  { week: 'W6', revenue: 20300 },
  { week: 'W7', revenue: 23800 },
  { week: 'W8', revenue: 24600 },
  { week: 'W9', revenue: 22900 },
  { week: 'W10', revenue: 25100 },
  { week: 'W11', revenue: 26400 },
  { week: 'W12', revenue: 27800 },
];

const sessionsByProvider = [
  { provider: 'Dr. Chen', sessions: 64 },
  { provider: 'Dr. Patel', sessions: 52 },
  { provider: 'Dr. Adams', sessions: 48 },
  { provider: 'Dr. Rivera', sessions: 41 },
  { provider: 'Dr. Kim', sessions: 37 },
];

const retentionData = [
  { month: 'Oct', rate: 82 },
  { month: 'Nov', rate: 84 },
  { month: 'Dec', rate: 81 },
  { month: 'Jan', rate: 86 },
  { month: 'Feb', rate: 88 },
  { month: 'Mar', rate: 91 },
];

const revenueByPayer = [
  { name: 'Commercial', value: 42 },
  { name: 'Medicare', value: 24 },
  { name: 'Medicaid', value: 18 },
  { name: 'Self-Pay', value: 10 },
  { name: 'Other', value: 6 },
];

const PIE_COLORS = [TEAL, CORAL, GOLD, BLUE, PURPLE];

const DATE_RANGE_TABS = [
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'quarter', label: 'This Quarter' },
  { key: 'custom', label: 'Custom' },
];

// ---------------------------------------------------------------------------
// Glass card wrapper
// ---------------------------------------------------------------------------
function GlassCard({ children, className }) {
  return (
    <Card
      className={cn('backdrop-blur-md border shadow-sm', className)}
      style={{
        background: 'var(--sm-glass-bg, rgba(255,255,255,0.70))',
        borderColor: 'var(--sm-glass-border, rgba(255,255,255,0.30))',
      }}
    >
      {children}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Currency formatter
// ---------------------------------------------------------------------------
const usd = (v) =>
  `$${Number(v).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function InsightsMojo() {
  const [dateRange, setDateRange] = useState('month');

  // --- API placeholders -------------------------------------------------
  // Future: fetch from /api/modules/insights/revenue, /sessions, /clients, /retention
  // For POC all data is mocked above.

  const statsCards = [
    {
      label: 'Revenue This Month',
      value: '$27,800',
      icon: <DollarSign className="w-5 h-5" />,
      color: 'teal',
    },
    {
      label: 'Sessions Completed',
      value: '242',
      icon: <Calendar className="w-5 h-5" />,
      color: 'primary',
    },
    {
      label: 'New Clients',
      value: '18',
      icon: <Users className="w-5 h-5" />,
      color: 'gold',
    },
    {
      label: 'Retention Rate',
      value: '91%',
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'green',
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--sm-bg, #f8fafc)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* ---------- Header ---------- */}
        <MojoHeader
          icon={<BarChart2 className="w-6 h-6" />}
          title="Insights"
          subtitle="Practice performance at a glance"
        />

        {/* ---------- Date range selector ---------- */}
        <FilterTabBar
          tabs={DATE_RANGE_TABS}
          activeTab={dateRange}
          onTabChange={setDateRange}
        />

        {/* ---------- Stats row ---------- */}
        <StatsCardRow cards={statsCards} />

        {/* ---------- Row 1: Revenue Trend + Sessions by Provider ---------- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend — Area Chart */}
          <GlassCard>
            <CardHeader className="pb-2">
              <CardTitle
                className="text-base font-semibold"
                style={{ fontFamily: 'var(--sm-font-display)', color: 'var(--sm-slate)' }}
              >
                Revenue Trend (12 Weeks)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueWeekly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="tealGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={TEAL} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={TEAL} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="week"
                      tick={{ fontSize: 12, fontFamily: 'var(--sm-font-ui)' }}
                      stroke="#94a3b8"
                    />
                    <YAxis
                      tickFormatter={usd}
                      tick={{ fontSize: 12, fontFamily: 'var(--sm-font-ui)' }}
                      stroke="#94a3b8"
                    />
                    <Tooltip
                      formatter={(value) => [usd(value), 'Revenue']}
                      contentStyle={{
                        borderRadius: 8,
                        border: '1px solid var(--sm-glass-border)',
                        backdropFilter: 'blur(8px)',
                        background: 'rgba(255,255,255,0.85)',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke={TEAL}
                      strokeWidth={2}
                      fill="url(#tealGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </GlassCard>

          {/* Sessions by Provider — Bar Chart */}
          <GlassCard>
            <CardHeader className="pb-2">
              <CardTitle
                className="text-base font-semibold"
                style={{ fontFamily: 'var(--sm-font-display)', color: 'var(--sm-slate)' }}
              >
                Sessions by Provider
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sessionsByProvider} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="provider"
                      tick={{ fontSize: 11, fontFamily: 'var(--sm-font-ui)' }}
                      stroke="#94a3b8"
                    />
                    <YAxis
                      tick={{ fontSize: 12, fontFamily: 'var(--sm-font-ui)' }}
                      stroke="#94a3b8"
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: '1px solid var(--sm-glass-border)',
                        background: 'rgba(255,255,255,0.85)',
                      }}
                    />
                    <Bar dataKey="sessions" fill={BLUE} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </GlassCard>
        </div>

        {/* ---------- Row 2: Client Retention + Revenue by Payer ---------- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Client Retention — Line Chart */}
          <GlassCard>
            <CardHeader className="pb-2">
              <CardTitle
                className="text-base font-semibold"
                style={{ fontFamily: 'var(--sm-font-display)', color: 'var(--sm-slate)' }}
              >
                Client Retention
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={retentionData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12, fontFamily: 'var(--sm-font-ui)' }}
                      stroke="#94a3b8"
                    />
                    <YAxis
                      domain={[70, 100]}
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fontSize: 12, fontFamily: 'var(--sm-font-ui)' }}
                      stroke="#94a3b8"
                    />
                    <Tooltip
                      formatter={(value) => [`${value}%`, 'Retention']}
                      contentStyle={{
                        borderRadius: 8,
                        border: '1px solid var(--sm-glass-border)',
                        background: 'rgba(255,255,255,0.85)',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="rate"
                      stroke={PURPLE}
                      strokeWidth={2}
                      dot={{ fill: PURPLE, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </GlassCard>

          {/* Revenue by Payer — Pie Chart */}
          <GlassCard>
            <CardHeader className="pb-2">
              <CardTitle
                className="text-base font-semibold"
                style={{ fontFamily: 'var(--sm-font-display)', color: 'var(--sm-slate)' }}
              >
                Revenue by Payer Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={revenueByPayer}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {revenueByPayer.map((entry, index) => (
                        <Cell
                          key={`cell-${entry.name}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`${value}%`, 'Share']}
                      contentStyle={{
                        borderRadius: 8,
                        border: '1px solid var(--sm-glass-border)',
                        background: 'rgba(255,255,255,0.85)',
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      wrapperStyle={{ fontSize: 12, fontFamily: 'var(--sm-font-ui)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
