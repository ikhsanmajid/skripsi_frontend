/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useMemo, useState, useEffect } from "react"
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    ColumnDef,
} from "@tanstack/react-table"
import useSWR, { useSWRConfig } from "swr"
import {
    Button,
    Table,
    Form,
    Row,
    Col,
    Spinner,
    Card,
    InputGroup,
} from "react-bootstrap"
import { useRouter } from "next/navigation"
import { PencilSquare, Trash, Search, InfoCircleFill, PersonPlusFill } from "react-bootstrap-icons"
import { ToastContainer, toast } from 'react-toastify'
import { UserEditModal } from "./_components/UserEditModal"
import { UserDeleteModal } from "./_components/UserDeleteModal"

import 'react-toastify/dist/ReactToastify.css'


import api from "@/lib/axios"
import UserDetailModal from "./_components/UserDetailModal"
import { useSession } from "next-auth/react"
import { useDebounce } from "@/lib/debounce"

export type User = {
    id: number
    emp_number: string
    name: string
    is_active: boolean
    face_directory: string | null
    idRfidUser: number | null
    rfid: {
        id: number | undefined,
        number: string | undefined
    } | null
}

const fetchUsers = async (url: string) => {
    try {
        const { data } = await api.get(url)
        return {
            data: data.data as User[],
            total: data.count,
        }
    } catch (error) {
        console.error("Gagal memuat pengguna:", error)
        toast.error("Gagal memuat data pengguna.")
        return { data: [], total: 0 }
    }
}

