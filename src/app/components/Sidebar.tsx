"use client"

import { useState, useEffect } from "react"
import { Nav } from "react-bootstrap"
import { useRouter } from "next/navigation"
import {
  House,
  ChevronLeft,
  ChevronRight,
  Gear,
  People,
  Cpu,
  DoorClosed,
} from "react-bootstrap-icons"
import { motion, AnimatePresence } from "framer-motion"
import "./styles.css"

export default function Sidebar({
  collapsed,
  toggleCollapse,
}: {
  collapsed: boolean
  toggleCollapse: () => void
}) {
  const router = useRouter()
  const [openMaster, setOpenMaster] = useState(false)

  useEffect(() => {
    if (collapsed) {
      setOpenMaster(false)
    }
  }, [collapsed])

  const handleToggleMaster = () => {
    if (!collapsed) setOpenMaster((p) => !p)
  }

  const submenuVariants = {
    hidden: { height: 0, opacity: 0, overflow: "hidden" },
    visible: { height: "auto", opacity: 1, overflow: "hidden" },
  }

  const labelVariants = {
    hidden: { opacity: 0, x: -15 },
    visible: { opacity: 1, x: 0 },
  }

  return (
    <motion.div
      className={`sidebar ${collapsed ? "collapsed" : ""}`}
      animate={{ width: collapsed ? 60 : 240 }}
      transition={{ duration: 0.3 }}
    >
      <Nav className="flex-column p-2">

        <Nav.Link onClick={toggleCollapse} className="text-white nav-link mb-2 d-flex justify-content-end">

          <div className="nav-icon rounded-2">

            {collapsed ? <ChevronRight /> : <ChevronLeft />}

          </div>

        </Nav.Link>

        {/* Dashboard */}
        <Nav.Link onClick={() => router.push("/home")} className="text-white nav-link border-menu">
          <div className="nav-icon"><House /></div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span key="dashboard" variants={labelVariants} initial="hidden" animate="visible" exit="hidden" transition={{ duration: 0.2 }} className="nav-label">
                Dashboard
              </motion.span>
            )}
          </AnimatePresence>
        </Nav.Link>

        {/* ===== Master Data ===== */}
        <Nav.Link onClick={handleToggleMaster} className="text-white nav-link border-menu">
          <div className="nav-icon"><Gear /></div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                key="master-label-container"
                className="nav-label-container"
                variants={labelVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                transition={{ duration: 0.2 }}
              >
                <span className="nav-label">Master Data</span>
                <motion.div animate={{ rotate: openMaster ? 90 : 0 }}>
                  <ChevronRight size={14} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </Nav.Link>

        <AnimatePresence>
          {!collapsed && openMaster && (
            <motion.div key="submenu-master" className="ms-4 submenu" variants={submenuVariants} initial="hidden" animate="visible" exit="hidden" transition={{ duration: 0.3, ease: "easeInOut" }}>
              <Nav.Link onClick={() => router.push("/manajemen/users")} className="text-white nav-link">
                <div className="nav-icon"><People size={18} /></div>
                <span className="nav-label">User</span>
              </Nav.Link>

              <Nav.Link onClick={() => router.push("/manajemen/rfid")} className="text-white nav-link">
                <div className="nav-icon"><Cpu size={18} /></div>
                <span className="nav-label">RFID</span>
              </Nav.Link>

              <Nav.Link onClick={() => router.push("/manajemen/rooms")} className="text-white nav-link">
                <div className="nav-icon"><DoorClosed size={18} /></div>
                <span className="nav-label">Ruangan</span>
              </Nav.Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* About */}
        {/* <Nav.Link onClick={() => router.push("/about")} className="text-white nav-link border-menu">
          <div className="nav-icon"><Info /></div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span key="about" variants={labelVariants} initial="hidden" animate="visible" exit="hidden" transition={{ duration: 0.2 }} className="nav-label">
                About
              </motion.span>
            )}
          </AnimatePresence>
        </Nav.Link> */}
      </Nav>
    </motion.div>
  )
}