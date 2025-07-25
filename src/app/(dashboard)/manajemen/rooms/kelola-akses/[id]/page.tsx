/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import useSWR, { useSWRConfig } from "swr"
import AsyncSelect from 'react-select/async'
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    ColumnDef,
} from "@tanstack/react-table"
import {
    Button,
    Card,
    Row,
    Col,
    Spinner,
    InputGroup,
    Table,
    Form
} from "react-bootstrap"
import { ArrowLeft, PersonPlus, Trash, Search } from "react-bootstrap-icons"
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { use } from "react"

import api from "@/lib/axios"
import { useDebounce, useDebounceFunc } from "@/lib/debounce"
import { fetcher } from "@/lib/fetcher"
import { DeleteConfirmationModal } from "./_components/DeleteConfirmationModal"
import { useSession } from "next-auth/react"
import Pagination from "@/app/components/Pagination"

// ===== TYPE DEFINITIONS =====

type RoomDetails = {
    status: string,
    data: {
        id: number
        name: string
        secret: string
        ip_address: string
    }
}

type User = {
    id: number
    emp_number: string
    name: string
    is_active: boolean
    face_directory: string | null
    idRfidUser: number
    rfid?: {
        id: number | undefined,
        number: string | undefined
    } | null
}

// User who already has access
export type AccessUser = User;

// Options for react-select
type SelectOption = {
    value: number;
    label: string;
};

// API response structure for the access list
type AccessListResponse = {
    data: AccessUser[];
    total: number;
}

// ===== API FETCHER FUNCTIONS =====

// Fetcher for the TanStack table (access list)
const fetchAccessList = async (url: string): Promise<AccessListResponse> => {
    try {
        const { data } = await api.get(url);
        // Ensure the response has the expected structure
        return {
            data: data.data as AccessUser[],
            total: data.count,
        };
    } catch (error) {
        console.error("Failed to load access list:", error);
        toast.error("Failed to load user access list.");
        return { data: [], total: 0 };
    }
};


