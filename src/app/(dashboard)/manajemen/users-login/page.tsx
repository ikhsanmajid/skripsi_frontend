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
import { PencilSquare, Trash, Search, PersonPlusFill } from "react-bootstrap-icons"
import { ToastContainer, toast } from 'react-toastify'
import { UserEditModal } from "./_components/UserLoginEditModal"
import { UserDeleteModal } from "./_components/UserDeleteModal"

import 'react-toastify/dist/ReactToastify.css'


import api from "@/lib/axios"
import { useSession } from "next-auth/react"
import { AxiosError } from "axios"
import { useDebounce } from "@/lib/debounce"
import Pagination from "@/app/components/Pagination"


export enum Role {
    ADMIN = "ADMIN",
    AUDITOR = "AUDITOR"
}

export type User = {
    id: number
    username: string
    password: string,
    role: Role,
    is_active: boolean
}



const fetchUsers = async (url: string) => {
    try {
        const { data } = await api.get(url)
        return {
            data: data.data as User[],
            total: data.count,
        }
    } catch (error) {
        if (error instanceof AxiosError) {
            if (error.status === 403) {
                toast.error("error.response?.data.message")
            }
        } else {
            console.error("Gagal memuat pengguna:", error)
            toast.error("Gagal memuat data pengguna.")
        }

        return { data: [], total: 0 }
    }
}

export default function UsersPage() {
    const router = useRouter()
    const [filters, setFilters] = useState({ keyword: "", role: null as string | null, isActive: null as boolean | null })
    const debouncedKeyword = useDebounce(filters.keyword, 500)
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })

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
        if (filters.role !== null) params.append('role', String(filters.role))
        return `users_login?${params.toString()}`
    }, [pagination, debouncedKeyword, filters.isActive, filters.role])

    const { data, isLoading, error } = useSWR(swrKey, fetchUsers, {
        keepPreviousData: true,
        revalidateOnFocus: false
    })

    useEffect(() => {
        if (pagination.pageIndex !== 0) {
            setPagination(p => ({ ...p, pageIndex: 0 }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedKeyword, filters.isActive, filters.role]);

    const totalRows = data?.total ?? 0
    const pageCount = Math.ceil(totalRows / pagination.pageSize) || 1

    const handleDeleteUser = async () => {
        if (!userToDelete) return;

        setIsDeleting(true);
        const toastId = toast.loading(`Menghapus ${userToDelete.username}...`);

        try {
            const response = await api.delete(`/users_login/delete/${userToDelete.id}`);

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
                accessorKey: "username",
                header: "Username",
            },
            {
                accessorKey: "role",
                header: "Role",
                cell: ({ getValue }) => {
                    return getValue() === "ADMIN" ? <span className="badge text-bg-success">Admin</span> : <span className="badge text-bg-info">Auditor</span>;
                }
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
            {
                header: "Aksi",
                size: 120,
                cell: ({ row }) => (
                    <div className="d-flex gap-2">
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
        [pagination.pageIndex, pagination.pageSize, swrKey, status]
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
                    <Button disabled={session?.user.role !== "ADMIN"} variant="primary" onClick={() => router.push("/manajemen/users-login/create")}>
                        <PersonPlusFill className="me-2" />
                        Tambah Pengguna Login
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
                                    placeholder="Cari berdasarkan username..."
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
                        <Col md={3}>
                            <Form.Select
                                value={filters.role === null ? 'null' : filters.role}
                                onChange={(e) => setFilters(p => ({ ...p, role: e.target.value === 'null' ? null : e.target.value }))}
                            >
                                <option value="null">Semua Role</option>
                                <option value="ADMIN">Admin</option>
                                <option value="AUDITOR">Auditor</option>
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
                        <Pagination<User> table={table} pagination={pagination} pageCount={pageCount} totalRows={totalRows} />
                    </Card.Footer>
                )}
            </Card>

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
