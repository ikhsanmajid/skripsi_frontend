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
import api from "@/lib/axios"
import { z } from "zod"

const rfidCreateSchema = z.object({
    number: z.string().min(8, "Nomor kartu RFID harus 8 karakter").max(8, "Nomor kartu RFID harus 8 karakter"),
});

export const RfidAddModal = ({ show, onHide, onUpdate }: { show: boolean; onHide: () => void; onUpdate: () => void; }) => {
    const [number, setNumber] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string | undefined>>({});

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        // [PERBAIKAN] Validasi menggunakan skema baru
        const validationResult = rfidCreateSchema.safeParse({ number });
        if (!validationResult.success) {
            const formattedErrors: Record<string, string> = {};
            validationResult.error.issues.forEach(issue => {
                formattedErrors[issue.path[0]] = issue.message;
            });
            setErrors(formattedErrors);
            return;
        }

        setIsSubmitting(true);
        const toastId = toast.loading("Menambahkan RFID baru...");

        try {
            const response = await api.post('/rfid/create', { number });
            if (response.data && response.data.status === 'success') {
                toast.update(toastId, { render: "RFID berhasil ditambahkan!", type: "success", isLoading: false, autoClose: 3000 });
                onUpdate();
                onHide();
            } else {
                throw new Error(response.data.message || "Gagal menambahkan RFID.");
            }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any ) {
            const errorMessage = err.response?.data?.message || err.message || "Terjadi kesalahan.";
            toast.update(toastId, { render: errorMessage, type: "error", isLoading: false, autoClose: 5000 });
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        if (!show) {
            setNumber('');
            setErrors({});
        }
    }, [show]);

    return (
        <Modal show={show} onHide={onHide} centered backdrop="static">
            <Form noValidate onSubmit={handleSubmit}>
                <Modal.Header closeButton>
                    <Modal.Title>Tambah RFID Baru</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group controlId="formAddRfidNumber">
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
                            placeholder="Contoh: AFA1617B"
                        />
                        <Form.Control.Feedback type="invalid">{errors.number}</Form.Control.Feedback>
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