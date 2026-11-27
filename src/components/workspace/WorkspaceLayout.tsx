import { useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Info,
  Menu,
  RotateCcw,
  Settings,
  ShieldCheck,
  Sliders,
  Trash2,
  X,
} from 'lucide-react';
import { triggerLocalDownload, formatBytes } from '../../utils/download';
import { useRouter, type AppRoute } from '../../hooks/useRouter';
import { useSanitizerStore } from '../../hooks/useSanitizerStore';
import { ClyroLogo } from '../shared/ClyroLogo';

type NavItem = {
  route: AppRoute;
  label: string;
  icon: typeof ShieldCheck;
  badge?: string;
};

const WORKSPACE_ITEMS: NavItem[] = [
  { route: '/app', label: 'Sanitizer', icon: ShieldCheck },
  { route: '/app/handover', label: 'Safe Handover', icon: Sliders },
  { route: '/app/audit', label: 'Privacy Audit', icon: FileText },
];

const RESOURCE_ITEMS: NavItem[] = [
  { route: '/app/how-it-works', label: 'How It Works', icon: Info },
  { route: '/app/privacy', label: 'Privacy Guide', icon: BookOpen },
  { route: '/app/settings', label: 'Settings', icon: Settings },
];

const ROUTE_TITLES: Record<AppRoute, string> = {
  '/': 'Clyro',
  '/app': 'Data Sanitizer',
  '/app/handover': 'Safe Handover',
  '/app/audit': 'Privacy Audit',
  '/app/how-it-works': 'How It Works',
  '/app/privacy': 'Privacy Guide',
  '/app/settings': 'Settings',
};

