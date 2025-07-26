"use client"

import { useEffect, useMemo, useState } from "react"
import {
    Card, Row, Col, Button, Spinner, Table, Image,
    InputGroup
} from "react-bootstrap"
import {
    getServerTime, useLastTenAccess, useRoom, useUser
} from "@/services/dashboard.service"
import { showError } from "@/lib/showError"
import { Bounce, toast, ToastContainer } from "react-toastify"
import {
    ColumnDef, flexRender, getCoreRowModel, useReactTable
} from "@tanstack/react-table"
import { useSession } from "next-auth/react"
import { useAccessLogImages } from "@/services/dashboard.service"
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useDebounceFunc } from "@/lib/debounce"
import api from "@/lib/axios"
import AsyncSelect from "react-select/async"

type lastTenAccess = {
    id: number
    emp_name: string
    emp_number: string
    room_name: string
    access_log_image_dir: string
    timestamp: Date | string
}

type SelectOption = {
    value: number;
    label: string;
};

type User = {
    id: number
    emp_number: string
    name: string
    is_active: boolean
    face_directory: string | null
    idRfidUser: number
    rfid?: {
        id: number | undefined,
        number: string | undefined
    } | null
}

type Room = {
    id: number
    name: string
    secret: string
    ip_address: string
}

export default function AccessLog() {
    const { data: session, status } = useSession()
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

    const {
        data: lastTenAccess,
        isLoading: isLoadingLastTenAccess,
        isError: isErrorLastTenAccess,
        refresh: refreshLastTenAccess
    } = useLastTenAccess()

    const fileNames = useMemo(() => {
        return lastTenAccess?.data?.map((d: lastTenAccess) => d.access_log_image_dir) ?? []
    }, [lastTenAccess])

    const imageUrls = useAccessLogImages(fileNames)

    const [startDate, setStartDate] = useState<Date | null>(null)
    const [endDate, setEndDate] = useState<Date | null>(null)

    const [selectedUser, setSelectedUser] = useState<SelectOption | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [reloadUnassignedUser, setReloadUnassignedUser] = useState<number>(0)

    const [selectedRoom, setSelectedRoom] = useState<SelectOption | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [reloadUnassignedRoom, setReloadUnassignedRoom] = useState<number>(0)

    const fetchUnassignedUsers = async (inputValue: string): Promise<SelectOption[]> => {
        if (!inputValue) return [];
        try {
            const { data } = await api.get(`/users/?keyword=${inputValue}`);
            const users: User[] = data.data || [];
            return users.map(user => ({
                value: user.idRfidUser,
                label: `${user.name} (${user.rfid?.number || 'No RFID'})`
            }));
        } catch (error) {
            console.error("Failed to load users:", error);
            toast.error("Failed to load user data.");
            return [];
        }
    };

    const fetchUnassignedRooms = async (inputValue: string): Promise<SelectOption[]> => {
        if (!inputValue) return [];
        try {
            const { data } = await api.get(`/rooms/?keyword=${inputValue}`);
            const users: Room[] = data.data || [];
            return users.map(user => ({
                value: user.id,
                label: user.name
            }));
        } catch (error) {
            console.error("Failed to load users:", error);
            toast.error("Failed to load user data.");
            return [];
        }
    };

    const debouncedFetchUsers = useDebounceFunc(fetchUnassignedUsers, 500)
    const debouncedFetchRoom = useDebounceFunc(fetchUnassignedRooms, 500)

    function handleFilter() {
        if (!startDate || !endDate) return;

        // Kirim ke server nanti, misalnya:
        console.log("Filter:", {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
        });

        // Kalau ingin langsung filter di frontend:
        // Atau bisa trigger request baru ke useLastTenAccess({ startDate, endDate })
    }

    const columns = useMemo<ColumnDef<lastTenAccess>[]>(() => [
        {
            header: "No.",
            cell: (info) => info.row.index + 1,
            size: 5,
        },
        {
            accessorKey: "emp_number",
            header: "No. Karyawan",
        },
        {
            accessorKey: "emp_name",
            header: "Nama Karyawan",
        },
        {
            accessorKey: "room_name",
            header: "Nama Ruangan",
        },
        {
            accessorKey: "access_log_image_dir",
            header: "Foto Akses",
            cell: (info) => {
                const fileName = info.getValue() as string
                const imgSrc = imageUrls[fileName]

                if (imgSrc === undefined) {
                    return <span className="text-muted fst-italic">Memuat...</span>
                }

                return imgSrc ? (
                    <Image
                        src={imgSrc}
                        thumbnail
                        style={{ maxWidth: 180, height: 'auto' }}
                        alt="Foto wajah"
                    />
                ) : (
                    <span className="text-muted fst-italic">Tidak ada foto</span>
                )
            },
        },
        {
            accessorKey: "timestamp",
            header: "Waktu Akses",
            cell: (info) => {
                const raw = info.getValue() as string
                const date = new Date(raw)
                return date.toLocaleString('en-GB', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                    timeZone: 'Asia/Jakarta',
                }).replace(',', '').replace(/\//g, '-')
            },
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
    ], [imageUrls, session, status])

    const table = useReactTable<lastTenAccess>({
        data: lastTenAccess?.data ?? [],
        columns,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
    })

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
            <ToastContainer limit={4} newestOnTop transition={Bounce} />
            <div className="position-absolute pe-2 end-0 me-2 mt-2 text-muted small fw-semibold" style={{ zIndex: 10 }}>
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
                <Col md={6} lg={4}>
                    <Card bg="primary" text="white" className="shadow-sm">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-start">
                                <h5 className="mb-0">Jumlah Karyawan (Aktif)</h5>
                                <Button variant="light" size="sm" onClick={refreshCountUser} title="Refresh">⟳</Button>
                            </div>
                            <div style={{ fontSize: "2rem", fontWeight: "bold" }}>
                                {isLoadingUser ? <Spinner animation="border" size="sm" /> :
                                    isErrorUser ? "Gagal" : (userCount?.count ?? 0)}
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col md={6} lg={4}>
                    <Card bg="success" text="white" className="shadow-sm">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-start">
                                <h5 className="mb-0">Jumlah Ruangan</h5>
                                <Button variant="light" size="sm" onClick={refreshCountRoom} title="Refresh">⟳</Button>
                            </div>
                            <div style={{ fontSize: "2rem", fontWeight: "bold" }}>
                                {isLoadingRoom ? <Spinner animation="border" size="sm" /> :
                                    isErrorRoom ? "Gagal" : (roomCount?.count ?? 0)}
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>



            <Row>
                <Col className="mt-4" md={8} lg={12}>
                    <Card className="shadow-sm">
                        <Card.Header>
                            <div className="d-flex align-items-center justify-content-between mb-2">
                                <h5 className="mb-0">Last Ten Access</h5>
                                <Button
                                    variant="info"
                                    size="lg"
                                    onClick={refreshLastTenAccess}
                                    title="Refresh"
                                >
                                    ⟳
                                </Button>
                            </div>

                            {isLoadingLastTenAccess && (
                                <div className="d-flex justify-content-center my-2">
                                    <Spinner animation="border" variant="primary" size="sm" />
                                </div>
                            )}
                        </Card.Header>
                        <Card.Body>
                            <Row className="mb-4 align-items-end">
                                <Col>
                                    <label className="form-label fw-semibold">User </label>
                                    <InputGroup >
                                        <AsyncSelect
                                            instanceId={1}
                                            key={reloadUnassignedUser}
                                            cacheOptions
                                            defaultOptions
                                            loadOptions={debouncedFetchUsers}
                                            placeholder="Type to search for name or RFID number..."
                                            isClearable
                                            onChange={(option) => setSelectedUser(option as SelectOption)}
                                            value={selectedUser}
                                            noOptionsMessage={({ inputValue }) =>
                                                !inputValue ? "Start typing to search for users" : "User not found"
                                            }
                                            loadingMessage={() => "Searching..."}
                                            styles={{
                                                control: (base) => ({ ...base, flexGrow: 1, width: "480px" }),
                                            }}
                                        />
                                    </InputGroup>
                                </Col>

                                <Col>
                                    <label className="form-label fw-semibold">Ruangan </label>
                                    <InputGroup>
                                        <AsyncSelect
                                            instanceId={2}
                                            key={reloadUnassignedRoom}
                                            cacheOptions
                                            defaultOptions
                                            loadOptions={debouncedFetchRoom}
                                            placeholder="Type to search for Room..."
                                            isClearable
                                            onChange={(option) => setSelectedRoom(option as SelectOption)}
                                            value={selectedRoom}
                                            noOptionsMessage={({ inputValue }) =>
                                                !inputValue ? "Start typing to search for room" : "Room not found"
                                            }
                                            loadingMessage={() => "Searching..."}
                                            styles={{
                                                control: (base) => ({ ...base, flexGrow: 1, width: "480px" }),
                                            }}
                                        />
                                    </InputGroup>
                                </Col>

                                <Col >
                                    <label className="form-label fw-semibold">Tanggal Mulai </label>
                                    <DatePicker
                                        selected={startDate}
                                        onChange={(date) => setStartDate(date)}
                                        className="form-control"
                                        dateFormat="dd-MM-yyyy"
                                        placeholderText="Pilih tanggal mulai"
                                        maxDate={new Date()}
                                        isClearable
                                    />
                                </Col>
                                <Col >
                                    <label className="form-label fw-semibold">Tanggal Akhir </label>
                                    <DatePicker
                                        selected={endDate}
                                        onChange={(date) => setEndDate(date)}
                                        className="form-control"
                                        dateFormat="dd-MM-yyyy"
                                        placeholderText="Pilih tanggal akhir"
                                        maxDate={new Date()}
                                        isClearable
                                    />
                                </Col>
                                <Col >
                                    <Button
                                        className="w-100"
                                        variant="primary"
                                        onClick={handleFilter}
                                    >
                                        Filter
                                    </Button>
                                </Col>
                            </Row>
                            <div className="table-responsive">
                                <Table hover striped className="mb-0">
                                    <thead className="table-dark">
                                        {table.getHeaderGroups().map((hg) => (
                                            <tr key={hg.id}>
                                                {hg.headers.map((h) => (
                                                    <th key={h.id} style={{ width: h.getSize() }}>
                                                        {flexRender(h.column.columnDef.header, h.getContext())}
                                                    </th>
                                                ))}
                                            </tr>
                                        ))}
                                    </thead>
                                    <tbody>
                                        {table.getRowModel().rows.length === 0 ? (
                                            <tr>
                                                <td colSpan={columns.length} className="text-center py-5">
                                                    {isErrorLastTenAccess ? "Gagal memuat data." : "Data tidak ditemukan."}
                                                </td>
                                            </tr>
                                        ) : (
                                            table.getRowModel().rows.map((row) => (
                                                <tr key={row.id}>
                                                    {row.getVisibleCells().map((cell) => (
                                                        <td key={cell.id} className="align-middle">
                                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </Table>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </div>
    )
}
