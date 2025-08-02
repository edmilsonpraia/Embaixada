import { useLocation, NavLink } from 'react-router-dom';
import { 
  FileText, 
  Home, 
  MessageSquare, 
  HelpCircle, 
  Bell,
  Users,
  Settings,
  Shield,
  BarChart3,
  LogOut
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

// Student navigation items
const studentItems = [
  { title: 'Dashboard', url: '/', icon: Home },
  { title: 'Meus Documentos', url: '/documents', icon: FileText },
  { title: 'Mensagens', url: '/messages', icon: MessageSquare },
  { title: 'Anúncios', url: '/announcements', icon: Bell },
  { title: 'Suporte', url: '/support', icon: HelpCircle },
];

// Admin/Officer navigation items
const adminItems = [
  { title: 'Dashboard', url: '/admin', icon: Home },
  { title: 'Usuários', url: '/admin/users', icon: Users },
  { title: 'Documentos', url: '/admin/documents', icon: FileText },
  { title: 'Mensagens', url: '/admin/messages', icon: MessageSquare },
  { title: 'Anúncios', url: '/admin/announcements', icon: Bell },
  { title: 'Suporte', url: '/admin/support', icon: HelpCircle },
  { title: 'Relatórios', url: '/admin/reports', icon: BarChart3 },
  { title: 'Configurações', url: '/admin/settings', icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, signOut, userRole } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;

  const isAdmin = userRole === 'admin' || userRole === 'officer';
  
  const navigationItems = isAdmin ? adminItems : studentItems;
  
  const isActive = (path: string) => {
    if (path === '/') {
      return currentPath === '/';
    }
    return currentPath.startsWith(path);
  };

  const getNavClass = (path: string) => {
    return isActive(path) 
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
      : "hover:bg-sidebar-accent/50";
  };

  return (
    <Sidebar className={collapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
            <FileText className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <h2 className="font-semibold text-sidebar-foreground">Sistema Praia</h2>
              <p className="text-xs text-sidebar-foreground/70">
                {isAdmin ? 'Painel Admin' : 'Portal do Estudante'}
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {isAdmin ? 'Administração' : 'Principal'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClass(item.url)}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Sistema</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/admin/audit" className={getNavClass('/admin/audit')}>
                      <Shield className="h-4 w-4" />
                      {!collapsed && <span>Auditoria</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Button
                variant="ghost"
                className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
                onClick={signOut}
              >
                <LogOut className="h-4 w-4" />
                {!collapsed && <span>Sair</span>}
              </Button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        
        {!collapsed && user && (
          <div className="px-3 py-2 text-xs text-sidebar-foreground/70">
            <p className="font-medium">{user.email}</p>
            <p className="capitalize">{userRole}</p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}