export default function UsersPage() {
    const router = useRouter()
    const [filters, setFilters] = useState({ keyword: "", isActive: null as boolean | null })
    const debouncedKeyword = useDebounce(filters.keyword, 500)
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })

    const [detailId, setDetailId] = useState<number | null>(null)
    const [showDetailModal, setShowDetailModal] = useState(false)

    const [userToEdit, setUserToEdit] = useState<User | null>(null)
    const [showEditModal, setShowEditModal] = useState(false)

    const [userToDelete, setUserToDelete] = useState<User | null>(null)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const { mutate } = useSWRConfig()

    const { data: session, status } = useSession()

    const swrKey = useMemo(() => {
        const params = new URLSearchParams({
            limit: String(pagination.pageSize),
            offset: String(pagination.pageIndex * pagination.pageSize),
        })
        if (debouncedKeyword) params.append('keyword', debouncedKeyword)
        if (filters.isActive !== null) params.append('is_active', String(filters.isActive))
        return `users?${params.toString()}`
    }, [pagination, debouncedKeyword, filters.isActive])

    const { data, isLoading, error } = useSWR(swrKey, fetchUsers, {
        keepPreviousData: true,
        revalidateOnFocus: false
    })

    useEffect(() => {
        if (pagination.pageIndex !== 0) {
            setPagination(p => ({ ...p, pageIndex: 0 }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedKeyword, filters.isActive]);

    const totalRows = data?.total ?? 0
    const pageCount = Math.ceil(totalRows / pagination.pageSize) || 1

    const handleDeleteUser = async () => {
        if (!userToDelete) return;

        setIsDeleting(true);
        const toastId = toast.loading(`Menghapus ${userToDelete.name}...`);

        try {
            const response = await api.delete(`/users/delete/${userToDelete.id}`);

            if (response.data && response.data.status === 'success') {
                toast.update(toastId, {
                    render: response.data.message || "Pengguna berhasil dihapus!",
                    type: "success",
                    isLoading: false,
                    autoClose: 2500
                });
                mutate(swrKey);
            } else {
                throw new Error(response.data.message || "Gagal menghapus pengguna.");
            }

        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || "Gagal menghapus pengguna.";
            toast.update(toastId, {
                render: errorMessage,
                type: "error",
                isLoading: false,
                autoClose: 5000
            });
        } finally {
            setIsDeleting(false);
            setShowDeleteModal(false);
            setUserToDelete(null);
        }
    }

    const columns = useMemo<ColumnDef<User>[]>(
        () => [
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
                accessorKey: "name",
                header: "Nama Karyawan",
            },
            {
                accessorKey: "is_active",
                header: "Status",
                cell: ({ getValue }) =>
                    getValue<boolean>() ? (
                        <span className="badge text-bg-success">Aktif</span>
                    ) : (
                        <span className="badge text-bg-secondary">Tidak Aktif</span>
                    ),
            },
            // [PERBAIKAN] Tambahkan kolom baru untuk Data Wajah
            {
                accessorKey: "face_directory",
                header: "Data Wajah",
                cell: ({ row }) =>
                    row.original.face_directory ? (
                        <span className="badge text-bg-primary">Tersedia</span>
                    ) : (
                        <span className="badge text-bg-secondary">Kosong</span>
                    ),
            },
            {
                accessorKey: "rfid.number",
                header: "RFID",
                cell: ({ row }) =>
                    row.original.rfid?.number ? (
                        <span className="badge text-bg-success">{row.original.rfid.number}</span>
                    ) : (
                        <span className="badge text-bg-secondary">RFID belum ada</span>
                    ),
            },
            {
                header: "Aksi",
                size: 120,
                cell: ({ row }) => (
                    <div className="d-flex gap-2">

                        <Button variant="outline-info" size="sm" title="Detail Pengguna" onClick={() => {
                            setDetailId(row.original.id)
                            setShowDetailModal(true)
                        }}>
                            <InfoCircleFill />
                        </Button>
                        <Button disabled={session?.user.role !== "ADMIN"} variant="outline-warning" size="sm" title="Edit Pengguna" onClick={() => {
                            setUserToEdit(row.original)
                            setShowEditModal(true)
                        }}>
                            <PencilSquare />
                        </Button>
                        <Button disabled={session?.user.role !== "ADMIN"} variant="outline-danger" size="sm" title="Hapus Pengguna" onClick={() => {
                            setUserToDelete(row.original)
                            setShowDeleteModal(true)
                        }}>
                            <Trash />
                        </Button>

                    </div>
                ),
            },
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [pagination.pageIndex, pagination.pageSize, swrKey, status, session]
    )

    const table = useReactTable<User>({
        data: data?.data ?? [],
        columns,
        pageCount,
        state: { pagination },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
    })

    return (
        <div className="container-fluid py-3">
            <ToastContainer position="top-right" theme="colored" />

            <Row className="mb-3 align-items-center">
                <Col>
                    <h4 className="mb-0">Manajemen Pengguna</h4>
                </Col>
                <Col xs="auto">
                    <Button disabled={session?.user.role !== "ADMIN"} variant="primary" onClick={() => router.push("/manajemen/users/create")}>
                        <PersonPlusFill className="me-2" />
                        Tambah Pengguna
                    </Button>
                </Col>
            </Row>

            <Card className="shadow-sm">
                <Card.Header className="p-3 bg-light">
                    <Row className="g-2">
                        <Col md={5}>
                            <InputGroup>
                                <InputGroup.Text><Search /></InputGroup.Text>
                                <Form.Control
                                    placeholder="Cari berdasarkan nama, nomor RFID atau no. karyawan..."
                                    value={filters.keyword}
                                    onChange={(e) => setFilters(p => ({ ...p, keyword: e.target.value }))}
                                />
                            </InputGroup>
                        </Col>
                        <Col md={3}>
                            <Form.Select
                                value={filters.isActive === null ? 'null' : String(filters.isActive)}
                                onChange={(e) => setFilters(p => ({ ...p, isActive: e.target.value === 'null' ? null : e.target.value === 'true' }))}
                            >
                                <option value="null">Semua Status</option>
                                <option value="true">Aktif</option>
                                <option value="false">Tidak Aktif</option>
                            </Form.Select>
                        </Col>
                    </Row>
                </Card.Header>
                <Card.Body className="p-0 position-relative">
                    {isLoading && (
                        <div className="position-absolute w-100 h-100 d-flex justify-content-center align-items-center" style={{ background: "rgba(255, 255, 255, 0.7)", zIndex: 10 }}>
                            <Spinner animation="border" variant="primary" />
                        </div>
                    )}
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
                                            {error ? "Gagal memuat data." : "Data tidak ditemukan."}
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
                        <span className="text-muted small">
                            Menampilkan{' '}
                            <strong>{table.getRowModel().rows.length > 0 ? pagination.pageIndex * pagination.pageSize + 1 : 0}</strong>
                            {' - '}
                            <strong>{pagination.pageIndex * pagination.pageSize + table.getRowModel().rows.length}</strong>
                            {' '}dari <strong>{totalRows}</strong> data
                        </span>

                        <nav className="d-flex align-items-center gap-2">
                            <ul className="pagination mb-0">
                                <li className={`page-item ${!table.getCanPreviousPage() ? "disabled" : ""}`}>
                                    <button className="page-link" onClick={() => table.setPageIndex(0)}>
                                        Awal
                                    </button>
                                </li>
                                <li className={`page-item ${!table.getCanPreviousPage() ? "disabled" : ""}`}>
                                    <button className="page-link" onClick={() => table.previousPage()}>
                                        Sebelumnya
                                    </button>
                                </li>
                                {(() => {
                                    const pageList = [...Array(pageCount)].map((_, i) => i)
                                    const currentPage = table.getState().pagination.pageIndex
                                    const startIndex =
                                        pageCount <= 5 || currentPage <= 2
                                            ? 0
                                            : currentPage + 2 >= pageCount
                                                ? pageCount - 5
                                                : currentPage - 2
                                    const visiblePages = pageList.slice(startIndex, startIndex + 5)

                                    return visiblePages.map((item) => (
                                        <li key={item} className={`page-item ${currentPage === item ? "active" : ""}`}>
                                            <button className="page-link" onClick={() => table.setPageIndex(item)}>
                                                {item + 1}
                                            </button>
                                        </li>
                                    ))
                                })()}
                                <li className={`page-item ${!table.getCanNextPage() ? "disabled" : ""}`}>
                                    <button className="page-link" onClick={() => table.nextPage()}>
                                        Berikutnya
                                    </button>
                                </li>
                                <li className={`page-item ${!table.getCanNextPage() ? "disabled" : ""}`}>
                                    <button className="page-link" onClick={() => table.setPageIndex(pageCount - 1)}>
                                        Akhir
                                    </button>
                                </li>
                            </ul>
                            <span className="badge bg-light text-dark d-none d-md-inline">
                                Halaman {pagination.pageIndex + 1} / {pageCount}
                            </span>
                        </nav>
                    </Card.Footer>
                )}
            </Card>

            <UserDetailModal
                userId={detailId}
                show={showDetailModal}
                onHide={() => setShowDetailModal(false)}
            />

            <UserEditModal
                show={showEditModal}
                onHide={() => setShowEditModal(false)}
                user={userToEdit}
                onUpdate={() => mutate(swrKey)}
            />

            <UserDeleteModal
                show={showDeleteModal}
                onHide={() => setShowDeleteModal(false)}
                onConfirm={handleDeleteUser}
                user={userToDelete}
                isDeleting={isDeleting}
            />
        </div>
    )
}
