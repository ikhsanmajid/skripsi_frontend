/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useMemo, useState, useEffect, useRef } from "react"
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
    Modal,
    Image
} from "react-bootstrap"
import { PencilSquare, Trash, Search, InfoCircleFill, PersonPlusFill, ExclamationTriangleFill, CloudUpload } from "react-bootstrap-icons"
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { useRouter } from "next/navigation"
import { z } from "zod"

import api from "@/lib/axios"
import UserDetailModal from "./UserDetailModal"

// Custom hook for debouncing input.
const useDebounce = <T,>(value: T, delay: number): T => {
    const [debouncedValue, setDebouncedValue] = useState<T>(value)
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value) }, delay)
        return () => { clearTimeout(handler) }
    }, [value, delay])
    return debouncedValue
}

type User = {
    id: number
    emp_number: string
    name: string
    is_active: boolean
    face_directory: string | null // [PERBAIKAN] Tambahkan face_directory ke tipe
}

// Skema validasi Zod untuk form edit
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const userUpdateSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  emp_number: z.string().regex(/^\d{5}$/, "No. Karyawan harus 5 digit angka"),
  is_active: z.boolean(),
  image: z
    .any()
    .refine((file) => file === null || file instanceof File, "Input gambar tidak valid.")
    .refine((file) => file === null || file.size <= MAX_FILE_SIZE, `Ukuran gambar maksimal 5MB.`)
    .refine(
      (file) => file === null || ACCEPTED_IMAGE_TYPES.includes(file.type),
      "Hanya format .jpg, .jpeg, .png dan .webp yang didukung."
    )
    .optional(),
});


// Fetcher function for user list.
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

// Komponen Modal Edit Pengguna
const UserEditModal = ({ show, onHide, user, onUpdate }: {
    show: boolean,
    onHide: () => void,
    user: User | null,
    onUpdate: () => void
}) => {
    const [formData, setFormData] = useState({ name: '', emp_number: '' });
    const [isActive, setIsActive] = useState(true);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [errors, setErrors] = useState<Record<string, string | undefined>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (user) {
            setFormData({ name: user.name, emp_number: user.emp_number });
            setIsActive(user.is_active);
        }
        // Selalu reset state file & error saat modal dibuka/user berubah
        setImageFile(null);
        if (imagePreview) {
            URL.revokeObjectURL(imagePreview);
        }
        setImagePreview(null);
        setErrors({});
    }, [user, show]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setImageFile(file);
        if (imagePreview) {
            URL.revokeObjectURL(imagePreview);
        }
        if (file) {
            const previewUrl = URL.createObjectURL(file);
            setImagePreview(previewUrl);
            setErrors(p => ({ ...p, image: undefined }));
        } else {
            setImagePreview(null);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setErrors({});

        // Validasi client-side dengan Zod sebelum submit
        const validationResult = userUpdateSchema.safeParse({
            name: formData.name,
            emp_number: formData.emp_number,
            is_active: isActive,
            image: imageFile,
        });

        if (!validationResult.success) {
            const formattedErrors: Record<string, string> = {};
            validationResult.error.issues.forEach(issue => {
                formattedErrors[issue.path[0]] = issue.message;
            });
            setErrors(formattedErrors);
            return;
        }

        setIsUpdating(true);
        const toastId = toast.loading("Memperbarui data pengguna...");

        const payload = new FormData();
        payload.append('name', formData.name);
        payload.append('emp_number', formData.emp_number);
        payload.append('is_active', String(isActive));

        if (imageFile) {
            payload.append('image', imageFile);
        }

        try {
            const response = await api.patch(`/users/update/${user.id}`, payload, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data && response.data.status === 'success') {
                const wasImageUploaded = !!imageFile;
                const isFaceNotDetected = response.data.fileMsg === "Data muka tidak terdeteksi";

                toast.update(toastId, {
                    render: response.data.message || "Data pengguna berhasil diperbarui!",
                    type: "success",
                    isLoading: false,
                    autoClose: 2500
                });

                onUpdate();

                if (wasImageUploaded && isFaceNotDetected) {
                    toast.warn("Foto tidak diubah: Wajah tidak terdeteksi. Silakan coba foto lain.", { autoClose: 6000 });
                } else {
                    if (wasImageUploaded && response.data.fileMsg) {
                        toast.warn(response.data.fileMsg, { autoClose: 5000 });
                    }
                    onHide();
                }
            } else {
                // Asumsikan error jika status bukan 'success'
                throw new Error(response.data.message || "Gagal memperbarui data.");
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
                let displayMessage = apiResponse?.message || err.message || "Terjadi kesalahan.";
                if (typeof displayMessage === 'string' && displayMessage.includes("Users_emp_number_key")) {
                    displayMessage = "Nomor karyawan sudah terdaftar. Silakan gunakan nomor lain.";
                }
                toast.update(toastId, { render: displayMessage, type: "error", isLoading: false, autoClose: 5000 });
            }
        } finally {
            setIsUpdating(false);
        }
    };

    if (!user) return null;

    return (
        <Modal show={show} onHide={onHide} size="lg" centered backdrop="static">
            <Form noValidate onSubmit={handleUpdate}>
                <Modal.Header closeButton>
                    <Modal.Title>Edit Pengguna: {user.name}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group as={Row} className="mb-3" controlId="formEditName">
                        <Form.Label column sm={3}>Nama</Form.Label>
                        <Col sm={9}>
                            <Form.Control 
                                type="text" 
                                value={formData.name} 
                                onChange={e => {
                                    setFormData(p => ({ ...p, name: e.target.value }));
                                    setErrors(p => ({ ...p, name: undefined }));
                                }} 
                                required 
                                isInvalid={!!errors.name}
                            />
                            <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
                        </Col>
                    </Form.Group>
                    <Form.Group as={Row} className="mb-3" controlId="formEditEmpNumber">
                        <Form.Label column sm={3}>No. Karyawan</Form.Label>
                        <Col sm={9}>
                            <Form.Control 
                                type="text" 
                                value={formData.emp_number} 
                                maxLength={5}
                                onChange={e => {
                                    setFormData(p => ({ ...p, emp_number: e.target.value }));
                                    setErrors(p => ({ ...p, emp_number: undefined }));
                                }} 
                                required 
                                isInvalid={!!errors.emp_number}
                            />
                            <Form.Control.Feedback type="invalid">{errors.emp_number}</Form.Control.Feedback>
                        </Col>
                    </Form.Group>
                    <Form.Group as={Row} className="mb-3">
                        <Form.Label column sm={3}>Status</Form.Label>
                        <Col sm={9}>
                            <Form.Check 
                                type="switch" 
                                id="edit-is-active" 
                                label={isActive ? "Aktif" : "Tidak Aktif"} 
                                checked={isActive} 
                                onChange={e => setIsActive(e.target.checked)} 
                            />
                        </Col>
                    </Form.Group>
                    <Form.Group as={Row} className="mb-3">
                        <Form.Label column sm={3}>Ganti Foto</Form.Label>
                        <Col sm={9}>
                            <Form.Control 
                                type="file" 
                                accept="image/*" 
                                onChange={handleImageChange} 
                                ref={fileInputRef} 
                                className="d-none" 
                                isInvalid={!!errors.image}
                            />
                            <Button variant="outline-secondary" onClick={() => fileInputRef.current?.click()}>
                                <CloudUpload className="me-2" /> Pilih Gambar...
                            </Button>
                            <Form.Control.Feedback type="invalid" className="d-block">{errors.image}</Form.Control.Feedback>
                            {imagePreview && <Image src={imagePreview} thumbnail className="mt-3" style={{ maxWidth: '150px' }} />}
                        </Col>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onHide} disabled={isUpdating}>Batal</Button>
                    <Button variant="primary" type="submit" disabled={isUpdating}>
                        {isUpdating ? <Spinner as="span" size="sm" /> : "Simpan Perubahan"}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};


