/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import { useState, useEffect, useRef } from "react"
import {
    Button,
    Form,
    Row,
    Col,
    Spinner,
    Modal,
    Image
} from "react-bootstrap"
import { CloudUpload } from "react-bootstrap-icons"
import { toast } from 'react-toastify'
import { z } from "zod"
import api from "@/lib/axios"
import { type User } from "../../../../../../types/user"
import AsyncSelect from 'react-select/async'

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

type OptionType = {
    value: string;
    label: string;
}

const loadOptions = async (inputValue: string): Promise<OptionType[]> => {
    try {
        const response = await api.get("/rfid/getUnassigned", {
            params: { keyword: inputValue },
        });

        //console.log("keyword: ", inputValue)

        const data = response.data.data ?? [];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return data.map((item: any) => ({
            value: item.id,
            label: item.number
        }))
    } catch (error) {
        toast.error("Fetching data RFID gagal")
        console.error("Fetching error: ", error)
        return [];
    }
}


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

export const UserEditModal = ({ show, onHide, user, onUpdate }: {
    show: boolean,
    onHide: () => void,
    user: User | null,
    onUpdate: () => void
}) => {
    const [formData, setFormData] = useState<{ name: string, emp_number: string, rfid: { value: string | null, label: string | null } | null }>({ name: '', emp_number: '', rfid: null });
    const [isActive, setIsActive] = useState(true);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [errors, setErrors] = useState<Record<string, string | undefined>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (user) {
            setFormData({ name: user.name, emp_number: user.emp_number, rfid: { value: user.rfid ? String(user.rfid.id) : null, label: user.rfid ? String(user.rfid.number) : null } });
            setIsActive(user.is_active);
        }
        //console.log("data rfid user: ", user?.idRfidUser)
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
            image: imageFile
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
        if (formData.rfid?.value) {
            payload.append('rfid', formData.rfid.value);
        } else {
            payload.append('rfid', '');
        }
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
                    <Form.Group as={Row} className="mb-3" controlId="formEditRFID">
                        <Form.Label column sm={3}>RFID</Form.Label>
                        <Col sm={9}>
                            <AsyncSelect
                                name="rfid"
                                cacheOptions
                                loadOptions={loadOptions}
                                defaultOptions
                                value={
                                    formData.rfid?.value && formData.rfid?.label
                                        ? { value: formData.rfid.value, label: formData.rfid.label }
                                        : null
                                }
                                onChange={(selected) => {
                                    setFormData((prev) => ({
                                        ...prev,
                                        rfid: {
                                            value: selected?.value ?? null,
                                            label: selected?.label ?? null,
                                        },
                                    }));
                                    setErrors((prev) => ({ ...prev, rfid: undefined }));
                                }}
                                isClearable />
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
                            {imagePreview && <Image src={imagePreview} alt="Image Preview" thumbnail className="mt-3" style={{ maxWidth: '150px' }} />}
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