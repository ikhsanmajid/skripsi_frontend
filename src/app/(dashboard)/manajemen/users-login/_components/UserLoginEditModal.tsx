"use client"

import { useState, useEffect } from "react"
import {
    Button,
    Form,
    Row,
    Col,
    Spinner,
    Modal,
    InputGroup,
} from "react-bootstrap"
import { Eye, EyeSlash } from "react-bootstrap-icons"
import { toast } from 'react-toastify'
import { z } from "zod"
import api from "@/lib/axios"
import { Role, type User } from "../page"


const userUpdateSchema = z.object({
    username: z.string().min(8, "Username minimal 8 karakter"),
    password: z
        .string()
        .superRefine((password, ctx) => {
            if (password === "default") {
                return z.NEVER
            } else {

                // Jika password < 8 karakter
                if (password.length < 8 && password !== "") {
                    ctx.addIssue({
                        code: "custom",
                        message: "Password harus lebih dari 8 karakter",
                    })
                }

                // Jika password tidak terdapat angka
                if (!password.match(".*[0-9].*")) {
                    ctx.addIssue({
                        code: "custom",
                        message: "Password minimal terdapat 1 angka",
                    })
                }

                // Jika password tidak terdapat simbol
                if (!password.match(".*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?].*")) {
                    ctx.addIssue({
                        code: "custom",
                        message: "Password minimal terdapat 1 simbol",
                    })
                }

                // Jika password tidak terdapat huruf kapital
                if (!password.match(".*[A-Z].*")) {
                    ctx.addIssue({
                        code: "custom",
                        message: "Password minimal terdapat 1 huruf kapital",
                    });
                }
            }
        }),
    role: z.enum(["ADMIN", "AUDITOR"], { message: "Wajib pilih satu" }),
    is_active: z.boolean().optional()
});

export const UserEditModal = ({ show, onHide, user, onUpdate }: {
    show: boolean,
    onHide: () => void,
    user: User | null,
    onUpdate: () => void
}) => {
    const [formData, setFormData] = useState<{ username: string, password: string, role: Role | '', is_active: boolean | undefined }>({ username: '', password: '', role: '', is_active: undefined });
    const [isUpdating, setIsUpdating] = useState(false);
    const [errors, setErrors] = useState<Record<string, string | undefined>>({});

    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({ username: user.username, password: 'default', role: user.role as Role, is_active: user.is_active });
        }
        setErrors({});
    }, [user, show]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setErrors({});

        // Validasi client-side dengan Zod sebelum submit
        const validationResult = userUpdateSchema.safeParse({
            username: formData.username,
            password: formData.password,
            role: formData.role,
            is_active: formData.is_active
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
        payload.append('username', formData.username);
        payload.append('password', formData.password);
        payload.append('role', String(formData.role));
        payload.append('is_active', formData.is_active ? "true" : "false");

        try {
            const response = await api.patch(`/users_login/update/${user.id}`, payload, {
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.data && response.data.status === 'success') {
                toast.update(toastId, {
                    render: response.data.message || "Data pengguna berhasil diperbarui!",
                    type: "success",
                    isLoading: false,
                    autoClose: 2500
                });

                onUpdate();

            } else {
                // Asumsikan error jika status bukan 'success'
                throw new Error(response.data.message || "Gagal memperbarui data.");
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                    <Modal.Title>Edit Pengguna: {user.username}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group as={Row} className="mb-3" controlId="formEditUserName">
                        <Form.Label column sm={3}>Nama</Form.Label>
                        <Col sm={9}>
                            <Form.Control
                                type="text"
                                value={formData.username}
                                onChange={e => {
                                    setFormData(p => ({ ...p, username: e.target.value }));
                                    setErrors(p => ({ ...p, username: undefined }));
                                }}
                                required
                                isInvalid={!!errors.username}
                            />
                            <Form.Control.Feedback type="invalid">{errors.username}</Form.Control.Feedback>
                        </Col>
                    </Form.Group>
                    <Form.Group as={Row} className="mb-3" controlId="formEditPassword">
                        <Form.Label column sm={3}>Password</Form.Label>
                        <Col sm={9}>
                            <InputGroup>
                                <Form.Control
                                    type={showPassword ? "text" : "password"}
                                    value={formData.password}
                                    onChange={e => {
                                        setFormData(p => ({ ...p, password: e.target.value }));
                                        setErrors(p => ({ ...p, password: undefined }));
                                    }}
                                    required
                                    isInvalid={!!errors.password}
                                />
                                <Button
                                    variant="outline-secondary"
                                    onClick={() => setShowPassword(prev => !prev)}
                                    tabIndex={-1}                                 >
                                    {showPassword ? <EyeSlash /> : <Eye />}
                                </Button>
                                <Form.Control.Feedback type="invalid">{errors.password}</Form.Control.Feedback>
                            </InputGroup>
                        </Col>
                    </Form.Group>
                    <Form.Group as={Row} className="mb-3" controlId="formEditActive">
                        <Form.Label column sm={3}>Status Aktif</Form.Label>
                        <Col sm={9} className="d-flex align-items-center">
                            <Form.Check
                                type="switch"
                                id="edit-user-is-active"
                                label=""
                                checked={!!formData.is_active}
                                onChange={e => {
                                    setFormData(p => ({ ...p, is_active: e.target.checked }));
                                    setErrors(p => ({ ...p, is_active: undefined }));
                                }}
                            />
                            <span className="ms-2">{formData.is_active ? "Aktif" : "Tidak Aktif"}</span>
                        </Col>
                    </Form.Group>
                    <Form.Group as={Row} className="mb-3" controlId="formEditRole">
                        <Form.Label column sm={3}>Role</Form.Label>
                        <Col sm={9}>
                            <Form.Select
                                value={formData.role as Role}
                                onChange={e => {
                                    setFormData(p => ({ ...p, role: e.target.value as Role }));
                                    setErrors(p => ({ ...p, role: undefined }));
                                }}
                                required
                                disabled={isUpdating}
                                isInvalid={!!errors.role}
                            >
                                <option value="">Pilih role...</option>
                                <option value="ADMIN">Admin</option>
                                <option value="AUDITOR">Auditor</option>
                            </Form.Select>
                            <Form.Control.Feedback type="invalid">{errors.role}</Form.Control.Feedback>
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