export function WorkspaceLayout({ children }: { children: ReactNode }) {
  const { route, navigate } = useRouter();
  const {
    format,
    localFileBytes,
    input,
    canExport,
    isProcessing,
    result,
    recipientScope,
    resetSession,
    announcement,
  } = useSanitizerStore();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const exportFilename =
    format === 'csv'
      ? recipientScope !== 'default'
        ? `clyro-handover-${recipientScope}.csv`
        : 'clyro-sanitized.csv'
      : 'clyro-sanitized.txt';

  const handleQuickExport = () => {
    if (!canExport) return;
    const mime = format === 'csv' ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8';
    triggerLocalDownload(result.sanitizedOutput, exportFilename, mime);
  };

  const renderNavSection = (title: string, items: NavItem[]) => (
    <div className="space-y-1">
      {!collapsed && (
        <div className="px-3 pb-1 text-[11px] font-medium tracking-[0.08em] text-[#737373] uppercase">
          {title}
        </div>
      )}
      {items.map((item) => {
        const Icon = item.icon;
        const active = route === item.route;
        return (
          <button
            key={item.route}
            type="button"
            onClick={() => {
              navigate(item.route);
              setMobileMenuOpen(false);
            }}
            aria-current={active ? 'page' : undefined}
            title={collapsed ? item.label : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-colors cursor-pointer ${
              active
                ? 'bg-[#191B1D] text-[#F5F5F5] border border-[#26282A]'
                : 'text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#111315] border border-transparent'
            }`}
          >
            <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#A8E6CF]' : 'text-[#737373]'}`} />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-[#F5F5F5] flex">
      {/* Screen reader status announcer */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      {/* Desktop Sidebar */}
      <aside
        aria-label="Workspace navigation"
        className={`hidden md:flex flex-col shrink-0 border-r border-[#1B1D1F] bg-[#0C0D0E] transition-all duration-200 ${
          collapsed ? 'w-[68px]' : 'w-[240px]'
        }`}
      >
        <div className="h-14 px-3.5 flex items-center justify-between border-b border-[#1B1D1F]">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-left focus-visible:outline-none cursor-pointer"
            aria-label="Clyro Home"
          >
            <ClyroLogo compact={collapsed} />
          </button>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1.5 rounded-md text-[#737373] hover:text-[#F5F5F5] hover:bg-[#191B1D] transition-colors cursor-pointer"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex-1 px-2.5 py-5 space-y-6 overflow-y-auto clyro-scroll">
          {renderNavSection('Workspace', WORKSPACE_ITEMS)}
          {renderNavSection('Resources', RESOURCE_ITEMS)}
        </div>

        <div className="p-2.5 border-t border-[#1B1D1F] space-y-1.5">
          <div
            className={`flex items-center gap-2.5 px-3 py-2 rounded-md bg-[#111315] border border-[#1B1D1F] ${
              collapsed ? 'justify-center px-0' : ''
            }`}
            title="100% Client-Side Local Processing"
          >
            <span className="w-2 h-2 rounded-full bg-[#6DD6A4] shrink-0" aria-hidden="true" />
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-[11px] font-medium text-[#F5F5F5] truncate">
                  Browser-Only Engine
                </div>
                <div className="text-[10px] text-[#737373] truncate">
                  Zero record uploads
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={resetSession}
            title="Clear session memory"
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[12px] text-[#A3A3A3] hover:text-[#E87D85] hover:bg-[#111315] transition-colors cursor-pointer ${
              collapsed ? 'justify-center px-0' : ''
            }`}
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            {!collapsed && <span>Clear Session</span>}
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            title="Return to website"
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[12px] text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#111315] transition-colors cursor-pointer ${
              collapsed ? 'justify-center px-0' : ''
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
            {!collapsed && <span>Return to Website</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 w-[260px] max-w-[85vw] bg-[#0C0D0E] border-r border-[#26282A] flex flex-col h-full">
            <div className="h-14 px-4 flex items-center justify-between border-b border-[#1B1D1F]">
              <ClyroLogo />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="p-1.5 rounded-md text-[#A3A3A3] hover:text-[#F5F5F5]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 p-3 space-y-6 overflow-y-auto">
              {renderNavSection('Workspace', WORKSPACE_ITEMS)}
              {renderNavSection('Resources', RESOURCE_ITEMS)}
            </div>
            <div className="p-3 border-t border-[#1B1D1F] space-y-2">
              <button
                type="button"
                onClick={() => {
                  resetSession();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] text-[#E87D85] hover:bg-[#111315]"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear Session</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  navigate('/');
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] text-[#A3A3A3] hover:bg-[#111315]"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Website</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Compact Top Bar */}
        <header className="h-14 px-4 sm:px-6 border-b border-[#1B1D1F] bg-[#050505]/95 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open workspace navigation"
              className="md:hidden p-1.5 -ml-1.5 rounded-md text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#111315]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-[14px] font-medium text-[#F5F5F5] truncate">
                {ROUTE_TITLES[route]}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#111315] border border-[#26282A] text-[#A8E6CF]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6DD6A4]" aria-hidden="true" />
                {isProcessing ? 'Processing locally…' : 'Local In-Memory'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0C0D0E] border border-[#1B1D1F] text-[12px] font-mono text-[#A3A3A3]">
              {format === 'csv' ? (
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#A8E6CF]" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-[#A3A3A3]" />
              )}
              <span>{format.toUpperCase()}</span>
              {input.length > 0 && (
                <>
                  <span className="text-[#26282A]">•</span>
                  <span>{formatBytes(localFileBytes)}</span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={resetSession}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-medium border border-[#26282A] bg-[#0C0D0E] text-[#A3A3A3] hover:text-[#F5F5F5] hover:border-[#3A3D40] transition-colors cursor-pointer"
              title="Reset input, output, mappings, and worker state"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>

            <button
              type="button"
              onClick={handleQuickExport}
              disabled={!canExport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium bg-[#F5F5F5] text-[#050505] hover:bg-[#A8E6CF] disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
              title={canExport ? `Download ${exportFilename}` : 'Provide valid input before exporting'}
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </header>

        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
