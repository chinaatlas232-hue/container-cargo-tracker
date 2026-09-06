import React, { useMemo, useState } from 'react';

interface AtlasCustomTableProps {
  data: Record<string, any>[];
  isSponsorsPivot?: boolean;
  isAgingReport?: boolean;
  onContainerClick?: (containerNo: string) => void;
  rowsPerPage?: number;
}

export const AtlasCustomTable: React.FC<AtlasCustomTableProps> = ({
  data,
  isSponsorsPivot = false,
  isAgingReport = false,
  onContainerClick,
  rowsPerPage = 100,
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Compute duplicated codes
  const duplicatedCodes = useMemo(() => {
    if (!data || data.length === 0) return new Set<string>();
    const codeKey = Object.keys(data[0] || {}).find((k) =>
      ['code', 'الكود', 'كود'].includes(k.trim().toLowerCase())
    );
    if (!codeKey) return new Set<string>();
    const counts = new Map<string, number>();
    for (const r of data) {
      const c = String(r[codeKey] || '').trim();
      if (c && !c.toLowerCase().includes('total')) {
        counts.set(c, (counts.get(c) || 0) + 1);
      }
    }
    const dupes = new Set<string>();
    counts.forEach((count, code) => {
      if (count > 1) dupes.add(code);
    });
    return dupes;
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="p-4 bg-slate-800 text-slate-300 rounded-lg text-center my-4 font-semibold">
        لا توجد بيانات للعرض.
      </div>
    );
  }

  // Remove existing total rows to avoid duplicates in numbering
  const nonTotalRows: any[] = [];
  const totalRows: any[] = [];

  data.forEach((r) => {
    const isTotal = Object.values(r).some((v) => {
      const s = String(v || '').trim().toLowerCase();
      return s.includes('grand total') || s.includes('grandtotal') || s.includes('الإجمالي الكلي');
    });
    if (isTotal) totalRows.push(r);
    else nonTotalRows.push(r);
  });

  const allColumns = Object.keys(data[0] || {}).filter((c) => c !== 'التسلسل');
  const codeKey = allColumns.find((c) => ['code', 'الكود', 'كود'].includes(c.trim().toLowerCase()));
  const sponsorKey = allColumns.find((c) => c.includes('كفيل'));

  const totalPages = Math.max(1, Math.ceil(nonTotalRows.length / rowsPerPage));
  const displayedNonTotal = rowsPerPage < nonTotalRows.length 
    ? nonTotalRows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage) 
    : nonTotalRows;

  const rowsToRender = [...displayedNonTotal, ...totalRows];

  return (
    <div className="w-full my-4 overflow-x-auto">
      {/* Pagination controls if large */}
      {nonTotalRows.length > rowsPerPage && (
        <div className="no-print flex items-center justify-between bg-slate-800 text-white p-2.5 rounded-t-lg text-sm mb-1 border border-slate-700">
          <div className="text-slate-300">
            عرض {((currentPage - 1) * rowsPerPage) + 1} إلى {Math.min(currentPage * rowsPerPage, nonTotalRows.length)} من إجمالي {nonTotalRows.length} سجل
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-xs font-bold cursor-pointer"
            >
              السابق
            </button>
            <span className="text-xs font-mono font-bold">
              صفحة {currentPage} من {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-xs font-bold cursor-pointer"
            >
              التالي
            </button>
          </div>
        </div>
      )}

      <table className="custom-html-table">
        <thead>
          <tr>
            {!isSponsorsPivot && <th>التسلسل</th>}
            {allColumns.map((col) => (
              <th key={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rowsToRender.map((row, rowIdx) => {
            const isRowTotal = Object.values(row).some((val) => {
              if (val === null || val === undefined) return false;
              const valS = String(val).trim().toLowerCase();
              return valS.includes('grand total') || valS.includes('grandtotal') || valS.includes('الإجمالي الكلي');
            });

            const sponsorVal = sponsorKey ? String(row[sponsorKey] || '') : '';
            const isNotArrived = sponsorVal.includes('لم تصل بعد');

            const rowCodeVal = codeKey ? String(row[codeKey] || '').trim() : '';
            const isCodeDuplicated = Boolean(codeKey && duplicatedCodes.has(rowCodeVal));

            const seqNum = isRowTotal ? '' : (currentPage - 1) * rowsPerPage + rowIdx + 1;

            return (
              <tr
                key={rowIdx}
                style={
                  isRowTotal
                    ? { backgroundColor: '#374151', color: '#ffffff', fontWeight: 'bold' }
                    : undefined
                }
              >
                {!isSponsorsPivot && (
                  <td
                    style={
                      isRowTotal
                        ? { backgroundColor: '#374151', color: '#ffffff', fontWeight: 'bold' }
                        : undefined
                    }
                  >
                    {seqNum || '-'}
                  </td>
                )}

                {allColumns.map((col, colIdx) => {
                  const val = row[col];
                  const colStr = String(col);
                  const valStr = val === null || val === undefined ? '' : String(val).trim();

                  let numericVal: number | null = null;
                  try {
                    const cleanStr = valStr.replace(/¥/g, '').replace(/\$/g, '').replace(/,/g, '');
                    if (cleanStr !== '' && !isNaN(Number(cleanStr))) {
                      numericVal = parseFloat(cleanStr);
                    }
                  } catch (e) {
                    numericVal = null;
                  }

                  let cellStyle: React.CSSProperties = {};

                  if (isRowTotal) {
                    cellStyle = { backgroundColor: '#374151', color: '#ffffff', fontWeight: 'bold' };
                  } else {
                    if (isCodeDuplicated && col === codeKey) {
                      cellStyle = { backgroundColor: '#fef08a', color: '#713f12', fontWeight: 'bold' };
                    } else if (isSponsorsPivot) {
                      cellStyle = { backgroundColor: '#fce7f3', color: '#831843', fontWeight: 'bold' };
                      if (colIdx < 2) {
                        cellStyle = { backgroundColor: '#fed7aa', color: '#7c2d12', fontWeight: 'bold' };
                      }
                    } else {
                      if (numericVal !== null && numericVal > 0 && colStr !== 'التسلسل') {
                        cellStyle = { backgroundColor: '#fbcfe8', color: '#831843', fontWeight: 'bold' };
                      } else if (isNotArrived) {
                        cellStyle = { backgroundColor: '#fef08a', color: '#713f12' };
                        if (['رقم الحاوية', sponsorKey].includes(colStr)) {
                          cellStyle.fontWeight = 'bold';
                        }
                      } else {
                        if (['رقم الحاوية', sponsorKey].includes(colStr) && valStr && valStr !== '-') {
                          cellStyle = { backgroundColor: '#bbf7d0', color: '#065f46', fontWeight: 'bold' };
                        }
                      }
                    }
                  }

                  // Format value
                  let formattedVal: React.ReactNode = valStr;

                  if (val === null || val === undefined || valStr === '' || valStr.toLowerCase() === 'nan') {
                    formattedVal = '-';
                  } else if (['رقم الحاوية', 'رقم الحاويات'].includes(colStr) && valStr && valStr !== '-' && !isRowTotal) {
                    formattedVal = (
                      <button
                        type="button"
                        onClick={() => onContainerClick && onContainerClick(valStr)}
                        title={`عرض وتتبع مسار الحاوية ${valStr} مباشرة على خريطة التتبع`}
                        className="inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white px-2.5 py-1 rounded shadow-sm text-xs font-bold transition-all cursor-pointer hover:scale-105 border border-blue-400/30"
                      >
                        <span className="font-mono tracking-wide">{valStr}</span>
                        <span className="text-[10px] bg-blue-800/90 text-blue-100 px-1 py-0.5 rounded flex items-center gap-0.5">
                          🗺️ الخريطة
                        </span>
                      </button>
                    );
                  } else if (numericVal !== null) {
                    const isCurrencyCol = [
                      'مبلغ',
                      'قيمة',
                      'المجموع',
                      'دفع',
                      'سعر',
                      'الاستحصالات',
                      'متبقي',
                      'المتبقي',
                    ].some((kw) => colStr.includes(kw));

                    if (isCurrencyCol || isSponsorsPivot) {
                      if (['المجموع', 'الزبون دفع', 'المكتب دفع'].includes(colStr)) {
                        formattedVal = Number.isInteger(numericVal)
                          ? numericVal.toLocaleString('en-US')
                          : numericVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      } else if (
                        colStr.includes('¥') ||
                        colStr.includes('يوان') ||
                        valStr.includes('¥') ||
                        (isSponsorsPivot && colStr.includes('الزبون دفع'))
                      ) {
                        formattedVal = `¥${numericVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                      } else if (
                        isSponsorsPivot &&
                        ['سعر البيع', 'مبلغ الجمرك', 'متبقي حقيقي'].some((k) => colStr.includes(k))
                      ) {
                        formattedVal = `$ ${numericVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                      } else if (isSponsorsPivot && colStr.includes('مجموع الكارتون')) {
                        formattedVal = Number.isInteger(numericVal)
                          ? numericVal.toLocaleString('en-US')
                          : numericVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      } else if (isSponsorsPivot) {
                        formattedVal = Number.isInteger(numericVal)
                          ? numericVal.toLocaleString('en-US')
                          : numericVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      } else {
                        formattedVal = `$${numericVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                      }
                    } else {
                      formattedVal = Number.isInteger(numericVal)
                        ? numericVal.toLocaleString('en-US')
                        : numericVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    }
                  }

                  return (
                    <td key={col} style={cellStyle}>
                      {formattedVal}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
