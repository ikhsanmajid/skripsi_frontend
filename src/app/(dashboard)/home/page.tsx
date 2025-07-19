"use client"

import { useEffect, useState } from "react"
import { Card, Row, Col, Button, Spinner } from "react-bootstrap"
import { getServerTime, useRoom, useUser } from "@/services/dashboard.service"
import { showError } from "@/lib/showError"
import { Bounce, ToastContainer } from "react-toastify"

export default function HalamanDashboard() {
    const [serverTime, setServerTime] = useState<Date | null>(null)
    const { time } = getServerTime()
    const {
        data: roomCount,
        isLoading: isLoadingRoom,
        isError: isErrorRoom,
        refresh: refreshCountRoom,
    } = useRoom()
    const {
        data: userCount,
        isLoading: isLoadingUser,
        isError: isErrorUser,
        refresh: refreshCountUser,
    } = useUser()

    useEffect(() => {
        if (!time?.time) return

        const serverDate = new Date(time.time)
        const offset = serverDate.getTime() - Date.now()

        const updateTime = () => {
            setServerTime(new Date(Date.now() + offset))
        }

        updateTime()
        const interval = setInterval(updateTime, 1000)

        return () => clearInterval(interval)
    }, [time])

    useEffect(() => {
        if (isErrorRoom) showError({ message: "Gagal Fetch Room" })
    }, [isErrorRoom])

    useEffect(() => {
        if (isErrorUser) showError({ message: "Gagal Fetch User" })
    }, [isErrorUser])

    return (
        <div>
            <ToastContainer 
            limit={4}
            newestOnTop
            transition={Bounce}/>
            {/* Server Time Display */}
            <div
                className="position-absolute pe-2 end-0 me-2 mt-2 text-muted small fw-semibold"
                style={{ zIndex: 10 }}
            >
                {serverTime?.toLocaleString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                }) ?? "Memuat..."}
            </div>

            <h3 className="mb-4">Dashboard</h3>

            <Row className="g-4">
                {/* Jumlah Karyawan */}
                <Col md={6} lg={4}>
                    <Card bg="primary" text="white" className="shadow-sm">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-start">
                                <h5 className="mb-0">Jumlah Karyawan (Aktif)</h5>
                                <Button
                                    variant="light"
                                    size="sm"
                                    onClick={refreshCountUser}
                                    title="Refresh"
                                >
                                    ⟳
                                </Button>
                            </div>
                            <div style={{ fontSize: "2rem", fontWeight: "bold" }}>
                                {isLoadingUser ? (
                                    <Spinner animation="border" size="sm" />
                                ) : isErrorUser ? (
                                    "Gagal"
                                ) : (
                                    userCount?.count ?? 0
                                )}
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Jumlah Ruangan */}
                <Col md={6} lg={4}>
                    <Card bg="success" text="white" className="shadow-sm">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-start">
                                <h5 className="mb-0">Jumlah Ruangan</h5>
                                <Button
                                    variant="light"
                                    size="sm"
                                    onClick={refreshCountRoom}
                                    title="Refresh"
                                >
                                    ⟳
                                </Button>
                            </div>
                            <div style={{ fontSize: "2rem", fontWeight: "bold" }}>
                                {isLoadingRoom ? (
                                    <Spinner animation="border" size="sm" />
                                ) : isErrorRoom ? (
                                    "Gagal"
                                ) : (
                                    roomCount?.count ?? 0
                                )}
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </div>
    )
}
