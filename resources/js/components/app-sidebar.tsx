import { Link, usePage } from '@inertiajs/react';
import {
    AtSign,
    ClipboardList,
    History,
    LayoutGrid,
    MessageSquare,
    MessagesSquare,
    Table2,
    Target,
    Users,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

export function AppSidebar() {
    const { auth } = usePage().props;
    const canManageUsers =
        auth.user?.role === 'admin' || auth.user?.role === 'ketua_tim';

    const mainNavItems: NavItem[] = [
        {
            title: 'Dasbor',
            href: dashboard(),
            icon: LayoutGrid,
        },
        // "Target Saya" hanya untuk anggota (admin/ketua memakai "Kelola Target").
        ...(canManageUsers
            ? []
            : [
                  {
                      title: 'Target Saya',
                      href: '/reports',
                      icon: ClipboardList,
                  } satisfies NavItem,
                  {
                      title: 'Komentar',
                      href: '/komentar',
                      icon: MessageSquare,
                  } satisfies NavItem,
                  {
                      title: 'Riwayat',
                      href: '/reports/riwayat',
                      icon: History,
                  } satisfies NavItem,
              ]),
        ...(canManageUsers
            ? [
                  {
                      title: 'Kelola Target',
                      href: '/targets',
                      icon: Target,
                  } satisfies NavItem,
                  {
                      title: 'Laporan Harian',
                      href: '/laporan',
                      icon: Table2,
                  } satisfies NavItem,
                  {
                      title: 'Komentar Tim',
                      href: '/komentar-tim',
                      icon: MessagesSquare,
                  } satisfies NavItem,
                  {
                      title: 'Media',
                      href: '/media',
                      icon: AtSign,
                  } satisfies NavItem,
                  {
                      title: 'Manajemen User',
                      href: '/users',
                      icon: Users,
                  } satisfies NavItem,
              ]
            : []),
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
