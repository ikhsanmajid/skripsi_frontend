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
import { PencilSquare, Trash, Search, TagFill } from "react-bootstrap-icons"
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import api from "@/lib/axios"
import { RfidAddModal } from "./_components/RFIDAddModal"
import { RfidEditModal } from "./_components/RFIDEditModal"
import { DeleteConfirmationModal } from "./_components/DeleteConfirmationModal"

const useDebounce = <T,>(value: T, delay: number): T => {
    const [debouncedValue, setDebouncedValue] = useState<T>(value)
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value) }, delay)
        return () => { clearTimeout(handler) }
    }, [value, delay])
    return debouncedValue
}

export type Rfid = {
    id: number
    number: string
    is_active: boolean
}

const fetchRfids = async (url: string) => {
    try {
        const { data } = await api.get(url)
        return {
            data: data.data as Rfid[],
            total: data.count,
        }
    } catch (error) {
        console.error("Gagal memuat RFID:", error)
        toast.error("Gagal memuat data RFID.")
        return { data: [], total: 0 }
    }
}

export default function RfidPage() {
    const [filters, setFilters] = useState({ keyword: "", isActive: null as boolean | null })
    const debouncedKeyword = useDebounce(filters.keyword, 500)
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })

    const [showAddModal, setShowAddModal] = useState(false);
    const [itemToEdit, setItemToEdit] = useState<Rfid | null>(null)
    const [showEditModal, setShowEditModal] = useState(false)
    const [itemToDelete, setItemToDelete] = useState<Rfid | null>(null)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const { mutate } = useSWRConfig()

    const swrKey = useMemo(() => {
        const params = new URLSearchParams({
            limit: String(pagination.pageSize),
            offset: String(pagination.pageIndex * pagination.pageSize),
        })
        if (debouncedKeyword) params.append('keyword', debouncedKeyword)
        if (filters.isActive !== null) params.append('is_active', String(filters.isActive))
        return `rfid?${params.toString()}`
    }, [pagination, debouncedKeyword, filters.isActive])

    const { data, isLoading, error } = useSWR(swrKey, fetchRfids, {
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

    const handleDelete = async () => {
        if (!itemToDelete) return;

        setIsDeleting(true);
        const toastId = toast.loading(`Menghapus ${itemToDelete.number}...`);

        try {
            const response = await api.delete(`/rfid/delete/${itemToDelete.id}`);
            if (response.data && response.data.status === 'success') {
                toast.update(toastId, { render: "RFID berhasil dihapus!", type: "success", isLoading: false, autoClose: 3000 });

               
                const isLastItemOnPage = data?.data.length === 1 && pagination.pageIndex > 0;
                if (isLastItemOnPage) {
                    setPagination(p => ({ ...p, pageIndex: p.pageIndex - 1 }));
                } else {
                    mutate(swrKey);
                }

            } else {
                throw new Error(response.data.message || "Gagal menghapus RFID.");
            }
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || "Gagal menghapus RFID.";
            toast.update(toastId, { render: errorMessage, type: "error", isLoading: false, autoClose: 5000 });
        } finally {
            setIsDeleting(false);
            setShowDeleteModal(false);
            setItemToDelete(null);
        }
    }

    const columns = useMemo<ColumnDef<Rfid>[]>(
        () => [
            {
                header: "No.",
                cell: (info) => pagination.pageIndex * pagination.pageSize + info.row.index + 1,
                size: 5,
            },
            {
                accessorKey: "number",
                header: "Nomor RFID",
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
                        <Button variant="outline-warning" size="sm" title="Edit RFID" onClick={() => {
                            setItemToEdit(row.original)
                            setShowEditModal(true)
                        }}>
                            <PencilSquare />
                        </Button>
                        <Button variant="outline-danger" size="sm" title="Hapus RFID" onClick={() => {
                            setItemToDelete(row.original)
                            setShowDeleteModal(true)
                        }}>
                            <Trash />
                        </Button>
                    </div>
                ),
            },
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [pagination.pageIndex, pagination.pageSize, swrKey]
    )

    const table = useReactTable<Rfid>({
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
                    <h4 className="mb-0">Manajemen RFID</h4>
                </Col>
                <Col xs="auto">
                    <Button variant="primary" onClick={() => setShowAddModal(true)}>
                        <TagFill className="me-2" />
                        Tambah RFID
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
                                    placeholder="Cari berdasarkan nomor RFID..."
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

            <RfidAddModal
                show={showAddModal}
                onHide={() => setShowAddModal(false)}
                onUpdate={() => mutate(swrKey)}
            />

            <RfidEditModal
                show={showEditModal}
                onHide={() => setShowEditModal(false)}
                rfid={itemToEdit}
                onUpdate={() => mutate(swrKey)}
            />

            <DeleteConfirmationModal
                show={showDeleteModal}
                onHide={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                item={itemToDelete}
                isDeleting={isDeleting}
            />
        </div>
    )
}
