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
import api from "@/lib/axios"
import { type Rfid } from "../page"

const rfidUpdateSchema = z.object({
    number: z.string().min(8, "Nomor kartu RFID harus 8 karakter").max(8, "Nomor kartu RFID harus 8 karakter").optional(),
    is_active: z.enum(["true", "false"]).optional()
});

export const RfidEditModal = ({ show, onHide, rfid, onUpdate }: { show: boolean; onHide: () => void; rfid: Rfid | null; onUpdate: () => void; }) => {
    const [number, setNumber] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [errors, setErrors] = useState<Record<string, string | undefined>>({});

    useEffect(() => {
        if (rfid) {
            setNumber(rfid.number);
            setIsActive(rfid.is_active);
            setErrors({});
        }
    }, [rfid, show]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rfid) return;
        setErrors({});

        const validationResult = rfidUpdateSchema.safeParse({ number, is_active: String(isActive) });
        if (!validationResult.success) {
            const formattedErrors: Record<string, string> = {};
            validationResult.error.issues.forEach(issue => {
                formattedErrors[issue.path[0]] = issue.message;
            });
            setErrors(formattedErrors);
            return;
        }

        setIsUpdating(true);
        const toastId = toast.loading("Memperbarui RFID...");

        try {
            const payload = {
                number: number,
                is_active: String(isActive)
            };
            const response = await api.patch(`/rfid/update/${rfid.id}`, payload);

            if (response.data && response.data.status === 'success') {
                toast.update(toastId, { render: "RFID berhasil diperbarui!", type: "success", isLoading: false, autoClose: 3000 });
                onUpdate();
                onHide();
            } else {
                throw new Error(response.data.message || "Gagal memperbarui RFID.");
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
            setIsUpdating(false);
        }
    };

    if (!rfid) return null;

    return (
        <Modal show={show} onHide={onHide} centered backdrop="static">
            <Form noValidate onSubmit={handleUpdate}>
                <Modal.Header closeButton>
                    <Modal.Title>Edit RFID: {rfid.number}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group className="mb-3" controlId="formEditRfidNumber">
                        <Form.Label>Nomor RFID</Form.Label>
                        <Form.Control
                            type="text"
                            value={number}
                            maxLength={8}
                            onChange={e => {
                                setNumber(e.target.value);
                                setErrors(p => ({ ...p, number: undefined }));
                            }}
                            required
                            isInvalid={!!errors.number}
                        />
                        <Form.Control.Feedback type="invalid">{errors.number}</Form.Control.Feedback>
                    </Form.Group>
                    <Form.Group>
                        <Form.Check
                            type="switch"
                            id="edit-rfid-is-active"
                            label={isActive ? "Aktif" : "Tidak Aktif"}
                            checked={isActive}
                            onChange={e => setIsActive(e.target.checked)}
                        />
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