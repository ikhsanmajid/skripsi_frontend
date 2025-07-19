export type UserDetail = {
    id: number
    name: string
    emp_number: string
    face_directory: string
    is_active: boolean
    rfid: {
        id: number,
        number: string | null
    } | null
}

export type User = {
    id: number
    emp_number: string
    name: string
    is_active: boolean
    face_directory: string | null
    idRfidUser: number | null
    rfid: {
        id: number | undefined,
        number: string | undefined
    } | null
}