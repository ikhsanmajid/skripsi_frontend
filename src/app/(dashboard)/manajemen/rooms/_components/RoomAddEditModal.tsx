"use client"

import { useState, useEffect } from "react"
import {
    Button,
    Form,
    Spinner,
    Modal
} from "react-bootstrap"
import { toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { z } from "zod"
import { type Room } from "../page"

import api from "@/lib/axios"

const roomCreateSchema = z.object({
    name: z.string().min(1, "Nama ruangan tidak boleh kosong"),
    secret: z.string().min(8, "Password ruangan minimal 8 karakter"),
    ip_address: z.string().ip({ version: 'v4', message: "Harus berformat IPv4" }).min(1, "IP tidak boleh kosong")
})

const roomUpdateSchema = z.object({
    name: z.string().optional(),
    secret: z.string().optional(),
    ip_address: z.string().ip({ version: 'v4', message: "Harus berformat IPv4" }).optional()
})

export const RoomModal = ({ show, onHide, room, onUpdate }: {
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