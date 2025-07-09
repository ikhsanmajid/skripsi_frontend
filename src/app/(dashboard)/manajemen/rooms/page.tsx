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
import { PencilSquare, Trash, Search, DoorClosedFill } from "react-bootstrap-icons"
import { ToastContainer, toast } from 'react-toastify'
import { useSession } from "next-auth/react"
import 'react-toastify/dist/ReactToastify.css'

import { RoomModal } from "./_components/RoomAddEditModal"
import { DeleteConfirmationModal } from "./_components/RoomDeleteModal"

import api from "@/lib/axios"

const useDebounce = <T,>(value: T, delay: number): T => {
    const [debouncedValue, setDebouncedValue] = useState<T>(value)
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value) }, delay)
        return () => { clearTimeout(handler) }
    }, [value, delay])
    return debouncedValue
}

export type Room = {
    id: number
    name: string
    secret: string
    ip_address: string
}

const fetchRooms = async (url: string) => {
    try {
        const { data } = await api.get(url)
        return {
            data: data.data as Room[],
            total: data.count,
        }
    } catch (error) {
        console.error("Gagal memuat ruangan:", error)
        toast.error("Gagal memuat data ruangan.")
        return { data: [], total: 0 }
    }
}

export default function RoomsPage() {
    const [filters, setFilters] = useState({ keyword: "" });
    const debouncedKeyword = useDebounce(filters.keyword, 500);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    
    const [showModal, setShowModal] = useState(false);
    const [itemToEdit, setItemToEdit] = useState<Room | null>(null);
    const [itemToDelete, setItemToDelete] = useState<Room | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const { data: session } = useSession()

    const { mutate } = useSWRConfig();
    
    const swrKey = useMemo(() => {
        const params = new URLSearchParams({
            limit: String(pagination.pageSize),
            offset: String(pagination.pageIndex * pagination.pageSize),
        });
        if (debouncedKeyword) params.append('keyword', debouncedKeyword);
        return `rooms?${params.toString()}`;
    }, [pagination, debouncedKeyword]);

    const { data, isLoading, error } = useSWR(swrKey, fetchRooms, { 
        keepPreviousData: true, 
        revalidateOnFocus: false 
    });
    
    useEffect(() => {
        if (pagination.pageIndex !== 0) {
            setPagination(p => ({ ...p, pageIndex: 0 }));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedKeyword]);

    const totalRows = data?.total ?? 0;
    const pageCount = Math.ceil(totalRows / pagination.pageSize) || 1;
    
    const handleDelete = async () => {
        if (!itemToDelete) return;

        setIsDeleting(true);
        const toastId = toast.loading(`Menghapus ${itemToDelete.name}...`);

        try {
            const response = await api.delete(`/rooms/delete/${itemToDelete.id}`);
            if (response.data && response.data.status === 'success') {
                toast.update(toastId, { render: "Ruangan berhasil dihapus!", type: "success", isLoading: false, autoClose: 3000 });
                
                const isLastItemOnPage = data?.data.length === 1 && pagination.pageIndex > 0;
                if (isLastItemOnPage) {
                    setPagination(p => ({ ...p, pageIndex: p.pageIndex - 1 }));
                } else {
                    mutate(swrKey);
                }
            } else {
                throw new Error(response.data.message || "Gagal menghapus ruangan.");
            }
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || "Gagal menghapus ruangan.";
            toast.update(toastId, { render: errorMessage, type: "error", isLoading: false, autoClose: 5000 });
        } finally {
            setIsDeleting(false);
            setShowDeleteModal(false);
            setItemToDelete(null);
        }
    };

    const columns = useMemo<ColumnDef<Room>[]>(
        () => [
            {
                header: "No.",
                cell: (info) => pagination.pageIndex * pagination.pageSize + info.row.index + 1,
                size: 5,
            },
            {
                accessorKey: "name",
                header: "Nama Ruangan",
            },
            {
                accessorKey: "secret",
                header: "Secret Key",
            },
            {
                accessorKey: "ip_address",
                header: "Alamat IP",
            },
            {
                header: "Aksi",
                size: 120,
                cell: ({ row }) => (
                    <div className="d-flex gap-2">
                        <Button disabled={session?.user.role !== "ADMIN"} variant="outline-warning" size="sm" title="Edit Ruangan" onClick={() => {
                            setItemToEdit(row.original);
                            setShowModal(true);
                        }}>
                            <PencilSquare />
                        </Button>
                        <Button disabled={session?.user.role !== "ADMIN"} variant="outline-danger" size="sm" title="Hapus Ruangan" onClick={() => {
                            setItemToDelete(row.original);
                            setShowDeleteModal(true);
                        }}>
                            <Trash />
                        </Button>
                    </div>
                ),
            },
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [pagination.pageIndex, pagination.pageSize, swrKey]
    );

    const table = useReactTable<Room>({
        data: data?.data ?? [],
        columns,
        pageCount,
        state: { pagination },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
    });

    return (
        <div className="container-fluid py-3">
            <ToastContainer position="top-right" theme="colored" />

            <Row className="mb-3 align-items-center">
                <Col>
                    <h4 className="mb-0">Manajemen Ruangan</h4>
                </Col>
                <Col xs="auto">
                    <Button disabled={session?.user.role !== "ADMIN"} variant="primary" onClick={() => {
                        setItemToEdit(null);
                        setShowModal(true);
                    }}>
                        <DoorClosedFill className="me-2"/>
                        Tambah Ruangan
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
                                    placeholder="Cari berdasarkan nama, secret, atau IP..."
                                    value={filters.keyword}
                                    onChange={(e) => setFilters({ keyword: e.target.value })}
                                />
                            </InputGroup>
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

            <RoomModal
                show={showModal}
                onHide={() => setShowModal(false)}
                room={itemToEdit}
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