// Komponen Modal Konfirmasi Hapus
const DeleteConfirmationModal = ({ show, onHide, onConfirm, user, isDeleting }: {
    show: boolean,
    onHide: () => void,
    onConfirm: () => void,
    user: User | null,
    isDeleting: boolean
}) => {
    if (!user) return null;

    return (
        <Modal show={show} onHide={onHide} centered backdrop="static">
            <Modal.Header closeButton>
                <Modal.Title>
                    <ExclamationTriangleFill className="text-danger me-2" />
                    Konfirmasi Hapus
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                Apakah Anda yakin ingin menghapus pengguna: <strong>{user.name}</strong>?
                <br />
                <span className="text-danger">Tindakan ini tidak dapat dibatalkan.</span>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide} disabled={isDeleting}>
                    Batal
                </Button>
                <Button variant="danger" onClick={onConfirm} disabled={isDeleting}>
                    {isDeleting ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> : 'Ya, Hapus'}
                </Button>
            </Modal.Footer>
        </Modal>
    )
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

    // Reset pagination ke halaman pertama setiap kali filter berubah
    useEffect(() => {
        if (pagination.pageIndex !== 0) {
            setPagination(p => ({ ...p, pageIndex: 0 }));
        }
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
                        <Button variant="outline-warning" size="sm" title="Edit Pengguna" onClick={() => {
                            setUserToEdit(row.original)
                            setShowEditModal(true)
                        }}>
                            <PencilSquare />
                        </Button>
                        <Button variant="outline-danger" size="sm" title="Hapus Pengguna" onClick={() => {
                            setUserToDelete(row.original)
                            setShowDeleteModal(true)
                        }}>
                            <Trash />
                        </Button>
                    </div>
                ),
            },
        ],
        [pagination.pageIndex, pagination.pageSize, swrKey]
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
                    <Button variant="primary" onClick={() => router.push("/manajemen/users/create")}>
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
                                    placeholder="Cari berdasarkan nama atau no. karyawan..."
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

            <DeleteConfirmationModal
                show={showDeleteModal}
                onHide={() => setShowDeleteModal(false)}
                onConfirm={handleDeleteUser}
                user={userToDelete}
                isDeleting={isDeleting}
            />
        </div>
    )
}
