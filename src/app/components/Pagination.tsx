import { Table } from "@tanstack/react-table"

export default function Pagination<TData>({ table, pagination, totalRows, pageCount }: { table: Table<TData>, pagination: { pageIndex: number, pageSize: number }, totalRows: number, pageCount: number }) {
    return (<>
        <span className="text-muted small">
            Menampilkan{' '}
            <strong>{table.getRowModel().rows.length > 0 ? pagination.pageIndex * pagination.pageSize + 1 : 0}</strong>
            {' - '}
            <strong>{pagination.pageIndex * pagination.pageSize + table.getRowModel().rows.length}</strong>
            {' '}dari <strong>{totalRows}</strong> data
        </span>

        <nav className="d-flex align-items-center gap-2">
            <ul className="pagination mb-0">
                <li className={`page-item ${!table.getCanPreviousPage() ? "disabled" : ""}`}>
                    <button className="page-link" onClick={() => table.setPageIndex(0)}>
                        Awal
                    </button>
                </li>
                <li className={`page-item ${!table.getCanPreviousPage() ? "disabled" : ""}`}>
                    <button className="page-link" onClick={() => table.previousPage()}>
                        Sebelumnya
                    </button>
                </li>
                {(() => {
                    const pageList = [...Array(pageCount)].map((_, i) => i)
                    const currentPage = table.getState().pagination.pageIndex
                    const startIndex =
                        pageCount <= 5 || currentPage <= 2
                            ? 0
                            : currentPage + 2 >= pageCount
                                ? pageCount - 5
                                : currentPage - 2
                    const visiblePages = pageList.slice(startIndex, startIndex + 5)

                    return visiblePages.map((item) => (
                        <li key={item} className={`page-item ${currentPage === item ? "active" : ""}`}>
                            <button className="page-link" onClick={() => table.setPageIndex(item)}>
                                {item + 1}
                            </button>
                        </li>
                    ))
                })()}
                <li className={`page-item ${!table.getCanNextPage() ? "disabled" : ""}`}>
                    <button className="page-link" onClick={() => table.nextPage()}>
                        Berikutnya
                    </button>
                </li>
                <li className={`page-item ${!table.getCanNextPage() ? "disabled" : ""}`}>
                    <button className="page-link" onClick={() => table.setPageIndex(pageCount - 1)}>
                        Akhir
                    </button>
                </li>
            </ul>
            <span className="badge bg-light text-dark d-none d-md-inline">
                Halaman {pagination.pageIndex + 1} / {pageCount}
            </span>
        </nav>
    </>
    )
}