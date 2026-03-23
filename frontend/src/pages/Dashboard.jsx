import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format, isToday, isTomorrow, parseISO, isThisWeek, isThisMonth } from "date-fns";
import { motion } from "framer-motion";
import { DollarSign, Calendar, Users, TrendingUp, Clock, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import StatsCard from "@/components/ui/StatsCard";

export default function Dashboard() {
  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list("-date", 100)
  });

  const { data: events = [] } = useQuery({
    queryKey: ["events"],
    queryFn: () => base44.entities.Event.list("-date", 100)
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list()
  });

  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const personalExpenses = expenses.filter(e => e.is_personal !== false).reduce((sum, e) => sum + (e.amount || 0), 0);
  const clientExpenses = expenses.filter(e => e.is_personal === false).reduce((sum, e) => sum + (e.amount || 0), 0);
  
  const upcomingEvents = events.filter(e => {
    if (e.status === "cancelled" || e.status === "completed") return false;
    const eventDate = parseISO(e.date);
    return eventDate >= new Date(new Date().setHours(0, 0, 0, 0));
  }).slice(0, 5);

  const recentExpenses = expenses.slice(0, 5);

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || "Unknown";
  };

  const formatEventDate = (dateStr) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "MMM d");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Overview of your expenses and events</p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Expenses"
            value={`$${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={DollarSign}
            color="emerald"
          />
          <StatsCard
            title="Personal Expenses"
            value={`$${personalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={TrendingUp}
            color="blue"
          />
          <StatsCard
            title="Client Expenses"
            value={`$${clientExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={Users}
            color="purple"
          />
          <StatsCard
            title="Upcoming Events"
            value={upcomingEvents.length}
            icon={Calendar}
            color="amber"
          />
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upcoming Events */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Upcoming Events</h2>
                <Link to={createPageUrl("Events")} className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                  View all
                </Link>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {upcomingEvents.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No upcoming events</p>
                </div>
              ) : (
                upcomingEvents.map((event) => (
                  <div key={event.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="bg-emerald-50 text-emerald-600 rounded-xl px-3 py-2 text-center min-w-[60px]">
                        <span className="text-sm font-semibold">{formatEventDate(event.date)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{event.title}</p>
                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                          {event.time && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {event.time}
                            </span>
                          )}
                          {event.location && (
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="w-3.5 h-3.5" />
                              {event.location}
                            </span>
                          )}
                        </div>
                        {!event.is_personal && event.client_id && (
                          <span className="inline-block mt-2 text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">
                            {getClientName(event.client_id)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>

          {/* Recent Expenses */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Recent Expenses</h2>
                <Link to={createPageUrl("Expenses")} className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                  View all
                </Link>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {recentExpenses.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No expenses yet</p>
                </div>
              ) : (
                recentExpenses.map((expense) => (
                  <div key={expense.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{expense.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-slate-400">
                            {format(parseISO(expense.date), "MMM d, yyyy")}
                          </span>
                          {expense.category && (
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize">
                              {expense.category.replace(/_/g, " ")}
                            </span>
                          )}
                          {!expense.is_personal && expense.client_id && (
                            <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">
                              {getClientName(expense.client_id)}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="font-semibold text-slate-900 ml-4">
                        {expense.currency || "$"}{expense.amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
