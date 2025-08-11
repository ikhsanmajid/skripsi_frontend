"use client"

import { useEffect, useMemo, useState } from "react"
import {
    Card, Row, Col, Button, Spinner, Table, Image,
    InputGroup,
    Placeholder
} from "react-bootstrap"
import {
    getServerTime, useAccessLog
} from "@/services/dashboard.service"
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
import Pagination from "@/app/components/Pagination"

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
    idUser: number | null
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



    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })

    const [startDate, setStartDate] = useState<Date | null>(null)
    const [endDate, setEndDate] = useState<Date | null>(null)

    const [selectedUser, setSelectedUser] = useState<SelectOption | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [reloadUnassignedUser, setReloadUnassignedUser] = useState<number>(0)

    const [selectedRoom, setSelectedRoom] = useState<SelectOption | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [reloadUnassignedRoom, setReloadUnassignedRoom] = useState<number>(0)

    const [filters, setFilters] = useState({
        start_date: null as string | null,
        end_date: null as string | null,
        room_id: null as number | null,
        user_id: null as number | null
    })

    const {
        data: accessLogData,
        total: accessLogTotal,
        isLoading: isLoadingAccessLog,
        isError: isErrorAccessLog,
        refresh: refreshAccessLog
    } = useAccessLog(pagination.pageIndex, pagination.pageSize, filters)

    const totalRows = accessLogTotal ?? 0
    const pageCount = Math.ceil(totalRows / pagination.pageSize) || 1

    const fileNames = useMemo(() => {
        return accessLogData?.map((d: lastTenAccess) => d.access_log_image_dir) ?? []
    }, [accessLogData])

    const { imageUrls, isLoading } = useAccessLogImages(fileNames)

    const fetchUsers = async (inputValue: string): Promise<SelectOption[]> => {
        //if (!inputValue) return [];
        try {
            const { data } = await api.get(`/users/?keyword=${inputValue}`);
            const users: User[] = data.data || [];
            return users.map(user => ({
                value: user.idUser!,
                label: `${user.name} (${user.rfid?.number || 'No RFID'})`
            }));
        } catch (error) {
            console.error("Failed to load users:", error);
            toast.error("Failed to load user data.");
            return [];
        }
    };

    const fetchRooms = async (inputValue: string): Promise<SelectOption[]> => {
        //if (!inputValue) return [];
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

    const debouncedFetchUsers = useDebounceFunc(fetchUsers, 500)
    const debouncedFetchRoom = useDebounceFunc(fetchRooms, 500)

    function handleFilter() {
        if (!startDate && endDate) toast.error("Tanggal Awal Harus Diisi")

        setFilters({
            start_date: startDate ? startDate.toLocaleDateString("en-CA") : null,
            end_date: endDate ? endDate.toLocaleDateString("en-CA") : null,
            room_id: selectedRoom?.value ?? null,
            user_id: selectedUser?.value ?? null
        })
        setPagination(prev => ({ ...prev, pageIndex: 0 })) // reset ke halaman pertama
    }

    const columns = useMemo<ColumnDef<lastTenAccess>[]>(() => [
        {
            header: "No.",
            cell: (info) => pagination.pageIndex * pagination.pageSize + info.row.index + 1,
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

                if (isLoading) {
                    return (
                        <Placeholder as="div" animation="wave">
                            <Placeholder
                                xs={12}
                                style={{ maxWidth: 180, height: 120 }}
                            />
                        </Placeholder>
                    )
                }

                return (
                    <Image
                        src={imgSrc!}
                        thumbnail
                        style={{ maxWidth: 180, height: 'auto' }}
                        alt="Foto wajah"
                    />
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
    ], [pagination.pageIndex, pagination.pageSize, imageUrls, session, status])

    const table = useReactTable<lastTenAccess>({
        data: accessLogData ?? [],
        columns,
        pageCount,
        state: { pagination },
        onPaginationChange: setPagination,
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

            <h3 className="mb-4">Access Log</h3>

            <Row>
                <Col className="mt-4" md={8} lg={12}>
                    <Card className="shadow-sm">
                        <Card.Header>
                            <div className="d-flex align-items-center justify-content-between mb-2">
                                <h5 className="mb-0">Last Ten Access</h5>
                                <Button
                                    variant="info"
                                    size="lg"
                                    onClick={refreshAccessLog}
                                    title="Refresh"
                                >
                                    ⟳
                                </Button>
                            </div>
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
                                        {isLoadingAccessLog && (
                                            <tr>
                                                <td colSpan={columns.length} className="text-center py-5">
                                                    <Spinner animation="border" variant="primary" size="sm" />
                                                </td>
                                            </tr>
                                        )}

                                        {!isLoadingAccessLog && table.getRowModel().rows.length === 0 ? (
                                            <tr>
                                                <td colSpan={columns.length} className="text-center py-5">
                                                    {isErrorAccessLog ? "Gagal memuat data." : "Data tidak ditemukan."}
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
                        {totalRows > 0 && (
                            <Card.Footer className="d-flex flex-wrap justify-content-between align-items-center p-3">
                                <Pagination<lastTenAccess> table={table} pagination={pagination} pageCount={pageCount} totalRows={totalRows} isLoading={isLoadingAccessLog} />
                            </Card.Footer>
                        )}
                    </Card>
                </Col>
            </Row>
        </div>
    )
}
