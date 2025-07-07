import { toast } from "react-toastify"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function showError(error: any) {
  const message = error?.response?.data?.message || error?.message || "Unknown error"
  toast.error(message, {
    position: "bottom-right",
    autoClose: 1500,
    closeButton: false,
    
  })
}