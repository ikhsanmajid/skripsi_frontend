"use client"

import { Navbar, Nav, Container, NavDropdown } from "react-bootstrap"
import { useSession, signOut } from "next-auth/react"

export default function AppNavbar() {
  const { data: session } = useSession()

  return (
    <Navbar bg="primary" variant="dark" expand="lg" className="shadow-sm sticky-top">
      <Container fluid>
        <Navbar.Brand href="/">Aplikasi DoorLock</Navbar.Brand>
        <Navbar.Toggle aria-controls="main-navbar" />
        <Navbar.Collapse id="main-navbar" >
          <Nav className="ms-auto align-items-center gap-3" >
            {session?.user ? (
              <NavDropdown
                align="end"
                style={{border: 0}}
                title={
                  <>
                    {session.user.username}
                  </>
                }
              >
                <NavDropdown.Item onClick={() => signOut({ callbackUrl: "/login" })}>
                  Logout
                </NavDropdown.Item>
              </NavDropdown>
            ) : (
              <Nav.Link href="/login" className="text-white">
                Login
              </Nav.Link>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  )
}
