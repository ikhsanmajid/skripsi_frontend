/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
    Container,
    Card,
    Form,
    Row,
    Col,
    Button,
    Spinner,
} from "react-bootstrap"
import { PersonPlusFill, ArrowLeft } from "react-bootstrap-icons"
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { z } from "zod"

import api from "@/lib/axios"

const userCreateSchema = z.object({
    username: z.string().min(8, "Username minimal 8 karakter"),
    password: z.string()
        .min(8, "Password minimal 8 karakter")
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
            "Password harus mengandung huruf besar, huruf kecil, angka, dan simbol"
        ),
    role: z.enum(["ADMIN", "AUDITOR"], {message: "Wajib pilih satu"})
});


export default function UserLoginCreatePage() {
    const router = useRouter()
    const [formData, setFormData] = useState({ username: '', password: '', role: '' })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errors, setErrors] = useState<Record<string, string | undefined>>({});



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setErrors({});

        const validationResult = userCreateSchema.safeParse({
            username: formData.username,
            password: formData.password,
            role: formData.role,
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
        payload.append('username', formData.username)
        payload.append('password', formData.password)
        payload.append('role', formData.role)
        payload.append('is_active', "true")

        try {
            const response = await api.post('/users_login/register', payload, {
                headers: { 'Content-Type': 'application/json' }
            })

            if (response.data && response.data.status === 'success') {
                toast.update(toastId, {
                    render: response.data.message || "Pengguna berhasil ditambahkan!",
                    type: "success",
                    isLoading: false,
                    autoClose: 3000
                })

                setTimeout(() => {
                    router.push('/manajemen/users-login')
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
                        <p className="text-muted">Isi detail pengguna baru di bawah ini.</p>
                        <hr />
                        <Form.Group as={Row} className="mb-3" controlId="formName">
                            <Form.Label column sm={3} md={2} className="fw-semibold">Username</Form.Label>
                            <Col sm={9} md={10}>
                                <Form.Control
                                    type="text"
                                    placeholder="Masukkan username"
                                    value={formData.username}
                                    onChange={e => {
                                        setFormData(p => ({ ...p, username: e.target.value }));
                                        setErrors(p => ({ ...p, username: undefined }));
                                    }}
                                    required
                                    disabled={isSubmitting}
                                    isInvalid={!!errors.username}
                                />
                                <Form.Control.Feedback type="invalid">{errors.username}</Form.Control.Feedback>
                            </Col>
                        </Form.Group>

                        <Form.Group as={Row} className="mb-3" controlId="formEmpNumber">
                            <Form.Label column sm={3} md={2} className="fw-semibold">Password</Form.Label>
                            <Col sm={9} md={10}>
                                <Form.Control
                                    type="password"
                                    placeholder="Masukkan Password"
                                    value={formData.password}
                                    onChange={e => {
                                        setFormData(p => ({ ...p, password: e.target.value }));
                                        setErrors(p => ({ ...p, password: undefined }));
                                    }}
                                    required
                                    disabled={isSubmitting}
                                    isInvalid={!!errors.password}
                                />
                                <Form.Control.Feedback type="invalid">{errors.password}</Form.Control.Feedback>
                            </Col>
                        </Form.Group>

                        <Form.Group as={Row} className="mb-3" controlId="formRole">
                            <Form.Label column sm={3} md={2} className="fw-semibold">Role</Form.Label>
                            <Col sm={9} md={10}>
                                <Form.Select
                                    value={formData.role}
                                    onChange={e => {
                                        setFormData(p => ({ ...p, role: e.target.value }));
                                        setErrors(p => ({ ...p, role: undefined }));
                                    }}
                                    required
                                    disabled={isSubmitting}
                                    isInvalid={!!errors.role} 
                                >
                                    <option value="">Pilih role...</option>
                                    <option value="ADMIN">Admin</option>
                                    <option value="AUDITOR">Auditor</option>
                                </Form.Select>
                                <Form.Control.Feedback type="invalid">{errors.role}</Form.Control.Feedback>
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