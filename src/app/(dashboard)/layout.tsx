"use client"

import { useState } from "react"
import Sidebar from "../components/Sidebar"
import AppNavbar from "../components/Navbar"

export default function LayoutWithSidebar({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="min-vh-100">
      <AppNavbar />
      <div className="d-flex">
        <Sidebar collapsed={collapsed} toggleCollapse={() => setCollapsed(p => !p)} />
        <div
          className="main-content p-4"
          style={{
            marginLeft: collapsed ? 60 : 240,
            transition: "margin-left .3s",
            width: "100%",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
