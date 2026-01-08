"use client"

import * as React from "react"
import {
  FileText,
  Archive,
  Database,
  FileBarChart,
  Sparkles,
  Network,
  Settings,
  Crown,
  Building2,
  Layers,
  Link2,
  Users,
  Wrench,
  Bell,
} from "lucide-react"
import { useLocation, useSearchParams } from "react-router-dom"
import { useProfile } from "@contexts"
import { useCradleNavigate } from "@hooks"
import Logo from "@/components/base/Logo/Logo"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronRight } from "lucide-react"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  onNotificationsClick?: () => void
  unreadNotificationsCount?: number
}

export function AppSidebar({ onNotificationsClick, unreadNotificationsCount = 0, ...props }: AppSidebarProps) {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { isEntryManager, isAdmin } = useProfile()
  const { navigateLink } = useCradleNavigate()

  const isManageActive = location.pathname === "/manage" || location.pathname.startsWith("/manage/") || location.pathname === "/manage/entities"

  // Map current navigation items
  const navMain = [
    {
      title: "Notes",
      url: "/notes",
      icon: FileText,
      isActive: location.pathname === "/notes" || location.pathname.startsWith("/notes/"),
    },
    {
      title: "Files",
      url: "/files",
      icon: Archive,
      isActive: location.pathname === "/files" || location.pathname.startsWith("/files/"),
    },
    {
      title: "Digest Data",
      url: "/digest-data",
      icon: Database,
      isActive: location.pathname === "/digest-data" || location.pathname.startsWith("/digest-data/"),
    },
    {
      title: "Reports",
      url: "/reports",
      icon: FileBarChart,
      isActive: location.pathname === "/reports" || location.pathname.startsWith("/reports/"),
    },
    {
      title: "Enrichment",
      url: "/enrich",
      icon: Sparkles,
      isActive: location.pathname === "/enrich" || location.pathname.startsWith("/enrich"),
    },
    {
      title: "Graph Explorer",
      url: "/knowledge-graph",
      icon: Network,
      isActive: location.pathname === "/knowledge-graph" || location.pathname.startsWith("/knowledge-graph/"),
    },
  ]

  const footerItems = [
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
      isActive: location.pathname === "/settings" || location.pathname.startsWith("/settings/"),
    },
  ]

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="flex items-center justify-center h-14 p-0 gap-0">
        <Logo text={false} height="1.5em" onClick={navigateLink('/')} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        {isEntryManager() && (
          <SidebarMenu>
            <SidebarMenuItem>
              {(() => {
                const manageItems = [
                  {
                    title: "Entities",
                    url: "/manage/entities",
                    icon: Building2,
                  },
                  {
                    title: "Entry Types",
                    url: "/manage/entry-types",
                    icon: Layers,
                  },
                  {
                    title: "Type Mappings",
                    url: "/manage/type-mappings",
                    icon: Link2,
                  },
                  ...(isAdmin() ? [
                    {
                      title: "Users",
                      url: "/manage/users",
                      icon: Users,
                    },
                    {
                      title: "Enrichment",
                      url: "/manage/enrichment",
                      icon: Sparkles,
                    },
                    {
                      title: "Management",
                      url: "/manage/management",
                      icon: Wrench,
                    },
                  ] : []),
                ]

                const isSubItemActive = (subItemUrl: string) => {
                  return location.pathname === subItemUrl || location.pathname.startsWith(subItemUrl + '/')
                }

                return (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuButton tooltip="Manage" isActive={isManageActive}>
                        <Crown />
                        <span>Manage</span>
                        <ChevronRight className="ml-auto" />
                      </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start" className="w-48">
                      <DropdownMenuLabel>Manage</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {manageItems.map((subItem) => (
                        <DropdownMenuItem
                          key={subItem.title}
                          asChild
                          className={isSubItemActive(subItem.url) ? "bg-accent" : ""}
                        >
                          <a href={subItem.url} onClick={navigateLink(subItem.url)}>
                            {subItem.icon && <subItem.icon />}
                            <span className="max-w-52 text-wrap">{subItem.title}</span>
                          </a>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )
              })()}
            </SidebarMenuItem>
          </SidebarMenu>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Notifications"
              onClick={onNotificationsClick}
            >
              <Bell />
              <span>Notifications</span>
              {unreadNotificationsCount > 0 && (
                <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
