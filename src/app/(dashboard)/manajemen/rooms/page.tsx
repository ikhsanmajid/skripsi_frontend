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
import { PencilSquare, Trash, Search, DoorClosedFill, KeyFill } from "react-bootstrap-icons"
import { ToastContainer, toast } from 'react-toastify'
import { useSession } from "next-auth/react"
import 'react-toastify/dist/ReactToastify.css'

import { RoomModal } from "./_components/RoomAddEditModal"
import { DeleteConfirmationModal } from "./_components/RoomDeleteModal"

import { useRouter } from "next/navigation"
import { useDebounce } from "@/lib/debounce"

import { type Room } from "../../../../../types/room"
import { deleteRoom, fetchRooms } from "@/services/room.service"
import Pagination from "@/app/components/Pagination"

export default function RoomsPage() {
    const [filters, setFilters] = useState({ keyword: "" });
    const debouncedKeyword = useDebounce(filters.keyword, 500);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

    const [showModal, setShowModal] = useState(false);
    const [itemToEdit, setItemToEdit] = useState<Room | null>(null);
    const [itemToDelete, setItemToDelete] = useState<Room | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const { data: session, status } = useSession()
    const router = useRouter()

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
            const response = await deleteRoom(itemToDelete.id)
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
                cell: ({ row }) => (
                    <>
                        <span>{row.original.name} (ID: {row.original.id})</span>
                    </>
                )
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
                            <PencilSquare /> Edit
                        </Button>
                        <Button disabled={session?.user.role !== "ADMIN"} variant="outline-danger" size="sm" title="Hapus Ruangan" onClick={() => {
                            setItemToDelete(row.original);
                            setShowDeleteModal(true);
                        }}>
                            <Trash /> Delete
                        </Button>
                        <Button
                            variant="outline-info"
                            size="sm"
                            title="Kelola Akses"
                            onClick={() => {
                                router.push(`/manajemen/rooms/kelola-akses/${row.original.id}`);
                            }}>
                            <KeyFill /> Kelola Akses
                        </Button>
                    </div>
                ),
            },
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [pagination.pageIndex, pagination.pageSize, swrKey, session, status]
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
                        <DoorClosedFill className="me-2" />
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
                        <Pagination<Room> table={table} pagination={pagination} totalRows={totalRows} pageCount={pageCount} isLoading={isLoading} />
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
