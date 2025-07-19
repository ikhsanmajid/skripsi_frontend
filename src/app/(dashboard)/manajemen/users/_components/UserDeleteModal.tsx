"use client"

import { 
    Button, 
    Spinner, 
    Modal,
} from "react-bootstrap"
import { ExclamationTriangleFill } from "react-bootstrap-icons"
import { type User } from "../../../../../../types/user"

export const UserDeleteModal = ({ show, onHide, onConfirm, user, isDeleting }: {
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