export default function AccessManagementPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id: roomId } = use(params)
    const { mutate } = useSWRConfig()

    const { data: session, status } = useSession()

    const [isLoadingGrant, setIsLoadingGrant] = useState<boolean>(false)

    const [selectedUser, setSelectedUser] = useState<SelectOption | null>(null);
    const [reloadUnassignedUser, setReloadUnassignedUser] = useState<number>(0)

    const [userToRevoke, setUserToRevoke] = useState<AccessUser | null>(null)
    const [showRevokeModal, setShowRevokeModal] = useState(false)
    const [isRevoking, setIsRevoking] = useState(false)

    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [accessListKeyword, setAccessListKeyword] = useState('');

    const debouncedAccessListKeyword = useDebounce(accessListKeyword, 500);


    const { data: room, error: roomError, isLoading: roomLoading } = useSWR<RoomDetails>(
        roomId ? `/rooms/${roomId}` : null,
        fetcher
    );

    // SWR Key for the access list, depends on pagination and search keyword
    const accessListSWRKey = useMemo(() => {
        if (!roomId) return null;
        const params = new URLSearchParams({
            limit: String(pagination.pageSize),
            offset: String(pagination.pageIndex * pagination.pageSize),
        });
        if (debouncedAccessListKeyword) {
            params.append('keyword', debouncedAccessListKeyword);
        }
        return `/users-rooms/accessList/${roomId}?${params.toString()}`;
    }, [roomId, pagination, debouncedAccessListKeyword]);

    // Fetch the list of users with access using the new fetcher
    const {
        data: accessData,
        error: accessError,
        isLoading: accessLoading,
    } = useSWR<AccessListResponse>(accessListSWRKey, fetchAccessList, {
        keepPreviousData: true,
        revalidateOnFocus: false,
    });

    // Reset to page 1 when filter changes
    useEffect(() => {
        if (pagination.pageIndex !== 0) {
            setPagination(p => ({ ...p, pageIndex: 0 }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedAccessListKeyword]);


    // --- ASYNC SELECT FOR ADDING USERS ---

    // Function to load user options for AsyncSelect
    const fetchUnassignedUsers = async (inputValue: string): Promise<SelectOption[]> => {
        if (!inputValue) return [];
        try {
            const { data } = await api.get(`/users-rooms/getUnassigned/${roomId}?keyword=${inputValue}`);
            const users: User[] = data.data || [];
            return users.map(user => ({
                value: user.idRfidUser,
                label: `${user.name} (${user.rfid?.number || 'No RFID'})`
            }));
        } catch (error) {
            console.error("Failed to load users:", error);
            toast.error("Failed to load user data.");
            return [];
        }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debouncedFetchUsers = useCallback(useDebounceFunc(fetchUnassignedUsers, 500), [roomId])

    // --- ACTION HANDLERS ---

    // Grant access to the selected user
    const handleGrantAccess = async () => {
        setIsLoadingGrant(true)
        if (!selectedUser) {
            toast.warn("Please select a user first.");
            return;
        }
        const toastId = toast.loading("Granting access...");
        try {
            await api.post(`/users-rooms/assign`, { idRfidUser: selectedUser.value, idRoom: roomId });
            toast.update(toastId, { render: "Access granted successfully!", type: "success", isLoading: false, autoClose: 3000 });
            setIsLoadingGrant(false)
            mutate(accessListSWRKey); // Refresh the access list table
            setReloadUnassignedUser(prev => prev + 1)
            setSelectedUser(null); // Reset selection
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || "Failed to grant access.";
            toast.update(toastId, { render: errorMessage, type: "error", isLoading: false, autoClose: 5000 });
            setIsLoadingGrant(false)
        }
    };

    // Revoke access from a user in the table
    const handleRevokeAccess = async () => {
        if (!userToRevoke) return;
        setIsRevoking(true)

        const toastId = toast.loading(`Revoking access from ${userToRevoke.name}...`);
        try {
            const response = await api.delete(`/users-rooms/unassign/${userToRevoke.id}`,);
            if (response.data && response.data.status === 'success') {
                toast.update(toastId, { render: "Akses user berhasil dicabut!", type: "success", isLoading: false, autoClose: 3000 });


                const isLastItemOnPage = accessData?.data.length === 1 && pagination.pageIndex > 0;
                if (isLastItemOnPage) {
                    setPagination(p => ({ ...p, pageIndex: p.pageIndex - 1 }));
                } else {
                    mutate(accessListSWRKey);
                }

            } else {
                throw new Error(response.data.message || "Gagal menghapus akses user.");
            }
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || "Gagal menghapus akses user.";
            toast.update(toastId, { render: errorMessage, type: "error", isLoading: false, autoClose: 5000 });
        } finally {
            setIsRevoking(false);
            setShowRevokeModal(false);
            setUserToRevoke(null);
        }
    };

    // --- TANSTACK TABLE SETUP ---

    const totalRows = accessData?.total ?? 0;
    const pageCount = Math.ceil(totalRows / pagination.pageSize) || 1;

    const columns = useMemo<ColumnDef<AccessUser>[]>(
        () => [
            {
                header: "No.",
                cell: (info) => pagination.pageIndex * pagination.pageSize + info.row.index + 1,
                size: 5,
            },
            {
                accessorKey: "name",
                header: "Name",
            },
            {
                accessorKey: "emp_number",
                header: "No Karyawan",
            },
            {
                accessorKey: "rfid.number",
                header: "RFID",
                cell: ({ row }) => row.original.rfid?.number || <span className="text-muted">No RFID</span>,
            },
            {
                header: "Aksi",
                size: 120,
                cell: ({ row }) => (
                    <Button variant="outline-danger" disabled={status != "authenticated" || session?.user.role !== "ADMIN"} size="sm" onClick={() => {
                        setUserToRevoke(row.original)
                        setShowRevokeModal(true)
                    }}>
                        <Trash className="me-1" /> Revoke
                    </Button>
                ),
            },
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [pagination.pageIndex, pagination.pageSize, accessListSWRKey, status]
    );

    const table = useReactTable<AccessUser>({
        data: accessData?.data ?? [],
        columns,
        pageCount,
        state: { pagination },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
    });

    // --- RENDER ---

    const isOverallLoading = roomLoading;
    const isError = roomError || accessError;

    return (

        <>
            <div className="container-fluid py-3">
                <ToastContainer position="top-right" theme="colored" />

                <Row className="mb-3">
                    <Col>
                        <Button variant="light" onClick={() => router.push('/manajemen/rooms')}>
                            <ArrowLeft className="me-2" />
                            Back to Room List
                        </Button>
                    </Col>
                </Row>

                <Card className="shadow-sm">
                    <Card.Header className="p-3 bg-light">
                        <h4 className="mb-0">
                            Manage Access for Room: {room ? <strong>{room.data.name}</strong> : <Spinner as="span" size="sm" />}
                        </h4>
                    </Card.Header>
                    <Card.Body>
                        {isOverallLoading && (
                            <div className="text-center p-5">
                                <Spinner animation="border" variant="primary" />
                                <p className="mt-2">Loading data...</p>
                            </div>
                        )}

                        {isError && !isOverallLoading && (
                            <div className="text-center p-5 text-danger">
                                Failed to load data. Please try again later.
                            </div>
                        )}

                        {!isOverallLoading && !isError && (
                            <>
                                {/* Section to add access */}
                                <h5 className="mb-3">Add User Access</h5>
                                <Row className="mb-4">
                                    <Col md={6}>
                                        <InputGroup>
                                            <AsyncSelect
                                                key={reloadUnassignedUser}
                                                cacheOptions
                                                defaultOptions
                                                loadOptions={debouncedFetchUsers}
                                                placeholder="Type to search for name or RFID number..."
                                                onChange={(option) => setSelectedUser(option as SelectOption)}
                                                value={selectedUser}
                                                noOptionsMessage={({ inputValue }) =>
                                                    !inputValue ? "Start typing to search for users" : "User not found"
                                                }
                                                loadingMessage={() => "Searching..."}
                                                styles={{
                                                    control: (base) => ({ ...base, flexGrow: 1, width: "600px" }),
                                                }}
                                            />
                                            <Button variant="primary" onClick={handleGrantAccess} disabled={!selectedUser || isLoadingGrant || status != "authenticated" || session?.user.role !== "ADMIN"}>
                                                <PersonPlus className="me-2" />
                                                Grant Access
                                            </Button>
                                        </InputGroup>
                                    </Col>
                                </Row>

                                <hr />

                                {/* List of users with access */}
                                <h5 className="mb-3">Users with Access</h5>
                                <Row className="mb-3">
                                    <Col md={6}>
                                        <InputGroup>
                                            <InputGroup.Text><Search /></InputGroup.Text>
                                            <Form.Control
                                                placeholder="Search users with access..."
                                                value={accessListKeyword}
                                                onChange={(e) => setAccessListKeyword(e.target.value)}
                                            />
                                        </InputGroup>
                                    </Col>
                                </Row>

                                <div className="position-relative">
                                    {accessLoading && (
                                        <div className="position-absolute w-100 h-100 d-flex justify-content-center align-items-center" style={{ background: "rgba(255, 255, 255, 0.7)", zIndex: 10, borderRadius: '0.375rem' }}>
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
                                                            {accessError ? "Failed to load data." : "No users with access found."}
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
                                </div>
                            </>
                        )}
                    </Card.Body>
                    {totalRows > 0 && !isOverallLoading && (
                        <Card.Footer className="d-flex flex-wrap justify-content-between align-items-center p-3">
                            <Pagination<AccessUser> table={table} pagination={pagination} pageCount={pageCount} totalRows={totalRows} />
                        </Card.Footer>
                    )}
                </Card>
            </div >

            <DeleteConfirmationModal
                show={showRevokeModal}
                onHide={() => setShowRevokeModal(false)}
                onConfirm={handleRevokeAccess}
                item={userToRevoke}
                isRevoking={isRevoking}
            />
        </>
    );
}
