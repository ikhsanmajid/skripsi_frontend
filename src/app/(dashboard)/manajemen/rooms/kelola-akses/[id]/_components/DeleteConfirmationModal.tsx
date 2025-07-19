"use client"

import {
    Button,
    Spinner,
    Modal
} from "react-bootstrap"
import { ExclamationTriangleFill } from "react-bootstrap-icons"
import { type AccessUser } from "../page"



export const DeleteConfirmationModal = ({ show, onHide, onConfirm, item, isRevoking }: {
    show: boolean,
    onHide: () => void,
    onConfirm: () => void,
    item: AccessUser | null,
    isRevoking: boolean
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
                Apakah Anda yakin ingin menghapus akses user: <strong>{item.name}</strong>?
                <br />
                <span className="text-danger">Tindakan ini tidak dapat dibatalkan.</span>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide} disabled={isRevoking}>
                    Batal
                </Button>
                <Button variant="danger" onClick={onConfirm} disabled={isRevoking}>
                    {isRevoking ? <Spinner as="span" animation="border" size="sm" /> : 'Ya, Hapus'}
                </Button>
            </Modal.Footer>
        </Modal>
    )
}