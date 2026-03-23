

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Gavel,
  Users2,
  Settings,
  Database,
  Briefcase,
  FileSearch,
  BookOpen,
  DollarSign,
  BarChart,
  Lock,
  Workflow,
  Building,
  Shield // Added Shield icon for Compliance Engine
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const navGroups = [
  {
    label: "Project Management",
    items: [
      { title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard },
      { title: "Projects & Disputes", url: createPageUrl("Projects"), icon: Briefcase },
      { title: "Stakeholders", url: createPageUrl("Stakeholders"), icon: Users },
      { title: "Calendar", url: createPageUrl("Calendar"), icon: Calendar },
    ],
  },
  {
    label: "Intelligence Suite",
    items: [
      { title: "Contract Hub", url: createPageUrl("Contracts"), icon: FileSearch },
      { title: "Dispute Desk", url: createPageUrl("DisputeDesk"), icon: Gavel },
      { title: "Evidence Engine", url: createPageUrl("EvidenceEngine"), icon: Database },
      { title: "Knowledge Navigator", url: createPageUrl("Knowledge"), icon: BookOpen },
    ],
  },
  {
    label: "Advanced Tools",
    items: [
      { title: "Payment & Claims", url: createPageUrl("Payments"), icon: DollarSign },
      { title: "Predictive Analytics", url: createPageUrl("Analytics"), icon: BarChart },
      { title: "Collaborative Room", url: createPageUrl("CollaborativeRoom"), icon: Users2 },
      { title: "Compliance Engine", url: createPageUrl("ComplianceEngine"), icon: Shield },
    ],
  },
  {
    label: "Automation",
    items: [
      { title: "Workflow Automation", url: createPageUrl("WorkflowAutomation"), icon: Workflow },
      { title: "Prompt & Workflow Vault", url: createPageUrl("WorkflowVault"), icon: Workflow },
    ],
  },
  {
    label: "Administration",
    items: [
      { title: "Team Management", url: createPageUrl("Team"), icon: Users2 },
      { title: "Security & Permissions", url: createPageUrl("Security"), icon: Lock },
      { title: "Settings", url: createPageUrl("Settings"), icon: Settings },
    ],
  },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();

  const isActiveNavItem = (itemUrl) => {
    try {
      const urlPath = itemUrl.startsWith('/') ? itemUrl : '/' + itemUrl;
      const pathWithoutParams = urlPath.split('?')[0];
      return location.pathname === pathWithoutParams;
    } catch (error) {
      console.error('Error checking active nav item:', error);
      return false;
    }
  };

  return (
    <SidebarProvider>
      <style>
        {`
          :root {
            --primary-blue: #2563eb;
            --primary-slate: #475569;
            --primary-emerald: #059669;
            --primary-amber: #d97706;
            --primary-red: #dc2626;
            --primary-purple: #7c3aed;
            
            --bg-primary: #ffffff;
            --bg-secondary: #f8fafc;
            --bg-tertiary: #f1f5f9;
            --bg-quaternary: #e2e8f0;
            
            --text-primary: #0f172a;
            --text-secondary: #334155;
            --text-tertiary: #64748b;
            --text-quaternary: #94a3b8;
            
            --border-primary: #e2e8f0;
            --border-secondary: #cbd5e1;
            
            --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
            --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
            --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
            --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
            
            --radius: 6px;
            --radius-md: 8px;
            --radius-lg: 12px;
          }
          
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
          
          * {
            box-sizing: border-box;
          }
          
          html, body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: var(--bg-secondary);
            color: var(--text-primary);
            margin: 0;
            padding: 0;
            min-height: 100vh;
            font-weight: 400;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            line-height: 1.5;
          }
          
          #root {
            background: var(--bg-secondary);
            min-height: 100vh;
          }

          /* === CARDS === */
          .professional-card {
            background: var(--bg-primary);
            border: 1px solid var(--border-primary);
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-sm);
            transition: all 0.2s ease;
          }
          
          .professional-card:hover {
            border-color: var(--border-secondary);
            box-shadow: var(--shadow);
          }
          
          .professional-card-elevated {
            background: var(--bg-primary);
            border: 1px solid var(--border-primary);
            border-radius: var(--radius-md);
            box-shadow: var(--shadow);
          }

          /* === BUTTONS === */
          .btn-primary {
            background: var(--primary-blue);
            color: white;
            border: none;
            border-radius: var(--radius);
            padding: 8px 16px;
            font-weight: 500;
            font-size: 14px;
            transition: all 0.2s ease;
            box-shadow: var(--shadow-sm);
          }
          .btn-primary:hover {
            background: #1d4ed8;
            box-shadow: var(--shadow);
          }
          
          .btn-secondary {
            background: var(--bg-primary);
            border: 1px solid var(--border-secondary);
            color: var(--text-secondary);
            border-radius: var(--radius);
            padding: 8px 16px;
            font-weight: 500;
            font-size: 14px;
            transition: all 0.2s ease;
          }
          .btn-secondary:hover {
            background: var(--bg-tertiary);
            border-color: var(--primary-blue);
            color: var(--primary-blue);
          }

          /* === INPUTS === */
          .input-field, .textarea-field, .select-field {
            background: var(--bg-primary);
            border: 1px solid var(--border-primary);
            color: var(--text-primary);
            border-radius: var(--radius);
            padding: 8px 12px;
            font-size: 14px;
            font-weight: 400;
            transition: all 0.2s ease;
          }
          .input-field::placeholder, .textarea-field::placeholder {
            color: var(--text-quaternary);
            font-weight: 400;
          }
          .input-field:focus, .textarea-field:focus, .select-field:focus {
            border-color: var(--primary-blue);
            box-shadow: 0 0 0 3px rgb(37 99 235 / 0.1);
            outline: none;
          }
          
          /* === SIDEBAR === */
          .sidebar-professional {
            background: var(--bg-primary);
            border-right: 1px solid var(--border-primary);
            box-shadow: var(--shadow-sm);
          }
          
          .nav-item-professional {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 16px;
            margin: 2px 8px;
            border-radius: var(--radius);
            color: var(--text-secondary);
            text-decoration: none;
            font-weight: 500;
            font-size: 14px;
            transition: all 0.2s ease;
          }
          
          .nav-item-professional:hover {
            background: var(--bg-tertiary);
            color: var(--text-primary);
          }
          
          .nav-item-professional.active {
            background: var(--primary-blue);
            color: white;
            box-shadow: var(--shadow-sm);
          }
          
          /* === TYPOGRAPHY === */
          .title-primary {
            font-weight: 700;
            font-size: 32px;
            color: var(--text-primary);
            line-height: 1.25;
            letter-spacing: -0.025em;
          }
          
          .title-secondary {
            font-weight: 600;
            font-size: 24px;
            color: var(--text-primary);
            line-height: 1.25;
          }
          
          .subtitle {
            font-weight: 500;
            font-size: 16px;
            color: var(--text-secondary);
            line-height: 1.5;
          }
          
          .body-text {
            font-weight: 400;
            font-size: 14px;
            color: var(--text-secondary);
            line-height: 1.5;
          }
          
          .caption {
            font-weight: 400;
            font-size: 12px;
            color: var(--text-tertiary);
            line-height: 1.4;
          }
          
          /* === BADGES === */
          .badge-primary {
            background: #dbeafe;
            color: var(--primary-blue);
            border: 1px solid #bfdbfe;
            padding: 2px 8px;
            border-radius: var(--radius);
            font-size: 12px;
            font-weight: 500;
          }
          
          .badge-success {
            background: #dcfce7;
            color: var(--primary-emerald);
            border: 1px solid #bbf7d0;
            padding: 2px 8px;
            border-radius: var(--radius);
            font-size: 12px;
            font-weight: 500;
          }
          
          .badge-warning {
            background: #fef3c7;
            color: var(--primary-amber);
            border: 1px solid #fde68a;
            padding: 2px 8px;
            border-radius: var(--radius);
            font-size: 12px;
            font-weight: 500;
          }
          
          .badge-danger {
            background: #fecaca;
            color: var(--primary-red);
            border: 1px solid #fca5a5;
            padding: 2px 8px;
            border-radius: var(--radius);
            font-size: 12px;
            font-weight: 500;
          }
          
          /* === SIDEBAR GROUP LABELS === */
          .sidebar-group-label {
            color: var(--text-tertiary);
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            margin: 16px 16px 8px 16px;
          }
          
          /* === ANIMATIONS === */
          .fade-in {
            animation: fadeIn 0.3s ease-out;
            animation-fill-mode: forwards;
          }
          
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
      
      <div className="min-h-screen flex w-full">
        <Sidebar className="sidebar-professional" data-sidebar>
          <SidebarHeader className="border-b border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center">
                <Building className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-base text-gray-900">Nometria</h2>
                <p className="text-xs text-gray-500 -mt-1">Construction</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-2">
            {navGroups.map((group, index) => (
              <SidebarGroup key={index} className="mb-2">
                <SidebarGroupLabel className="sidebar-group-label">
                  {group.label}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.title} asChild>
                        <Link
                          to={item.url}
                          className={`nav-item-professional ${
                            isActiveNavItem(item.url) ? "active" : ""
                          }`}
                        >
                          <item.icon className="w-4 h-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>

          <SidebarFooter className="border-t border-gray-200 p-4">
            <div className="professional-card p-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 font-semibold text-sm">N</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">Nometria Construction</p>
                  <p className="text-xs text-gray-500">Intelligence Platform</p>
                </div>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col min-w-0">
          <header className="bg-white border-b border-gray-200 px-6 py-3 md:hidden">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="btn-secondary p-2 rounded-md" />
              <h1 className="text-lg font-semibold text-gray-900">Nometria</h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto fade-in">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

