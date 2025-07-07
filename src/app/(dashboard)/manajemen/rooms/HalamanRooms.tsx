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
    Modal
} from "react-bootstrap"
import { PencilSquare, Trash, Search, ExclamationTriangleFill, DoorClosedFill } from "react-bootstrap-icons"
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { z } from "zod"

import api from "@/lib/axios"

// Custom hook for debouncing input.
const useDebounce = <T,>(value: T, delay: number): T => {
    const [debouncedValue, setDebouncedValue] = useState<T>(value)
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value) }, delay)
        return () => { clearTimeout(handler) }
    }, [value, delay])
    return debouncedValue
}

// Tipe data untuk Ruangan
type Room = {
    id: number
    name: string
    secret: string
    ip_address: string
}

// Skema validasi Zod untuk Ruangan
const roomCreateSchema = z.object({
  name: z.string().min(1, "Nama ruangan tidak boleh kosong"),
  secret: z.string().min(8, "Password ruangan minimal 8 karakter"),
  ip_address: z.string().ip({version: 'v4', message: "Harus berformat IPv4"}).min(1, "IP tidak boleh kosong")
})

const roomUpdateSchema = z.object({
  name: z.string().optional(),
  secret: z.string().optional(),
  ip_address: z.string().ip({version: 'v4', message: "Harus berformat IPv4"}).optional()
})


// Fetcher function for room list.
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

// Komponen Modal Tambah/Edit Ruangan (digabung menjadi satu)
const RoomModal = ({ show, onHide, room, onUpdate }: { 
    show: boolean; 
    onHide: () => void; 
    room: Room | null; 
    onUpdate: () => void; 
}) => {
    const [formData, setFormData] = useState({ name: '', secret: '', ip_address: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string | undefined>>({});
    
    const isEditMode = !!room;

    useEffect(() => {
        if (show) {
            if (isEditMode) {
                setFormData({ name: room.name, secret: room.secret, ip_address: room.ip_address });
            } else {
                setFormData({ name: '', secret: '', ip_address: '' });
            }
            setErrors({});
        }
    }, [room, show, isEditMode]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setErrors(prev => ({ ...prev, [name]: undefined }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        // Gunakan skema yang sesuai untuk validasi
        const schema = isEditMode ? roomUpdateSchema : roomCreateSchema;
        const validationResult = schema.safeParse(formData);

        if (!validationResult.success) {
            const formattedErrors: Record<string, string> = {};
            validationResult.error.issues.forEach(issue => {
                formattedErrors[issue.path[0]] = issue.message;
            });
            setErrors(formattedErrors);
            return;
        }

        setIsSubmitting(true);
        const toastId = toast.loading(isEditMode ? "Memperbarui ruangan..." : "Menambahkan ruangan...");

        try {
            const response = isEditMode
                ? await api.patch(`/rooms/update/${room.id}`, validationResult.data)
                : await api.post('/rooms/create', validationResult.data);

            if (response.data && response.data.status === 'success') {
                toast.update(toastId, { 
                    render: response.data.message || `Ruangan berhasil ${isEditMode ? 'diperbarui' : 'ditambahkan'}!`, 
                    type: "success", 
                    isLoading: false, 
                    autoClose: 3000 
                });
                onUpdate();
                onHide();
            } else {
                throw new Error(response.data.message || "Operasi gagal.");
            }
        } catch (err: any) {
            const apiResponse = err.response?.data;
            if (apiResponse?.zodErrors) {
                const backendErrors: Record<string, string> = {};
                apiResponse.zodErrors.forEach((error: { path: string, message: string }) => {
                    backendErrors[error.path] = error.message;
                });
                setErrors(backendErrors);
                toast.update(toastId, { render: "Periksa kembali isian form Anda.", type: "error", isLoading: false, autoClose: 3000 });
            } else {
                const errorMessage = apiResponse?.message || err.message || "Terjadi kesalahan.";
                toast.update(toastId, { render: errorMessage, type: "error", isLoading: false, autoClose: 5000 });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} centered backdrop="static">
            <Form noValidate onSubmit={handleSubmit}>
                <Modal.Header closeButton>
                    <Modal.Title>{isEditMode ? `Edit Ruangan: ${room.name}` : 'Tambah Ruangan Baru'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group className="mb-3" controlId="formRoomName">
                        <Form.Label>Nama Ruangan</Form.Label>
                        <Form.Control
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            isInvalid={!!errors.name}
                            placeholder="Contoh: Ruang Server"
                        />
                        <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
                    </Form.Group>
                    <Form.Group className="mb-3" controlId="formRoomSecret">
                        <Form.Label>Secret Key</Form.Label>
                        <Form.Control
                            type="text"
                            name="secret"
                            value={formData.secret}
                            onChange={handleChange}
                            required
                            isInvalid={!!errors.secret}
                            placeholder="Masukkan secret key"
                        />
                        <Form.Control.Feedback type="invalid">{errors.secret}</Form.Control.Feedback>
                    </Form.Group>
                    <Form.Group controlId="formRoomIpAddress">
                        <Form.Label>Alamat IP</Form.Label>
                        <Form.Control
                            type="text"
                            name="ip_address"
                            value={formData.ip_address}
                            onChange={handleChange}
                            required
                            isInvalid={!!errors.ip_address}
                            placeholder="Contoh: 192.168.1.100"
                        />
                        <Form.Control.Feedback type="invalid">{errors.ip_address}</Form.Control.Feedback>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onHide} disabled={isSubmitting}>Batal</Button>
                    <Button variant="primary" type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Spinner as="span" size="sm" /> : "Simpan"}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

// Komponen Modal Konfirmasi Hapus
const DeleteConfirmationModal = ({ show, onHide, onConfirm, item, isDeleting }: {
    show: boolean,
    onHide: () => void,
    onConfirm: () => void,
    item: Room | null,
    isDeleting: boolean
}) => {
    if (!item) return null;

    return (
        <Modal show={show} onHide={onHide} centered backdrop="static">
            <Modal.Header closeButton>
                <Modal.Title>
                    <ExclamationTriangleFill className="text-danger me-2" />
                    Konfirmasi Hapus
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                Apakah Anda yakin ingin menghapus ruangan: <strong>{item.name}</strong>?
                <br />
                <span className="text-danger">Tindakan ini tidak dapat dibatalkan.</span>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide} disabled={isDeleting}>
                    Batal
                </Button>
                <Button variant="danger" onClick={onConfirm} disabled={isDeleting}>
                    {isDeleting ? <Spinner as="span" animation="border" size="sm" /> : 'Ya, Hapus'}
                </Button>
            </Modal.Footer>
        </Modal>
    )
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
                        <Button variant="outline-warning" size="sm" title="Edit Ruangan" onClick={() => {
                            setItemToEdit(row.original);
                            setShowModal(true);
                        }}>
                            <PencilSquare />
                        </Button>
                        <Button variant="outline-danger" size="sm" title="Hapus Ruangan" onClick={() => {
                            setItemToDelete(row.original);
                            setShowDeleteModal(true);
                        }}>
                            <Trash />
                        </Button>
                    </div>
                ),
            },
        ],
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
                    <Button variant="primary" onClick={() => {
                        setItemToEdit(null); // Pastikan null untuk mode tambah
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
