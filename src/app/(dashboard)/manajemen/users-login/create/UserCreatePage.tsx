/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { 
    Container, 
    Card, 
    Form, 
    Row, 
    Col, 
    Button, 
    Spinner, 
    Image 
} from "react-bootstrap"
import { PersonPlusFill, ArrowLeft, CloudUpload } from "react-bootstrap-icons"
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { z } from "zod"

import api from "@/lib/axios"

const MAX_FILE_SIZE = 5 * 1024 * 1024; 
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const userCreateSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  emp_number: z.string().regex(/^\d{5}$/, "No. Karyawan harus 5 digit angka"),
  image: z
    .any()
    .refine((file) => file === null || file instanceof File, "Input tidak valid.")
    .refine((file) => file === null || file.size <= MAX_FILE_SIZE, `Ukuran gambar maksimal 5MB.`)
    .refine(
      (file) => file === null || ACCEPTED_IMAGE_TYPES.includes(file.type),
      "Hanya format .jpg, .jpeg, .png dan .webp yang didukung."
    )
    .optional(),
});


export default function UserCreatePage() {
    const router = useRouter()
    const [formData, setFormData] = useState({ name: '', emp_number: '' })
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errors, setErrors] = useState<Record<string, string | undefined>>({});
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setImageFile(file)
        
        if (imagePreview) {
            URL.revokeObjectURL(imagePreview)
        }
        
        if (file) {
            const previewUrl = URL.createObjectURL(file)
            setImagePreview(previewUrl)
            setErrors(prev => ({ ...prev, image: undefined }));
        } else {
            setImagePreview(null)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setErrors({}); 

        const validationResult = userCreateSchema.safeParse({
            name: formData.name,
            emp_number: formData.emp_number,
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

        setIsSubmitting(true)
        const toastId = toast.loading("Menambahkan pengguna baru...")

        const payload = new FormData()
        payload.append('name', formData.name)
        payload.append('emp_number', formData.emp_number)
        if (imageFile) {
            payload.append('image', imageFile)
        }

        try {
            const response = await api.post('/users/create', payload, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })

            if (response.data && response.data.status === 'success') {
                toast.update(toastId, {
                    render: response.data.message || "Pengguna berhasil ditambahkan!",
                    type: "success",
                    isLoading: false,
                    autoClose: 3000
                })

                if (imageFile && response.data.fileMsg) {
                    toast.warn(response.data.fileMsg, { autoClose: 5000 })
                }

                setTimeout(() => {
                    router.push('/manajemen/users')
                }, 1500)

            } else {
                throw new Error(response.data.message || "Gagal menambahkan pengguna.")
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
            setIsSubmitting(false)
        }
    }

    return (
        <Container fluid className="py-3">
            <ToastContainer position="top-right" theme="colored" />

            <Row className="mb-3 align-items-center">
                <Col xs="auto">
                    <Button variant="outline-secondary" onClick={() => router.back()}>
                        <ArrowLeft /> Kembali
                    </Button>
                </Col>
                <Col>
                    <h4 className="mb-0">Tambah Pengguna Baru</h4>
                </Col>
            </Row>

            <Card className="shadow-sm">
                <Form noValidate onSubmit={handleSubmit}>
                    <Card.Body>
                        <p className="text-muted">Isi detail pengguna baru di bawah ini. Foto bersifat opsional dan dapat ditambahkan nanti.</p>
                        <hr/>
                        <Form.Group as={Row} className="mb-3" controlId="formName">
                            <Form.Label column sm={3} md={2} className="fw-semibold">Nama</Form.Label>
                            <Col sm={9} md={10}>
                                <Form.Control
                                    type="text"
                                    placeholder="Masukkan nama lengkap"
                                    value={formData.name}
                                    onChange={e => {
                                        setFormData(p => ({ ...p, name: e.target.value }));
                                        setErrors(p => ({ ...p, name: undefined }));
                                    }}
                                    required
                                    disabled={isSubmitting}
                                    isInvalid={!!errors.name}
                                />
                                <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
                            </Col>
                        </Form.Group>

                        <Form.Group as={Row} className="mb-3" controlId="formEmpNumber">
                            <Form.Label column sm={3} md={2} className="fw-semibold">No. Karyawan</Form.Label>
                            <Col sm={9} md={10}>
                                <Form.Control
                                    type="text"
                                    placeholder="Masukkan nomor karyawan"
                                    value={formData.emp_number}
                                    maxLength={5}
                                    onChange={e => {
                                        setFormData(p => ({ ...p, emp_number: e.target.value }));
                                        setErrors(p => ({ ...p, emp_number: undefined }));
                                    }}
                                    required
                                    disabled={isSubmitting}
                                    isInvalid={!!errors.emp_number}
                                />
                                <Form.Control.Feedback type="invalid">{errors.emp_number}</Form.Control.Feedback>
                            </Col>
                        </Form.Group>

                        <Form.Group as={Row} className="mb-3" controlId="formImage">
                            <Form.Label column sm={3} md={2} className="fw-semibold">Foto Wajah</Form.Label>
                            <Col sm={9} md={10}>
                                <Form.Control
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    ref={fileInputRef}
                                    className="d-none"
                                    disabled={isSubmitting}
                                    isInvalid={!!errors.image}
                                />
                                <Button variant="outline-secondary" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}>
                                    <CloudUpload className="me-2" />
                                    {imageFile ? "Ganti Gambar..." : "Pilih Gambar..."}
                                </Button>
                                <Form.Control.Feedback type="invalid" className="d-block">{errors.image}</Form.Control.Feedback>
                                {imagePreview && (
                                    <div className="mt-3">
                                        <Image alt="Image Preview" src={imagePreview} thumbnail style={{ maxWidth: '150px' }} />
                                    </div>
                                )}
                            </Col>
                        </Form.Group>

                    </Card.Body>
                    <Card.Footer className="text-end">
                        <Button variant="secondary" className="me-2" onClick={() => router.push('/manajemen/users')} disabled={isSubmitting}>
                            Batal
                        </Button>
                        <Button variant="primary" type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                                    <span className="ms-2">Menyimpan...</span>
                                </>
                            ) : (
                                <>
                                    <PersonPlusFill className="me-2" />
                                    Simpan Pengguna
                                </>
                            )}
                        </Button>
                    </Card.Footer>
                </Form>
            </Card>
        </Container>
    )
}